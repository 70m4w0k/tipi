import { useCallback, useRef, useState } from "react";
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
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
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
  const { household, members } = useHousehold(profile);
  const { messages, loading, sendMessage, addReaction, vote } = useMessages(
    profile?.household_id
  );

  const [text, setText] = useState("");
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<TextInput>(null);

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
      Alert.alert("Permission requise", "Autorise l'accès aux photos pour envoyer une image.");
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
      const contentType = asset.mimeType ?? `image/${ext}`;

      const response = await fetch(asset.uri);
      const arrayBuffer = await response.arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from("chat-images")
        .upload(filePath, arrayBuffer, {
          contentType,
          upsert: false,
        });

      if (uploadError) {
        Alert.alert("Erreur upload", uploadError.message);
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
          <Ionicons name="chatbubbles-outline" size={48} color="#9CA3AF" />
          <Text style={styles.emptyText}>
            Rejoins ou crée une coloc pour accéder au chat.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{household?.name ?? "Chat"}</Text>
        <Text style={styles.headerSubtitle}>
          {members.length} membre{members.length > 1 ? "s" : ""}
        </Text>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        {loading && messages.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1D4ED8" />
          </View>
        ) : messages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyText}>
              Pas encore de messages.{"\n"}Envoie le premier !
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
            keyboardDismissMode="interactive"
          />
        )}

        <View style={[styles.inputBar, Platform.OS === "android" && { paddingBottom: 12 }]}>
          <View style={styles.inputRow}>
            <Pressable
              style={styles.iconButton}
              onPress={() => void handlePickImage()}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator size={18} color="#6B7280" />
              ) : (
                <Ionicons name="camera-outline" size={22} color="#6B7280" />
              )}
            </Pressable>

            <Pressable
              style={styles.iconButton}
              onPress={() => setShowPollCreator(true)}
            >
              <Ionicons name="stats-chart-outline" size={20} color="#6B7280" />
            </Pressable>

            <TextInput
              ref={inputRef}
              style={styles.textInput}
              placeholder="Message..."
              placeholderTextColor="#9CA3AF"
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
              <Ionicons name="arrow-up" size={20} color="#FFFFFF" />
            </Pressable>
          </View>
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
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  headerSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 1,
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
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 22,
  },
  listContent: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  inputBar: {
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 8,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 4,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 15,
    maxHeight: 100,
    backgroundColor: "#F9FAFB",
    color: "#111827",
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#1D4ED8",
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    backgroundColor: "#CBD5E1",
  },
});
