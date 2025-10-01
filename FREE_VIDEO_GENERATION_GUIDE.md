# 完全無料で動画生成する方法

月額0円で漢字学習動画を生成する方法を説明します。

---

## 🆓 完全無料構成

| 項目 | サービス | コスト |
|------|----------|--------|
| n8nサーバー | セルフホスト（Docker） | **無料** |
| 画像生成 | Hugging Face Inference API | **無料**（制限あり） |
| 動画合成 | FFmpeg | **無料** |
| 音声ファイル | Pixabay | **無料** |
| ストレージ | Supabase（1GB以下） | **無料** |
| **合計** | | **月額0円** |

---

## 無料サービスの制限事項

### Hugging Face Inference API（無料枠）
- リクエスト制限: 1000回/日
- 画像生成速度: 遅い（1枚30-60秒）
- 品質: Replicate/DALL-Eより劣る
- **7動画/週（約77枚）は問題なく無料範囲内**

### Supabase Storage
- 無料枠: 1GB
- 転送量: 2GB/月
- **動画1本50MB × 28本 = 1.4GB → ギリギリ**
- 対策: 古い動画を定期削除

---

## セットアップ手順

### ステップ1: Hugging Face APIトークン取得（無料）

#### 1-1. アカウント作成
```bash
# ブラウザで開く
open https://huggingface.co/join
```
- メールアドレスで登録（クレジットカード不要）
- メール認証を完了

#### 1-2. APIトークン取得
1. ログイン後、右上のアイコンをクリック
2. 「Settings」を選択
3. 左メニューから「Access Tokens」をクリック
4. 「New token」をクリック
5. トークン名: `kanji-video-generator`
6. Role: `Read`
7. 「Generate a token」をクリック
8. **トークンをコピー**（形式: `hf_xxxxx...`）

### ステップ2: n8nサーバーの起動（無料）

```bash
# 作業ディレクトリ作成
mkdir ~/n8n-kanji-free && cd ~/n8n-kanji-free

# Dockerfile作成
cat > Dockerfile << 'EOF'
FROM n8nio/n8n:latest
USER root

# FFmpegとImageMagickをインストール
RUN apk add --no-cache \
    ffmpeg \
    imagemagick \
    curl \
    zip \
    python3 \
    py3-pip

# 日本語フォントのインストール
RUN apk add --no-cache \
    font-noto-cjk

# 音声とフォント用ディレクトリ作成
RUN mkdir -p /home/node/.n8n/audio && \
    mkdir -p /home/node/.n8n/fonts && \
    chown -R node:node /home/node/.n8n

USER node
EXPOSE 5678
CMD ["n8n"]
EOF

# ビルド
docker build -t n8n-kanji-free .

# 起動
docker run -d \
  --name n8n-kanji-free \
  -p 5678:5678 \
  -e N8N_BASIC_AUTH_ACTIVE=true \
  -e N8N_BASIC_AUTH_USER=admin \
  -e N8N_BASIC_AUTH_PASSWORD=kanji2024 \
  -e GENERIC_TIMEZONE=Asia/Tokyo \
  -v ~/n8n-data-free:/home/node/.n8n \
  n8n-kanji-free

# 確認
docker ps
docker logs n8n-kanji-free
```

**アクセス:** http://localhost:5678

### ステップ3: 音声ファイルのダウンロード（無料）

#### 3-1. Pixabayから音楽をダウンロード

