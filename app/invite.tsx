import { Redirect, useLocalSearchParams } from "expo-router";

export default function InviteRedirect() {
  const { code } = useLocalSearchParams<{ code: string }>();
  return <Redirect href={`/(auth)/join?code=${code ?? ""}`} />;
}
