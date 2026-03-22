-- Add arya_reaction column to arya_messages
-- Stores emoji reaction that Arya gives to messages (like WhatsApp reactions)
ALTER TABLE arya_messages ADD COLUMN IF NOT EXISTS arya_reaction TEXT;
