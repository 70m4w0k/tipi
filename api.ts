import { ChatMessage } from "./types";
import Constants from "expo-constants";
import { Platform } from "react-native";

function buildApiBase() {
  const fromEnv = process.env.EXPO_PUBLIC_CHAT_API_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/+$/, "");
  }

  if (Platform.OS === "web" && typeof window !== "undefined") {
    return `${window.location.origin}/api/chat`;
  }

  const anyConstants = Constants as unknown as {
    expoConfig?: { hostUri?: string };
    manifest?: { debuggerHost?: string };
    manifest2?: { extra?: { expoGo?: { debuggerHost?: string } } };
  };

  const hostUri =
    anyConstants.expoConfig?.hostUri ??
    anyConstants.manifest2?.extra?.expoGo?.debuggerHost ??
    anyConstants.manifest?.debuggerHost;

  const host = hostUri?.split(":")[0];
  if (host) {
    return `http://${host}:3000/api/chat`;
  }

  return "http://127.0.0.1:3000/api/chat";
}

const API_BASE = buildApiBase();

export const chatApi = {
  async getMessages(): Promise<ChatMessage[]> {
    try {
      const res = await fetch(`${API_BASE}/messages`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data.messages || [];
    } catch (err) {
      console.error("Erreur getMessages:", err);
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
      const res = await fetch(`${API_BASE}/send`, {
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
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data.message;
    } catch (err) {
      console.error("Erreur sendMessage:", err);
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
