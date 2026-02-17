import { CallSession } from "../types";
import { enqueuePairNotification, supabase } from "../utils/supabase";

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

  try {
    await enqueuePairNotification({
      constellationId,
      eventType: "message_new",
      payload: {
        has_image: Boolean(imageUrl),
        has_voice_note: Boolean(voiceNoteUrl),
        preview_text: (content || "").slice(0, 120),
        message_id: data.id,
      },
    });
  } catch (enqueueError) {
    console.error("Failed to enqueue message notification:", enqueueError);
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

  try {
    await enqueuePairNotification({
      constellationId,
      eventType: "call_ringing",
      payload: {
        call_session_id: data.id,
        call_type: data.type,
        started_by: data.started_by,
        created_at: data.created_at,
      },
    });
  } catch (enqueueError) {
    console.error("Failed to enqueue call notification:", enqueueError);
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
