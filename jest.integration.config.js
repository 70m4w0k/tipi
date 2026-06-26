module.exports = {
  preset: "jest-expo",
  testMatch: ["**/__tests__/integration/**/*.test.{ts,tsx}"],
  setupFiles: ["./__tests__/integration/setup.ts"],
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|@supabase/.*)",
  ],
  testTimeout: 20000,
};
