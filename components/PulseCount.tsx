import React, { useRef } from "react";
import { StyleSheet, Text } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withSequence, withSpring } from "react-native-reanimated";

/** Animated counter that pulses briefly when the value changes */
export function PulseCount({ value, style, color }: { value: number; style?: object; color: string }) {
  const scale = useSharedValue(1);
  const prevValue = useRef(value);

  if (prevValue.current !== value) {
    prevValue.current = value;
    scale.value = withSequence(
      withSpring(1.3, { damping: 8, stiffness: 200 }),
      withSpring(1, { damping: 8, stiffness: 200 })
    );
  }

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animStyle}>
      <Text style={[{ color }, style]}>{value}</Text>
    </Animated.View>
  );
}
