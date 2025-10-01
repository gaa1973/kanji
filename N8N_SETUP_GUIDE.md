# n8n Video Generation Workflow Setup Guide

このガイドでは、KanjiFlowアプリの動画生成機能をn8nワークフローで実装する方法を説明します。

## なぜn8nを使うのか？

### メリット
1. **ビジュアルワークフロー**: 複雑な処理を視覚的に管理
2. **長時間処理対応**: Edge Functionの時間制限を回避
3. **エラーハンドリング**: リトライと詳細なログ機能
4. **簡単な統合**: 多数のAPIサービスとの連携が容易
5. **デバッグが簡単**: 各ステップの実行結果を確認可能

## 必要なもの

### 1. n8nサーバー

**オプションA: Docker（推奨）**
```bash
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -e N8N_BASIC_AUTH_ACTIVE=true \
  -e N8N_BASIC_AUTH_USER=admin \
  -e N8N_BASIC_AUTH_PASSWORD=your-password \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n
```

**オプションB: npm**
```bash
npm install -g n8n
n8n start
```

### 2. FFmpegのインストール

n8nサーバーにFFmpegが必要です：

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install ffmpeg

# macOS
brew install ffmpeg

# Docker（カスタムイメージ）
FROM n8nio/n8n:latest
RUN apk add --no-cache ffmpeg
```

### 3. 画像生成API

以下のいずれかのサービスを選択：

**オプションA: Replicate（推奨）**
- [Replicate](https://replicate.com/)でアカウント作成
- APIトークンを取得
- Stable Diffusion XLモデルを使用

**オプションB: OpenAI DALL-E**
- [OpenAI Platform](https://platform.openai.com/)でアカウント作成
- APIキーを取得
- DALL-E 3を使用

**オプションC: Stability AI**
- [Stability AI](https://stability.ai/)でアカウント作成
- APIキーを取得

### 4. 音声ファイル

以下のファイルをn8nサーバーにアップロード：
- `LoFi_Japanese_Chill.mp3` - BGM（20秒以上）
- `brush_strike.wav` - 筆の音（0.5秒程度）

保存先: `/home/node/.n8n/audio/`

## ワークフローのセットアップ

### ステップ1: ワークフローのインポート

1. n8n管理画面にアクセス（`http://localhost:5678`）
2. 左メニューから「Workflows」を選択
3. 「Import from File」をクリック
4. `n8n-workflow-spec.json`をアップロード

### ステップ2: 環境変数の設定

n8n管理画面で「Settings」→「Credentials」を開き、以下を追加：

#### Replicate API
```
Name: Replicate API
Type: HTTP Request
Authentication: Header Auth
Header Name: Authorization
Header Value: Token YOUR_REPLICATE_API_TOKEN
```

#### Supabase
```
Name: Supabase
Type: Supabase
URL: YOUR_SUPABASE_URL
Service Role Key: YOUR_SUPABASE_SERVICE_ROLE_KEY
```

### ステップ3: ワークフローのカスタマイズ

#### Webhook URLの確認
1. Webhookノードを開く
2. 「Test URL」をコピー
3. `.env`ファイルに追加：
```bash
VITE_N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/kanji-video-generate
```

#### FFmpegパスの確認
「Compose Video with FFmpeg」ノードで、FFmpegのパスを確認：
```javascript
const ffmpegPath = '/usr/bin/ffmpeg'; // 環境に応じて変更
```

#### 音声ファイルパスの設定
```javascript
const bgmPath = '/home/node/.n8n/audio/LoFi_Japanese_Chill.mp3';
const sfxPath = '/home/node/.n8n/audio/brush_strike.wav';
```

### ステップ4: Supabase Storageバケットの作成

Supabase管理画面で以下のバケットを作成：

```sql
-- kanji-images バケット
INSERT INTO storage.buckets (id, name, public)
VALUES ('kanji-images', 'kanji-images', false);

-- kanji-videos バケット
INSERT INTO storage.buckets (id, name, public)
VALUES ('kanji-videos', 'kanji-videos', true);

-- RLSポリシー
CREATE POLICY "Service role can upload images"
  ON storage.objects FOR INSERT
  TO service_role
  WITH CHECK (bucket_id = 'kanji-images');

CREATE POLICY "Anyone can view videos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'kanji-videos');

CREATE POLICY "Service role can upload videos"
  ON storage.objects FOR INSERT
  TO service_role
  WITH CHECK (bucket_id = 'kanji-videos');
```

