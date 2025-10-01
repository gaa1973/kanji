import { useState, useEffect } from 'react';
import { Sparkles, Video } from 'lucide-react';
import { CategorySelector } from './components/CategorySelector';
import { KanjiInput } from './components/KanjiInput';
import { KanjiSuggestions } from './components/KanjiSuggestions';
import { VideoPreview } from './components/VideoPreview';
import { CategoryType } from './types';
import { supabase } from './lib/supabase';

function App() {
  const [selectedCategory, setSelectedCategory] = useState<CategoryType | null>(null);
  const [selectedKanji, setSelectedKanji] = useState<string[]>([]);
  const [weeklyTheme, setWeeklyTheme] = useState<CategoryType | null>(null);

  useEffect(() => {
    const themes: CategoryType[] = ['viral', 'motivation', 'emotion', 'culture', 'cool', 'nature', 'beautiful'];
    const randomTheme = themes[Math.floor(Math.random() * themes.length)];
    setWeeklyTheme(randomTheme);
  }, []);

  const handleAddKanji = (kanji: string) => {
    if (!selectedKanji.includes(kanji) && selectedKanji.length < 7) {
      setSelectedKanji([...selectedKanji, kanji]);
    }
  };

  const handleRandomize = async () => {
    if (!selectedCategory) return;

    try {
      const { data, error } = await supabase
        .from('kanji_library')
        .select('kanji')
        .eq('category', selectedCategory);

      if (error) throw error;

      const available = data?.map(k => k.kanji) || [];
      const shuffled = [...available].sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, 7);

      setSelectedKanji(selected);
    } catch (error) {
      console.error('Error randomizing kanji:', error);
    }
  };

  const handleCategorySelect = (category: CategoryType) => {
    setSelectedCategory(category);
    setSelectedKanji([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <header className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Video className="w-12 h-12 text-blue-600" />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              KanjiFlow Pro
            </h1>
          </div>
          <p className="text-xl text-gray-600 mb-2">
            漢字学習用週間ショート動画ジェネレーター
          </p>
          <p className="text-sm text-gray-500">
            SNS用の魅力的な縦型動画（9:16）を7本・各20秒で作成
          </p>

          {weeklyTheme && (
            <div className="mt-6 inline-block px-6 py-3 bg-gradient-to-r from-amber-100 to-orange-100 border border-amber-300 rounded-lg">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-600" />
                <span className="text-sm font-semibold text-amber-900">
                  今週のテーマ: {weeklyTheme.toUpperCase()}
                </span>
              </div>
            </div>
          )}
        </header>

        <div className="space-y-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <CategorySelector
              onSelectCategory={handleCategorySelect}
              selectedCategory={selectedCategory}
            />
          </div>

          {selectedCategory && (
            <>
              <div className="bg-white rounded-xl shadow-lg p-6">
                <KanjiSuggestions
                  category={selectedCategory}
                  selectedKanji={selectedKanji}
                  onAddKanji={handleAddKanji}
                  onRandomize={handleRandomize}
                />
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6">
                <KanjiInput
                  selectedKanji={selectedKanji}
                  onKanjiChange={setSelectedKanji}
                />
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6">
                <VideoPreview selectedKanji={selectedKanji} />
              </div>
            </>
          )}

          {!selectedCategory && (
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-12 text-center">
              <Video className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                はじめましょう
              </h3>
              <p className="text-gray-600">
                上のカテゴリーを選択して、週間漢字動画シリーズの作成を開始
              </p>
            </div>
          )}
        </div>

        <footer className="mt-16 text-center text-sm text-gray-500 pb-8">
          <div className="space-y-2">
            <p>KanjiFlow Pro - 教育用漢字動画ジェネレーター</p>
            <p className="text-xs">
              機能: 100個以上の厳選された漢字 • 7カテゴリー • 書き順 • 用例 • 動画タイムラインプレビュー
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App;
