import React, { useEffect, useMemo, useState } from "react";
import { LayoutChangeEvent, StyleSheet, View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  interpolate,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";

type Props = {
  progress: number; // 0–1
  color: string;
  borderRadius?: number;
};

const WAVE_WIDTH = 18;
const WAVE_AMP = 4;
const WAVE_CENTER = WAVE_WIDTH / 2;

function buildWavePath(svgHeight: number, period: number): string {
  const segments = 80;
  let d = `M 0 0 L 0 ${svgHeight}`;
  for (let i = 0; i <= segments; i++) {
    const y = svgHeight * (1 - i / segments);
    const x = WAVE_CENTER + Math.sin((y / period) * Math.PI * 2) * WAVE_AMP;
    d += ` L ${x.toFixed(2)} ${y.toFixed(2)}`;
  }
  return d + " Z";
}

export function LiquidProgress({ progress, color, borderRadius = 12 }: Props) {
  const [measuredH, setMeasuredH] = useState(0);
  const wave = useSharedValue(0);

  const onLayout = (e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (h > 0 && h !== measuredH) setMeasuredH(h);
  };

  useEffect(() => {
    wave.value = withRepeat(
      withTiming(1, { duration: 4000, easing: Easing.linear }),
      -1,
      false,
    );
  }, []);

  const h = measuredH || 80;

  const waveAnim = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(wave.value, [0, 1], [0, -h]) }],
  }));

  const svgH = h * 2;
  const wavePath = useMemo(() => buildWavePath(svgH, h), [svgH, h]);

  if (progress <= 0) return <View style={styles.container} onLayout={onLayout} pointerEvents="none" />;

  const isFull = progress >= 1;

  return (
    <View style={[styles.container, { borderRadius }]} onLayout={onLayout} pointerEvents="none">
      <View
        style={[styles.fill, {
          backgroundColor: color,
          opacity: 0.14,
          borderTopLeftRadius: borderRadius,
          borderBottomLeftRadius: borderRadius,
          borderTopRightRadius: isFull ? borderRadius : 0,
          borderBottomRightRadius: isFull ? borderRadius : 0,
          width: isFull ? "100%" : `${Math.max(progress * 100 - 3, 0)}%` as any,
        }]}
      />
      {!isFull && measuredH > 0 && (
        <View
          style={[styles.waveClip, {
            left: `${Math.max(progress * 100 - 3, 0)}%` as any,
            height: h,
          }]}
        >
          <Animated.View style={[{ width: WAVE_WIDTH, height: svgH }, waveAnim]}>
            <Svg width={WAVE_WIDTH} height={svgH} viewBox={`0 0 ${WAVE_WIDTH} ${svgH}`}>
              <Path d={wavePath} fill={color} opacity={0.14} />
            </Svg>
          </Animated.View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute", left: 0, right: 0, top: 0, bottom: 0,
    overflow: "hidden",
  },
  fill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
  },
  waveClip: {
    position: "absolute",
    top: 0,
    overflow: "hidden",
    width: WAVE_WIDTH,
  },
});
