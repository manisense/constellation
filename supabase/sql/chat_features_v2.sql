-- Chat V2 feature additions
-- Run this migration in Supabase SQL Editor

-- 1. Read receipts: track when partner last viewed the chat
ALTER TABLE messages ADD COLUMN IF NOT EXISTS seen_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Message replies / quoted messages
ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_to_message_id UUID REFERENCES messages(id) ON DELETE SET NULL DEFAULT NULL;

-- 3. Message type field (text | image | voice_note | file)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS message_type TEXT NOT NULL DEFAULT 'text';

-- 4. File attachments metadata
ALTER TABLE messages ADD COLUMN IF NOT EXISTS file_name TEXT DEFAULT NULL;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS file_size INTEGER DEFAULT NULL;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS file_url TEXT DEFAULT NULL;

-- 5. Voice note duration (seconds)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS voice_note_duration INTEGER DEFAULT NULL;

-- 6. Reaction emojis
CREATE TABLE IF NOT EXISTS message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(message_id, user_id, emoji)
);

-- Enable RLS on message_reactions
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

-- RLS: only constellation members can see/write reactions
DROP POLICY IF EXISTS "constellation_members_reactions_select" ON message_reactions;
CREATE POLICY "constellation_members_reactions_select" ON message_reactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM messages m
      JOIN constellation_members cm ON cm.constellation_id = m.constellation_id
      WHERE m.id = message_reactions.message_id
        AND cm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "constellation_members_reactions_insert" ON message_reactions;
CREATE POLICY "constellation_members_reactions_insert" ON message_reactions
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM messages m
      JOIN constellation_members cm ON cm.constellation_id = m.constellation_id
      WHERE m.id = message_reactions.message_id
        AND cm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "constellation_members_reactions_delete" ON message_reactions;
CREATE POLICY "constellation_members_reactions_delete" ON message_reactions
  FOR DELETE USING (user_id = auth.uid());

-- Storage bucket for file attachments (run separately in Supabase dashboard if needed)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('attachments', 'attachments', false) ON CONFLICT DO NOTHING;
