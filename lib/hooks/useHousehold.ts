import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../supabase";
import { Household, Profile } from "../types";

let channelCounter = 0;

export function useHousehold(profile: Profile | null) {
  const [household, setHousehold] = useState<Household | null>(null);
  const [members, setMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const channelId = useRef(++channelCounter);

  const isAdmin = profile?.role === "admin";

  const householdId = profile?.household_id;
  const profileVersion = profile ? `${profile.id}:${profile.display_name}:${profile.color}` : "";

  const fetchHousehold = useCallback(async () => {
    if (!householdId) {
      setHousehold(null);
      setMembers([]);
      return;
    }
    setLoading(true);
    const { data: h } = await supabase
      .from("households")
      .select("*")
      .eq("id", householdId)
      .single();
    setHousehold(h);

    const { data: m } = await supabase
      .from("profiles")
      .select("*")
      .eq("household_id", householdId);
    setMembers(m ?? []);
    setLoading(false);
  }, [householdId, profileVersion]);

  useEffect(() => {
    void fetchHousehold();
  }, [fetchHousehold]);

  useEffect(() => {
    if (!householdId) return;
    const channel = supabase
      .channel(`household-profiles:${householdId}:${channelId.current}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `household_id=eq.${householdId}` },
        (payload) => {
          const updated = payload.new as Profile;
          setMembers((prev) => prev.map((m) => m.id === updated.id ? updated : m));
        }
      )
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [householdId]);

  const createHousehold = async (name: string) => {
    const { data, error } = await supabase
      .from("households")
      .insert({ name })
      .select()
      .single();
    if (error || !data) return { error };

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ household_id: data.id })
      .eq("id", profile!.id);
    if (updateError) return { error: updateError };

    setHousehold(data);
    return { error: null, household: data };
  };

  const joinHousehold = async (inviteCode: string) => {
    const { data, error } = await supabase
      .from("households")
      .select("*")
      .eq("invite_code", inviteCode.trim().toLowerCase())
      .maybeSingle();
    if (error) return { error };
    if (!data) return { error: new Error("Code invalide") };

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ household_id: data.id })
      .eq("id", profile!.id);
    if (updateError) return { error: updateError };

    setHousehold(data);
    return { error: null, household: data };
  };

  const renameHousehold = async (newName: string) => {
    if (!household) return { error: new Error("Pas de coloc") };
    const { error } = await supabase
      .from("households")
      .update({ name: newName.trim() })
      .eq("id", household.id);
    if (!error) setHousehold({ ...household, name: newName.trim() });
    return { error };
  };

  const regenerateInviteCode = async () => {
    if (!household) return { error: new Error("Pas de coloc") };
    const newCode = Math.random().toString(36).substring(2, 8);
    const { error } = await supabase
      .from("households")
      .update({ invite_code: newCode })
      .eq("id", household.id);
    if (!error) setHousehold({ ...household, invite_code: newCode });
    return { error };
  };

  const kickMember = async (memberId: string) => {
    if (memberId === profile?.id) return { error: new Error("Tu ne peux pas t'exclure toi-même") };
    const { error } = await supabase
      .from("profiles")
      .update({ household_id: null })
      .eq("id", memberId);
    if (!error) setMembers(members.filter((m) => m.id !== memberId));
    return { error };
  };

  const promoteMember = async (memberId: string) => {
    const { error } = await supabase
      .from("profiles")
      .update({ role: "admin" })
      .eq("id", memberId);
    if (!error) {
      setMembers(members.map((m) => m.id === memberId ? { ...m, role: "admin" as const } : m));
    }
    return { error };
  };

  const demoteMember = async (memberId: string) => {
    if (memberId === profile?.id) return { error: new Error("Tu ne peux pas te rétrograder toi-même") };
    const { error } = await supabase
      .from("profiles")
      .update({ role: "member" })
      .eq("id", memberId);
    if (!error) {
      setMembers(members.map((m) => m.id === memberId ? { ...m, role: "member" as const } : m));
    }
    return { error };
  };

  const deleteHousehold = async () => {
    if (!household) return { error: new Error("Pas de coloc") };
    for (const m of members) {
      await supabase.from("profiles").update({ household_id: null }).eq("id", m.id);
    }
    const { error } = await supabase.from("households").delete().eq("id", household.id);
    if (!error) {
      setHousehold(null);
      setMembers([]);
    }
    return { error };
  };

  return {
    household,
    members,
    loading,
    isAdmin,
    createHousehold,
    joinHousehold,
    renameHousehold,
    regenerateInviteCode,
    kickMember,
    promoteMember,
    demoteMember,
    deleteHousehold,
    refreshHousehold: fetchHousehold,
  };
}
