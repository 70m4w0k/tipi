import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../lib/theme";

type Props = {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  hideCancel?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * Modal de confirmation réutilisable — remplace Alert.alert (no-op sur le web).
 * Avec hideCancel, sert aussi de modal d'information (un seul bouton).
 */
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  destructive,
  hideCancel,
  onConfirm,
  onCancel,
}: Props) {
  const t = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.overlay} onPress={onCancel}>
        <Pressable style={[styles.content, { backgroundColor: t.card }]} onPress={() => {}}>
          <Text style={[styles.title, { color: t.text }]}>{title}</Text>
          {!!message && <Text style={[styles.message, { color: t.textSecondary }]}>{message}</Text>}
          <View style={styles.btnRow}>
            {!hideCancel && (
              <Pressable style={[styles.cancelBtn, { backgroundColor: t.separator }]} onPress={onCancel}>
                <Text style={[styles.cancelText, { color: t.textSecondary }]}>{cancelLabel}</Text>
              </Pressable>
            )}
            <Pressable
              testID="confirm-dialog-confirm"
              style={[styles.confirmBtn, { backgroundColor: destructive ? t.danger : t.accent }]}
              onPress={onConfirm}
            >
              <Text style={styles.confirmText}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  content: { borderRadius: 16, padding: 20, width: "100%", maxWidth: 340 },
  title: { fontSize: 17, fontWeight: "700", marginBottom: 8 },
  message: { fontSize: 14, lineHeight: 20, marginBottom: 20 },
  btnRow: { flexDirection: "row", gap: 10 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: "center" },
  cancelText: { fontWeight: "600", fontSize: 15 },
  confirmBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: "center" },
  confirmText: { fontWeight: "600", color: "#FFFFFF", fontSize: 15 },
});