### ステップ5: ワークフローのテスト

1. Webhookノードの「Test URL」にPOSTリクエストを送信：

```bash
curl -X POST https://your-n8n-instance.com/webhook/kanji-video-generate \
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

2. n8n管理画面で実行状況を確認
3. 各ノードの出力を確認してデバッグ

## ワークフローの動作

### タイムライン（1つの漢字あたり）

1. **背景画像生成** (30-60秒)
   - Replicate APIでStable Diffusionを呼び出し
   - 和紙風背景（1080x1920）を生成

2. **書き順画像生成** (N × 30-60秒、Nは画数)
   - 各画ごとにプログレッシブな画像を生成
   - 背景画像をベースレイヤーとして使用

3. **画像アップロード** (5-10秒)
   - Supabase Storageにすべての画像をアップロード

4. **動画合成** (60-120秒)
   - FFmpegで20秒の動画を作成
   - タイムライン:
     - 0-1秒: オープニング
     - 1-4秒: カテゴリー紹介
     - 4-14秒: 書き順アニメーション
     - 14-17秒: 使用例
     - 17-20秒: まとめ
   - BGMと効果音を合成

5. **動画アップロード** (10-20秒)
   - Supabase Storageに動画をアップロード

**合計時間（7漢字）**: 15-35分

## トラブルシューティング

### FFmpegが見つからない
```bash
which ffmpeg
# パスを確認してワークフローに設定
```

### メモリ不足エラー
n8nのメモリ上限を増やす：
```bash
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -e N8N_MEMORY_LIMIT=4096 \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n
```

### Replicate APIがタイムアウト
- `wait`ノードのタイムアウト時間を延長（300秒→600秒）
- ポーリング間隔を調整（5秒→10秒）

### 画像生成の品質が低い
Replicateノードのプロンプトを調整：
```javascript
const prompt = `Japanese kanji ${kanji}, professional calligraphy,
  high quality black ink on traditional washi paper,
  minimalist zen aesthetic, 4k resolution, sharp details`;
```

## コスト見積もり

### Replicate API (Stable Diffusion XL)
- 1画像: $0.0055
- 平均画数: 10画
- 7漢字: (1背景 + 10画) × 7 = 77画像
- **合計: 約$0.42 / 週**

### OpenAI DALL-E 3（代替案）
- 1画像 (1024×1792): $0.080
- 7漢字: 77画像
- **合計: 約$6.16 / 週**

### n8n Cloud（オプション）
- Starter: $20/月（500実行/月）
- Pro: $50/月（2500実行/月）

**推奨**: セルフホスト + Replicate = 月額$1.68

## 本番環境への移行

### 1. n8nのホスティング

**オプションA: n8n Cloud**
- [n8n.cloud](https://n8n.cloud/)でアカウント作成
- ワークフローをエクスポート/インポート

**オプションB: セルフホスト**
```bash
# Docker Compose
version: '3'
services:
  n8n:
    image: n8nio/n8n
    ports:
      - "5678:5678"
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=${N8N_PASSWORD}
      - N8N_HOST=${N8N_HOST}
      - N8N_PROTOCOL=https
      - WEBHOOK_URL=https://${N8N_HOST}/
    volumes:
      - ~/.n8n:/home/node/.n8n
    restart: always
```

### 2. Webhook URLの更新
`.env.production`に追加：
```bash
VITE_N8N_WEBHOOK_URL=https://your-production-n8n.com/webhook/kanji-video-generate
```

### 3. セキュリティ
- Basic認証を有効化
- HTTPS証明書をセットアップ
- Webhookに認証トークンを追加

## サポート

問題が発生した場合：
1. n8nのExecution Logを確認
2. 各ノードの出力をチェック
3. FFmpegのエラーログを確認
4. Supabase Storageのアクセス権限を確認

## 次のステップ

- [ ] n8nサーバーをセットアップ
- [ ] ワークフローをインポート
- [ ] API認証情報を設定
- [ ] 音声ファイルをアップロード
- [ ] テスト実行
- [ ] 本番環境にデプロイ
