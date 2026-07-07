import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text } from "react-native";
import { useTheme } from "../lib/theme";

/**
 * Bannière d'erreur inline stylée — remplace Alert.alert pour les erreurs et
 * validations (convention CLAUDE.md : pas d'Alert, incompatible web mobile).
 * Ne rend rien si `message` est vide. Cliquable pour se fermer si onDismiss.
 */
export function ErrorBanner({ message, onDismiss }: { message: string; onDismiss?: () => void }) {
  const t = useTheme();
  if (!message) return null;
  return (
    <Pressable
      style={[styles.banner, { backgroundColor: t.dangerLight, borderColor: t.danger }]}
      onPress={onDismiss}
      disabled={!onDismiss}
    >
      <Ionicons name="alert-circle" size={18} color={t.danger} />
      <Text style={[styles.text, { color: t.danger }]}>{message}</Text>
      {onDismiss && <Ionicons name="close" size={16} color={t.danger} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  text: { flex: 1, fontSize: 14, fontWeight: "500" },
});
