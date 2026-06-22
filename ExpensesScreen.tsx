import { Dispatch, SetStateAction, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Expense, ExpenseCategory } from "./types";

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  courses: "🛒 Courses",
  loyer: "🏠 Loyer",
  restaurant: "🍕 Restaurant",
  transport: "🚗 Transport",
  loisirs: "🎉 Loisirs",
  autre: "📦 Autre",
};

const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  courses: "#10B981",
  loyer: "#3B82F6",
  restaurant: "#F59E0B",
  transport: "#8B5CF6",
  loisirs: "#EC4899",
  autre: "#6B7280",
};

/**
 * Calcule les remboursements optimaux pour minimiser le nombre de transactions.
 * Algorithme : on résout les dettes en appariant les plus grands créanciers aux plus grands débiteurs.
 */
function computeSettlements(
  expenses: Expense[],
  roommates: string[],
): Array<{ from: string; to: string; amount: number }> {
  // Calculer le bilan de chaque personne
  const balances: Record<string, number> = Object.fromEntries(
    roommates.map((r) => [r, 0]),
  );

  for (const expense of expenses) {
    if (expense.participants.length === 0) continue;
    const share = expense.amount / expense.participants.length;
    balances[expense.payer] = (balances[expense.payer] ?? 0) + expense.amount;
    for (const p of expense.participants) {
      balances[p] = (balances[p] ?? 0) - share;
    }
  }

  const creditors: Array<{ name: string; amount: number }> = [];
  const debtors: Array<{ name: string; amount: number }> = [];

  for (const [name, balance] of Object.entries(balances)) {
    if (balance > 0.01) creditors.push({ name, amount: balance });
    else if (balance < -0.01) debtors.push({ name, amount: -balance });
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
      from: debt.name,
      to: cred.name,
      amount: Math.round(transfer * 100) / 100,
    });

    cred.amount -= transfer;
    debt.amount -= transfer;

    if (cred.amount < 0.01) ci++;
    if (debt.amount < 0.01) di++;
  }

  return settlements;
}

type ActiveTab = "list" | "add" | "balances";

