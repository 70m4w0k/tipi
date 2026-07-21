import React from "react";
import Svg, { Path, Circle, Rect } from "react-native-svg";
import { MedallionMotif } from "../lib/sport-logic";

/**
 * Médaillon de badge sportif (famille "Médaillon" RPG).
 * Motif propre à chaque exercice + hexagone dont l'ornement monte avec le rang.
 * viewBox interne 48×48, dessiné dans la couleur passée (react-native-svg ne
 * connaît pas currentColor).
 */

// --- Motifs par exercice (repère 0-24, recentrés ensuite par un G) ---
function Motif({ motif, color }: { motif: MedallionMotif; color: string }) {
  switch (motif) {
    case "pompes": // double chevron de poussée
      return (
        <>
          <Path d="M7 6 L12 10.5 L17 6" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M7 12 L12 16.5 L17 12" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </>
      );
    case "abdos": // tablette segmentée
      return (
        <>
          <Rect x={8} y={4} width={8} height={16} rx={3} fill="none" stroke={color} strokeWidth={2} />
          <Path d="M8 9.5 h8 M8 14.5 h8 M12 4 v16" stroke={color} strokeWidth={1.4} />
        </>
      );
    case "squats": // flèche de descente sur barre
      return (
        <>
          <Path d="M12 4 v8" stroke={color} strokeWidth={2} strokeLinecap="round" />
          <Path d="M8 9.5 L12 14 L16 9.5" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M6.5 18.5 h11" stroke={color} strokeWidth={2} strokeLinecap="round" />
        </>
      );
    case "gainage": // colonne (cohérent avec Statue / Mégalithe / Mont Rushmore)
      return (
        <>
          <Path d="M6 5 h12 M6 19 h12" stroke={color} strokeWidth={2} strokeLinecap="round" />
          <Path d="M9 7.5 v9 M12 7.5 v9 M15 7.5 v9" stroke={color} strokeWidth={1.4} strokeLinecap="round" />
        </>
      );
    default: // générique (exercices custom) : noyau/cible
      return (
        <>
          <Circle cx={12} cy={12} r={4.5} fill="none" stroke={color} strokeWidth={2} />
          <Circle cx={12} cy={12} r={1.4} fill={color} />
        </>
      );
  }
}

// --- Hexagone du contenant ---
function hexPath(r: number): string {
  let d = "";
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 3;
    d += (i === 0 ? "M" : "L") + (24 + r * Math.cos(a)).toFixed(2) + " " + (24 + r * Math.sin(a)).toFixed(2) + " ";
  }
  return d + "Z";
}
function arcPath(cx: number, cy: number, r: number, a0: number, a1: number): string {
  const p = (a: number) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  const [x0, y0] = p(a0);
  const [x1, y1] = p(a1);
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

const HEX_OUTER = hexPath(20);
const HEX_INNER = hexPath(16.4);
const LAUREL_L = arcPath(24, 25, 22.5, Math.PI * 0.62, Math.PI * 0.88);
const LAUREL_R = arcPath(24, 25, 22.5, Math.PI * 0.12, Math.PI * 0.38);

type BadgeMedallionProps = {
  motif: MedallionMotif;
  tier: number; // 1-5, ornement croissant
  color: string;
  size?: number;
};

export function BadgeMedallion({ motif, tier, color, size = 36 }: BadgeMedallionProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <Path d={HEX_OUTER} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />
      {tier >= 2 && <Path d={HEX_INNER} fill="none" stroke={color} strokeWidth={1.1} strokeLinejoin="round" />}
      {tier >= 3 && (
        <>
          <Circle cx={6.4} cy={24} r={2} fill={color} />
          <Circle cx={41.6} cy={24} r={2} fill={color} />
        </>
      )}
      {tier >= 4 && (
        <>
          <Path d={LAUREL_L} fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
          <Path d={LAUREL_R} fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
        </>
      )}
      {tier >= 5 && (
        <>
          <Path d="M24 0.8 v3.6 M13 3.6 l2 3.4 M35 3.6 l-2 3.4" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
          <Circle cx={24} cy={45} r={2} fill={color} />
        </>
      )}
      {/* Svg imbriqué : place et met à l'échelle le motif sans transform (compatible web) */}
      <Svg x={17.28} y={18.28} width={13.44} height={13.44} viewBox="0 0 24 24">
        <Motif motif={motif} color={color} />
      </Svg>
    </Svg>
  );
}
