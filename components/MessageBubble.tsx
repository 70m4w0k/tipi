import { useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Message, Profile } from "../lib/types";
import { useTheme } from "../lib/theme";
import ReactionPicker from "./ReactionPicker";

type Props = {
  message: Message;
  currentUserId: string;
  profiles: Profile[];
  onReaction: (messageId: string, emoji: string) => void;
  onVote: (messageId: string, optionId: string) => void;
};

export default function MessageBubble({
  message,
  currentUserId,
  profiles,
  onReaction,
  onVote,
}: Props) {
  const [showPicker, setShowPicker] = useState(false);
  const t = useTheme();

  const author = profiles.find((p) => p.id === message.author_id);
  const isOwn = message.author_id === currentUserId;
  const time = new Date(message.sent_at).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const totalVotes =
    message.poll?.options.reduce((sum, o) => sum + o.votes.length, 0) ?? 0;

  return (
    <View style={[styles.wrapper, isOwn && styles.wrapperOwn]}>
      <Pressable
        style={[styles.card, { backgroundColor: t.card, borderColor: t.cardBorder }, isOwn && { backgroundColor: t.accentLight, borderColor: t.accent }]}
        onLongPress={() => setShowPicker(true)}
      >
        <View style={styles.header}>
          <Text style={[styles.authorName, { color: author?.color ?? t.textSecondary }]}>
            {author?.display_name ?? "Inconnu"}
          </Text>
          <Text style={[styles.time, { color: t.textMuted }]}>{time}</Text>
        </View>

        {message.type === "text" && message.content && (
          <Text style={[styles.contentText, { color: t.text }]}>{message.content}</Text>
        )}

        {message.type === "image" && message.content && (
          <Image
            source={{ uri: message.content }}
            style={styles.image}
            resizeMode="cover"
          />
        )}

        {message.type === "poll" && message.poll && (
          <View style={styles.pollContainer}>
            <Text style={[styles.pollQuestion, { color: t.text }]}>{message.poll.question}</Text>
            {message.poll.options.map((option) => {
              const pct =
                totalVotes > 0
                  ? Math.round((option.votes.length / totalVotes) * 100)
                  : 0;
              const hasVoted = option.votes.includes(currentUserId);

              return (
                <Pressable
                  key={option.id}
                  style={[styles.pollOption, { borderColor: t.cardBorder }, hasVoted && { borderColor: t.accent }]}
                  onPress={() => onVote(message.id, option.id)}
                >
                  <View style={styles.pollBarTrack}>
                    <View
                      style={[styles.pollBar, { flex: pct, maxWidth: "100%", backgroundColor: t.accentLight }]}
                    />
                    <View style={{ flex: 100 - pct }} />
                  </View>
                  <View style={styles.pollOptionContent}>
                    <Text
                      style={[
                        styles.pollOptionText,
                        { color: t.textSecondary },
                        hasVoted && { fontWeight: "700", color: t.accent },
                      ]}
                    >
                      {option.text}
                    </Text>
                    <Text style={[styles.pollPct, { color: t.textSecondary }]}>
                      {option.votes.length} ({pct}%)
                    </Text>
                  </View>
                </Pressable>
              );
            })}
            <Text style={[styles.pollTotal, { color: t.textMuted }]}>
              {totalVotes} vote{totalVotes !== 1 ? "s" : ""}
            </Text>
          </View>
        )}

        {Object.keys(message.reactions).length > 0 && (
          <View style={styles.reactionsRow}>
            {Object.entries(message.reactions).map(([emoji, users]) => (
              <Pressable
                key={emoji}
                style={[
                  styles.reactionBadge,
                  { backgroundColor: t.separator },
                  users.includes(currentUserId) && { backgroundColor: t.accentLight, borderWidth: 1, borderColor: t.accent },
                ]}
                onPress={() => onReaction(message.id, emoji)}
              >
                <Text style={styles.reactionEmoji}>{emoji}</Text>
                <Text style={[styles.reactionCount, { color: t.textSecondary }]}>{users.length}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </Pressable>

      {showPicker && (
        <ReactionPicker
          onSelectEmoji={(emoji) => onReaction(message.id, emoji)}
          onClose={() => setShowPicker(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    alignItems: "flex-start",
  },
  wrapperOwn: {
    alignItems: "flex-end",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
    maxWidth: "85%",
    minWidth: 120,
  },
  cardOwn: {
    backgroundColor: "#EEF2FF",
    borderColor: "#C7D2FE",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
    gap: 8,
  },
  authorName: {
    fontSize: 13,
    fontWeight: "700",
  },
  time: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  contentText: {
    fontSize: 15,
    color: "#111827",
    lineHeight: 21,
  },
  image: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    marginTop: 4,
  },
  pollContainer: {
    marginTop: 4,
    gap: 6,
  },
  pollQuestion: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  pollOption: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
    position: "relative",
    minHeight: 40,
    justifyContent: "center",
  },
  pollOptionVoted: {
    borderColor: "#1D4ED8",
  },
  pollBarTrack: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    right: 0,
    flexDirection: "row",
  },
  pollBar: {
    backgroundColor: "#DBEAFE",
    borderRadius: 7,
  },
  pollOptionContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    zIndex: 1,
  },
  pollOptionText: {
    fontSize: 14,
    color: "#374151",
    flex: 1,
  },
  pollOptionTextVoted: {
    fontWeight: "700",
    color: "#1D4ED8",
  },
  pollPct: {
    fontSize: 12,
    color: "#6B7280",
    marginLeft: 8,
  },
  pollTotal: {
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "right",
    marginTop: 2,
  },
  reactionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  reactionBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  reactionBadgeOwn: {
    backgroundColor: "#DBEAFE",
    borderWidth: 1,
    borderColor: "#93C5FD",
  },
  reactionEmoji: {
    fontSize: 14,
  },
  reactionCount: {
    fontSize: 12,
    color: "#374151",
    fontWeight: "600",
  },
});
