import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
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
import { useTheme } from "../../lib/theme";
import { supabase } from "../../lib/supabase";
import { Message, Poll } from "../../lib/types";
import MessageBubble from "../../components/MessageBubble";
import PollCreator from "../../components/PollCreator";
import { haptic } from "../../lib/haptics";

export default function ChatScreen() {
  const { session, profile } = useAuth();
  const { household, members } = useHousehold(profile);
  const { messages, loading, sendMessage, addReaction, vote, fetchMessages } = useMessages(
    profile?.household_id
  );
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchMessages();
    setRefreshing(false);
  }, [fetchMessages]);
  const t = useTheme();

  const [text, setText] = useState("");
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const currentUserId = session?.user?.id ?? "";

  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    void haptic.light();
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
      void haptic.medium();
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
      void haptic.medium();
      await sendMessage("poll", null, poll);
    },
    [sendMessage]
  );

  const handleReaction = useCallback(
    (messageId: string, emoji: string) => {
      void haptic.light();
      void addReaction(messageId, emoji);
    },
    [addReaction]
  );

  const handleVote = useCallback(
    (messageId: string, optionId: string) => {
      void haptic.light();
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
      <SafeAreaView style={[styles.container, { backgroundColor: t.background }]}>
        <View style={styles.emptyContainer}>
          <Ionicons name="chatbubbles-outline" size={48} color={t.textMuted} />
          <Text style={[styles.emptyText, { color: t.textSecondary }]}>
            Rejoins ou crée une coloc pour accéder au chat.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.background }]} edges={["top", "left", "right"]}>
      <View style={[styles.header, { backgroundColor: t.card, borderBottomColor: t.cardBorder }]}>
        <Text style={[styles.headerTitle, { color: t.text }]}>{household?.name ?? "Chat"}</Text>
        <Text style={[styles.headerSubtitle, { color: t.textSecondary }]}>
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
            <ActivityIndicator size="large" color={t.accent} />
          </View>
        ) : messages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconCircle, { backgroundColor: t.accentLight }]}>
              <Ionicons name="chatbubbles-outline" size={40} color={t.accent} />
            </View>
            <Text style={[styles.emptyTitle, { color: t.text }]}>Pas encore de messages</Text>
            <Text style={[styles.emptyText, { color: t.textSecondary }]}>
              Envoie le premier message à tes colocs !
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
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.accent} colors={[t.accent]} />}
          />
        )}

        <View style={[styles.inputBar, { backgroundColor: t.card, borderTopColor: t.cardBorder }, Platform.OS === "android" && { paddingBottom: 12 }]}>
          <View style={styles.inputRow}>
            <Pressable
              style={styles.iconButton}
              onPress={() => void handlePickImage()}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator size={18} color={t.textSecondary} />
              ) : (
                <Ionicons name="camera-outline" size={22} color={t.textSecondary} />
              )}
            </Pressable>

            <Pressable
              style={styles.iconButton}
              onPress={() => setShowPollCreator(true)}
            >
              <Ionicons name="stats-chart-outline" size={20} color={t.textSecondary} />
            </Pressable>

            <TextInput
              ref={inputRef}
              style={[styles.textInput, { borderColor: t.cardBorder, backgroundColor: t.inputBg, color: t.text }]}
              placeholder="Message..."
              placeholderTextColor={t.textMuted}
              value={text}
              onChangeText={setText}
              multiline
              maxLength={2000}
            />

            <Pressable
              style={[
                styles.sendButton,
                { backgroundColor: t.accent },
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
  },
  flex: {
    flex: 1,
  },
  header: {
    borderBottomWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  headerSubtitle: {
    fontSize: 13,
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
    gap: 10,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  listContent: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  inputBar: {
    borderTopWidth: 1,
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
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 15,
    maxHeight: 100,
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
