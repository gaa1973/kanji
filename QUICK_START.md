# 🚀 クイックスタートガイド（5ステップ）

完全無料でKanjiFlow動画生成を始める最速の方法です。

---

## 前提条件

- ✅ Dockerがインストール済み
- ✅ Supabaseアカウント（無料）
- ✅ 約1時間の時間

---

## ステップ1: 自動セットアップスクリプトを実行（10分）

```bash
# プロジェクトディレクトリに移動
cd /path/to/project

# セットアップスクリプトを実行
bash setup-n8n-free.sh
```

スクリプトが以下を自動で実行します：
- Dockerイメージのビルド（FFmpeg + ImageMagick + 日本語フォント）
- n8nコンテナの起動
- 環境設定ファイルの作成

### 環境変数の設定

スクリプトが `.env` ファイルを作成するので、以下を編集：

```bash
# ~/n8n-kanji-free/.env を開く
nano ~/n8n-kanji-free/.env

# または
code ~/n8n-kanji-free/.env
```

**編集箇所:**
```bash
SUPABASE_URL=https://xxxxx.supabase.co  # あなたのSupabase URL
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...    # あなたのService Role Key
```

**Supabase認証情報の取得方法:**
1. [Supabase Dashboard](https://supabase.com/dashboard)にログイン
2. プロジェクトを選択
3. Settings → API
4. `URL` と `service_role` キーをコピー

保存後、Enterキーを押してセットアップを続行。

---

## ステップ2: Supabase Storageバケットを作成（5分）

### 2-1. Supabase SQL Editorを開く

1. Supabase Dashboard → SQL Editor
2. 「New query」をクリック

### 2-2. 以下のSQLを実行

```sql
-- kanji-images バケット（一時的な画像保存）
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
```

3. 「Run」をクリック

### 2-3. 確認

Storage → Bucketsで以下が表示されればOK:
- ✅ kanji-images
- ✅ kanji-videos

---

## ステップ3: 音声ファイルをダウンロード（5分）

### 3-1. Pixabayから無料音楽をダウンロード

**BGM（Lo-fi音楽）:**
1. [Pixabay Music - Lo-fi](https://pixabay.com/music/search/lofi/)にアクセス
2. 気に入った曲を選択
3. 「Free Download」→ MP3形式でダウンロード

**効果音（筆の音）:**
1. [Pixabay Sound Effects - Brush](https://pixabay.com/sound-effects/search/brush/)にアクセス
2. 筆音を選択
3. ダウンロード

### 3-2. ファイルをコンテナにコピー

```bash
# ダウンロードした音楽ファイルをコピー
docker cp ~/Downloads/your-lofi-music.mp3 n8n-kanji-free:/home/node/.n8n/audio/LoFi_Japanese_Chill.mp3

# 効果音をコピー
docker cp ~/Downloads/your-brush-sound.wav n8n-kanji-free:/home/node/.n8n/audio/brush_strike.wav

# 確認
docker exec n8n-kanji-free ls -la /home/node/.n8n/audio/
```

出力例:
```
-rw-r--r-- 1 node node 2456789 Oct  1 12:34 LoFi_Japanese_Chill.mp3
-rw-r--r-- 1 node node   45678 Oct  1 12:35 brush_strike.wav
```

---

## ステップ4: n8nワークフローをインポート（10分）

### 4-1. n8n管理画面にアクセス

ブラウザで以下を開く:
```
http://localhost:5678
```

**ログイン:**
- Username: `admin`
- Password: `kanji2024`

### 4-2. ワークフローをインポート

1. 左メニューから「Workflows」をクリック
2. 右上の「Import from File」をクリック
3. `n8n-free-workflow.json`を選択
4. 「Import」をクリック

### 4-3. Supabase認証情報を設定

1. ワークフロー内の「Upload to Supabase」ノードをクリック
2. 「Credential to connect with」の横の「Create New」をクリック
3. 「HTTP Header Auth」を選択
4. 設定:
   - **Credential Name**: `Supabase Storage Auth`
   - **Name**: `Authorization`
   - **Value**: `Bearer YOUR_SUPABASE_SERVICE_ROLE_KEY`

     例: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

5. 「Create」をクリック

### 4-4. ワークフローをアクティブ化

1. 右上のトグルスイッチをクリック（Inactive → Active）
2. 「Save」をクリック

### 4-5. Webhook URLを取得

1. 最初の「Webhook」ノードをクリック
2. 「Production URL」をコピー

例: `http://localhost:5678/webhook/kanji-video-generate`

---

## ステップ5: テスト実行（5分）

### 5-1. シンプルテスト（1つの漢字）

```bash
bash test-webhook.sh
```

成功すると、以下のようなレスポンスが返ります:
```json
{
  "success": true,
  "message": "Successfully generated 1 kanji videos",
  "videos": [
    {
      "kanji": "水",
      "meaning": "water",
      "videoUrl": "https://xxxxx.supabase.co/storage/v1/object/public/kanji-videos/KanjiFlow_水_20241001.mp4"
    }
  ]
}
```

### 5-2. フルテスト（7つの漢字）

```bash
bash test-webhook-full.sh
```

**処理時間:** 約5分

成功すると、7つの動画URLが返ります。

### 5-3. 動画を確認

1. Supabase Dashboard → Storage → kanji-videos
2. 生成された動画ファイルをクリック
3. ダウンロードまたはブラウザで再生

---

## ✅ セットアップ完了！

おめでとうございます！完全無料の動画生成システムが稼働しています。

---

## 次のステップ

### フロントエンドとの連携

プロジェクトの `.env` ファイルに追加:

```bash
VITE_N8N_WEBHOOK_URL=http://localhost:5678/webhook/kanji-video-generate
```

アプリを再起動:
```bash
npm run dev
```

ブラウザでアプリを開き、7つの漢字を選択して「Generate Videos」をクリック！

---

## 🔧 トラブルシューティング

### n8nにアクセスできない

```bash
# コンテナが起動しているか確認
docker ps | grep n8n-kanji-free

# 起動していない場合
docker start n8n-kanji-free

# ログを確認
docker logs n8n-kanji-free
```

### テストが失敗する

1. **ワークフローがアクティブか確認**
   - n8n UI で「Active」になっているか

2. **Webhook URLが正しいか確認**
   - n8nのWebhookノードでURLを確認

3. **環境変数が正しいか確認**
   ```bash
   docker exec n8n-kanji-free env | grep SUPABASE
   ```

4. **音声ファイルが存在するか確認**
   ```bash
   docker exec n8n-kanji-free ls -la /home/node/.n8n/audio/
   ```

### 動画生成に失敗する

1. **FFmpegが利用可能か確認**
   ```bash
   docker exec n8n-kanji-free ffmpeg -version
   ```

2. **ImageMagickが利用可能か確認**
   ```bash
   docker exec n8n-kanji-free convert --version
   ```

3. **日本語フォントが利用可能か確認**
   ```bash
   docker exec n8n-kanji-free fc-list | grep -i noto
   ```

4. **n8nのExecution Logを確認**
   - n8n UI → Executions → 最新の実行をクリック
   - 各ノードのエラーメッセージを確認

### Supabaseアップロードが失敗する

1. **Service Role Keyが正しいか確認**
   - Supabase Dashboard → Settings → API
   - `service_role` (secret)をコピーし直す

2. **バケットが存在するか確認**
   - Supabase Dashboard → Storage
   - `kanji-videos` バケットが存在するか

3. **RLSポリシーが正しいか確認**
   - SQL Editorで以下を実行:
   ```sql
   SELECT * FROM storage.objects WHERE bucket_id = 'kanji-videos';
   ```

---

## 📚 さらに詳しく

- **完全なセットアップガイド**: `FREE_VIDEO_GENERATION_GUIDE.md`
- **n8nワークフロー詳細**: `N8N_WORKFLOW_STEP_BY_STEP.md`
- **代替オプション**: `PRACTICAL_VIDEO_GENERATION_OPTIONS.md`

---

## 💰 コスト

- **n8n（セルフホスト）**: 無料
- **Supabase（1GB以下）**: 無料
- **ImageMagick**: 無料
- **FFmpeg**: 無料
- **音楽（Pixabay）**: 無料

**月額合計: 0円** 🎉

---

## 🎉 楽しんでください！

質問があれば、プロジェクトのドキュメントを参照してください。
