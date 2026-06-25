import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "onboarding_done";

interface OnboardingContextValue {
  showOnboarding: boolean;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
}

const OnboardingContext = createContext<OnboardingContextValue>({
  showOnboarding: false,
  completeOnboarding: () => {},
  resetOnboarding: () => {},
});

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((val) => {
      setShowOnboarding(val !== "true");
      setLoaded(true);
    });
  }, []);

  const completeOnboarding = useCallback(() => {
    setShowOnboarding(false);
    void AsyncStorage.setItem(STORAGE_KEY, "true");
  }, []);

  const resetOnboarding = useCallback(() => {
    setShowOnboarding(true);
    void AsyncStorage.removeItem(STORAGE_KEY);
  }, []);

  if (!loaded) return null;

  return (
    <OnboardingContext.Provider value={{ showOnboarding, completeOnboarding, resetOnboarding }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  return useContext(OnboardingContext);
}
