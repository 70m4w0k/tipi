import {
  computeBalances,
  computeSettlements,
  ExpenseWithParticipants,
} from "../lib/hooks/useExpenses";
import { Profile } from "../lib/types";

function makeProfile(id: string): Profile {
  return {
    id,
    email: `${id}@test.com`,
    display_name: id,
    color: "#000",
    avatar_url: null,
    household_id: "h1",
    role: "member",
    birthday: null,
    created_at: "",
    show_sport_level: true,
    sport_title: null,
  };
}

function makeExpense(
  payer: string,
  amount: number,
  participants: string[]
): ExpenseWithParticipants {
  return {
    id: `exp-${Math.random()}`,
    household_id: "h1",
    title: "Test",
    amount,
    payer_id: payer,
    category: "autre",
    note: "",
    created_at: "",
    participants,
  };
}

const alice = makeProfile("alice");
const bob = makeProfile("bob");
const carol = makeProfile("carol");
const members = [alice, bob, carol];

describe("computeBalances", () => {
  it("returns zero balances with no expenses", () => {
    const balances = computeBalances([], members);
    expect(balances.alice).toBe(0);
    expect(balances.bob).toBe(0);
    expect(balances.carol).toBe(0);
  });

  it("splits a single expense equally among all participants", () => {
    const expenses = [makeExpense("alice", 90, ["alice", "bob", "carol"])];
    const balances = computeBalances(expenses, members);
    expect(balances.alice).toBeCloseTo(60);
    expect(balances.bob).toBeCloseTo(-30);
    expect(balances.carol).toBeCloseTo(-30);
  });

  it("handles expense where payer is not a participant", () => {
    const expenses = [makeExpense("alice", 60, ["bob", "carol"])];
    const balances = computeBalances(expenses, members);
    expect(balances.alice).toBeCloseTo(60);
    expect(balances.bob).toBeCloseTo(-30);
    expect(balances.carol).toBeCloseTo(-30);
  });

  it("handles multiple expenses from different payers", () => {
    const expenses = [
      makeExpense("alice", 90, ["alice", "bob", "carol"]),
      makeExpense("bob", 60, ["alice", "bob", "carol"]),
    ];
    const balances = computeBalances(expenses, members);
    // alice: +90 - 30 - 20 = +40
    // bob: +60 - 30 - 20 = +10
    // carol: -30 - 20 = -50
    expect(balances.alice).toBeCloseTo(40);
    expect(balances.bob).toBeCloseTo(10);
    expect(balances.carol).toBeCloseTo(-50);
  });

  it("handles expense between two people only", () => {
    const expenses = [makeExpense("alice", 100, ["alice", "bob"])];
    const balances = computeBalances(expenses, members);
    expect(balances.alice).toBeCloseTo(50);
    expect(balances.bob).toBeCloseTo(-50);
    expect(balances.carol).toBe(0);
  });

  it("skips expenses with no participants", () => {
    const expenses = [makeExpense("alice", 100, [])];
    const balances = computeBalances(expenses, members);
    expect(balances.alice).toBe(0);
    expect(balances.bob).toBe(0);
  });

  it("balances sum to zero", () => {
    const expenses = [
      makeExpense("alice", 120, ["alice", "bob", "carol"]),
      makeExpense("bob", 45, ["alice", "bob"]),
      makeExpense("carol", 30, ["bob", "carol"]),
    ];
    const balances = computeBalances(expenses, members);
    const sum = Object.values(balances).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(0);
  });
});

describe("computeSettlements", () => {
  it("returns no settlements when balanced", () => {
    const settlements = computeSettlements([], members);
    expect(settlements).toEqual([]);
  });

  it("produces a single settlement for two people", () => {
    const expenses = [makeExpense("alice", 100, ["alice", "bob"])];
    const settlements = computeSettlements(expenses, members);
    expect(settlements).toHaveLength(1);
    expect(settlements[0]).toEqual({
      from: "bob",
      to: "alice",
      amount: 50,
    });
  });

  it("produces correct settlements for three people", () => {
    const expenses = [makeExpense("alice", 90, ["alice", "bob", "carol"])];
    const settlements = computeSettlements(expenses, members);
    const totalTransferred = settlements.reduce((sum, s) => sum + s.amount, 0);
    expect(totalTransferred).toBeCloseTo(60);

    for (const s of settlements) {
      expect(s.to).toBe("alice");
      expect(s.amount).toBeCloseTo(30);
    }
  });

  it("minimizes number of transfers", () => {
    const expenses = [
      makeExpense("alice", 90, ["alice", "bob", "carol"]),
      makeExpense("bob", 90, ["alice", "bob", "carol"]),
    ];
    const settlements = computeSettlements(expenses, members);
    // alice: +60, bob: +60 => carol owes 60 to each? No:
    // alice: 90 - 30 - 30 = +30, bob: 90 - 30 - 30 = +30, carol: -30 -30 = -60
    // => carol pays 30 to alice, 30 to bob = 2 transfers
    expect(settlements).toHaveLength(2);
    const carolPayments = settlements.filter((s) => s.from === "carol");
    expect(carolPayments).toHaveLength(2);
    const total = carolPayments.reduce((sum, s) => sum + s.amount, 0);
    expect(total).toBeCloseTo(60);
  });

  it("all settlement amounts are positive", () => {
    const expenses = [
      makeExpense("alice", 200, ["alice", "bob", "carol"]),
      makeExpense("bob", 50, ["alice", "carol"]),
    ];
    const settlements = computeSettlements(expenses, members);
    for (const s of settlements) {
      expect(s.amount).toBeGreaterThan(0);
    }
  });
});
