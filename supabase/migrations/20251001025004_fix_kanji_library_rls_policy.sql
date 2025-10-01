/*
  # Fix Kanji Library RLS Policy

  1. Changes
    - Drop existing restrictive policy on kanji_library
    - Create new policy allowing public read access to kanji_library
    - This allows the app to work without authentication

  2. Security
    - Read-only access for everyone (no authentication required)
    - Write access still requires authentication (handled by existing policies)
*/

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Anyone can read kanji library" ON kanji_library;

-- Create new public read policy
CREATE POLICY "Public read access to kanji library"
  ON kanji_library FOR SELECT
  TO anon, authenticated
  USING (true);
