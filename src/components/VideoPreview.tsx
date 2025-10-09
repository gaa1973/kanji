import { useEffect, useState } from 'react';
import { supabase, KanjiData } from '../lib/supabase';
import { Loader2, Download, Play, CheckCircle } from 'lucide-react';
import { generateKanjiVideoScenes, downloadScenes } from '../lib/videoGenerator';

interface VideoPreviewProps {
  selectedKanji: string[];
}

interface KanjiDetails extends KanjiData {
  videoTimeline: {
    opening: string;
    introduction: string;
    strokeDemo: string;
    usage: string;
    conclusion: string;
  };
}

export function VideoPreview({ selectedKanji }: VideoPreviewProps) {
  const [kanjiDetails, setKanjiDetails] = useState<KanjiDetails[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generatedZips, setGeneratedZips] = useState<{ kanji: string; sceneCount: number }[]>([]);

  useEffect(() => {
    if (selectedKanji.length > 0) {
      loadKanjiDetails();
    } else {
      setKanjiDetails([]);
    }
  }, [selectedKanji]);

  const loadKanjiDetails = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('kanji_library')
        .select('*')
        .in('kanji', selectedKanji);

      if (error) throw error;

      const orderedData = selectedKanji
        .map(k => data?.find(d => d.kanji === k))
        .filter(Boolean) as KanjiData[];

      const detailsWithTimeline = orderedData.map(k => ({
        ...k,
        videoTimeline: {
          opening: '0.0s - 1.0s: "Today\'s Kanji" + "Can you write this?" (黒背景)',
          introduction: `1.0s - 4.0s: "Why this Kanji?" + "Category: ${k.category.toUpperCase()}" (黒背景)`,
          strokeDemo: `4.0s - 14.0s: 書き順デモ ${k.total_strokes ?? '?'}画 (背景画像 + テロップ "Stroke i/${k.total_strokes ?? '?'}")`,
          usage: `14.0s - 17.0s: "How to use it?" + Example (黒背景)`,
          conclusion: `17.0s - 20.0s: ${k.kanji} = ${k.meaning ?? ''} + "Level: ${k.difficulty ?? ''}" + "Share if you learned!" (黒背景)`
        }
      }));

      setKanjiDetails(detailsWithTimeline);
    } catch (error) {
      console.error('Error loading kanji details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setGenerationProgress(0);
    setGeneratedZips([]);

    try {
      const n8nWebhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL ||
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-kanji-videos`;

      const requestData = kanjiDetails.map(k => ({
        kanji: k.kanji,
        meaning: k.meaning,
        category: k.category,
        difficulty: k.difficulty,
        totalStrokes: k.total_strokes,
        usageExample: (Array.isArray(k.usage_examples) && k.usage_examples[0]) || { word: '', reading: '', translation: '' },
      }));

      setGenerationProgress(30);

      const response = await fetch(n8nWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(import.meta.env.VITE_N8N_WEBHOOK_URL ? {} : {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          })
        },
        body: JSON.stringify({ kanjiList: requestData }),
      });

      if (!response.ok) {
        throw new Error('動画生成リクエストが失敗しました');
      }

      const result = await response.json();
      setGenerationProgress(100);

      if (result.success && result.downloadUrl) {
        const results = requestData.map(k => ({
          kanji: k.kanji,
          sceneCount: 5
        }));
        setGeneratedZips(results);

        const a = document.createElement('a');
        a.href = result.downloadUrl;
        a.download = `KanjiFlow_Weekly_${new Date().toISOString().split('T')[0]}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        alert(`動画生成が完了しました！\n\nZIPファイルのダウンロードが開始されました。`);
      } else {
        const results = requestData.map(k => ({
          kanji: k.kanji,
          sceneCount: 5
        }));
        setGeneratedZips(results);

        alert(`動画生成リクエストを受け付けました。\n\n処理時間: 15-35分（7動画）\n\nn8nワークフローが必要です。詳細はn8n-workflow-spec.jsonを参照してください。`);
      }
    } catch (error) {
      console.error('Error generating videos:', error);
      alert('動画生成中にエラーが発生しました。もう一度お試しください。');
    } finally {
      setGenerating(false);
    }
  };

  if (selectedKanji.length === 0) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800">
          Video Preview ({kanjiDetails.length}/7)
        </h3>
{selectedKanji.length === 7 && !generating && generatedZips.length === 0 && (
          <button
            onClick={handleGenerate}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all shadow-md hover:shadow-lg text-lg font-semibold"
          >
            <Download size={24} />
            動画シーンを生成・ダウンロード
          </button>
        )}
{generating && (
          <div className="flex items-center gap-3 px-6 py-3 bg-blue-50 border-2 border-blue-300 rounded-lg">
            <Loader2 className="animate-spin text-blue-600" size={24} />
            <span className="text-blue-800 font-semibold">
              生成中... {Math.round(generationProgress)}%
            </span>
          </div>
        )}
{generatedZips.length > 0 && (
          <div className="flex items-center gap-2 px-6 py-3 bg-green-50 border-2 border-green-500 rounded-lg text-green-700">
            <CheckCircle size={24} />
            <span className="font-semibold">{generatedZips.length}個のZIPをダウンロード済み</span>
          </div>
        )}
      </div>

      {selectedKanji.length < 7 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            あと {7 - selectedKanji.length} 個の漢字を選択してください（7個必要）
          </p>
        </div>
      )}

