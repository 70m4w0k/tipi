import { ChatMessage } from "./types";
import Constants from "expo-constants";
import { Platform } from "react-native";

function buildApiBase() {
  // Priority 1: Check environment variable
  const fromEnv = process.env.EXPO_PUBLIC_CHAT_API_URL?.trim();
  if (fromEnv) {
    const url = fromEnv.replace(/\/+$/, "");
    console.log("[API] Using EXPO_PUBLIC_CHAT_API_URL:", url);
    return url;
  }

  // Priority 2: Web - use same origin
  if (Platform.OS === "web" && typeof window !== "undefined") {
    const url = `${window.location.origin}/api/chat`;
    console.log("[API] Using web origin:", url);
    return url;
  }

  // Priority 3: Android emulator special handling
  if (Platform.OS === "android") {
    const emuUrl = "http://10.0.2.2:3000/api/chat";
    console.log("[API] Trying Android emulator address:", emuUrl);
    return emuUrl;
  }

  // Priority 4: Try to extract host from Expo Constants
  try {
    const anyConstants = Constants as unknown as {
      expoConfig?: { hostUri?: string };
      manifest?: { debuggerHost?: string };
      manifest2?: { extra?: { expoGo?: { debuggerHost?: string } } };
    };

    const hostUri =
      anyConstants.expoConfig?.hostUri ??
      anyConstants.manifest2?.extra?.expoGo?.debuggerHost ??
      anyConstants.manifest?.debuggerHost;

    if (hostUri) {
      const host = hostUri.split(":")[0];
      const url = `http://${host}:3000/api/chat`;
      console.log("[API] Using Expo hostUri:", url);
      return url;
    }
  } catch (e) {
    console.warn("[API] Error reading Constants:", e);
  }

  // Fallback: localhost
  const fallback = "http://127.0.0.1:3000/api/chat";
  console.log("[API] Using fallback localhost:", fallback);
  return fallback;
}

const API_BASE = buildApiBase();
console.log("[API] Final API_BASE:", API_BASE);

export const chatApi = {
  async getMessages(): Promise<ChatMessage[]> {
    try {
      const url = `${API_BASE}/messages`;
      console.log("[getMessages] Fetching from:", url);
      const res = await fetch(url, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const text = await res.text();
        console.error(
          `[getMessages] HTTP ${res.status}:`,
          text.substring(0, 200),
        );
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      console.log(
        "[getMessages] Success, received",
        data.messages?.length ?? 0,
        "messages",
      );
      return data.messages || [];
    } catch (err) {
      console.error("[getMessages] Error:", err);
      return [];
    }
  },

  async sendMessage(
    author: string,
    type: "text" | "image" | "poll",
    content: string,
    poll?: {
      question: string;
      options: Array<{ id: string; text: string; votes: string[] }>;
    },
  ): Promise<ChatMessage | null> {
    try {
      const url = `${API_BASE}/send`;
      console.log("[sendMessage] POSTing to:", url);
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: `${Date.now()}`,
          author,
          type,
          content,
          poll: poll || null,
          sentAt: new Date().toISOString(),
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        console.error(
          `[sendMessage] HTTP ${res.status}:`,
          text.substring(0, 200),
        );
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      console.log("[sendMessage] Success");
      return data.message;
    } catch (err) {
      console.error("[sendMessage] Error:", err);
      return null;
    }
  },

  async addReaction(
    messageId: string,
    emoji: string,
    userName: string,
  ): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/${messageId}/reaction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji, userName }),
      });
      return res.ok;
    } catch (err) {
      console.error("Erreur addReaction:", err);
      return false;
    }
  },

  async vote(
    messageId: string,
    optionId: string,
    userName: string,
  ): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/${messageId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optionId, userName }),
      });
      return res.ok;
    } catch (err) {
      console.error("Erreur vote:", err);
      return false;
    }
  },

  async markAsRead(messageId: string, userName: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/${messageId}/read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userName }),
      });
      return res.ok;
    } catch (err) {
      console.error("Erreur markAsRead:", err);
      return false;
    }
  },
};
