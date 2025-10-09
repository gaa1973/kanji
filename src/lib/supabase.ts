import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface KanjiData {
  id: string;
  kanji: string;
  meaning: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  total_strokes: number;
  stroke_order: any[];
  usage_examples: Array<{
    word: string;
    reading: string;
    translation: string;
  }>;
  created_at: string;
}

export interface UsageHistory {
  id: string;
  user_id: string;
  kanji_id: string;
  used_at: string;
  batch_id: string | null;
}

export interface VideoBatch {
  id: string;
  user_id: string;
  kanji_list: string[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  completed_at: string | null;
}
