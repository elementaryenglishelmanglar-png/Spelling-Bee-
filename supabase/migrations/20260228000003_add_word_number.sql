-- Add word_number column to track the official spelling bee word number
ALTER TABLE words ADD COLUMN IF NOT EXISTS word_number INTEGER;
CREATE INDEX IF NOT EXISTS idx_words_word_number ON words(word_number);