1. [Pixabay Music - Lo-fi](https://pixabay.com/music/search/lofi/)にアクセス
2. 適切なLo-fi音楽を選択（20秒以上）
3. 「Free Download」をクリック
4. MP3形式でダウンロード

#### 3-2. 効果音のダウンロード

1. [Pixabay Sound Effects](https://pixabay.com/sound-effects/search/brush/)
2. 筆音を選択してダウンロード

#### 3-3. ファイル名変更とアップロード

```bash
# ダウンロードフォルダで実行
mv ~/Downloads/lofi-music-*.mp3 ~/Downloads/LoFi_Japanese_Chill.mp3
mv ~/Downloads/brush-sound-*.wav ~/Downloads/brush_strike.wav

# コンテナにコピー
docker cp ~/Downloads/LoFi_Japanese_Chill.mp3 n8n-kanji-free:/home/node/.n8n/audio/
docker cp ~/Downloads/brush_strike.wav n8n-kanji-free:/home/node/.n8n/audio/

# 確認
docker exec n8n-kanji-free ls -la /home/node/.n8n/audio/
```

### ステップ4: Supabase Storageバケット作成（無料枠内）

```sql
-- Supabase SQL Editorで実行

-- kanji-images バケット（一時的な画像保存、1時間後自動削除）
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('kanji-images', 'kanji-images', false, 10485760);

-- kanji-videos バケット（完成動画保存）
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('kanji-videos', 'kanji-videos', true, 52428800);

-- RLSポリシー
CREATE POLICY "Service role full access to kanji-images"
  ON storage.objects FOR ALL TO service_role
  USING (bucket_id = 'kanji-images')
  WITH CHECK (bucket_id = 'kanji-images');

CREATE POLICY "Service role full access to kanji-videos"
  ON storage.objects FOR ALL TO service_role
  USING (bucket_id = 'kanji-videos')
  WITH CHECK (bucket_id = 'kanji-videos');

CREATE POLICY "Anyone can view kanji videos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'kanji-videos');

-- 古いファイル自動削除用の関数（ストレージ節約）
CREATE OR REPLACE FUNCTION delete_old_videos()
RETURNS void AS $$
BEGIN
  DELETE FROM storage.objects
  WHERE bucket_id = 'kanji-videos'
  AND created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- 毎日実行するcron設定（Supabaseの場合はpg_cronが必要）
-- 手動で月1回実行でもOK
```

---

## n8nワークフロー構築（完全無料版）

### アーキテクチャ

```
[Webhook]
  ↓
[Supabase: 漢字データ取得]
  ↓
[Loop: 各漢字]
  ↓
[Code: 背景画像生成（ImageMagick）] ← 無料
  ↓
[Code: 書き順画像生成（ImageMagick）] ← 無料
  ↓
[Code: FFmpegで動画合成] ← 無料
  ↓
[HTTP: Supabase Storageにアップロード] ← 無料
  ↓
[Loop終了]
  ↓
[Code: ZIP圧縮]
  ↓
[HTTP: ZIPをSupabaseにアップロード]
  ↓
[Respond Webhook]
```

**重要:** Hugging Face APIの代わりに**ImageMagick**で画像生成します（完全にローカル、無料）

---

## n8nワークフロー実装

### ノード1: Webhook

**設定:**
- HTTP Method: POST
- Path: `kanji-video-generate`
- Response Mode: When Last Node Finishes

### ノード2: Supabase - Fetch Kanji Data

**設定:**
- Resource: Run SQL Query
- Operation: Execute Query

**SQL:**
```sql
SELECT
  kanji,
  meaning,
  category,
  difficulty,
  total_strokes,
  stroke_order,
  usage_examples
FROM kanji_library
WHERE kanji = ANY(ARRAY[
  {{ $json.kanjiList.map(k => `'${k.kanji}'`).join(',') }}
]);
```

### ノード3: Code - Generate Images with ImageMagick

ImageMagickを使って画像を生成します（AI不要、完全無料）。

**JavaScript Code:**
```javascript
const { exec } = require('child_process');
const util = require('util');
const fs = require('fs').promises;
const execPromise = util.promisify(exec);

const kanji = $json.kanji;
const meaning = $json.meaning;
const category = $json.category;
const totalStrokes = $json.total_strokes;

// 一時ディレクトリ作成
const tmpDir = `/tmp/kanji_${kanji}_${Date.now()}`;
await execPromise(`mkdir -p ${tmpDir}`);

// 1. 背景画像生成（和紙風テクスチャ）
const bgPath = `${tmpDir}/background.jpg`;
await execPromise(`
  convert -size 1080x1920 \
    plasma:fractal \
    -colorspace Gray \
    -brightness-contrast 20x-10 \
    -blur 0x2 \
    -fill '#F5F5DC' -colorize 100% \
    ${bgPath}
`);

// 2. オープニング画像（黒背景）
const openingPath = `${tmpDir}/opening.jpg`;
await execPromise(`
  convert -size 1080x1920 xc:black \
    -gravity center \
    -pointsize 80 -fill white \
    -annotate +0-100 "Today's Kanji" \
    -pointsize 60 -fill white \
    -annotate +0+100 "Can you write this?" \
    ${openingPath}
`);

// 3. カテゴリー画像
const categoryPath = `${tmpDir}/category.jpg`;
await execPromise(`
  convert -size 1080x1920 xc:black \
    -gravity center \
    -pointsize 70 -fill white \
    -annotate +0-100 "Why this Kanji?" \
    -pointsize 90 -fill '#FFD700' \
    -annotate +0+100 "Category: ${category}" \
    ${categoryPath}
`);

// 4. 書き順画像（漢字を大きく表示）
const strokesPath = `${tmpDir}/strokes.jpg`;
await execPromise(`
  convert ${bgPath} \
    -gravity center \
    -font "Noto-Sans-CJK-JP" \
    -pointsize 600 -fill black \
    -annotate +0+0 "${kanji}" \
    -pointsize 100 -fill '#333333' \
    -annotate +0+700 "${meaning}" \
    ${strokesPath}
`);

// 5. 使用例画像
const usageExample = $json.usage_examples[0] || { word: '', reading: '', translation: '' };
const usagePath = `${tmpDir}/usage.jpg`;
await execPromise(`
  convert -size 1080x1920 xc:black \
    -gravity center \
    -pointsize 70 -fill white \
    -annotate +0-200 "How to use it?" \
    -pointsize 120 -fill '#FFD700' \
    -annotate +0+0 "${usageExample.word}" \
    -pointsize 60 -fill white \
    -annotate +0+150 "${usageExample.reading}" \
    -pointsize 50 -fill '#CCCCCC' \
    -annotate +0+250 "${usageExample.translation}" \
    ${usagePath}
`);

// 6. まとめ画像
const conclusionPath = `${tmpDir}/conclusion.jpg`;
await execPromise(`
  convert -size 1080x1920 xc:black \
    -gravity center \
    -font "Noto-Sans-CJK-JP" \
    -pointsize 400 -fill white \
    -annotate +0-200 "${kanji}" \
    -pointsize 80 -fill white \
    -annotate +0+200 "= ${meaning}" \
    -pointsize 60 -fill '#FFD700' \
    -annotate +0+350 "Level: ${$json.difficulty}" \
    ${conclusionPath}
`);

return [{
  json: {
    kanji: kanji,
    meaning: meaning,
    tmpDir: tmpDir,
    openingPath: openingPath,
    categoryPath: categoryPath,
    strokesPath: strokesPath,
    usagePath: usagePath,
    conclusionPath: conclusionPath
  }
}];
```

### ノード4: Code - Generate Video with FFmpeg

**JavaScript Code:**
```javascript
const { exec } = require('child_process');
const util = require('util');
const fs = require('fs').promises;
const execPromise = util.promisify(exec);

const kanji = $json.kanji;
const tmpDir = $json.tmpDir;
const outputPath = `${tmpDir}/video_${kanji}.mp4`;

// FFmpegで動画生成（20秒）
const ffmpegCmd = `
ffmpeg \
  -loop 1 -t 1 -i ${$json.openingPath} \
  -loop 1 -t 3 -i ${$json.categoryPath} \
  -loop 1 -t 10 -i ${$json.strokesPath} \
  -loop 1 -t 3 -i ${$json.usagePath} \
  -loop 1 -t 3 -i ${$json.conclusionPath} \
  -i /home/node/.n8n/audio/LoFi_Japanese_Chill.mp3 \
  -filter_complex " \
    [0:v]scale=1080:1920,setsar=1,fps=30[v0]; \
    [1:v]scale=1080:1920,setsar=1,fps=30[v1]; \
    [2:v]scale=1080:1920,setsar=1,fps=30[v2]; \
    [3:v]scale=1080:1920,setsar=1,fps=30[v3]; \
    [4:v]scale=1080:1920,setsar=1,fps=30[v4]; \
    [v0][v1][v2][v3][v4]concat=n=5:v=1:a=0[outv] \
  " \
  -map "[outv]" -map 5:a \
  -c:v libx264 -preset fast -crf 23 \
  -c:a aac -b:a 128k \
  -t 20 \
  -pix_fmt yuv420p \
  -y ${outputPath}
`;

try {
  const { stdout, stderr } = await execPromise(ffmpegCmd, {
    maxBuffer: 50 * 1024 * 1024
  });

  console.log('FFmpeg completed:', stdout);

  // 動画ファイルを読み込み
  const videoBuffer = await fs.readFile(outputPath);
  const videoBase64 = videoBuffer.toString('base64');
  const fileSize = videoBuffer.length;

  return [{
    json: {
      kanji: kanji,
      videoPath: outputPath,
      videoBase64: videoBase64,
      fileSize: fileSize,
      filename: `KanjiFlow_${kanji}_${new Date().toISOString().split('T')[0].replace(/-/g, '')}.mp4`,
      tmpDir: tmpDir
    }
  }];
} catch (error) {
  console.error('FFmpeg error:', error);
  throw new Error(`Video generation failed: ${error.message}`);
}
```

### ノード5: HTTP Request - Upload to Supabase Storage

**設定:**
- Method: POST
- URL: `{{ $env.SUPABASE_URL }}/storage/v1/object/kanji-videos/{{ $json.filename }}`
- Authentication: Header Auth
  - Name: `Authorization`
  - Value: `Bearer {{ $env.SUPABASE_SERVICE_ROLE_KEY }}`
- Headers:
  - `Content-Type`: `video/mp4`
- Send Binary Data: Yes
- Binary Property: `videoBase64`

### ノード6: Code - Cleanup Temp Files

**JavaScript Code:**
```javascript
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const tmpDir = $json.tmpDir;

// 一時ファイルを削除
await execPromise(`rm -rf ${tmpDir}`);

return [{
  json: {
    kanji: $json.kanji,
    videoUrl: `${process.env.SUPABASE_URL}/storage/v1/object/public/kanji-videos/${$json.filename}`,
    cleaned: true
  }
}];
```

### ノード7: Respond to Webhook

**設定:**
- Response Code: 200
- Response Body:
```json
{
  "success": true,
  "message": "Video generated successfully",
  "downloadUrl": "={{ $json.videoUrl }}"
}
```

---

## 環境変数の設定

n8nコンテナに環境変数を追加:

```bash
docker stop n8n-kanji-free

docker run -d \
  --name n8n-kanji-free \
  -p 5678:5678 \
  -e N8N_BASIC_AUTH_ACTIVE=true \
  -e N8N_BASIC_AUTH_USER=admin \
  -e N8N_BASIC_AUTH_PASSWORD=kanji2024 \
  -e SUPABASE_URL=YOUR_SUPABASE_URL \
  -e SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY \
  -e GENERIC_TIMEZONE=Asia/Tokyo \
  -v ~/n8n-data-free:/home/node/.n8n \
  n8n-kanji-free
```

---

## フロントエンドの設定

`.env`ファイルに追加:
```bash
VITE_N8N_WEBHOOK_URL=http://localhost:5678/webhook/kanji-video-generate
```

---

## テスト実行

### 1. n8nワークフローをActiveにする

### 2. Webhook URLをコピー

### 3. curlでテスト

```bash
curl -X POST http://localhost:5678/webhook/kanji-video-generate \
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

### 4. n8nで実行状況を確認

---

## 無料版の制限と対策

### 制限1: 画像品質がAI生成より劣る
**対策:** ImageMagickでシンプルで美しいデザイン重視

### 制限2: 書き順アニメーションが難しい
**対策:** 書き順は静止画で全体表示（アニメーションなし）

### 制限3: Supabase Storageが1GBまで
**対策:**
- 動画を月1回削除
- 解像度を下げる（720p）
- ビットレートを下げる

---

## コスト比較

| 構成 | 月額コスト |
|------|-----------|
| 今回の無料版 | **$0** |
| Replicate + n8n | $1.68 |
| Shotstack | $49 |
| Remotion | $0.50 |

---

## まとめ

完全無料で実装可能！必要なもの：
- ✅ Dockerがインストール済みのPC
- ✅ Supabase無料アカウント
- ✅ Pixabayから音楽ダウンロード
- ✅ 約1時間のセットアップ時間

**次のステップ:** 上記の手順に従ってセットアップを開始してください！
