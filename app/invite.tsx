import { useEffect } from "react";
import { Redirect, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../lib/hooks/useAuth";

const PENDING_CODE_KEY = "tipi_pending_invite_code";

export function savePendingInviteCode(code: string) {
  return AsyncStorage.setItem(PENDING_CODE_KEY, code);
}

export function getPendingInviteCode() {
  return AsyncStorage.getItem(PENDING_CODE_KEY);
}

export function clearPendingInviteCode() {
  return AsyncStorage.removeItem(PENDING_CODE_KEY);
}

export default function InviteRedirect() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const { session, profile } = useAuth();

  useEffect(() => {
    if (code) void savePendingInviteCode(code);
  }, [code]);

  if (session && profile && !profile.household_id) {
    return <Redirect href={`/(auth)/join?code=${code ?? ""}`} />;
  }

  return <Redirect href={`/(auth)/login?code=${code ?? ""}`} />;
}
