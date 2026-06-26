import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../supabase";
import { Expense, ExpenseCategory, ExpenseParticipant, Profile } from "../types";

export type ExpenseWithParticipants = Expense & { participants: string[] };

let channelCounter = 0;

export function useExpenses(householdId: string | null | undefined) {
  const [expenses, setExpenses] = useState<ExpenseWithParticipants[]>([]);
  const [loading, setLoading] = useState(false);
  const channelId = useRef(++channelCounter);

  const fetchExpenses = useCallback(async () => {
    if (!householdId) {
      setExpenses([]);
      return;
    }
    setLoading(true);
    const { data: expenseRows } = await supabase
      .from("expenses")
      .select("*")
      .eq("household_id", householdId)
      .order("created_at", { ascending: false });

    if (!expenseRows || expenseRows.length === 0) {
      setExpenses([]);
      setLoading(false);
      return;
    }

    const expenseIds = expenseRows.map((e: Expense) => e.id);
    const { data: participantRows } = await supabase
      .from("expense_participants")
      .select("*")
      .in("expense_id", expenseIds);

    const participantsByExpense: Record<string, string[]> = {};
    for (const p of participantRows ?? []) {
      if (!participantsByExpense[p.expense_id]) {
        participantsByExpense[p.expense_id] = [];
      }
      participantsByExpense[p.expense_id].push(p.user_id);
    }

    const merged: ExpenseWithParticipants[] = expenseRows.map(
      (e: Expense) => ({
        ...e,
        participants: participantsByExpense[e.id] ?? [],
      })
    );

    setExpenses(merged);
    setLoading(false);
  }, [householdId]);

  useEffect(() => {
    void fetchExpenses();
  }, [fetchExpenses]);

  // Realtime subscription
  useEffect(() => {
    if (!householdId) return;

    const channel = supabase
      .channel(`expenses:${householdId}:${channelId.current}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "expenses",
          filter: `household_id=eq.${householdId}`,
        },
        () => {
          void fetchExpenses();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "expenses",
          filter: `household_id=eq.${householdId}`,
        },
        () => {
          void fetchExpenses();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [householdId, fetchExpenses]);

  const addExpense = useCallback(
    async (data: {
      title: string;
      amount: number;
      payer_id: string;
      category: ExpenseCategory;
      note: string;
      participant_ids: string[];
    }) => {
      if (!householdId) return;

      const { data: inserted, error } = await supabase
        .from("expenses")
        .insert({
          household_id: householdId,
          title: data.title,
          amount: data.amount,
          payer_id: data.payer_id,
          category: data.category,
          note: data.note,
        })
        .select()
        .single();

      if (error || !inserted) return { error };

      const participantRows = data.participant_ids.map((uid) => ({
        expense_id: inserted.id,
        user_id: uid,
      }));

      if (participantRows.length > 0) {
        const { error: pError } = await supabase
          .from("expense_participants")
          .insert(participantRows);
        if (pError) return { error: pError };
      }

      // Optimistic: add to local state immediately
      setExpenses((prev) => [
        { ...inserted, participants: data.participant_ids },
        ...prev,
      ]);

      return { error: null };
    },
    [householdId]
  );

  const deleteExpense = useCallback(async (id: string) => {
    const { error } = await supabase.from("expenses").delete().eq("id", id);
    if (!error) {
      setExpenses((prev) => prev.filter((e) => e.id !== id));
    }
    return { error };
  }, []);

  return { expenses, loading, addExpense, deleteExpense, fetchExpenses };
}

// ── Pure utility functions ──

export function computeBalances(
  expenses: ExpenseWithParticipants[],
  members: Profile[]
): Record<string, number> {
  const balances: Record<string, number> = {};
  for (const m of members) {
    balances[m.id] = 0;
  }

  for (const expense of expenses) {
    if (expense.participants.length === 0) continue;
    const share = expense.amount / expense.participants.length;
    balances[expense.payer_id] = (balances[expense.payer_id] ?? 0) + expense.amount;
    for (const pid of expense.participants) {
      balances[pid] = (balances[pid] ?? 0) - share;
    }
  }

  return balances;
}

export function computeSettlements(
  expenses: ExpenseWithParticipants[],
  members: Profile[]
): Array<{ from: string; to: string; amount: number }> {
  const balances = computeBalances(expenses, members);

  const creditors: Array<{ id: string; amount: number }> = [];
  const debtors: Array<{ id: string; amount: number }> = [];

  for (const [id, balance] of Object.entries(balances)) {
    if (balance > 0.01) creditors.push({ id, amount: balance });
    else if (balance < -0.01) debtors.push({ id, amount: -balance });
  }

  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const settlements: Array<{ from: string; to: string; amount: number }> = [];

  let ci = 0;
  let di = 0;
  while (ci < creditors.length && di < debtors.length) {
    const cred = creditors[ci];
    const debt = debtors[di];
    const transfer = Math.min(cred.amount, debt.amount);

    settlements.push({
      from: debt.id,
      to: cred.id,
      amount: Math.round(transfer * 100) / 100,
    });

    cred.amount -= transfer;
    debt.amount -= transfer;

    if (cred.amount < 0.01) ci++;
    if (debt.amount < 0.01) di++;
  }

  return settlements;
}
