import { TimelineChapter } from "../types";
import { supabase } from "../utils/supabase";
import { getCurrentConstellationId } from "./pairLifecycle";
import { syncRoomProgressFromTimeline } from "./roomService";

export const getTimelineChapters = async (): Promise<TimelineChapter[]> => {
  const constellationId = await getCurrentConstellationId();

  if (!constellationId) {
    return [];
  }

  const { data, error } = await supabase
    .from("timeline_chapters")
    .select("*")
    .eq("constellation_id", constellationId)
    .order("chapter_index", { ascending: true });

  if (error) {
    throw error;
  }

  return (data || []).map((chapter: any) => ({
    id: chapter.id,
    constellationId: chapter.constellation_id,
    chapterIndex: chapter.chapter_index,
    title: chapter.title,
    summary: chapter.summary,
    isUnlocked: chapter.is_unlocked,
    milestoneCount: chapter.milestone_count ?? 0,
  }));
};

export const unlockChapter = async (
  chapterId: string,
  chapterIndex: number
) => {
  const constellationId = await getCurrentConstellationId();

  if (!constellationId) {
    throw new Error("No constellation found.");
  }

  const { error } = await supabase
    .from("timeline_chapters")
    .update({ is_unlocked: true, updated_at: new Date().toISOString() })
    .eq("id", chapterId);

  if (error) {
    throw error;
  }

  await syncRoomProgressFromTimeline(constellationId, chapterIndex);
};

export const getOnThisDayMemories = async () => {
  const constellationId = await getCurrentConstellationId();

  if (!constellationId) {
    return [];
  }

  const month = new Date().getMonth() + 1;
  const day = new Date().getDate();

  const { data, error } = await supabase.rpc("get_on_this_day_memories", {
    target_constellation_id: constellationId,
    target_month: month,
    target_day: day,
  });

  if (error) {
    throw error;
  }

  return data || [];
};
