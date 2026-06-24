import { Slot } from "expo-router";
import { ActivityIndicator, Platform, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationBar } from "expo-navigation-bar";
import "react-native-url-polyfill/auto";
import { AuthProvider, useAuth } from "../lib/AuthContext";

function RootGate() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      {Platform.OS === "android" && <NavigationBar style="dark" />}
      <AuthProvider>
        <RootGate />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
