import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ijkaeprjoaxtxasepama.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlqa2FlcHJqb2F4dHhhc2VwYW1hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyNjczNzIsImV4cCI6MjA3NDg0MzM3Mn0.sUKgUbkUU1NBp-Dlj_Z3isWcqsPNl1KBXfNLXOvEzPc';

console.log('🔧 Supabase Config:', {
  url: supabaseUrl,
  hasKey: !!supabaseAnonKey,
  envUrl: import.meta.env.VITE_SUPABASE_URL,
});

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
