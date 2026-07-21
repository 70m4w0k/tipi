import { useEffect } from "react";
import { Platform } from "react-native";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";

const TAG = "tipi-exercise-tool";

/**
 * Garde l'écran allumé tant que le composant est monté, en ignorant le web
 * (l'API Wake Lock du navigateur lève « wake lock has not activated yet » lors
 * d'un démontage rapide — inutile hors mobile de toute façon).
 */
export function useKeepAwakeSafe(): void {
  useEffect(() => {
    if (Platform.OS === "web") return;
    void activateKeepAwakeAsync(TAG).catch(() => {});
    return () => { void deactivateKeepAwake(TAG).catch(() => {}); };
  }, []);
}
