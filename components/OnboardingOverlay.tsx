import React, { useCallback, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ViewToken,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../lib/theme";
import { useOnboarding } from "../lib/onboarding-context";
import { haptic } from "../lib/haptics";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface Slide {
  icon: string;
  title: string;
  description: string;
  features?: { icon: string; label: string }[];
}

const SLIDES: Slide[] = [
  {
    icon: "home-outline",
    title: "Bienvenue sur Tipi",
    description: "L'app qui simplifie la vie en colocation.\nDépenses, ménage, courses, recettes — tout au même endroit.",
  },
  {
    icon: "apps-outline",
    title: "Vos outils",
    description: "Tout ce qu'il faut pour gérer votre coloc au quotidien :",
    features: [
      { icon: "chatbubbles-outline", label: "Chat en temps réel" },
      { icon: "wallet-outline", label: "Partage des dépenses" },
      { icon: "checkbox-outline", label: "Suivi du ménage" },
      { icon: "cart-outline", label: "Liste de courses" },
      { icon: "restaurant-outline", label: "Recettes partagées" },
    ],
  },
  {
    icon: "people-outline",
    title: "Invitez vos colocs !",
    description: "Partagez votre code d'invitation depuis votre profil pour que vos colocataires rejoignent votre espace.",
  },
];

export function OnboardingOverlay() {
  const { showOnboarding, completeOnboarding } = useOnboarding();
  const t = useTheme();
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setCurrentIndex(viewableItems[0].index);
      }
    },
    [],
  );
  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const goNext = () => {
    void haptic.light();
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    } else {
      completeOnboarding();
    }
  };

  const skip = () => {
    void haptic.light();
    completeOnboarding();
  };

  const renderSlide = ({ item }: { item: Slide }) => (
    <ScrollView
      style={{ width: SCREEN_WIDTH }}
      contentContainerStyle={styles.slide}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.iconCircle, { backgroundColor: t.accentLight }]}>
        <Ionicons name={item.icon as any} size={56} color={t.accent} />
      </View>
      <Text style={[styles.slideTitle, { color: t.text }]}>{item.title}</Text>
      <Text style={[styles.slideDesc, { color: t.textSecondary }]}>{item.description}</Text>
      {item.features && (
        <View style={styles.featureList}>
          {item.features.map((f) => (
            <View key={f.label} style={[styles.featureRow, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
              <Ionicons name={f.icon as any} size={20} color={t.accent} />
              <Text style={[styles.featureLabel, { color: t.text }]}>{f.label}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );

  if (!showOnboarding) return null;

  const isLast = currentIndex === SLIDES.length - 1;

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <View style={[styles.overlay, { backgroundColor: t.background }]}>
        <View style={styles.skipRow}>
          <Pressable onPress={skip} hitSlop={12}>
            <Text style={[styles.skipText, { color: t.textMuted }]}>Passer</Text>
          </Pressable>
        </View>

        <FlatList
          ref={flatListRef}
          data={SLIDES}
          renderItem={renderSlide}
          keyExtractor={(_, i) => String(i)}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          bounces={false}
        />

        <View style={styles.footer}>
          <View style={styles.dots}>
            {SLIDES.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  { backgroundColor: i === currentIndex ? t.accent : t.cardBorder },
                ]}
              />
            ))}
          </View>

          <Pressable
            style={[styles.nextBtn, { backgroundColor: t.accent }]}
            onPress={goNext}
          >
            <Text style={styles.nextBtnText}>
              {isLast ? "C'est parti !" : "Suivant"}
            </Text>
            <Ionicons
              name={isLast ? "checkmark" : "arrow-forward"}
              size={18}
              color="#FFFFFF"
            />
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  skipRow: {
    alignItems: "flex-end",
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 8,
  },
  skipText: {
    fontSize: 15,
    fontWeight: "600",
  },
  slide: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 36,
    paddingVertical: 20,
  },
  iconCircle: {
    width: 112,
    height: 112,
    borderRadius: 56,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },
  slideTitle: {
    fontSize: 26,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 14,
  },
  slideDesc: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
    marginBottom: 20,
  },
  featureList: {
    width: "100%",
    gap: 8,
    marginTop: 4,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  featureLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 48,
    gap: 20,
    alignItems: "center",
  },
  dots: {
    flexDirection: "row",
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 14,
    width: "100%",
  },
  nextBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 17,
  },
});
