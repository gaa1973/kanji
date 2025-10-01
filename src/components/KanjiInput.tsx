import { useState } from 'react';
import { X } from 'lucide-react';

interface KanjiInputProps {
  selectedKanji: string[];
  onKanjiChange: (kanji: string[]) => void;
}

export function KanjiInput({ selectedKanji, onKanjiChange }: KanjiInputProps) {
  const [inputValue, setInputValue] = useState('');

  const handleAddKanji = (kanji: string) => {
    if (kanji && !selectedKanji.includes(kanji) && selectedKanji.length < 7) {
      onKanjiChange([...selectedKanji, kanji]);
    }
  };

  const handleRemoveKanji = (index: number) => {
    onKanjiChange(selectedKanji.filter((_, i) => i !== index));
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      handleAddKanji(inputValue.trim());
      setInputValue('');
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          選択した漢字 ({selectedKanji.length}/7)
        </label>
        <div className="flex flex-wrap gap-2 min-h-[80px] p-3 bg-gray-50 rounded-lg border border-gray-200">
          {selectedKanji.map((kanji, index) => (
            <div
              key={index}
              className="flex items-center gap-2 px-3 py-2 bg-white rounded-md border border-gray-300 shadow-sm"
            >
              <span className="text-2xl font-bold">{kanji}</span>
              <button
                onClick={() => handleRemoveKanji(index)}
                className="text-gray-400 hover:text-red-500 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          ))}
          {selectedKanji.length === 0 && (
            <div className="text-gray-400 text-sm">
              提案から選択するか、手動で入力してください
            </div>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          手動入力
        </label>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="漢字を入力してEnterキーを押す"
          disabled={selectedKanji.length >= 7}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
      </div>
    </div>
  );
}
