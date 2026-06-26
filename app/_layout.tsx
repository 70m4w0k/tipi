import { useEffect } from "react";
import { Slot } from "expo-router";
import { ActivityIndicator, Platform, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationBar } from "expo-navigation-bar";
import "react-native-url-polyfill/auto";
import { AuthProvider, useAuth } from "../lib/AuthContext";
import { ThemeProvider, useTheme } from "../lib/theme";
import { TimerProvider } from "../lib/timer-context";
import { OnboardingProvider } from "../lib/onboarding-context";
import { registerPWA } from "../lib/pwa";

function RootGate() {
  const { loading } = useAuth();
  const t = useTheme();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: t.background }}>
        <ActivityIndicator size="large" color={t.accent} />
      </View>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  useEffect(() => {
    registerPWA();
  }, []);

  return (
    <SafeAreaProvider>
      {Platform.OS === "android" && <NavigationBar style="dark" />}
      <ThemeProvider>
        <AuthProvider>
          <TimerProvider>
            <OnboardingProvider>
              <RootGate />
            </OnboardingProvider>
          </TimerProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
