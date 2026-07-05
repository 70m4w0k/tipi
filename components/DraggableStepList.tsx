import React, { useCallback } from "react";
import { View, StyleSheet } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  type SharedValue,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

function reorder<T>(arr: T[], from: number, to: number): T[] {
  const result = [...arr];
  const [removed] = result.splice(from, 1);
  result.splice(to, 0, removed);
  return result;
}

function DraggableItem({
  index,
  itemCount,
  itemHeight,
  activeIndex,
  translateY,
  handleColor,
  onReorderEnd,
  children,
}: {
  index: number;
  itemCount: number;
  itemHeight: number;
  activeIndex: SharedValue<number>;
  translateY: SharedValue<number>;
  handleColor: string;
  onReorderEnd: (from: number, to: number) => void;
  children: React.ReactNode;
}) {
  const panGesture = Gesture.Pan()
    .activateAfterLongPress(150)
    .onStart(() => {
      activeIndex.value = index;
    })
    .onUpdate((e) => {
      translateY.value = e.translationY;
    })
    .onFinalize(() => {
      const offset = Math.round(translateY.value / itemHeight);
      const to = Math.max(0, Math.min(itemCount - 1, index + offset));
      translateY.value = 0;
      activeIndex.value = -1;
      if (to !== index) runOnJS(onReorderEnd)(index, to);
    });

  const animatedStyle = useAnimatedStyle(() => {
    if (activeIndex.value === index) {
      return {
        transform: [{ translateY: translateY.value }, { scale: 1.02 }],
        zIndex: 100,
        opacity: 0.9,
      };
    }
    if (activeIndex.value >= 0) {
      const offset = Math.round(translateY.value / itemHeight);
      const target = Math.max(0, Math.min(itemCount - 1, activeIndex.value + offset));
      if (activeIndex.value < index && target >= index) {
        return { transform: [{ translateY: withTiming(-itemHeight) }, { scale: 1 }], zIndex: 0, opacity: 1 };
      }
      if (activeIndex.value > index && target <= index) {
        return { transform: [{ translateY: withTiming(itemHeight) }, { scale: 1 }], zIndex: 0, opacity: 1 };
      }
    }
    return { transform: [{ translateY: withTiming(0) }, { scale: 1 }], zIndex: 0, opacity: 1 };
  });

  return (
    <Animated.View style={[styles.itemRow, animatedStyle]}>
      <GestureDetector gesture={panGesture}>
        <Animated.View style={styles.handle}>
          <Ionicons name="reorder-three" size={22} color={handleColor} />
        </Animated.View>
      </GestureDetector>
      <View style={styles.itemContent}>{children}</View>
    </Animated.View>
  );
}

type Props<T> = {
  items: T[];
  onReorder: (items: T[]) => void;
  renderItem: (item: T, index: number) => React.ReactNode;
  handleColor: string;
  itemHeight?: number;
};

export function DraggableStepList<T>({
  items,
  onReorder: onReorderProp,
  renderItem,
  handleColor,
  itemHeight = 70,
}: Props<T>) {
  const activeIndex = useSharedValue(-1);
  const translateY = useSharedValue(0);

  const handleReorder = useCallback(
    (from: number, to: number) => {
      onReorderProp(reorder(items, from, to));
    },
    [items, onReorderProp],
  );

  return (
    <View>
      {items.map((item, idx) => (
        <DraggableItem
          key={idx}
          index={idx}
          itemCount={items.length}
          itemHeight={itemHeight}
          activeIndex={activeIndex}
          translateY={translateY}
          handleColor={handleColor}
          onReorderEnd={handleReorder}
        >
          {renderItem(item, idx)}
        </DraggableItem>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  itemRow: { flexDirection: "row", alignItems: "center" },
  handle: { paddingVertical: 8, paddingHorizontal: 6, justifyContent: "center" },
  itemContent: { flex: 1 },
});
