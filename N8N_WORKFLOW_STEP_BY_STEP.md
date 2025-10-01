# n8nワークフロー構築：ステップバイステップ

このガイドでは、n8n管理画面で漢字動画生成ワークフローを**手動で**構築する方法を説明します。

---

## 前提条件

- n8nサーバーが起動している（`http://localhost:5678`）
- Replicate APIトークンを取得済み
- Supabase Storageバケットが作成済み
- 音声ファイルをコンテナにアップロード済み

---

## ワークフロー構成の概要

```
[Webhook] → [Set Variable] → [Loop Kanji] → [HTTP Request (Replicate)]
→ [Wait] → [Loop Strokes] → [HTTP Request (Replicate)] → [Code (FFmpeg)]
→ [HTTP Request (Supabase Upload)] → [Respond Webhook]
```

---

## ステップ1: Webhookノードの作成

### 1-1. ノード追加
1. n8n管理画面で「Add workflow」をクリック
2. ワークフロー名を「Kanji Video Generator」に変更
3. キャンバス中央の「Add first step」をクリック
4. 「Webhook」を検索して選択

### 1-2. 設定
- **HTTP Method**: `POST`
- **Path**: `kanji-video-generate`
- **Authentication**: None
- **Response Mode**: When Last Node Finishes

### 1-3. Test Webhook
1. 「Listen for Test Event」をクリック
2. 別のターミナルで以下を実行:

```bash
curl -X POST http://localhost:5678/webhook-test/kanji-video-generate \
  -H "Content-Type: application/json" \
  -d '{
    "kanjiList": [
      {
        "kanji": "水",
        "meaning": "water",
        "category": "nature",
        "difficulty": "N5",
        "totalStrokes": 4,
        "usageExample": {
          "word": "水曜日",
          "reading": "すいようび",
          "translation": "Wednesday"
        }
      }
    ]
  }'
```

3. n8nで「Test step」をクリック
4. データが表示されればOK

---

## ステップ2: Credentialsの設定

実際のAPI呼び出しを行う前に、認証情報を設定します。

### 2-1. Replicate API認証情報

1. 右上のメニューから「Settings」→「Credentials」
2. 「Add Credential」をクリック
3. 「HTTP Header Auth」を選択
4. 設定:
   - **Credential Name**: `Replicate API`
   - **Name**: `Authorization`
   - **Value**: `Token r8_YOUR_TOKEN_HERE`（自分のトークンに置き換え）
5. 「Create」をクリック

### 2-2. Supabase認証情報

1. 「Add Credential」をクリック
2. 「Supabase」を検索して選択
3. 設定:
   - **Credential Name**: `Supabase`
   - **Host**: あなたのSupabase URL（例: `https://xxxxx.supabase.co`）
   - **Service Role Secret**: Supabase Service Role Key
4. 「Create」をクリック

**Supabase Keyの取得方法:**
1. Supabase Dashboard → Project Settings
2. API → Service Role Key（secret）をコピー

---

## ステップ3: 簡略版ワークフローの構築

完全なワークフローは複雑すぎるため、まず**シンプルな概念実証版**を作成します。

### 3-1. Code ノードの追加

1. Webhookノードの下の「+」をクリック
2. 「Code」を検索して選択
3. 「JavaScript」を選択

### 3-2. コードの記述

以下のコードを貼り付け:

```javascript
// 入力データの取得
const kanjiList = $input.first().json.kanjiList;

if (!kanjiList || !Array.isArray(kanjiList)) {
  throw new Error('kanjiList is required');
}

// 各漢字の処理用データを準備
const processedKanji = kanjiList.map((kanji, index) => {
  const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');

  return {
    json: {
      kanji: kanji.kanji,
      meaning: kanji.meaning,
      category: kanji.category,
      difficulty: kanji.difficulty,
      totalStrokes: kanji.totalStrokes,
      usageExample: kanji.usageExample,
      filename: `KanjiFlow_${kanji.kanji}_${dateStr}.mp4`,
      backgroundPrompt: `Japanese calligraphy background, traditional washi paper texture, subtle beige and cream colors, minimalist zen aesthetic, soft lighting, 1080x1920 vertical format`,
      index: index + 1,
      totalCount: kanjiList.length
    }
  };
});

return processedKanji;
```

