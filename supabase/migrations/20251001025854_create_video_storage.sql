/*
  # Create Video Storage Bucket

  1. Storage Setup
    - Create 'kanji-videos' storage bucket for video files
    - Set public access for downloads
    - Configure file size limits (50MB per video)

  2. Security
    - Public read access for downloads
    - Service role access for video generation
*/

-- Create storage bucket for kanji videos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'kanji-videos',
  'kanji-videos',
  true,
  52428800, -- 50MB
  ARRAY['video/mp4', 'video/webm', 'application/zip']
)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public read access for kanji videos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload videos" ON storage.objects;
DROP POLICY IF EXISTS "Service role can manage all videos" ON storage.objects;

-- Allow public read access
CREATE POLICY "Public read access for kanji videos"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'kanji-videos');

-- Allow service role to manage files
CREATE POLICY "Service role can manage all videos"
  ON storage.objects FOR ALL
  TO service_role
  USING (bucket_id = 'kanji-videos');
