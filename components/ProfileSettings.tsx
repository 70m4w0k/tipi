import { useState } from "react";
import {
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { supabase } from "../lib/supabase";
import { Profile, Household, PendingMember } from "../lib/types";
import { haptic } from "../lib/haptics";
import { useNavPreferences, ALL_TABS, NavTab } from "../lib/hooks/useNavPreferences";
import { useTheme, useThemeMode, ThemeMode } from "../lib/theme";
import { useOnboarding } from "../lib/onboarding-context";
import { COLOR_PRESETS } from "../lib/household-logic";

export function ProfileSettings({
  profile,
  household,
  members,
  isAdmin,
  onSignOut,
  onProfileUpdated,
  onRenameHousehold,
  onRegenerateCode,
  onKickMember,
  onPromoteMember,
  onDemoteMember,
  onDeleteHousehold,
  pendingMembers,
  onAddPendingMember,
  onRemovePendingMember,
}: {
  profile: Profile;
  household: Household | null;
  members: Profile[];
  isAdmin: boolean;
  onSignOut: () => void;
  onProfileUpdated: () => void;
  onRenameHousehold: (name: string) => Promise<{ error: any }>;
  onRegenerateCode: () => Promise<{ error: any }>;
  onKickMember: (id: string) => Promise<{ error: any }>;
  onPromoteMember: (id: string) => Promise<{ error: any }>;
  onDemoteMember: (id: string) => Promise<{ error: any }>;
  onDeleteHousehold: () => Promise<{ error: any }>;
  pendingMembers: PendingMember[];
  onAddPendingMember: (name: string) => Promise<{ error: any }>;
  onRemovePendingMember: (id: string) => Promise<{ error: any }>;
}) {
  const router = useRouter();
  const { enabledTabs, setTabs } = useNavPreferences();
  const t = useTheme();
  const { mode: themeMode, setMode: setThemeMode } = useThemeMode();
  const { resetOnboarding } = useOnboarding();
  const [displayName, setDisplayName] = useState(profile.display_name);
  const [selectedColor, setSelectedColor] = useState(profile.color);
  const [birthday, setBirthday] = useState(profile.birthday ?? "");
  const [saving, setSaving] = useState(false);
  const [editingHouseName, setEditingHouseName] = useState(false);
  const [houseName, setHouseName] = useState(household?.name ?? "");
  const [pendingName, setPendingName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [confirm, setConfirm] = useState<{ title: string; message: string; label: string; destructive?: boolean; onConfirm: () => void } | null>(null);

  const MAX_NAV_TABS = 4;
  const toggleNavTab = async (key: NavTab) => {
    if (enabledTabs.includes(key)) {
      if (enabledTabs.length <= 1) return;
      await setTabs(enabledTabs.filter((k) => k !== key));
    } else {
      if (enabledTabs.length >= MAX_NAV_TABS) {
        setErrorMsg(`Tu peux afficher ${MAX_NAV_TABS} pages maximum dans la barre de navigation.`);
        return;
      }
      await setTabs([...enabledTabs, key]);
    }
  };

  const hasChanges =
    displayName !== profile.display_name || selectedColor !== profile.color || birthday !== (profile.birthday ?? "");

  const handleSave = async () => {
    if (!displayName.trim()) {
      setErrorMsg("Le nom d'affichage ne peut pas être vide.");
      return;
    }
    setErrorMsg("");
    setSaving(true);
    const updates: Record<string, unknown> = { display_name: displayName.trim(), color: selectedColor };
    if (birthday.trim()) updates.birthday = birthday.trim();
    else updates.birthday = null;
    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", profile.id);
    if (error) {
      setErrorMsg(error.message);
    } else {
      onProfileUpdated();
    }
    setSaving(false);
  };

  const handleLeaveHousehold = () => {
    void haptic.heavy();
    setConfirm({
      title: "Quitter la coloc ?",
      message: "Tu devras rejoindre une coloc avec un code d'invitation pour utiliser l'app.",
      label: "Quitter",
      destructive: true,
      onConfirm: async () => {
        await supabase.from("profiles").update({ household_id: null }).eq("id", profile.id);
        onProfileUpdated();
        router.replace("/");
      },
    });
  };

  const handleRename = async () => {
    if (!houseName.trim()) return;
    const { error } = await onRenameHousehold(houseName);
    if (error) setErrorMsg(error.message);
    setEditingHouseName(false);
  };

  const handleRegenerateCode = () => {
    setConfirm({
      title: "Régénérer le code ?",
      message: "L'ancien code ne fonctionnera plus. Les membres actuels ne sont pas affectés.",
      label: "Régénérer",
      onConfirm: async () => {
        const { error } = await onRegenerateCode();
        if (error) setErrorMsg(error.message);
      },
    });
  };

  const handleKick = (member: Profile) => {
    setConfirm({
      title: "Exclure ce membre ?",
      message: `${member.display_name} ne pourra plus accéder à la coloc. Son historique sera conservé.`,
      label: "Exclure",
      destructive: true,
      onConfirm: async () => {
        const { error } = await onKickMember(member.id);
        if (error) setErrorMsg(error.message);
      },
    });
  };

  const handlePromote = (member: Profile) => {
    setConfirm({
      title: "Promouvoir admin ?",
      message: `${member.display_name} pourra gérer la coloc (renommer, exclure, etc.)`,
      label: "Promouvoir",
      onConfirm: async () => {
        const { error } = await onPromoteMember(member.id);
        if (error) setErrorMsg(error.message);
      },
    });
  };

  const handleDemote = (member: Profile) => {
    setConfirm({
      title: "Rétrograder ?",
      message: `${member.display_name} ne pourra plus gérer la coloc.`,
      label: "Rétrograder",
      destructive: true,
      onConfirm: async () => {
        const { error } = await onDemoteMember(member.id);
        if (error) setErrorMsg(error.message);
      },
    });
  };

  const handleDeleteHousehold = () => {
    setConfirm({
      title: "Supprimer la coloc ?",
      message: "Tous les membres seront déconnectés. Cette action est irréversible.",
      label: "Supprimer",
      destructive: true,
      onConfirm: async () => {
        const { error } = await onDeleteHousehold();
        if (error) setErrorMsg(error.message);
        else router.replace("/");
      },
    });
  };

  return (
    <>
    <ScrollView contentContainerStyle={styles.container}>
      {!!errorMsg && (
        <Pressable
          style={[styles.errorBanner, { backgroundColor: t.dangerLight, borderColor: t.danger }]}
          onPress={() => setErrorMsg("")}
        >
          <Ionicons name="alert-circle" size={18} color={t.danger} />
          <Text style={[styles.errorText, { color: t.danger }]}>{errorMsg}</Text>
          <Ionicons name="close" size={16} color={t.danger} />
        </Pressable>
      )}
      <Text style={[styles.sectionTitle, { color: t.text }]}>Profil</Text>

      <View style={[styles.card, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
        <Text style={[styles.label, { color: t.text }]}>Email</Text>
        <Text style={[styles.value, { color: t.textSecondary }]}>{profile.email}</Text>

        <Text style={[styles.label, { color: t.text }]}>Nom d'affichage</Text>
        <TextInput
          style={[styles.input, { borderColor: t.inputBorder, backgroundColor: t.inputBg, color: t.text }]}
          value={displayName}
          onChangeText={setDisplayName}
        />

        <Text style={[styles.label, { color: t.text }]}>Date de naissance</Text>
        <TextInput
          style={[styles.input, { borderColor: t.inputBorder, backgroundColor: t.inputBg, color: t.text }]}
          placeholder="AAAA-MM-JJ"
          placeholderTextColor={t.textMuted}
          value={birthday}
          onChangeText={setBirthday}
        />

        <Text style={[styles.label, { color: t.text }]}>Couleur</Text>
        <View style={styles.colorRow}>
          {COLOR_PRESETS.map((color) => {
            const takenBy = members.find((m) => m.id !== profile.id && m.color === color);
            return (
              <Pressable
                key={color}
                style={[
                  styles.colorSwatch,
                  { backgroundColor: color },
                  selectedColor === color && styles.colorSwatchSelected,
                  !!takenBy && styles.colorSwatchTaken,
                ]}
                onPress={() => {
                  if (takenBy) return;
                  void haptic.light();
                  setSelectedColor(color);
                }}
              >
                {!!takenBy && (
                  <Ionicons name="ban-outline" size={18} color="#FFFFFF" />
                )}
              </Pressable>
            );
          })}
        </View>

        {hasChanges && (
          <Pressable
            style={[styles.button, { backgroundColor: t.accent }, saving && styles.buttonDisabled]}
            onPress={() => void handleSave()}
            disabled={saving}
          >
            <Text style={styles.buttonText}>Enregistrer</Text>
          </Pressable>
        )}
      </View>

      {household && (
        <>
          <Text style={[styles.sectionTitle, { color: t.text }]}>Coloc</Text>
          <View style={[styles.card, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
            <Text style={[styles.label, { color: t.text }]}>Nom</Text>
            {editingHouseName && isAdmin ? (
              <View style={styles.inlineEdit}>
                <TextInput
                  style={[styles.input, { flex: 1, borderColor: t.inputBorder, backgroundColor: t.inputBg, color: t.text }]}
                  value={houseName}
                  onChangeText={setHouseName}
                  autoFocus
                />
                <Pressable style={styles.inlineBtn} onPress={() => void handleRename()}>
                  <Ionicons name="checkmark" size={20} color="#10B981" />
                </Pressable>
                <Pressable style={styles.inlineBtn} onPress={() => { setEditingHouseName(false); setHouseName(household.name); }}>
                  <Ionicons name="close" size={20} color="#9CA3AF" />
                </Pressable>
              </View>
            ) : (
              <Pressable
                style={styles.editableRow}
                onPress={() => isAdmin && setEditingHouseName(true)}
                disabled={!isAdmin}
              >
                <Text style={[styles.value, { color: t.textSecondary }]}>{household.name}</Text>
                {isAdmin && <Ionicons name="pencil" size={16} color="#9CA3AF" />}
              </Pressable>
            )}

            <Text style={[styles.label, { color: t.text }]}>Code d'invitation</Text>
            <View style={styles.codeRow}>
              <Text style={[styles.codeDisplay, { color: t.accent }]}>{household.invite_code}</Text>
              {isAdmin && (
                <Pressable style={styles.inlineBtn} onPress={handleRegenerateCode}>
                  <Ionicons name="refresh" size={20} color="#1D4ED8" />
                </Pressable>
              )}
            </View>
            <Pressable
              style={[styles.shareButton, { backgroundColor: t.accent }]}
              onPress={async () => {
                if (!household) return;
                const inviteLink = `https://tipi-tau.vercel.app/invite?code=${household.invite_code}`;
                const installLink = "https://tipi-tau.vercel.app/install";
                await Share.share({
                  message: `Rejoins notre coloc "${household.name}" sur Tipi !\n\n👉 ${inviteLink}\n\n📲 Installer l'app : ${installLink}`,
                });
              }}
            >
              <Ionicons name="share-outline" size={18} color="#FFFFFF" />
              <Text style={styles.shareButtonText}>Inviter mes colocs</Text>
            </Pressable>

            <Pressable
              style={[styles.button, styles.buttonDanger]}
              onPress={handleLeaveHousehold}
            >
              <Text style={styles.buttonText}>Quitter la coloc</Text>
            </Pressable>
          </View>

          {/* Members list */}
          <Text style={[styles.sectionTitle, { color: t.text }]}>Membres</Text>
          <View style={[styles.card, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
            {members.map((m) => (
              <View key={m.id} style={[styles.memberRow, { borderBottomColor: t.separator }]}>
                <View style={[styles.memberAvatar, { backgroundColor: m.color }]}>
                  <Text style={styles.memberAvatarText}>
                    {m.display_name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.memberName, { color: t.text }]}>
                    {m.display_name}
                    {m.id === profile.id ? " (toi)" : ""}
                  </Text>
                  <Text style={[styles.memberRole, { color: t.textMuted }]}>
                    {m.role === "admin" ? "Admin" : "Membre"}
                  </Text>
                </View>
                {isAdmin && m.id !== profile.id && (
                  <View style={styles.memberActions}>
                    {m.role === "member" ? (
                      <Pressable style={styles.memberActionBtn} onPress={() => handlePromote(m)}>
                        <Ionicons name="arrow-up-circle-outline" size={22} color="#1D4ED8" />
                      </Pressable>
                    ) : (
                      <Pressable style={styles.memberActionBtn} onPress={() => handleDemote(m)}>
                        <Ionicons name="arrow-down-circle-outline" size={22} color="#F59E0B" />
                      </Pressable>
                    )}
                    <Pressable style={styles.memberActionBtn} onPress={() => handleKick(m)}>
                      <Ionicons name="person-remove-outline" size={20} color="#EF4444" />
                    </Pressable>
                  </View>
                )}
              </View>
            ))}
          </View>

          {/* Pending members (admin) */}
          {isAdmin && (
            <>
              <Text style={[styles.sectionTitle, { color: t.text }]}>Membres en attente</Text>
              <View style={[styles.card, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
                <Text style={[styles.hint, { color: t.textSecondary }]}>
                  Pré-ajoute des membres pour qu'ils puissent s'identifier en rejoignant la coloc.
                </Text>
                {pendingMembers.map((pm) => (
                  <View key={pm.id} style={[styles.memberRow, { borderBottomColor: t.separator }]}>
                    <View style={[styles.memberAvatar, { backgroundColor: t.textMuted }]}>
                      <Ionicons name="time-outline" size={16} color="#FFF" />
                    </View>
                    <Text style={[styles.memberName, { color: t.text, flex: 1 }]}>{pm.display_name}</Text>
                    <Pressable
                      style={styles.memberActionBtn}
                      onPress={async () => {
                        void haptic.light();
                        await onRemovePendingMember(pm.id);
                      }}
                    >
                      <Ionicons name="close-circle-outline" size={22} color={t.danger} />
                    </Pressable>
                  </View>
                ))}
                <View style={styles.pendingAddRow}>
                  <TextInput
                    style={[styles.input, { borderColor: t.inputBorder, backgroundColor: t.inputBg, color: t.text, flex: 1 }]}
                    placeholder="Nom du membre"
                    placeholderTextColor={t.textMuted}
                    value={pendingName}
                    onChangeText={setPendingName}
                  />
                  <Pressable
                    style={[styles.pendingAddBtn, { backgroundColor: t.accent, opacity: pendingName.trim() ? 1 : 0.4 }]}
                    onPress={async () => {
                      if (!pendingName.trim()) return;
                      void haptic.light();
                      await onAddPendingMember(pendingName.trim());
                      setPendingName("");
                    }}
                    disabled={!pendingName.trim()}
                  >
                    <Ionicons name="add" size={22} color="#FFF" />
                  </Pressable>
                </View>
              </View>
            </>
          )}

          {/* Admin danger zone */}
          {isAdmin && (
            <>
              <Text style={[styles.sectionTitle, { color: t.text }]}>Zone dangereuse</Text>
              <View style={[styles.card, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
                <Text style={[styles.hint, { color: t.textSecondary }]}>
                  Supprimer la coloc déconnectera tous les membres. Cette action est irréversible.
                </Text>
                <Pressable
                  style={[styles.button, styles.buttonDanger]}
                  onPress={handleDeleteHousehold}
                >
                  <Text style={styles.buttonText}>Supprimer la coloc</Text>
                </Pressable>
              </View>
            </>
          )}
        </>
      )}

      <Text style={[styles.sectionTitle, { color: t.text }]}>Apparence</Text>
      <View style={[styles.card, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
        {(["system", "light", "dark"] as ThemeMode[]).map((m) => {
          const selected = themeMode === m;
          const label = m === "system" ? "Automatique" : m === "light" ? "Clair" : "Sombre";
          const icon = m === "system" ? "phone-portrait-outline" : m === "light" ? "sunny-outline" : "moon-outline";
          return (
            <Pressable
              key={m}
              style={[styles.navConfigItem, { borderBottomColor: t.separator }]}
              onPress={() => setThemeMode(m)}
            >
              <Ionicons name={icon as any} size={20} color={selected ? t.accent : t.textMuted} />
              <Text style={[styles.navConfigLabel, { color: t.textSecondary }, selected && { color: t.text, fontWeight: "600" }]}>
                {label}
              </Text>
              <Ionicons
                name={selected ? "checkbox" : "square-outline"}
                size={22}
                color={selected ? t.accent : t.textMuted}
              />
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.sectionTitle, { color: t.text }]}>Barre de navigation</Text>
      <View style={[styles.card, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
        <Text style={[styles.hint, { color: t.textSecondary }]}>
          Choisis jusqu'à {MAX_NAV_TABS} pages à afficher dans la barre du bas. Redémarre l'app pour appliquer.
        </Text>
        {ALL_TABS.filter((tab) => tab.key !== "home").map((tab) => {
          const isEnabled = enabledTabs.includes(tab.key);
          return (
            <Pressable
              key={tab.key}
              style={[styles.navConfigItem, { borderBottomColor: t.separator }]}
              onPress={() => void toggleNavTab(tab.key)}
            >
              <Ionicons name={tab.icon as any} size={20} color={isEnabled ? t.accent : t.textMuted} />
              <Text style={[styles.navConfigLabel, { color: t.textSecondary }, isEnabled && { color: t.text, fontWeight: "600" }]}>
                {tab.label}
              </Text>
              <Ionicons
                name={isEnabled ? "checkbox" : "square-outline"}
                size={22}
                color={isEnabled ? t.accent : t.textMuted}
              />
            </Pressable>
          );
        })}
      </View>

      <Pressable
        style={[styles.tutorialButton, { backgroundColor: t.card, borderColor: t.cardBorder }]}
        onPress={() => { void haptic.light(); resetOnboarding(); }}
      >
        <Ionicons name="help-circle-outline" size={20} color={t.accent} />
        <Text style={[styles.tutorialButtonText, { color: t.accent }]}>Revoir le tutoriel</Text>
      </Pressable>

      <Pressable
        style={[styles.tutorialButton, { borderColor: t.accent }]}
        onPress={() => {
          void Linking.openURL("https://expo.dev/accounts/tomawok/projects/tipi/builds");
        }}
      >
        <Ionicons name="download-outline" size={20} color={t.accent} />
        <Text style={[styles.tutorialButtonText, { color: t.accent }]}>Vérifier les mises à jour</Text>
      </Pressable>

      <Pressable style={styles.logoutButton} onPress={onSignOut}>
        <Text style={[styles.logoutText, { color: t.danger }]}>Se déconnecter</Text>
      </Pressable>
    </ScrollView>

    <Modal visible={!!confirm} transparent animationType="fade">
      <Pressable style={styles.modalOverlay} onPress={() => setConfirm(null)}>
        <Pressable style={[styles.modalContent, { backgroundColor: t.card }]} onPress={() => {}}>
          <Text style={[styles.modalTitle, { color: t.text }]}>{confirm?.title}</Text>
          <Text style={[styles.modalMessage, { color: t.textSecondary }]}>{confirm?.message}</Text>
          <View style={styles.modalBtnRow}>
            <Pressable style={[styles.modalCancelBtn, { backgroundColor: t.separator }]} onPress={() => setConfirm(null)}>
              <Text style={[styles.modalCancelText, { color: t.textSecondary }]}>Annuler</Text>
            </Pressable>
            <Pressable
              style={[styles.modalConfirmBtn, { backgroundColor: confirm?.destructive ? t.danger : t.accent }]}
              onPress={() => { confirm?.onConfirm(); setConfirm(null); }}
            >
              <Text style={styles.modalConfirmText}>{confirm?.label}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40, gap: 12 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  label: { fontWeight: "600", color: "#374151", fontSize: 13 },
  value: { color: "#6B7280", fontSize: 15, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    fontSize: 15,
  },
  colorRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingVertical: 4,
  },
  colorSwatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  colorSwatchSelected: {
    borderColor: "#111827",
    borderWidth: 3,
  },
  colorSwatchTaken: {
    opacity: 0.5,
  },
  button: {
    backgroundColor: "#1D4ED8",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 4,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#FFFFFF", fontWeight: "700", fontSize: 15 },
  buttonDanger: { backgroundColor: "#EF4444" },
  codeDisplay: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1D4ED8",
    letterSpacing: 4,
    textAlign: "center",
    paddingVertical: 8,
  },
  codeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  hint: { fontSize: 12, textAlign: "center" },
  shareButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 4,
  },
  shareButtonText: { color: "#FFFFFF", fontWeight: "700", fontSize: 15 },
  inlineEdit: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  inlineBtn: {
    padding: 6,
  },
  editableRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  memberAvatarText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 16,
  },
  memberName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  memberRole: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  memberActions: {
    flexDirection: "row",
    gap: 4,
  },
  memberActionBtn: {
    padding: 6,
  },
  pendingAddRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    marginTop: 8,
  },
  pendingAddBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  navConfigItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  navConfigLabel: { fontSize: 15, color: "#6B7280", flex: 1 },
  navConfigLabelActive: { color: "#111827", fontWeight: "600" },
  tutorialButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 12,
    marginTop: 4,
  },
  tutorialButtonText: { fontWeight: "600", fontSize: 15 },
  logoutButton: {
    alignItems: "center",
    paddingVertical: 16,
    marginTop: 8,
  },
  logoutText: { color: "#EF4444", fontWeight: "600", fontSize: 15 },
  errorBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderWidth: 1, borderRadius: 10, padding: 12,
  },
  errorText: { flex: 1, fontSize: 14, fontWeight: "500" },
  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center", alignItems: "center", padding: 24,
  },
  modalContent: {
    borderRadius: 16, padding: 20, width: "100%", maxWidth: 340,
  },
  modalTitle: { fontSize: 17, fontWeight: "700", marginBottom: 8 },
  modalMessage: { fontSize: 14, lineHeight: 20, marginBottom: 20 },
  modalBtnRow: { flexDirection: "row", gap: 10 },
  modalCancelBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: "center",
  },
  modalCancelText: { fontWeight: "600", fontSize: 15 },
  modalConfirmBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: "center",
  },
  modalConfirmText: { fontWeight: "600", color: "#FFFFFF", fontSize: 15 },
});
