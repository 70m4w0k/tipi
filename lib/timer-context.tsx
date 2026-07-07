import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { haptic } from "./haptics";
import { ConfirmDialog } from "../components/ConfirmDialog";

interface InstanceTimer {
  seconds: number;
  running: boolean;
}

interface TimerContextValue {
  timers: Record<string, InstanceTimer>;
  cookingInstanceId: string | null;
  startTimer: (instanceId: string, minutes: number) => void;
  stopTimer: (instanceId: string) => void;
  pauseResumeTimer: (instanceId: string) => void;
  openCookingMode: (instanceId: string) => void;
  closeCookingMode: () => void;
  formatTimer: (sec: number) => string;
}

const TimerContext = createContext<TimerContextValue | null>(null);

export function TimerProvider({ children }: { children: React.ReactNode }) {
  const [cookingInstanceId, setCookingInstanceId] = useState<string | null>(null);
  const [timers, setTimers] = useState<Record<string, InstanceTimer>>({});
  const [timerFinished, setTimerFinished] = useState(false);
  const intervalsRef = useRef<Record<string, ReturnType<typeof setInterval>>>({});

  const clearTimerInterval = useCallback((id: string) => {
    if (intervalsRef.current[id]) {
      clearInterval(intervalsRef.current[id]);
      delete intervalsRef.current[id];
    }
  }, []);

  const tickTimer = useCallback((id: string) => {
    clearTimerInterval(id);
    intervalsRef.current[id] = setInterval(() => {
      setTimers((prev) => {
        const t = prev[id];
        if (!t || !t.running) return prev;
        if (t.seconds <= 1) {
          clearTimerInterval(id);
          void haptic.success();
          setTimerFinished(true);
          const { [id]: _, ...rest } = prev;
          return rest;
        }
        return { ...prev, [id]: { ...t, seconds: t.seconds - 1 } };
      });
    }, 1000);
  }, [clearTimerInterval]);

  useEffect(() => {
    return () => {
      for (const id of Object.keys(intervalsRef.current)) {
        clearInterval(intervalsRef.current[id]);
      }
    };
  }, []);

  const startTimer = useCallback((instanceId: string, minutes: number) => {
    if (minutes <= 0) return;
    void haptic.medium();
    clearTimerInterval(instanceId);
    setTimers((prev) => ({ ...prev, [instanceId]: { seconds: minutes * 60, running: true } }));
    tickTimer(instanceId);
  }, [clearTimerInterval, tickTimer]);

  const stopTimer = useCallback((instanceId: string) => {
    clearTimerInterval(instanceId);
    setTimers((prev) => {
      const { [instanceId]: _, ...rest } = prev;
      return rest;
    });
  }, [clearTimerInterval]);

  const pauseResumeTimer = useCallback((instanceId: string) => {
    setTimers((prev) => {
      const t = prev[instanceId];
      if (!t) return prev;
      if (t.running) {
        clearTimerInterval(instanceId);
        return { ...prev, [instanceId]: { ...t, running: false } };
      } else {
        tickTimer(instanceId);
        return { ...prev, [instanceId]: { ...t, running: true } };
      }
    });
  }, [clearTimerInterval, tickTimer]);

  const formatTimer = useCallback((sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }, []);

  const openCookingMode = useCallback((instanceId: string) => {
    void haptic.medium();
    setCookingInstanceId(instanceId);
  }, []);

  const closeCookingMode = useCallback(() => {
    setCookingInstanceId(null);
  }, []);

  return (
    <TimerContext.Provider
      value={{
        timers,
        cookingInstanceId,
        startTimer,
        stopTimer,
        pauseResumeTimer,
        openCookingMode,
        closeCookingMode,
        formatTimer,
      }}
    >
      {children}
      <ConfirmDialog
        visible={timerFinished}
        title="Minuteur terminé !"
        message="Le temps est écoulé."
        confirmLabel="OK"
        hideCancel
        onConfirm={() => setTimerFinished(false)}
        onCancel={() => setTimerFinished(false)}
      />
    </TimerContext.Provider>
  );
}

export function useTimer() {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error("useTimer must be used inside TimerProvider");
  return ctx;
}
