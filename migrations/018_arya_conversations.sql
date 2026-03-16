-- ============================================
-- Migration 018: Arya Conversations & Messages
-- Persistent chat storage for Arya AI
-- ============================================

-- Conversations table
CREATE TABLE IF NOT EXISTS arya_conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  message_count INT DEFAULT 0
);

-- Messages table
-- is_deleted_by_user only affects UI rendering.
-- Arya context loader always reads full message history
-- regardless of this flag to maintain conversation continuity
-- and learn user communication patterns.
CREATE TABLE IF NOT EXISTS arya_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES arya_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  is_deleted_by_user BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_arya_conversations_user ON arya_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_arya_messages_conversation ON arya_messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_arya_messages_user ON arya_messages(user_id);

-- RLS on arya_conversations
ALTER TABLE arya_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own conversations"
  ON arya_conversations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own conversations"
  ON arya_conversations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations"
  ON arya_conversations FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS on arya_messages
ALTER TABLE arya_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own messages"
  ON arya_messages FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own messages"
  ON arya_messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update is_deleted_by_user flag only
CREATE POLICY "Users can soft-delete own messages"
  ON arya_messages FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- No DELETE policy — messages are never removed from DB
