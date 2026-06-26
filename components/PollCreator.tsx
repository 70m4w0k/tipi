import { useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../lib/theme";

type Props = {
  onCreatePoll: (question: string, options: string[]) => void;
  onClose: () => void;
};

export default function PollCreator({ onCreatePoll, onClose }: Props) {
  const t = useTheme();
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);

  const updateOption = (index: number, value: string) => {
    setOptions((prev) => prev.map((o, i) => (i === index ? value : o)));
  };

  const addOption = () => {
    if (options.length >= 6) return;
    setOptions((prev) => [...prev, ""]);
  };

  const removeOption = (index: number) => {
    if (options.length <= 2) return;
    setOptions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreate = () => {
    const trimmedQuestion = question.trim();
    const trimmedOptions = options.map((o) => o.trim()).filter((o) => o.length > 0);

    if (!trimmedQuestion) {
      Alert.alert("Question requise", "Entre une question pour le sondage.");
      return;
    }
    if (trimmedOptions.length < 2) {
      Alert.alert("Options requises", "Il faut au moins 2 options.");
      return;
    }

    onCreatePoll(trimmedQuestion, trimmedOptions);
    onClose();
  };

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.container, { backgroundColor: t.card }]}>
          <Text style={[styles.title, { color: t.text }]}>Nouveau sondage</Text>

          <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
            <Text style={[styles.label, { color: t.textSecondary }]}>Question</Text>
            <TextInput
              style={[styles.input, { borderColor: t.inputBorder, backgroundColor: t.inputBg, color: t.text }]}
              placeholder="Pose ta question..."
              placeholderTextColor={t.textMuted}
              value={question}
              onChangeText={setQuestion}
              multiline
            />

            <Text style={[styles.label, { color: t.textSecondary }]}>Options</Text>
            {options.map((opt, i) => (
              <View key={i} style={styles.optionRow}>
                <TextInput
                  style={[styles.input, styles.optionInput, { borderColor: t.inputBorder, backgroundColor: t.inputBg, color: t.text }]}
                  placeholder={`Option ${i + 1}`}
                  placeholderTextColor={t.textMuted}
                  value={opt}
                  onChangeText={(v) => updateOption(i, v)}
                />
                {options.length > 2 && (
                  <Pressable
                    style={[styles.removeButton, { backgroundColor: t.dangerLight }]}
                    onPress={() => removeOption(i)}
                  >
                    <Ionicons name="close" size={16} color={t.danger} />
                  </Pressable>
                )}
              </View>
            ))}

            {options.length < 6 && (
              <Pressable style={styles.addButton} onPress={addOption}>
                <Text style={[styles.addText, { color: t.accent }]}>+ Ajouter une option</Text>
              </Pressable>
            )}
          </ScrollView>

          <View style={styles.actions}>
            <Pressable style={[styles.cancelButton, { borderColor: t.inputBorder }]} onPress={onClose}>
              <Text style={[styles.cancelText, { color: t.textSecondary }]}>Annuler</Text>
            </Pressable>
            <Pressable style={[styles.createButton, { backgroundColor: t.accent }]} onPress={handleCreate}>
              <Text style={styles.createText}>Creer</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  container: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 32,
    maxHeight: "80%",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
    marginBottom: 16,
  },
  scroll: {
    flexGrow: 0,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#F9FAFB",
    fontSize: 16,
    color: "#111827",
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  optionInput: {
    flex: 1,
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },
  removeText: {
    color: "#DC2626",
    fontSize: 14,
    fontWeight: "700",
  },
  addButton: {
    paddingVertical: 10,
    alignItems: "center",
  },
  addText: {
    color: "#1D4ED8",
    fontWeight: "600",
    fontSize: 14,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    alignItems: "center",
  },
  cancelText: {
    color: "#374151",
    fontWeight: "700",
    fontSize: 16,
  },
  createButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: "#1D4ED8",
    alignItems: "center",
  },
  createText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 16,
  },
});
