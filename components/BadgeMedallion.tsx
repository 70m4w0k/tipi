import React from "react";
import Svg, { Path, Circle, Rect } from "react-native-svg";
import { MedallionMotif } from "../lib/sport-logic";

/**
 * Médaillon de badge sportif (famille "Médaillon" RPG).
 * Motif propre à chaque exercice + hexagone dont l'ornement monte avec le rang.
 * Tout est dessiné directement dans le repère 48×48 (motif centré, agrandi) :
 * pas de transform ni de Svg imbriqué, donc rendu identique sur natif et web.
 */

const MAIN = 1.9;
const THIN = 1.2;

// --- Motifs par exercice, centrés sur (24,24) dans le repère 48×48 ---
function Motif({ motif, color }: { motif: MedallionMotif; color: string }) {
  switch (motif) {
    case "pompes": // double chevron de poussée
      return (
        <>
          <Path d="M18.5 19 L24 23.2 L29.5 19" fill="none" stroke={color} strokeWidth={MAIN} strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M18.5 25 L24 29.2 L29.5 25" fill="none" stroke={color} strokeWidth={MAIN} strokeLinecap="round" strokeLinejoin="round" />
        </>
      );
    case "abdos": // tablette segmentée
      return (
        <>
          <Rect x={19.5} y={15.5} width={9} height={17} rx={3.4} fill="none" stroke={color} strokeWidth={MAIN} />
          <Path d="M19.5 21.7 h9 M19.5 27.5 h9 M24 15.5 v17" stroke={color} strokeWidth={THIN} />
        </>
      );
    case "squats": // flèche de descente sur barre
      return (
        <>
          <Path d="M24 15.5 v7" stroke={color} strokeWidth={MAIN} strokeLinecap="round" />
          <Path d="M19.5 21 L24 26 L28.5 21" fill="none" stroke={color} strokeWidth={MAIN} strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M17.8 31 h12.4" stroke={color} strokeWidth={MAIN} strokeLinecap="round" />
        </>
      );
    case "gainage": // colonne (cohérent avec Statue / Mégalithe / Mont Rushmore)
      return (
        <>
          <Path d="M17.5 16 h13 M17.5 32 h13" stroke={color} strokeWidth={MAIN} strokeLinecap="round" />
          <Path d="M20.5 19 v10 M24 19 v10 M27.5 19 v10" stroke={color} strokeWidth={THIN} strokeLinecap="round" />
        </>
      );
    default: // générique (exercices custom) : noyau/cible
      return (
        <>
          <Circle cx={24} cy={24} r={5.6} fill="none" stroke={color} strokeWidth={MAIN} />
          <Circle cx={24} cy={24} r={1.8} fill={color} />
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
      <Motif motif={motif} color={color} />
    </Svg>
  );
}
