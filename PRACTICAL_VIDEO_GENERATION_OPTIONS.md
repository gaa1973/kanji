# 実用的な動画生成オプション

n8nでの完全な動画生成は複雑です。**より実用的な3つのアプローチ**を紹介します。

---

## オプション1: Shotstack API（推奨）⭐

### 概要
- JSONテンプレートで動画を定義
- API呼び出しで動画を生成
- テロップ、トランジション、音楽の合成が簡単
- n8nとの統合が容易

### メリット
✅ FFmpegの知識不要
✅ 複雑なタイムラインも簡単に定義
✅ レンダリングが高速（クラウドで並列処理）
✅ n8nから簡単に呼び出し可能

### コスト
- 無料枠: 20動画/月
- Pro: $49/月（500動画）
- **7動画/週 = 月28動画 → Pro プラン推奨**

### セットアップ手順

#### 1. Shotstackアカウント作成
```
https://shotstack.io/
→ Sign Up
→ Free Trial開始（クレジットカード不要）
```

#### 2. APIキーの取得
```
Dashboard → Settings → API Keys
→ "Create API Key"
→ キーをコピー
```

#### 3. n8n HTTPリクエストノードの設定

**URL**: `https://api.shotstack.io/v1/render`
**Method**: `POST`
**Headers**:
```json
{
  "x-api-key": "YOUR_SHOTSTACK_API_KEY",
  "Content-Type": "application/json"
}
```

**Body**（漢字動画用テンプレート）:
```json
{
  "timeline": {
    "background": "#000000",
    "tracks": [
      {
        "clips": [
          {
            "asset": {
              "type": "title",
              "text": "Today's Kanji\nCan you write this?",
              "style": "minimal",
              "color": "#ffffff",
              "size": "medium"
            },
            "start": 0,
            "length": 1
          },
          {
            "asset": {
              "type": "title",
              "text": "Why this Kanji?\nCategory: {{ $json.category }}",
              "style": "minimal",
              "color": "#ffffff",
              "size": "medium"
            },
            "start": 1,
            "length": 3
          },
          {
            "asset": {
              "type": "image",
              "src": "{{ $json.backgroundImageUrl }}"
            },
            "start": 4,
            "length": 10
          },
          {
            "asset": {
              "type": "title",
              "text": "{{ $json.kanji }}\n{{ $json.meaning }}",
              "style": "minimal",
              "color": "#ffffff",
              "size": "large"
            },
            "start": 17,
            "length": 3
          }
        ]
      },
      {
        "clips": [
          {
            "asset": {
              "type": "audio",
              "src": "https://your-supabase-url/storage/v1/object/public/audio/LoFi_Japanese_Chill.mp3",
              "volume": 0.5
            },
            "start": 0,
            "length": 20
          }
        ]
      }
    ]
  },
  "output": {
    "format": "mp4",
    "resolution": "1080x1920",
    "fps": 30,
    "quality": "high"
  }
}
```

#### 4. ステータスチェック（ポーリング）

レンダリングは非同期なので、完了を待つ必要があります：

```javascript
// Waitノード（5秒間隔で20回リトライ）
const renderId = $json.response.id;
const statusUrl = `https://api.shotstack.io/v1/render/${renderId}`;

// HTTP Requestノードで定期的にステータスチェック
// status === "done" になったらURL取得
```

#### 5. 完成動画のダウンロード

```javascript
if ($json.response.status === 'done') {
  const videoUrl = $json.response.url;
  // Supabase Storageにアップロード
}
```

### 完全なn8nワークフロー（Shotstack版）

```
[Webhook]
  → [Loop Kanji List]
    → [HTTP: Replicate - 背景画像生成]
    → [Wait: 画像生成完了]
    → [HTTP: Shotstack - 動画レンダリング開始]
    → [Wait: レンダリング完了（5秒×20回）]
    → [HTTP: 動画ダウンロード]
    → [HTTP: Supabase Storageにアップロード]
  → [Code: ZIP圧縮]
  → [HTTP: ZIPをSupabaseにアップロード]
  → [Respond Webhook]
```

**所要時間**: 1漢字あたり2-3分（並列処理で高速化可能）

---

## オプション2: Remotion（React-based）

### 概要
- Reactコンポーネントとして動画を定義
- TypeScriptで完全な制御
- Remotion Lambdaでクラウドレンダリング

### メリット
✅ 完全なプログラマブル制御
✅ Reactの知識が活かせる
✅ 複雑なアニメーションも可能
✅ ローカルでプレビュー可能

### デメリット
❌ セットアップが複雑
❌ Reactの知識が必要
❌ コストが高い（$1/分のレンダリング時間）

### コスト
- Remotion Lambda: $0.05/分のレンダリング
- 1動画（20秒）= 約$0.017
- 7動画 = 約$0.12/週
- **月額約$0.50**

### セットアップ手順

#### 1. Remotionプロジェクトの作成

```bash
npm init video kanjiflow-videos
cd kanjiflow-videos
npm install
```

#### 2. 動画コンポーネントの作成

`src/Kanji Video.tsx`:
```tsx
import { AbsoluteFill, Sequence, staticFile, Audio, Img } from 'remotion';