{generatedZips.length > 0 && (
        <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200 rounded-lg p-6">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="text-green-600 flex-shrink-0 mt-1" size={24} />
              <div className="flex-1">
                <h4 className="text-lg font-semibold text-gray-800 mb-2">
                  動画生成リクエストが完了しました！
                </h4>
                <p className="text-sm text-gray-600 mb-4">
                  {generatedZips.length}個の漢字動画が処理キューに追加されました。
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-blue-800 font-semibold mb-2">処理ステップ（各動画）:</p>
                  <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
                    <li>背景画像を生成（Image Generation Tool - 1080x1920 jpg）</li>
                    <li>書き順シーケンス画像を生成（各画数ごとにPNG）</li>
                    <li>FFmpegで動画を合成（20秒、BGM・効果音付き）</li>
                    <li>指定タイミングでテロップを挿入</li>
                    <li>MP4ファイルとしてエクスポート</li>
                    <li>全動画をZIPに圧縮</li>
                    <li>一時ファイルをクリーンアップ</li>
                  </ol>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-yellow-800 font-semibold mb-2">必要な要件:</p>
                  <ul className="text-xs text-yellow-700 space-y-1 list-disc list-inside">
                    <li>画像生成API（Stable Diffusion / Midjourney / DALL-E）</li>
                    <li>FFmpeg（動画合成・編集用）</li>
                    <li>音声ファイル: LoFi_Japanese_Chill.mp3, brush_strike.wav</li>
                    <li>十分なサーバーストレージと処理能力</li>
                  </ul>
                </div>
                <div className="grid grid-cols-3 md:grid-cols-7 gap-2">
                  {generatedZips.map((zip, idx) => (
                    <div
                      key={idx}
                      className="bg-white border-2 border-green-300 rounded-lg p-2 text-center"
                    >
                      <div className="text-2xl mb-1">{zip.kanji}</div>
                      <div className="text-xs text-gray-600">キュー済</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {kanjiDetails.map((kanji, index) => (
          <div
            key={kanji.id}
            className="bg-white rounded-lg border-2 border-gray-200 overflow-hidden"
          >
            <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-5xl font-bold">{kanji.kanji}</span>
                  <div>
                    <h4 className="text-lg font-semibold text-gray-800">
                      {kanji.meaning}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {kanji.total_strokes} strokes • {kanji.difficulty} • {kanji.category}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  <Play size={16} />
                  {expandedIndex === index ? '閉じる' : 'プレビュー'}
                </button>
              </div>
            </div>

            {expandedIndex === index && (
              <div className="p-6 space-y-4 bg-gray-50">
                <div className="aspect-[9/16] max-w-[300px] mx-auto bg-gradient-to-b from-gray-800 to-gray-900 rounded-lg overflow-hidden shadow-xl">
                  <div className="h-full flex flex-col items-center justify-center text-white p-6">
                    <div className="text-center space-y-4">
                      <div className="text-sm opacity-75">Today's Kanji</div>
                      <div className="text-7xl font-bold my-8">{kanji.kanji}</div>
                      <div className="text-2xl">{kanji.meaning}</div>
                      <div className="text-sm opacity-75 mt-4">
                        {Array.isArray(kanji.usage_examples) && kanji.usage_examples.length > 0
                          ? `${kanji.usage_examples[0].word} (${kanji.usage_examples[0].reading})`
                          : ''}
                      </div>
                      <div className="text-xs opacity-50 mt-2">
                        {kanji.usage_examples[0]?.translation}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h5 className="font-semibold text-gray-700">動画タイムライン（20秒）</h5>
                  <div className="space-y-1 text-sm">
                    <div className="p-2 bg-white rounded">{kanji.videoTimeline.opening}</div>
                    <div className="p-2 bg-white rounded">{kanji.videoTimeline.introduction}</div>
                    <div className="p-2 bg-white rounded">{kanji.videoTimeline.strokeDemo}</div>
                    <div className="p-2 bg-white rounded">{kanji.videoTimeline.usage}</div>
                    <div className="p-2 bg-white rounded">{kanji.videoTimeline.conclusion}</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h5 className="font-semibold text-gray-700">オーディオ</h5>
                  <div className="text-sm space-y-1">
                    <div className="p-2 bg-white rounded">BGM: Lo-fi Japanese Chill</div>
                    <div className="p-2 bg-white rounded">効果音: 筆の音（各0.1秒）</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
