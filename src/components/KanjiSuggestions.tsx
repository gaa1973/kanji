import React, { useEffect, useState } from 'react';
import { supabase, KanjiData } from '../lib/supabase';
import { Loader2, RefreshCw } from 'lucide-react';
import { CategoryType } from '../types';

interface KanjiSuggestionsProps {
  category: CategoryType | null;
  selectedKanji: string[];
  onAddKanji: (kanji: string) => void;
  onRandomize: () => void;
}

export function KanjiSuggestions({
  category,
  selectedKanji,
  onAddKanji,
  onRandomize
}: KanjiSuggestionsProps) {
  const [kanji, setKanji] = useState<KanjiData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (category) {
      loadKanjiByCategory(category);
    }
  }, [category]);

  const loadKanjiByCategory = async (cat: CategoryType) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('kanji_library')
        .select('*')
        .eq('category', cat)
        .order('kanji', { ascending: true });

      if (error) throw error;
      setKanji(data || []);
      console.log(`Loaded ${data?.length || 0} kanji for category: ${cat}`);
    } catch (error) {
      console.error('Error loading kanji:', error);
      setError(error instanceof Error ? error.message : '漢字の読み込みに失敗しました');
      setKanji([]);
    } finally {
      setLoading(false);
    }
  };

  if (!category) {
    return (
      <div className="text-center py-12 text-gray-500">
        カテゴリーを選択すると漢字の提案が表示されます
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 mb-2">エラー: {error}</p>
        <button
          onClick={() => category && loadKanjiByCategory(category)}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          再試行
        </button>
      </div>
    );
  }

  if (kanji.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-2">このカテゴリーに漢字が見つかりませんでした</p>
        <p className="text-sm text-gray-400">データベース接続を確認してください</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800">
          利用可能な漢字 ({kanji.length}個)
        </h3>
        <button
          onClick={onRandomize}
          disabled={kanji.length < 7}
          className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          title={kanji.length < 7 ? `7個以上の漢字が必要です（現在: ${kanji.length}個）` : 'クリックして7つランダムに選択'}
        >
          <RefreshCw size={16} />
          ランダム7つ選択
        </button>
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
        {kanji.map((k) => {
          const isSelected = selectedKanji.includes(k.kanji);
          const isDisabled = selectedKanji.length >= 7 && !isSelected;

          return (
            <button
              key={k.id}
              onClick={() => !isSelected && !isDisabled && onAddKanji(k.kanji)}
              disabled={isDisabled}
              className={`aspect-square flex flex-col items-center justify-center rounded-lg border-2 transition-all ${
                isSelected
                  ? 'border-blue-500 bg-blue-50 cursor-not-allowed'
                  : isDisabled
                  ? 'border-gray-200 bg-gray-100 cursor-not-allowed opacity-50'
                  : 'border-gray-200 bg-white hover:border-blue-300 hover:scale-105 cursor-pointer'
              }`}
              title={`${k.kanji} - ${k.meaning} (${k.difficulty})`}
            >
              <span className="text-3xl font-bold">{k.kanji}</span>
              <span className="text-xs text-gray-600 mt-1">{k.meaning}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default KanjiSuggestions;
