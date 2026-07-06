import { Linking, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../lib/theme";

const APK_URL = "https://github.com/70m4w0k/tipi/releases/latest";
const WEB_APP_URL = "https://tipi-tau.vercel.app";

export default function InstallScreen() {
  const t = useTheme();

  const openLink = (url: string) => void Linking.openURL(url);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.background }]}>
      <View style={styles.content}>
        <View style={[styles.iconCircle, { backgroundColor: t.accentLight }]}>
          <Ionicons name="download-outline" size={56} color={t.accent} />
        </View>

        <Text style={[styles.title, { color: t.text }]}>Installer Tipi</Text>
        <Text style={[styles.subtitle, { color: t.textSecondary }]}>
          Choisissez comment accéder à l'application
        </Text>

        <View style={styles.buttons}>
          <Pressable
            style={[styles.btn, { backgroundColor: t.accent }]}
            onPress={() => openLink(APK_URL)}
          >
            <Ionicons name="phone-portrait-outline" size={22} color="#FFF" />
            <View style={styles.btnTextWrap}>
              <Text style={styles.btnLabel}>Application Android</Text>
              <Text style={styles.btnHint}>Télécharger le dernier APK</Text>
            </View>
            <Ionicons name="download-outline" size={18} color="#FFF" />
          </Pressable>

          {Platform.OS === "web" && (
            <Pressable
              style={[styles.btn, { backgroundColor: t.card, borderWidth: 1, borderColor: t.accent }]}
              onPress={() => {
                if ("standalone" in window.navigator || window.matchMedia("(display-mode: standalone)").matches) return;
                alert("Pour installer : ouvrez le menu de votre navigateur et choisissez « Ajouter à l'écran d'accueil »");
              }}
            >
              <Ionicons name="globe-outline" size={22} color={t.accent} />
              <View style={styles.btnTextWrap}>
                <Text style={[styles.btnLabel, { color: t.accent }]}>Application web (PWA)</Text>
                <Text style={[styles.btnHint, { color: t.textSecondary }]}>Ajouter à l'écran d'accueil</Text>
              </View>
              <Ionicons name="add-circle-outline" size={18} color={t.accent} />
            </Pressable>
          )}

          <Pressable
            style={[styles.btn, { backgroundColor: t.card, borderWidth: 1, borderColor: t.cardBorder }]}
            onPress={() => openLink(WEB_APP_URL)}
          >
            <Ionicons name="laptop-outline" size={22} color={t.text} />
            <View style={styles.btnTextWrap}>
              <Text style={[styles.btnLabel, { color: t.text }]}>Continuer sur le web</Text>
              <Text style={[styles.btnHint, { color: t.textSecondary }]}>tipi-tau.vercel.app</Text>
            </View>
            <Ionicons name="arrow-forward" size={18} color={t.textMuted} />
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  iconCircle: {
    width: 112,
    height: 112,
    borderRadius: 56,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  title: { fontSize: 26, fontWeight: "800", marginBottom: 8, textAlign: "center" },
  subtitle: { fontSize: 16, textAlign: "center", marginBottom: 32 },
  buttons: { width: "100%", gap: 12 },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 14,
  },
  btnTextWrap: { flex: 1 },
  btnLabel: { fontSize: 16, fontWeight: "700", color: "#FFF" },
  btnHint: { fontSize: 13, color: "rgba(255,255,255,0.7)", marginTop: 2 },
});
