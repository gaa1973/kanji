/*
  # KanjiFlow Pro Database Schema

  1. New Tables
    - `kanji_library`
      - `id` (uuid, primary key)
      - `kanji` (text, unique) - The kanji character
      - `meaning` (text) - Primary English meaning
      - `category` (text) - Category classification
      - `difficulty` (text) - Difficulty level (beginner/intermediate/advanced)
      - `total_strokes` (integer) - Total number of strokes
      - `stroke_order` (jsonb) - Array of stroke data
      - `usage_examples` (jsonb) - Array of compound words with readings
      - `created_at` (timestamptz)
    
    - `usage_history`
      - `id` (uuid, primary key)
      - `user_id` (uuid) - References auth.users
      - `kanji_id` (uuid) - References kanji_library
      - `used_at` (timestamptz)
      - `batch_id` (uuid) - Groups weekly batches together
    
    - `video_batches`
      - `id` (uuid, primary key)
      - `user_id` (uuid) - References auth.users
      - `kanji_list` (jsonb) - Array of 7 kanji IDs
      - `status` (text) - pending/processing/completed/failed
      - `created_at` (timestamptz)
      - `completed_at` (timestamptz)
    
  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
*/

-- Kanji Library Table
CREATE TABLE IF NOT EXISTS kanji_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kanji text UNIQUE NOT NULL,
  meaning text NOT NULL,
  category text NOT NULL,
  difficulty text NOT NULL DEFAULT 'beginner',
  total_strokes integer NOT NULL,
  stroke_order jsonb DEFAULT '[]'::jsonb,
  usage_examples jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE kanji_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read kanji library"
  ON kanji_library FOR SELECT
  TO authenticated
  USING (true);

-- Usage History Table
CREATE TABLE IF NOT EXISTS usage_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kanji_id uuid NOT NULL REFERENCES kanji_library(id) ON DELETE CASCADE,
  used_at timestamptz DEFAULT now(),
  batch_id uuid
);

ALTER TABLE usage_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage history"
  ON usage_history FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own usage history"
  ON usage_history FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Video Batches Table
CREATE TABLE IF NOT EXISTS video_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kanji_list jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE video_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own video batches"
  ON video_batches FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own video batches"
  ON video_batches FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own video batches"
  ON video_batches FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_kanji_category ON kanji_library(category);
CREATE INDEX IF NOT EXISTS idx_kanji_difficulty ON kanji_library(difficulty);
CREATE INDEX IF NOT EXISTS idx_usage_history_user ON usage_history(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_history_batch ON usage_history(batch_id);
CREATE INDEX IF NOT EXISTS idx_video_batches_user ON video_batches(user_id);
