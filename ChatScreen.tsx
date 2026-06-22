import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { ChatMessage } from "./types";
import { chatApi } from "./api";

const EMOJIS = ["👍", "❤️", "😂", "😮", "🔥", "😢"];

export function ChatScreen({
  currentUser,
  onClose,
}: {
  currentUser: string;
  onClose?: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [inputText, setInputText] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [pollInput, setPollInput] = useState("");
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
  const [showPollModal, setShowPollModal] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(
    null,
  );
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch messages toutes les 2s
  useEffect(() => {
    const fetchMessages = async () => {
      const msgs = await chatApi.getMessages();
      setMessages(
        msgs.sort(
          (a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime(),
        ),
      );

      // Marquer comme lu
      for (const msg of msgs) {
        if (!msg.readBy.includes(currentUser)) {
          void chatApi.markAsRead(msg.id, currentUser);
        }
      }
    };

    void fetchMessages();
    pollIntervalRef.current = setInterval(fetchMessages, 2000);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [currentUser]);

  const sendTextMessage = async () => {
    const text = inputText.trim();
    if (!text) return;

    setLoading(true);
    const result = await chatApi.sendMessage(currentUser, "text", text);
    if (result) {
      setMessages((prev) => [result, ...prev]);
      setInputText("");
    } else {
      Alert.alert(
        "Erreur",
        "Message non envoyé. Vérifiez la connexion au serveur.",
      );
    }
    setLoading(false);
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        setSelectedImage(uri);
      }
    } catch (err) {
      Alert.alert("Erreur", "Impossible de sélectionner l'image.");
    }
  };

  const sendImageMessage = async () => {
    if (!selectedImage) return;

    setLoading(true);
    const result = await chatApi.sendMessage(
      currentUser,
      "image",
      selectedImage,
    );
    if (result) {
      setMessages((prev) => [result, ...prev]);
      setSelectedImage(null);
    } else {
      Alert.alert("Erreur", "Image non envoyée.");
    }
    setLoading(false);
  };

  const createPoll = async () => {
    const validOptions = pollOptions.filter((opt) => opt.trim());
    if (!pollInput.trim() || validOptions.length < 2) {
      Alert.alert(
        "Sondage invalide",
        "Ajoute une question et au moins 2 options.",
      );
      return;
    }

    setLoading(true);
    const poll = {
      question: pollInput,
      options: validOptions.map((text) => ({
        id: `${Date.now()}-${Math.random()}`,
        text,
        votes: [],
      })),
    };

    const result = await chatApi.sendMessage(
      currentUser,
      "poll",
      JSON.stringify(poll),
      poll,
    );
    if (result) {
      setMessages((prev) => [result, ...prev]);
      setPollInput("");
      setPollOptions(["", ""]);
      setShowPollModal(false);
    } else {
      Alert.alert("Erreur", "Sondage non créé.");
    }
    setLoading(false);
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    await chatApi.addReaction(messageId, emoji, currentUser);
    setShowReactionPicker(null);

    // Refresh messages
    const msgs = await chatApi.getMessages();
    setMessages(
      msgs.sort(
        (a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime(),
      ),
    );
  };

  const handleVote = async (messageId: string, optionId: string) => {
    await chatApi.vote(messageId, optionId, currentUser);

    // Refresh messages
    const msgs = await chatApi.getMessages();
    setMessages(
      msgs.sort(
        (a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime(),
      ),
    );
  };

  return (
    <View style={styles.container}>
      {showPollModal && (
        <View style={styles.modal}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Créer un sondage</Text>
            <TextInput
              style={styles.input}
              placeholder="Question..."
              value={pollInput}
              onChangeText={setPollInput}
            />
            {pollOptions.map((opt, idx) => (
              <TextInput
                key={idx}
                style={styles.input}
                placeholder={`Option ${idx + 1}`}
                value={opt}
                onChangeText={(text) => {
                  const newOpts = [...pollOptions];
                  newOpts[idx] = text;
                  setPollOptions(newOpts);
                }}
              />
            ))}
            <Pressable
              style={styles.button}
              onPress={() => setPollOptions([...pollOptions, ""])}
            >
              <Text style={styles.buttonText}>+ Ajouter option</Text>
            </Pressable>
            <View style={styles.row}>
              <Pressable
                style={[styles.button, styles.buttonSecondary]}
                onPress={() => setShowPollModal(false)}
              >
                <Text style={styles.buttonText}>Annuler</Text>
              </Pressable>
              <Pressable
                style={styles.button}
                onPress={() => void createPoll()}
              >
                <Text style={styles.buttonText}>Créer</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {showReactionPicker && (
        <View style={styles.modal}>
          <View style={styles.reactionPicker}>
            {EMOJIS.map((emoji) => (
              <Pressable
                key={emoji}
                onPress={() => void handleReaction(showReactionPicker, emoji)}
              >
                <Text style={styles.emojiButton}>{emoji}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      <FlatList
        data={messages}
        keyExtractor={(msg) => msg.id}
        renderItem={({ item: msg }) => (
          <Pressable
            style={styles.messageBubble}
            onLongPress={() => setShowReactionPicker(msg.id)}
          >
            <Text style={styles.author}>
              {msg.author} {msg.readBy.includes(currentUser) && "✓✓"}
            </Text>

            {msg.type === "text" && (
              <Text style={styles.messageText}>{msg.content}</Text>
            )}

            {msg.type === "image" && (
              <Image
                source={{ uri: msg.content }}
                style={styles.messageImage}
              />
            )}

            {msg.type === "poll" && msg.poll && (
              <View style={styles.pollContainer}>
                <Text style={styles.pollQuestion}>{msg.poll.question}</Text>
                {msg.poll.options.map((opt) => {
                  const totalVotes = msg.poll!.options.reduce(
                    (sum, o) => sum + o.votes.length,
                    0,
                  );
                  const percentage =
                    totalVotes > 0 ? (opt.votes.length / totalVotes) * 100 : 0;
                  return (
                    <Pressable
                      key={opt.id}
                      style={[
                        styles.pollOption,
                        opt.votes.includes(currentUser) &&
                          styles.pollOptionSelected,
                      ]}
                      onPress={() => void handleVote(msg.id, opt.id)}
                    >
                      <View
                        style={[styles.pollBar, { width: `${percentage}%` }]}
                      />
                      <Text style={styles.pollText}>
                        {opt.text} ({opt.votes.length})
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}

            {Object.keys(msg.reactions).length > 0 && (
              <View style={styles.reactions}>
                {Object.entries(msg.reactions).map(([emoji, users]) => (
                  <Pressable
                    key={emoji}
                    style={styles.reactionBadge}
                    onPress={() => void handleReaction(msg.id, emoji)}
                  >
                    <Text>
                      {emoji} {users.length}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}

            <Text style={styles.timestamp}>{formatTime(msg.sentAt)}</Text>
          </Pressable>
        )}
        inverted
        refreshing={loading}
      />

      {selectedImage && (
        <View style={styles.imagePreview}>
          <Image source={{ uri: selectedImage }} style={styles.previewImage} />
          <Pressable
            style={styles.button}
            onPress={() => void sendImageMessage()}
          >
            <Text style={styles.buttonText}>Envoyer image</Text>
          </Pressable>
          <Pressable
            style={[styles.button, styles.buttonSecondary]}
            onPress={() => setSelectedImage(null)}
          >
            <Text style={styles.buttonText}>Annuler</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.inputContainer}>
        <Pressable style={styles.iconButton} onPress={() => void pickImage()}>
          <Text style={styles.icon}>📷</Text>
        </Pressable>
        <TextInput
          style={styles.textInput}
          placeholder="Message..."
          value={inputText}
          onChangeText={setInputText}
        />
        <Pressable
          style={styles.iconButton}
          onPress={() => setShowPollModal(true)}
        >
          <Text style={styles.icon}>📊</Text>
        </Pressable>
        <Pressable
          style={styles.sendButton}
          onPress={() => void sendTextMessage()}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.sendIcon}>↗️</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

function formatTime(isoString: string) {
  const date = new Date(isoString);
  return date.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F6FA" },
  messageBubble: {
    marginHorizontal: 12,
    marginVertical: 6,
    padding: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  author: { fontWeight: "700", color: "#111827", fontSize: 12 },
  messageText: { color: "#374151", marginTop: 4 },
  messageImage: { width: "100%", height: 200, borderRadius: 8, marginTop: 8 },
  pollContainer: { marginTop: 8, gap: 8 },
  pollQuestion: { fontWeight: "700", color: "#111827" },
  pollOption: {
    padding: 10,
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    overflow: "hidden",
  },
  pollOptionSelected: { backgroundColor: "#E0E7FF" },
  pollBar: {
    position: "absolute",
    height: "100%",
    backgroundColor: "#D1D5DB",
    opacity: 0.4,
  },
  pollText: { color: "#374151", fontWeight: "600" },
  reactions: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 },
  reactionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "#F3F4F6",
    borderRadius: 999,
  },
  timestamp: { fontSize: 10, color: "#9CA3AF", marginTop: 4 },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    gap: 8,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#1D4ED8",
    alignItems: "center",
    justifyContent: "center",
  },
  sendIcon: { fontSize: 20 },
  iconButton: { padding: 8 },
  icon: { fontSize: 24 },
  button: {
    backgroundColor: "#1D4ED8",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: "center",
  },
  buttonSecondary: { backgroundColor: "#D1D5DB" },
  buttonText: { color: "#FFF", fontWeight: "700" },
  modal: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 20,
    width: "80%",
    gap: 12,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  row: { flexDirection: "row", gap: 8 },
  imagePreview: {
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    padding: 12,
    gap: 8,
  },
  previewImage: { width: "100%", height: 150, borderRadius: 8 },
  reactionPicker: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  emojiButton: { fontSize: 32, padding: 8 },
});
