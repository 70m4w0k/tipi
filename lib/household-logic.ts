import { Profile } from "./types";

export function canKick(actor: Profile, target: Profile): boolean {
  return actor.role === "admin" && actor.id !== target.id && actor.household_id === target.household_id;
}

export function canPromote(actor: Profile, target: Profile): boolean {
  return actor.role === "admin" && target.role === "member" && actor.id !== target.id;
}

export function canDemote(actor: Profile, target: Profile): boolean {
  return actor.role === "admin" && target.role === "admin" && actor.id !== target.id;
}

export function canManageHousehold(profile: Profile): boolean {
  return profile.role === "admin" && profile.household_id !== null;
}

export function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 8);
}

export function countAdmins(members: Profile[]): number {
  return members.filter((m) => m.role === "admin").length;
}

export function isLastAdmin(profile: Profile, members: Profile[]): boolean {
  return profile.role === "admin" && countAdmins(members) === 1;
}

export const COLOR_PRESETS = [
  "#2563EB", "#F97316", "#16A34A", "#9333EA", "#EF4444",
  "#0D9488", "#EC4899", "#D97706", "#4F46E5", "#059669",
];

export function pickAvailableColor(takenColors: string[]): string {
  const taken = new Set(takenColors);
  return COLOR_PRESETS.find((c) => !taken.has(c)) ?? COLOR_PRESETS[0];
}
