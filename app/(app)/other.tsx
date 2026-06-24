import { SafeAreaView } from "react-native-safe-area-context";
import { StyleSheet } from "react-native";
import { useAuth } from "../../lib/hooks/useAuth";
import { useHousehold } from "../../lib/hooks/useHousehold";
import { ProfileSettings } from "../../components/ProfileSettings";

export default function ProfileScreen() {
  const { profile, signOut, refreshProfile } = useAuth();
  const { household } = useHousehold(profile);

  if (!profile) return null;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ProfileSettings
        profile={profile}
        household={household}
        onSignOut={signOut}
        onProfileUpdated={refreshProfile}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F6FA" },
});
