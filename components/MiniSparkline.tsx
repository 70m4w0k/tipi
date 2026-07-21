import React from "react";
import { StyleSheet, View } from "react-native";
import { useTheme } from "../lib/theme";

type MiniSparklineProps = {
  values: number[]; // p.ex. 7 derniers jours
  color: string;
  height?: number;
};

/** Mini histogramme de tendance (dernier point mis en avant) */
export function MiniSparkline({ values, color, height = 24 }: MiniSparklineProps) {
  const t = useTheme();
  const max = Math.max(1, ...values);
  return (
    <View style={[styles.row, { height }]} testID="mini-sparkline">
      {values.map((v, i) => {
        const isLast = i === values.length - 1;
        const h = v > 0 ? Math.max(2, (v / max) * height) : 2;
        return (
          <View
            key={i}
            style={{
              flex: 1,
              height: h,
              borderRadius: 2,
              backgroundColor: v === 0 ? t.cardBorder : color,
              opacity: v === 0 ? 1 : isLast ? 1 : 0.4,
            }}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-end", gap: 3 },
});
