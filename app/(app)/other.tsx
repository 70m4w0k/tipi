import { SafeAreaView } from "react-native-safe-area-context";
import { StyleSheet } from "react-native";
import { useAuth } from "../../lib/hooks/useAuth";
import { useHousehold } from "../../lib/hooks/useHousehold";
import { ProfileSettings } from "../../components/ProfileSettings";

export default function ProfileScreen() {
  const { profile, signOut, refreshProfile } = useAuth();
  const {
    household, members, isAdmin,
    renameHousehold, regenerateInviteCode,
    kickMember, promoteMember, demoteMember, deleteHousehold,
  } = useHousehold(profile);

  if (!profile) return null;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ProfileSettings
        profile={profile}
        household={household}
        members={members}
        isAdmin={isAdmin}
        onSignOut={signOut}
        onProfileUpdated={refreshProfile}
        onRenameHousehold={renameHousehold}
        onRegenerateCode={regenerateInviteCode}
        onKickMember={kickMember}
        onPromoteMember={promoteMember}
        onDemoteMember={demoteMember}
        onDeleteHousehold={deleteHousehold}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F6FA" },
});
