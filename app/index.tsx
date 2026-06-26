import { Redirect } from "expo-router";
import { useAuth } from "../lib/hooks/useAuth";

export default function Index() {
  const { session, profile, loading } = useAuth();

  if (loading) return null;
  if (!session) return <Redirect href="/(auth)/login" />;
  if (!profile?.household_id) return <Redirect href="/(auth)/join" />;
  return <Redirect href="/(app)/home" />;
}