4. 「Test step」をクリックして動作確認

---

## ステップ4: Replicate API呼び出し（背景画像生成）

### 4-1. HTTP Request ノードの追加

1. Codeノードの下の「+」をクリック
2. 「HTTP Request」を検索して選択

### 4-2. 設定

- **Method**: `POST`
- **URL**: `https://api.replicate.com/v1/predictions`
- **Authentication**: `Replicate API`（先ほど作成した認証情報）
- **Send Body**: Yes
- **Body Content Type**: JSON
- **JSON/RAW Parameters**: 以下を入力

```json
{
  "version": "39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
  "input": {
    "prompt": "={{ $json.backgroundPrompt }}",
    "width": 1080,
    "height": 1920,
    "num_outputs": 1,
    "guidance_scale": 7.5,
    "num_inference_steps": 50
  }
}
```

**注意**: `version`はStable Diffusion XLのモデルIDです。最新版は[Replicate Models](https://replicate.com/stability-ai/sdxl)で確認してください。

### 4-3. Test実行

1. 「Test step」をクリック
2. レスポンスに`id`と`status`が含まれていればOK

---

## ステップ5: Wait ノード（画像生成待機）

Replicateは非同期APIなので、画像生成が完了するまで待機する必要があります。

### 5-1. HTTP Request ノードの追加（ポーリング）

1. 前のノードの下の「+」をクリック
2. 「HTTP Request」を選択

### 5-2. 設定

- **Method**: `GET`
- **URL**: `https://api.replicate.com/v1/predictions/={{ $json.id }}`
- **Authentication**: `Replicate API`

### 5-3. ループ設定

1. ノードの設定画面で「Add Field」をクリック
2. 「Options」→「Retry On Fail」を有効化
3. 設定:
   - **Max Tries**: 20
   - **Wait Between Tries**: 5000（5秒）

### 5-4. If ノードでステータスチェック

1. 「If」ノードを追加
2. 条件:
   - **Condition**: `{{ $json.status }}` equals `succeeded`
3. Trueの場合は次のステップへ
4. Falseの場合は再度HTTPリクエスト（ループ）

---

## ステップ6: FFmpegで動画合成（Code ノード）

### 6-1. Code ノードの追加

1. Ifノードの「True」出力に接続
2. 「Code」ノードを追加

### 6-2. FFmpegコードの記述

```javascript
const { exec } = require('child_process');
const util = require('util');
const fs = require('fs').promises;
const execPromise = util.promisify(exec);

// 入力データ
const kanji = $json.kanji;
const meaning = $json.meaning;
const backgroundImageUrl = $json.output[0]; // Replicateから返された画像URL
const totalStrokes = $json.totalStrokes;

// 背景画像をダウンロード
const backgroundPath = `/tmp/bg_${kanji}.jpg`;
await execPromise(`curl -o ${backgroundPath} "${backgroundImageUrl}"`);

// シンプルな動画生成（背景画像のみ、20秒）
const outputPath = `/tmp/video_${kanji}.mp4`;

const ffmpegCmd = `ffmpeg -loop 1 -i ${backgroundPath} \
  -i /home/node/.n8n/audio/LoFi_Japanese_Chill.mp3 \
  -c:v libx264 -t 20 -pix_fmt yuv420p \
  -c:a aac -b:a 128k -shortest \
  ${outputPath}`;

try {
  const { stdout, stderr } = await execPromise(ffmpegCmd);
  console.log('FFmpeg output:', stdout);

  // 動画ファイルを読み込み
  const videoBuffer = await fs.readFile(outputPath);
  const videoBase64 = videoBuffer.toString('base64');

  return [{
    json: {
      kanji: kanji,
      meaning: meaning,
      videoPath: outputPath,
      videoBase64: videoBase64,
      filename: `KanjiFlow_${kanji}_${Date.now()}.mp4`
    }
  }];
} catch (error) {
  throw new Error(`FFmpeg failed: ${error.message}`);
}
```

### 6-3. 注意事項

この簡略版では：
- 背景画像のみを20秒間表示
- 書き順アニメーションは未実装
- テロップは未実装

完全版を実装するには、さらに複雑なFFmpegコマンドが必要です。

---

## ステップ7: Supabase Storageへアップロード

### 7-1. HTTP Request ノードの追加

1. Codeノードの下に「HTTP Request」ノードを追加

### 7-2. 設定

- **Method**: `POST`
- **URL**: `https://YOUR_SUPABASE_URL/storage/v1/object/kanji-videos/={{ $json.filename }}`
- **Authentication**: Header Auth
  - **Name**: `Authorization`
  - **Value**: `Bearer YOUR_SUPABASE_SERVICE_ROLE_KEY`
- **Send Headers**: Yes
  - **Name**: `Content-Type`
  - **Value**: `video/mp4`
- **Send Body**: Yes
- **Body Content Type**: Raw/Custom
- **Body**: `={{ $json.videoBase64 }}`
- **Specify Body**: Base64

---

## ステップ8: レスポンス返却

### 8-1. Set ノードで結果をまとめる

1. 最後に「Set」ノードを追加
2. 設定:

```json
{
  "success": true,
  "message": "Video generated successfully",
  "downloadUrl": "https://YOUR_SUPABASE_URL/storage/v1/object/public/kanji-videos/={{ $json.filename }}"
}
```

### 8-2. ワークフローを保存

1. 右上の「Save」をクリック
2. ワークフローを「Active」にする

---

## ステップ9: フロントエンドとの連携

### 9-1. Webhook URLの取得

1. Webhookノードをクリック
2. **Production URL**をコピー

例: `http://localhost:5678/webhook/kanji-video-generate`

### 9-2. .envファイルに追加

プロジェクトの`.env`ファイルを編集:

```bash
VITE_N8N_WEBHOOK_URL=http://localhost:5678/webhook/kanji-video-generate
```

### 9-3. アプリケーションを再起動

```bash
npm run dev
```

---

## ステップ10: テスト実行

### 10-1. フロントエンドからテスト

1. ブラウザでアプリを開く
2. 7つの漢字を選択
3. 「Generate Videos」ボタンをクリック

### 10-2. n8nで実行状況を確認

1. n8n管理画面で「Executions」を開く
2. 最新の実行をクリック
3. 各ノードの実行結果を確認

### 10-3. エラーが出た場合

- 各ノードの出力を確認
- エラーメッセージを読む
- Credentials（認証情報）が正しいか確認

---

## 制限事項と今後の改善

### 現在の簡略版の制限

1. **書き順アニメーションなし** - 背景画像のみ表示
2. **テロップなし** - 文字情報の合成未実装
3. **1漢字のみ処理** - ループ処理未実装
4. **ZIP圧縮なし** - 個別動画のみ

### 完全版の実装に必要なこと

1. **ループノード**でkanjiListを反復処理
2. **書き順画像生成**のサブワークフロー
3. **複雑なFFmpegコマンド**でテロップ合成
4. **Code ノード**でZIP圧縮
5. **エラーハンドリング**の追加

---

## 推奨: 外部動画編集サービスの利用

n8nで完全な動画編集を実装するのは複雑すぎるため、以下のような外部サービスの利用を検討してください：

### オプション1: Remotion（React-based video）
- [Remotion](https://www.remotion.dev/)
- Reactコンポーネントとして動画を作成
- n8nからRemotion Lambda API呼び出し

### オプション2: Shotstack API
- [Shotstack](https://shotstack.io/)
- JSON定義で動画を生成
- テロップ、トランジション、音楽の合成が簡単

### オプション3: Creatomate
- [Creatomate](https://creatomate.com/)
- テンプレートベースの動画生成
- APIで簡単に操作

これらのサービスを使えば、FFmpegの複雑さを回避できます。

---

## サポート

- n8n Community: [community.n8n.io](https://community.n8n.io/)
- Replicate Documentation: [replicate.com/docs](https://replicate.com/docs)
- FFmpeg Documentation: [ffmpeg.org/documentation.html](https://ffmpeg.org/documentation.html)
