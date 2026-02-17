import { RitualEntry } from "../types";
import { supabase } from "../utils/supabase";
import { getCurrentConstellationId } from "./pairLifecycle";

export const dailyPromptPool = [
  "What made you feel most loved today?",
  "One tiny thing I appreciated about us today was…",
  "How can I support you better tomorrow?",
  "Which moment today felt like home with you?",
];

export const getTodayPrompt = () => {
  const day = new Date().getDate();
  return dailyPromptPool[day % dailyPromptPool.length];
};

export const submitDailyRitual = async (
  ritualType: RitualEntry["ritualType"],
  responseText: string
): Promise<RitualEntry> => {
  const constellationId = await getCurrentConstellationId();
  const { data: userData } = await supabase.auth.getUser();

  if (!constellationId || !userData.user?.id) {
    throw new Error("You need an active constellation to complete rituals.");
  }

  const promptText = ritualType === "prompt" ? getTodayPrompt() : null;

  const { data, error } = await supabase
    .from("daily_ritual_entries")
    .insert({
      constellation_id: constellationId,
      completed_by: userData.user.id,
      ritual_type: ritualType,
      prompt_text: promptText,
      response_text: responseText,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return {
    id: data.id,
    constellationId: data.constellation_id,
    createdAt: data.created_at,
    completedBy: data.completed_by,
    ritualType: data.ritual_type,
    promptText: data.prompt_text,
    responseText: data.response_text,
  };
};

export const getCurrentStreak = async (): Promise<number> => {
  const constellationId = await getCurrentConstellationId();

  if (!constellationId) {
    return 0;
  }

  const { data } = await supabase.rpc("get_constellation_ritual_streak", {
    target_constellation_id: constellationId,
  });

  return Number(data ?? 0);
};
