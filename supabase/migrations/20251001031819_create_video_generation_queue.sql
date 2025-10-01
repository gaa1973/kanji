/*
  # Create Video Generation Queue Table

  1. New Tables
    - `video_generation_queue`
      - `id` (uuid, primary key)
      - `kanji` (text)
      - `metadata` (jsonb) - stores all video generation specifications
      - `filename` (text) - output filename
      - `status` (text) - pending, processing, completed, failed
      - `video_url` (text) - URL to completed video
      - `error_message` (text) - error details if failed
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `completed_at` (timestamptz)

  2. Security
    - Enable RLS on `video_generation_queue` table
    - Add policy for service role to manage all records
    - Add policy for authenticated users to view their requests

  3. Indexes
    - Index on status for efficient queue processing
    - Index on created_at for time-based queries
*/

CREATE TABLE IF NOT EXISTS video_generation_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kanji text NOT NULL,
  metadata jsonb NOT NULL,
  filename text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  video_url text,
  error_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE video_generation_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage all queue records"
  ON video_generation_queue
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view queue records"
  ON video_generation_queue
  FOR SELECT
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_video_queue_status 
  ON video_generation_queue(status);

CREATE INDEX IF NOT EXISTS idx_video_queue_created 
  ON video_generation_queue(created_at DESC);