export function ExpensesScreen({
  expenses,
  setExpenses,
  currentUser,
  roommates,
}: {
  expenses: Expense[];
  setExpenses: Dispatch<SetStateAction<Expense[]>>;
  currentUser: string;
  roommates: string[];
}) {
  const [view, setView] = useState<ActiveTab>("list");

  // Formulaire
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [payer, setPayer] = useState(currentUser);
  const [participants, setParticipants] = useState<string[]>([...roommates]);
  const [category, setCategory] = useState<ExpenseCategory>("autre");
  const [note, setNote] = useState("");

  const balances = useMemo(() => {
    const result: Record<string, number> = Object.fromEntries(
      roommates.map((r) => [r, 0]),
    );
    for (const expense of expenses) {
      if (expense.participants.length === 0) continue;
      const share = expense.amount / expense.participants.length;
      result[expense.payer] += expense.amount;
      for (const p of expense.participants) {
        result[p] -= share;
      }
    }
    return result;
  }, [expenses, roommates]);

  const settlements = useMemo(
    () => computeSettlements(expenses, roommates),
    [expenses, roommates],
  );

  const maxAbsBalance = Math.max(...Object.values(balances).map(Math.abs), 1);

  const toggleParticipant = (name: string) => {
    setParticipants((prev) =>
      prev.includes(name) ? prev.filter((p) => p !== name) : [...prev, name],
    );
  };

  const selectAll = () => setParticipants([...roommates]);
  const selectNone = () => setParticipants([]);

  const addExpense = () => {
    const parsed = Number(amount.replace(",", "."));
    if (
      !title.trim() ||
      isNaN(parsed) ||
      parsed <= 0 ||
      participants.length === 0
    ) {
      Alert.alert(
        "Dépense invalide",
        "Remplis le titre, le montant et sélectionne au moins un participant.",
      );
      return;
    }
    const item: Expense = {
      id: `${Date.now()}`,
      title: title.trim(),
      amount: parsed,
      payer,
      participants,
      category,
      note: note.trim(),
      createdAt: new Date().toISOString(),
    };
    setExpenses((prev) => [item, ...prev]);
    // Reset form
    setTitle("");
    setAmount("");
    setPayer(currentUser);
    setParticipants([...roommates]);
    setCategory("autre");
    setNote("");
    setView("list");
  };

  const deleteExpense = (id: string) => {
    Alert.alert("Supprimer ?", "Cette dépense sera définitivement supprimée.", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: () => setExpenses((prev) => prev.filter((e) => e.id !== id)),
      },
    ]);
  };

  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
  const myBalance = balances[currentUser] ?? 0;

  return (
    <View style={styles.container}>
      {/* Header résumé */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total dépenses</Text>
          <Text style={styles.summaryValue}>{totalSpent.toFixed(2)} €</Text>
        </View>
        <View
          style={[
            styles.summaryCard,
            myBalance >= 0 ? styles.summaryGreen : styles.summaryRed,
          ]}
        >
          <Text style={styles.summaryLabel}>Mon solde</Text>
          <Text style={styles.summaryValueBig}>
            {myBalance >= 0 ? "+" : ""}
            {myBalance.toFixed(2)} €
          </Text>
        </View>
      </View>

      {/* Onglets internes */}
      <View style={styles.tabRow}>
        {(["list", "add", "balances"] as ActiveTab[]).map((v) => (
          <Pressable
            key={v}
            style={[styles.tab, view === v && styles.tabActive]}
            onPress={() => setView(v)}
          >
            <Text style={[styles.tabText, view === v && styles.tabTextActive]}>
              {v === "list"
                ? "📋 Dépenses"
                : v === "add"
                  ? "➕ Ajouter"
                  : "⚖️ Bilans"}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* ── Vue liste ── */}
        {view === "list" && (
          <View style={styles.section}>
            {expenses.length === 0 ? (
              <Text style={styles.empty}>
                Aucune dépense. Appuie sur ➕ Ajouter.
              </Text>
            ) : (
              expenses.map((expense) => {
                const share = expense.participants.includes(currentUser)
                  ? expense.amount / expense.participants.length
                  : 0;
                const iAmPayer = expense.payer === currentUser;
                return (
                  <View key={expense.id} style={styles.card}>
                    <View style={styles.cardHeader}>
                      <View
                        style={[
                          styles.categoryDot,
                          {
                            backgroundColor:
                              CATEGORY_COLORS[expense.category] ?? "#6B7280",
                          },
                        ]}
                      />
                      <View style={styles.cardMain}>
                        <Text style={styles.cardTitle}>{expense.title}</Text>
                        <Text style={styles.cardSub}>
                          {CATEGORY_LABELS[expense.category]} ·{" "}
                          {formatDate(expense.createdAt)}
                        </Text>
                        {expense.note ? (
                          <Text style={styles.cardNote}>📝 {expense.note}</Text>
                        ) : null}
                      </View>
                      <View style={styles.cardRight}>
                        <Text style={styles.cardAmount}>
                          {expense.amount.toFixed(2)} €
                        </Text>
                        <Text style={styles.cardPayer}>
                          payé par {expense.payer}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.cardFooter}>
                      <Text style={styles.participants}>
                        👥 {expense.participants.join(", ")}
                      </Text>
                      <Text
                        style={[
                          styles.myShare,
                          iAmPayer
                            ? styles.sharePositive
                            : styles.shareNegative,
                        ]}
                      >
                        {iAmPayer
                          ? `Tu récupères ${(expense.amount - share).toFixed(2)} €`
                          : expense.participants.includes(currentUser)
                            ? `Ta part : ${share.toFixed(2)} €`
                            : "Non concerné"}
                      </Text>
                      <Pressable
                        onPress={() => deleteExpense(expense.id)}
                        style={styles.deleteButton}
                      >
                        <Text style={styles.deleteText}>🗑️</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* ── Vue ajout ── */}
        {view === "add" && (
          <View style={styles.section}>
            <Text style={styles.formLabel}>Titre *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex : Courses Lidl, Loyer juillet..."
              value={title}
              onChangeText={setTitle}
            />

            <Text style={styles.formLabel}>Montant (€) *</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
            />

            <Text style={styles.formLabel}>Catégorie</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryRow}
            >
              {(Object.keys(CATEGORY_LABELS) as ExpenseCategory[]).map(
                (cat) => (
                  <Pressable
                    key={cat}
                    style={[
                      styles.categoryChip,
                      {
                        borderColor: CATEGORY_COLORS[cat],
                        backgroundColor:
                          category === cat ? CATEGORY_COLORS[cat] : "#F9FAFB",
                      },
                    ]}
                    onPress={() => setCategory(cat)}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        category === cat && styles.categoryChipTextActive,
                      ]}
                    >
                      {CATEGORY_LABELS[cat]}
                    </Text>
                  </Pressable>
                ),
              )}
            </ScrollView>

            <Text style={styles.formLabel}>Payé par *</Text>
            <View style={styles.chipRow}>
              {roommates.map((member) => (
                <Pressable
                  key={member}
                  style={[styles.chip, payer === member && styles.chipActive]}
                  onPress={() => setPayer(member)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      payer === member && styles.chipTextActive,
                    ]}
                  >
                    {member}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.labelRow}>
              <Text style={styles.formLabel}>Participants *</Text>
              <View style={styles.selectButtons}>
                <Pressable onPress={selectAll}>
                  <Text style={styles.selectBtn}>Tous</Text>
                </Pressable>
                <Pressable onPress={selectNone}>
                  <Text style={styles.selectBtn}>Aucun</Text>
                </Pressable>
              </View>
            </View>
            <View style={styles.chipRow}>
              {roommates.map((member) => {
                const selected = participants.includes(member);
                return (
                  <Pressable
                    key={member}
                    style={[
                      styles.checkChip,
                      selected && styles.checkChipActive,
                    ]}
                    onPress={() => toggleParticipant(member)}
                  >
                    <Text style={styles.checkIcon}>{selected ? "☑" : "☐"}</Text>
                    <Text
                      style={[
                        styles.chipText,
                        selected && styles.chipTextActive,
                      ]}
                    >
                      {member}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {participants.length > 0 && amount && (
              <Text style={styles.sharePreview}>
                ≈{" "}
                {(
                  Number(amount.replace(",", ".")) / participants.length || 0
                ).toFixed(2)}{" "}
                € / pers.
              </Text>
            )}

            <Text style={styles.formLabel}>Note (optionnel)</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              placeholder="Détails, justificatif..."
              value={note}
              onChangeText={setNote}
              multiline
            />

            <Pressable style={styles.submitButton} onPress={addExpense}>
              <Text style={styles.submitText}>✅ Ajouter la dépense</Text>
            </Pressable>
          </View>
        )}

        {/* ── Vue bilans ── */}
        {view === "balances" && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Balances</Text>
            {roommates.map((member) => {
              const bal = balances[member] ?? 0;
              const barWidth =
                maxAbsBalance > 0 ? (Math.abs(bal) / maxAbsBalance) * 100 : 0;
              const isPositive = bal >= 0;
              return (
                <View key={member} style={styles.balanceRow}>
                  <Text style={styles.balanceName}>{member}</Text>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.bar,
                        {
                          width: `${barWidth}%`,
                          backgroundColor: isPositive ? "#10B981" : "#EF4444",
                        },
                      ]}
                    />
                  </View>
                  <Text
                    style={[
                      styles.balanceAmount,
                      isPositive ? styles.positive : styles.negative,
                    ]}
                  >
                    {isPositive ? "+" : ""}
                    {bal.toFixed(2)} €
                  </Text>
                </View>
              );
            })}

            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>
              💸 Remboursements suggérés
            </Text>
            {settlements.length === 0 ? (
              <Text style={styles.empty}>
                Tout le monde est à l'équilibre 🎉
              </Text>
            ) : (
              settlements.map((s, i) => (
                <View key={i} style={styles.settlementCard}>
                  <Text style={styles.settlementText}>
                    <Text style={styles.settlementFrom}>{s.from}</Text>
                    {"  →  "}
                    <Text style={styles.settlementTo}>{s.to}</Text>
                  </Text>
                  <Text style={styles.settlementAmount}>
                    {s.amount.toFixed(2)} €
                  </Text>
                </View>
              ))
            )}

            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>
              📊 Par catégorie
            </Text>
            {(Object.keys(CATEGORY_LABELS) as ExpenseCategory[]).map((cat) => {
              const total = expenses
                .filter((e) => e.category === cat)
                .reduce((sum, e) => sum + e.amount, 0);
              if (total === 0) return null;
              return (
                <View key={cat} style={styles.catRow}>
                  <Text style={styles.catLabel}>{CATEGORY_LABELS[cat]}</Text>
                  <Text style={styles.catTotal}>{total.toFixed(2)} €</Text>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F6FA" },
  summaryRow: {
    flexDirection: "row",
    gap: 10,
    padding: 16,
    paddingBottom: 8,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  summaryGreen: { backgroundColor: "#ECFDF5", borderColor: "#10B981" },
  summaryRed: { backgroundColor: "#FEF2F2", borderColor: "#EF4444" },
  summaryLabel: { fontSize: 11, color: "#6B7280", marginBottom: 4 },
  summaryValue: { fontSize: 18, fontWeight: "700", color: "#111827" },
  summaryValueBig: { fontSize: 20, fontWeight: "700", color: "#111827" },
  tabRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  tab: {
    flex: 1,
    backgroundColor: "#E5E7EB",
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: "center",
  },
  tabActive: { backgroundColor: "#1D4ED8" },
  tabText: { fontWeight: "600", color: "#374151", fontSize: 12 },
  tabTextActive: { color: "#FFFFFF" },
  scroll: { padding: 16, paddingBottom: 40 },
  section: { gap: 12 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#111827" },
  empty: { color: "#6B7280", textAlign: "center", paddingVertical: 24 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 8,
  },
  cardHeader: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 5,
  },
  cardMain: { flex: 1 },
  cardTitle: { fontWeight: "700", color: "#111827", fontSize: 15 },
  cardSub: { fontSize: 12, color: "#6B7280" },
  cardNote: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  cardRight: { alignItems: "flex-end" },
  cardAmount: { fontWeight: "700", fontSize: 16, color: "#111827" },
  cardPayer: { fontSize: 11, color: "#6B7280" },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingTop: 8,
  },
  participants: { flex: 1, fontSize: 12, color: "#6B7280" },
  myShare: { fontSize: 12, fontWeight: "600" },
  sharePositive: { color: "#10B981" },
  shareNegative: { color: "#EF4444" },
  deleteButton: { padding: 4 },
  deleteText: { fontSize: 16 },
  formLabel: { fontWeight: "600", color: "#374151", marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
  },
  inputMultiline: { minHeight: 70, textAlignVertical: "top" },
  categoryRow: { gap: 8, paddingVertical: 6 },
  categoryChip: {
    borderWidth: 1.5,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  categoryChipText: { color: "#374151", fontWeight: "600", fontSize: 12 },
  categoryChipTextActive: { color: "#FFFFFF" },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  selectButtons: { flexDirection: "row", gap: 12 },
  selectBtn: { color: "#1D4ED8", fontWeight: "600", fontSize: 13 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: "#9CA3AF",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipActive: { backgroundColor: "#111827", borderColor: "#111827" },
  chipText: { color: "#374151", fontWeight: "600" },
  chipTextActive: { color: "#FFFFFF" },
  checkChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#9CA3AF",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#FFFFFF",
  },
  checkChipActive: {
    backgroundColor: "#EEF2FF",
    borderColor: "#1D4ED8",
  },
  checkIcon: { fontSize: 16 },
  sharePreview: {
    color: "#1D4ED8",
    fontWeight: "600",
    textAlign: "center",
    fontSize: 13,
  },
  submitButton: {
    backgroundColor: "#1D4ED8",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  submitText: { color: "#FFFFFF", fontWeight: "700", fontSize: 15 },
  balanceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 6,
  },
  balanceName: { width: 70, fontWeight: "600", color: "#374151" },
  barTrack: {
    flex: 1,
    height: 12,
    backgroundColor: "#E5E7EB",
    borderRadius: 6,
    overflow: "hidden",
  },
  bar: { height: "100%", borderRadius: 6 },
  balanceAmount: { width: 70, textAlign: "right", fontWeight: "700" },
  positive: { color: "#10B981" },
  negative: { color: "#EF4444" },
  settlementCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  settlementText: { fontSize: 14, color: "#374151" },
  settlementFrom: { fontWeight: "700", color: "#EF4444" },
  settlementTo: { fontWeight: "700", color: "#10B981" },
  settlementAmount: { fontWeight: "700", color: "#111827", fontSize: 16 },
  catRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  catLabel: { color: "#374151" },
  catTotal: { fontWeight: "700", color: "#111827" },
});
