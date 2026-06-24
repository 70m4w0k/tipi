import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../lib/hooks/useAuth";
import { useHousehold } from "../../lib/hooks/useHousehold";
import { useTheme } from "../../lib/theme";
import { ProfileSettings } from "../../components/ProfileSettings";

export default function ProfileScreen() {
  const { profile, signOut, refreshProfile } = useAuth();
  const {
    household, members, isAdmin,
    renameHousehold, regenerateInviteCode,
    kickMember, promoteMember, demoteMember, deleteHousehold,
  } = useHousehold(profile);
  const t = useTheme();

  if (!profile) return null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} edges={["top"]}>
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
