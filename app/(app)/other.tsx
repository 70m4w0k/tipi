import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../lib/hooks/useAuth";
import { useHousehold } from "../../lib/hooks/useHousehold";
import { useTheme } from "../../lib/theme";
import { ProfileSettings } from "../../components/ProfileSettings";

export default function ProfileScreen() {
  const { profile, signOut, refreshProfile } = useAuth();
  const {
    household, members, pendingMembers, isAdmin,
    renameHousehold, regenerateInviteCode,
    kickMember, promoteMember, demoteMember, deleteHousehold,
    addPendingMember, removePendingMember,
    refreshHousehold,
  } = useHousehold(profile);
  const t = useTheme();

  if (!profile) return null;

  const handleProfileUpdated = async () => {
    await refreshProfile();
    await refreshHousehold();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} edges={["top"]}>
      <ProfileSettings
        profile={profile}
        household={household}
        members={members}
        isAdmin={isAdmin}
        onSignOut={signOut}
        onProfileUpdated={handleProfileUpdated}
        onRenameHousehold={renameHousehold}
        onRegenerateCode={regenerateInviteCode}
        onKickMember={kickMember}
        onPromoteMember={promoteMember}
        onDemoteMember={demoteMember}
        onDeleteHousehold={deleteHousehold}
        pendingMembers={pendingMembers}
        onAddPendingMember={addPendingMember}
        onRemovePendingMember={removePendingMember}
      />
    </SafeAreaView>
  );
}
