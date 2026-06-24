import { useCallback, useEffect, useState } from "react";
import { supabase } from "../supabase";
import { Household, Profile } from "../types";

export function useHousehold(profile: Profile | null) {
  const [household, setHousehold] = useState<Household | null>(null);
  const [members, setMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchHousehold = useCallback(async () => {
    if (!profile?.household_id) {
      setHousehold(null);
      setMembers([]);
      return;
    }
    setLoading(true);
    const { data: h } = await supabase
      .from("households")
      .select("*")
      .eq("id", profile.household_id)
      .single();
    setHousehold(h);

    const { data: m } = await supabase
      .from("profiles")
      .select("*")
      .eq("household_id", profile.household_id);
    setMembers(m ?? []);
    setLoading(false);
  }, [profile?.household_id]);

  useEffect(() => {
    void fetchHousehold();
  }, [fetchHousehold]);

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

  return {
    household,
    members,
    loading,
    createHousehold,
    joinHousehold,
    refreshHousehold: fetchHousehold,
  };
}
