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
