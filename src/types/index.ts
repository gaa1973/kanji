export type CategoryType = 'viral' | 'motivation' | 'emotion' | 'culture' | 'cool' | 'nature' | 'beautiful';

export interface CategoryInfo {
  id: CategoryType;
  name: string;
  icon: string;
  description: string;
}

export const CATEGORIES: CategoryInfo[] = [
  { id: 'viral', name: 'バイラルしやすい', icon: '🔥', description: '人気でトレンドの漢字' },
  { id: 'motivation', name: 'モチベーション', icon: '💪', description: '励ましと力を与える' },
  { id: 'emotion', name: '感情系', icon: '😊', description: '感情を表現する' },
  { id: 'culture', name: '日本文化', icon: '🌸', description: '伝統的で文化的' },
  { id: 'cool', name: 'かっこいい系', icon: '🐉', description: '力強くインパクトのある' },
  { id: 'nature', name: '自然', icon: '🌊', description: '自然の世界' },
  { id: 'beautiful', name: '美しい漢字', icon: '✨', description: '美的に美しい' },
];
