import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, AppStateStatus } from "react-native";
import { supabase } from "../supabase";
import { Message, MessageType, Poll } from "../types";

let channelCounter = 0;

export function useMessages(householdId: string | null | undefined) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const channelId = useRef(++channelCounter);

  const fetchMessages = useCallback(async () => {
    if (!householdId) {
      setMessages([]);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("household_id", householdId)
      .order("sent_at", { ascending: false });
    setMessages(data ?? []);
    setLoading(false);
  }, [householdId]);

  useEffect(() => {
    void fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    if (!householdId) return;

    const channel = supabase
      .channel(`messages:${householdId}:${channelId.current}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `household_id=eq.${householdId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [newMsg, ...prev];
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `household_id=eq.${householdId}`,
        },
        (payload) => {
          const updated = payload.new as Message;
          setMessages((prev) =>
            prev.map((m) => (m.id === updated.id ? updated : m))
          );
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      void supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [householdId]);

  useEffect(() => {
    const handleAppState = (state: AppStateStatus) => {
      if (state === "active" && householdId) {
        void fetchMessages();
      }
    };
    const sub = AppState.addEventListener("change", handleAppState);
    return () => sub.remove();
  }, [householdId, fetchMessages]);

  const sendMessage = useCallback(
    async (type: MessageType, content: string | null, poll?: Poll) => {
      if (!householdId) return;
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from("messages").insert({
        household_id: householdId,
        author_id: user.id,
        type,
        content,
        poll: poll ?? null,
        reactions: {},
      });
    },
    [householdId]
  );

  const addReaction = useCallback(
    async (messageId: string, emoji: string) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const msg = messages.find((m) => m.id === messageId);
      if (!msg) return;

      const reactions = { ...msg.reactions };
      const users = reactions[emoji] ? [...reactions[emoji]] : [];
      const idx = users.indexOf(user.id);
      if (idx >= 0) {
        users.splice(idx, 1);
      } else {
        users.push(user.id);
      }
      if (users.length > 0) {
        reactions[emoji] = users;
      } else {
        delete reactions[emoji];
      }

      await supabase
        .from("messages")
        .update({ reactions })
        .eq("id", messageId);
    },
    [messages]
  );

  const vote = useCallback(
    async (messageId: string, optionId: string) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const msg = messages.find((m) => m.id === messageId);
      if (!msg?.poll) return;

      const updatedPoll: Poll = {
        question: msg.poll.question,
        options: msg.poll.options.map((opt) => {
          const votesWithout = opt.votes.filter((v) => v !== user.id);
          return {
            ...opt,
            votes:
              opt.id === optionId
                ? [...votesWithout, user.id]
                : votesWithout,
          };
        }),
      };

      await supabase
        .from("messages")
        .update({ poll: updatedPoll })
        .eq("id", messageId);
    },
    [messages]
  );

  const markAsRead = useCallback(
    async (messageId: string) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from("message_reads").upsert(
        { message_id: messageId, user_id: user.id },
        { onConflict: "message_id,user_id" }
      );
    },
    []
  );

  return { messages, loading, sendMessage, addReaction, vote, markAsRead, fetchMessages };
}