export const KanjiVideo: React.FC<{
  kanji: string;
  meaning: string;
  category: string;
  backgroundUrl: string;
}> = ({ kanji, meaning, category, backgroundUrl }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: 'black' }}>
      {/* Opening: 0-1s (30 frames) */}
      <Sequence from={0} durationInFrames={30}>
        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
          <h1 style={{ color: 'white', fontSize: 60 }}>Today's Kanji</h1>
          <h2 style={{ color: 'white', fontSize: 40 }}>Can you write this?</h2>
        </AbsoluteFill>
      </Sequence>

      {/* Category: 1-4s (90 frames) */}
      <Sequence from={30} durationInFrames={90}>
        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
          <h1 style={{ color: 'white', fontSize: 50 }}>Why this Kanji?</h1>
          <h2 style={{ color: 'white', fontSize: 60 }}>Category: {category}</h2>
        </AbsoluteFill>
      </Sequence>

      {/* Strokes: 4-14s (300 frames) */}
      <Sequence from={120} durationInFrames={300}>
        <Img src={backgroundUrl} style={{ width: '100%', height: '100%' }} />
        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
          <h1 style={{ fontSize: 200, color: 'black' }}>{kanji}</h1>
        </AbsoluteFill>
      </Sequence>

      {/* Usage: 14-17s (90 frames) */}
      <Sequence from={420} durationInFrames={90}>
        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
          <h1 style={{ color: 'white', fontSize: 50 }}>How to use it?</h1>
          <h2 style={{ color: 'white', fontSize: 60 }}>水曜日</h2>
        </AbsoluteFill>
      </Sequence>

      {/* Conclusion: 17-20s (90 frames) */}
      <Sequence from={510} durationInFrames={90}>
        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
          <h1 style={{ fontSize: 150 }}>{kanji}</h1>
          <h2 style={{ fontSize: 60 }}>= {meaning}</h2>
        </AbsoluteFill>
      </Sequence>

      {/* Audio */}
      <Audio src={staticFile('LoFi_Japanese_Chill.mp3')} volume={0.5} />
    </AbsoluteFill>
  );
};
```

#### 3. Remotion Lambdaの設定

```bash
npx remotion lambda sites create src/index.ts --site-name=kanjiflow
npx remotion lambda render <site-id> KanjiVideo --props='{"kanji":"水","meaning":"water"}'
```

#### 4. n8nからAPI呼び出し

```javascript
// n8n Code ノード
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const props = JSON.stringify({
  kanji: $json.kanji,
  meaning: $json.meaning,
  category: $json.category,
  backgroundUrl: $json.backgroundImageUrl
});

const cmd = `npx remotion lambda render <site-id> KanjiVideo --props='${props}'`;
const { stdout } = await execPromise(cmd);

// 出力URLを取得
const videoUrl = stdout.match(/https:\/\/.+\.mp4/)[0];
return [{ json: { videoUrl } }];
```

---

## オプション3: CapCut API（最もシンプル）

### 概要
- TikTokの親会社ByteDanceが提供
- スマホアプリで有名なCapCutのAPI版
- 縦型動画に最適化

### メリット
✅ 縦型動画に最適
✅ TikTok向けに最適化済み
✅ テンプレートが豊富
✅ 自動編集機能あり

### デメリット
❌ ベータ版（招待制）
❌ 日本語ドキュメントが少ない

### 現在の状況
- 2024年時点でベータ版
- [CapCut for Developers](https://www.capcut.com/tools/api)から申請

---

## 比較表

| 項目 | Shotstack | Remotion | CapCut | n8n+FFmpeg |
|------|-----------|----------|---------|------------|
| セットアップ難易度 | ⭐ 簡単 | ⭐⭐⭐ 難しい | ⭐⭐ 普通 | ⭐⭐⭐⭐⭐ 非常に難しい |
| 月額コスト（28動画） | $49 | $0.50 | 不明 | $1.68 |
| n8n統合 | ⭐⭐⭐⭐⭐ 最高 | ⭐⭐⭐ 良い | ⭐⭐⭐ 良い | ⭐⭐ 困難 |
| カスタマイズ性 | ⭐⭐⭐ 中 | ⭐⭐⭐⭐⭐ 最高 | ⭐⭐⭐⭐ 高 | ⭐⭐⭐⭐⭐ 最高 |
| レンダリング速度 | 速い | 普通 | 速い | 遅い |
| エラーハンドリング | 簡単 | 普通 | 簡単 | 困難 |

---

## 推奨アプローチ

### 初心者・迅速な実装が必要な場合
→ **Shotstack API** を使用

### 完全な制御が必要・予算が限られている場合
→ **Remotion** を使用

### プロトタイプ・学習目的の場合
→ **n8n + FFmpeg**（簡略版）

---

## 実装サンプル: Shotstack版

n8nワークフローの完全な実装例を`shotstack-workflow-example.json`として提供できます。

興味がある場合は、以下のコマンドで生成できます：

```bash
# Shotstackワークフロー生成スクリプト（仮）
node scripts/generate-shotstack-workflow.js
```

---

## 次のステップ

1. どのオプションを選択するか決定
2. 該当サービスのアカウント作成
3. APIキーの取得
4. n8nワークフローの構築
5. テスト実行

**推奨**: まずShotstackの無料トライアルで試してみる
