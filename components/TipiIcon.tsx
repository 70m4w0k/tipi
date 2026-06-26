import Svg, { Line, Path } from "react-native-svg";

export function TipiIcon({ size = 24, color = "#9CA3AF" }: { size?: number; color?: string }) {
  const sw = 1.7;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* 3 poles sticking out above */}
      <Line x1="12" y1="1" x2="10" y2="5.5" stroke={color} strokeWidth={sw} strokeLinecap="round" />
      <Line x1="12" y1="1" x2="12" y2="5" stroke={color} strokeWidth={sw} strokeLinecap="round" />
      <Line x1="12" y1="1" x2="14" y2="5.5" stroke={color} strokeWidth={sw} strokeLinecap="round" />
      {/* Tent body — triangle with rounded bottom corners */}
      <Path
        d="M12 5 L4 21 Q4 22 5 22 L19 22 Q20 22 20 21 L12 5 Z"
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Horizontal line across middle */}
      <Line x1="6.5" y1="15" x2="17.5" y2="15" stroke={color} strokeWidth={sw} strokeLinecap="round" />
      {/* Door opening */}
      <Path
        d="M10 22 L10 18 Q12 15.5 14 18 L14 22"
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}
