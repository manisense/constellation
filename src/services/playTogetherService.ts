import { CoupleSession } from "../types";
import { supabase } from "../utils/supabase";
import { getCurrentConstellationId } from "./pairLifecycle";

export const startCoupleSession = async (
  mode: "game" | "watch"
): Promise<CoupleSession> => {
  const constellationId = await getCurrentConstellationId();
  const { data: userData } = await supabase.auth.getUser();

  if (!constellationId || !userData.user?.id) {
    throw new Error("You need an active constellation to start this session.");
  }

  const { data, error } = await supabase
    .from("couple_sessions")
    .insert({
      constellation_id: constellationId,
      mode,
      status: "active",
      created_by: userData.user.id,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return {
    id: data.id,
    constellationId: data.constellation_id,
    mode: data.mode,
    status: data.status,
    createdBy: data.created_by,
    createdAt: data.created_at,
  };
};

export const endCoupleSession = async (sessionId: string) => {
  const { error } = await supabase
    .from("couple_sessions")
    .update({ status: "ended", updated_at: new Date().toISOString() })
    .eq("id", sessionId);

  if (error) {
    throw error;
  }
};
