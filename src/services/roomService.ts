import { SharedRoomState } from "../types";
import { supabase } from "../utils/supabase";
import { getCurrentConstellationId } from "./pairLifecycle";

const defaultRoomState = (constellationId: string): SharedRoomState => ({
  constellationId,
  roomName: "Our Shared Room",
  bondingStrength: 0,
  ambience: "starglow",
  decorLevel: 1,
  unlockedArtifacts: [],
  chapterUnlocked: 1,
});

export const getSharedRoomState = async (): Promise<SharedRoomState | null> => {
  const constellationId = await getCurrentConstellationId();

  if (!constellationId) {
    return null;
  }

  const { data: constellation } = await supabase
    .from("constellations")
    .select("id, name, bonding_strength")
    .eq("id", constellationId)
    .maybeSingle();

  const { data: roomData } = await supabase
    .from("room_states")
    .select("ambience, decor_level, unlocked_artifacts, chapter_unlocked")
    .eq("constellation_id", constellationId)
    .maybeSingle();

  if (!constellation) {
    return defaultRoomState(constellationId);
  }

  return {
    constellationId,
    roomName: constellation.name || "Our Shared Room",
    bondingStrength: constellation.bonding_strength ?? 0,
    ambience: roomData?.ambience ?? "starglow",
    decorLevel: roomData?.decor_level ?? 1,
    unlockedArtifacts: roomData?.unlocked_artifacts ?? [],
    chapterUnlocked: roomData?.chapter_unlocked ?? 1,
  };
};

export const syncRoomProgressFromTimeline = async (
  constellationId: string,
  chapterUnlocked: number
) => {
  await supabase.from("room_states").upsert({
    constellation_id: constellationId,
    chapter_unlocked: chapterUnlocked,
    updated_at: new Date().toISOString(),
  });
};
