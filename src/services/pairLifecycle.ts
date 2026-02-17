import { supabase } from "../utils/supabase";

export type PairLifecycleStatus =
  | "no_constellation"
  | "waiting_for_partner"
  | "complete";

export interface PairLifecycleState {
  status: PairLifecycleStatus;
  constellationId: string | null;
  inviteCode: string | null;
}

export const getPairLifecycleState = async (): Promise<PairLifecycleState> => {
  const { data, error } = await supabase.rpc("get_user_constellation_status");

  if (error || !data) {
    return {
      status: "no_constellation",
      constellationId: null,
      inviteCode: null,
    };
  }

  const rawStatus = data?.status;
  const status: PairLifecycleStatus =
    rawStatus === "waiting_for_partner"
      ? "waiting_for_partner"
      : rawStatus === "complete" || rawStatus === "quiz_needed"
      ? "complete"
      : "no_constellation";

  return {
    status,
    constellationId: data?.constellation?.id ?? null,
    inviteCode: data?.constellation?.invite_code ?? null,
  };
};

export const getCurrentConstellationId = async (): Promise<string | null> => {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;

  if (!userId) {
    return null;
  }

  const { data } = await supabase
    .from("constellation_members")
    .select("constellation_id")
    .eq("user_id", userId)
    .maybeSingle();

  return data?.constellation_id ?? null;
};
