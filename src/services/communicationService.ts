import { CallSession } from "../types";
import { supabase } from "../utils/supabase";

export type ChatPayload = {
  constellationId: string;
  content: string;
  imageUrl?: string | null;
  voiceNoteUrl?: string | null;
  voiceNoteDurationMs?: number | null;
};

export const sendTextOrMediaMessage = async (payload: ChatPayload) => {
  const {
    constellationId,
    content,
    imageUrl,
    voiceNoteUrl,
    voiceNoteDurationMs,
  } = payload;

  const { data, error } = await supabase
    .from("messages")
    .insert({
      constellation_id: constellationId,
      content,
      image_url: imageUrl ?? null,
      voice_note_url: voiceNoteUrl ?? null,
      voice_note_duration_ms: voiceNoteDurationMs ?? null,
      message_type: voiceNoteUrl ? "voice_note" : imageUrl ? "image" : "text",
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
};

export const createCallSession = async (
  constellationId: string,
  type: "voice" | "video"
): Promise<CallSession> => {
  const { data: userData } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("call_sessions")
    .insert({
      constellation_id: constellationId,
      started_by: userData.user?.id,
      type,
      status: "ringing",
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return {
    id: data.id,
    constellationId: data.constellation_id,
    startedBy: data.started_by,
    type: data.type,
    status: data.status,
    createdAt: data.created_at,
  };
};

export const updateCallStatus = async (
  sessionId: string,
  status: "active" | "ended" | "missed"
) => {
  const { error } = await supabase
    .from("call_sessions")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", sessionId);

  if (error) {
    throw error;
  }
};
