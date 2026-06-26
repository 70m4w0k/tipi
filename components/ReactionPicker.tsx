import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../lib/theme";

const EMOJIS = ["\u{1F44D}", "❤️", "\u{1F602}", "\u{1F62E}", "\u{1F525}", "\u{1F622}"];

type Props = {
  onSelectEmoji: (emoji: string) => void;
  onClose: () => void;
};

export default function ReactionPicker({ onSelectEmoji, onClose }: Props) {
  const t = useTheme();
  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={[styles.container, { backgroundColor: t.card }]}>
          {EMOJIS.map((emoji) => (
            <Pressable
              key={emoji}
              style={styles.emojiButton}
              onPress={() => {
                onSelectEmoji(emoji);
                onClose();
              }}
            >
              <Text style={styles.emoji}>{emoji}</Text>
            </Pressable>
          ))}
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 10,
    gap: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  emojiButton: {
    padding: 8,
    borderRadius: 8,
  },
  emoji: {
    fontSize: 28,
  },
});
