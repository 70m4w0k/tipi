import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "../../lib/hooks/useAuth";
import { useHousehold } from "../../lib/hooks/useHousehold";
import { useMessages } from "../../lib/hooks/useMessages";
import { supabase } from "../../lib/supabase";
import { Message, Poll } from "../../lib/types";
import MessageBubble from "../../components/MessageBubble";
import PollCreator from "../../components/PollCreator";

export default function ChatScreen() {
  const { session, profile } = useAuth();
  const { members } = useHousehold(profile);
  const { messages, loading, sendMessage, addReaction, vote } = useMessages(
    profile?.household_id
  );

  const [text, setText] = useState("");
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [uploading, setUploading] = useState(false);

  const currentUserId = session?.user?.id ?? "";

  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setText("");
    await sendMessage("text", trimmed);
  }, [text, sendMessage]);

  const handlePickImage = useCallback(async () => {
    if (!profile?.household_id) return;

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission requise", "Autorise l'acces aux photos pour envoyer une image.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
      allowsEditing: true,
    });

    if (result.canceled || !result.assets[0]) return;

    setUploading(true);
    try {
      const asset = result.assets[0];
      const ext = asset.uri.split(".").pop() ?? "jpg";
      const fileName = `${Date.now()}.${ext}`;
      const filePath = `${profile.household_id}/${fileName}`;

      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const arrayBuffer = await new Response(blob).arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from("chat-images")
        .upload(filePath, arrayBuffer, {
          contentType: asset.mimeType ?? `image/${ext}`,
          upsert: false,
        });

      if (uploadError) {
        Alert.alert("Erreur", "Impossible d'envoyer l'image.");
        setUploading(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from("chat-images")
        .getPublicUrl(filePath);

      await sendMessage("image", urlData.publicUrl);
    } catch {
      Alert.alert("Erreur", "Impossible d'envoyer l'image.");
    }
    setUploading(false);
  }, [profile?.household_id, sendMessage]);

  const handleCreatePoll = useCallback(
    async (question: string, options: string[]) => {
      const poll: Poll = {
        question,
        options: options.map((optText, i) => ({
          id: `opt_${Date.now()}_${i}`,
          text: optText,
          votes: [],
        })),
      };
      await sendMessage("poll", null, poll);
    },
    [sendMessage]
  );

  const handleReaction = useCallback(
    (messageId: string, emoji: string) => {
      void addReaction(messageId, emoji);
    },
    [addReaction]
  );

  const handleVote = useCallback(
    (messageId: string, optionId: string) => {
      void vote(messageId, optionId);
    },
    [vote]
  );

  const renderMessage = useCallback(
    ({ item }: { item: Message }) => (
      <MessageBubble
        message={item}
        currentUserId={currentUserId}
        profiles={members}
        onReaction={handleReaction}
        onVote={handleVote}
      />
    ),
    [currentUserId, members, handleReaction, handleVote]
  );

  if (!profile?.household_id) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>💬</Text>
          <Text style={styles.emptyText}>
            Rejoins ou cree une coloc pour acceder au chat.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Discussions</Text>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        {loading && messages.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1D4ED8" />
          </View>
        ) : messages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🏠</Text>
            <Text style={styles.emptyText}>
              Pas encore de messages. Envoie le premier !
            </Text>
          </View>
        ) : (
          <FlatList
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            inverted
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
          />
        )}

        <View style={styles.inputBar}>
          <Pressable
            style={styles.iconButton}
            onPress={() => void handlePickImage()}
            disabled={uploading}
          >
            <Text style={styles.iconText}>{uploading ? "..." : "\u{1F4F7}"}</Text>
          </Pressable>

          <Pressable
            style={styles.iconButton}
            onPress={() => setShowPollCreator(true)}
          >
            <Text style={styles.iconText}>{"\u{1F4CA}"}</Text>
          </Pressable>

          <TextInput
            style={styles.textInput}
            placeholder="Message..."
            value={text}
            onChangeText={setText}
            multiline
            maxLength={2000}
          />

          <Pressable
            style={[
              styles.sendButton,
              !text.trim() && styles.sendButtonDisabled,
            ]}
            onPress={() => void handleSend()}
            disabled={!text.trim()}
          >
            <Text style={styles.sendIcon}>{"\u{2191}"}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {showPollCreator && (
        <PollCreator
          onCreatePoll={(q, opts) => void handleCreatePoll(q, opts)}
          onClose={() => setShowPollCreator(false)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F6FA",
  },
  flex: {
    flex: 1,
  },
  header: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 22,
  },
  listContent: {
    paddingVertical: 12,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 6,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: {
    fontSize: 20,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
    backgroundColor: "#F9FAFB",
    color: "#111827",
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#1D4ED8",
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    backgroundColor: "#93C5FD",
  },
  sendIcon: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
  },
});
