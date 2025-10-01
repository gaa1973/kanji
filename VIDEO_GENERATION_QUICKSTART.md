# 動画生成クイックスタート

## 概要

KanjiFlowは、選択した7つの漢字から20秒のTikTok/Instagram Reels用動画を自動生成します。

## 動画の仕様

### タイムライン（各動画20秒）

| 時間 | シーン | 内容 |
|------|--------|------|
| 0-1秒 | オープニング | "Today's Kanji" + "Can you write this?" (黒背景) |
| 1-4秒 | カテゴリー紹介 | "Why this Kanji?" + カテゴリー名 (黒背景) |
| 4-14秒 | 書き順デモ | 背景画像上で一画ずつアニメーション + テロップ |
| 14-17秒 | 使用例 | "How to use it?" + 単語例 (黒背景) |
| 17-20秒 | まとめ | 漢字 = 意味 + レベル + CTA (黒背景) |

### 動画フォーマット
- **解像度**: 1080×1920 (9:16縦型)
- **形式**: MP4
- **フレームレート**: 30fps
- **音声**: Lo-fi BGM + 筆音効果音

## 実装オプション

### ✅ オプション1: n8nワークフロー（推奨）

**メリット**:
- 視覚的なワークフロー管理
- 長時間処理に対応
- エラーハンドリングが簡単
- デバッグが容易

**セットアップ時間**: 30分〜1時間

**コスト**: 月額$1.68（セルフホスト + Replicate API）

**手順**:
1. `N8N_SETUP_GUIDE.md`を参照
2. n8nサーバーをセットアップ
3. `n8n-workflow-spec.json`をインポート
4. API認証情報を設定
5. テスト実行

### ❌ オプション2: Edge Function（非推奨）

**問題点**:
- 実行時間制限（最大10分）
- 画像生成APIとFFmpegが必要
- 複雑なエラーハンドリング
- デバッグが困難

**現在の実装**: 仕様定義のみ（実際の動画生成なし）

## 処理フロー

```
フロントエンド
    ↓
   [7つの漢字を選択]
    ↓
   [Generate Videosボタン]
    ↓
n8nワークフロー
    ↓
   [各漢字ごとにループ]
    ├─ 背景画像生成 (Replicate API)
    ├─ 書き順画像生成 (N枚)
    ├─ 画像をSupabase Storageにアップロード
    ├─ FFmpegで動画合成 (20秒)
    └─ 動画をSupabase Storageにアップロード
    ↓
   [全動画をZIPに圧縮]
    ↓
   [ダウンロードURL返却]
    ↓
フロントエンド
    ↓
   [自動ダウンロード開始]
```

## 必要なサービス

### 1. 画像生成API（いずれか1つ）

| サービス | コスト | 品質 | 速度 |
|---------|--------|------|------|
| Replicate (Stable Diffusion XL) | $0.0055/枚 | ⭐⭐⭐⭐⭐ | 普通 |
| OpenAI DALL-E 3 | $0.080/枚 | ⭐⭐⭐⭐⭐ | 速い |
| Stability AI | $0.040/枚 | ⭐⭐⭐⭐ | 速い |

**推奨**: Replicate (コストが最も安い)

### 2. n8nホスティング（いずれか1つ）

| オプション | コスト | セットアップ |
|-----------|--------|-------------|
| セルフホスト (Docker) | 無料 | 中級 |
| n8n Cloud Starter | $20/月 | 簡単 |
| Railway | $5〜/月 | 簡単 |
| DigitalOcean Droplet | $6/月 | 中級 |

**推奨**: セルフホスト（Dockerで簡単）

### 3. 音声ファイル

以下のファイルを用意：
- **BGM**: Lo-fi Japanese Chill (20秒以上)
- **効果音**: 筆の音 (0.5秒)

**入手先**:
- [Pixabay Music](https://pixabay.com/music/) - 無料
- [Epidemic Sound](https://www.epidemicsound.com/) - 有料
- [Artlist](https://artlist.io/) - 有料

## コスト見積もり

### 週1回実行（7動画）

| 項目 | 詳細 | コスト |
|------|------|--------|
| 画像生成 | 平均77枚 (Replicate) | $0.42 |
| n8nホスティング | セルフホスト | $0 |
| Supabase Storage | 7×50MB = 350MB | $0 (1GB以下無料) |
| **週合計** | | **$0.42** |
| **月合計** | 4週間 | **$1.68** |

### 実際のコスト例（月間）

| サービス構成 | 月額 |
|-------------|------|
| Replicate + セルフホスト n8n | $1.68 |
| Replicate + n8n Cloud Starter | $21.68 |
| DALL-E + n8n Cloud Starter | $44.64 |

## クイックスタート（30分）

### ステップ1: n8nセットアップ (10分)

```bash
# Docker実行
docker run -d \
  --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n

# ブラウザで開く
open http://localhost:5678
```

### ステップ2: ワークフローインポート (5分)

1. n8n管理画面で「Import from File」
2. `n8n-workflow-spec.json`を選択
3. 「Import」をクリック

### ステップ3: API認証情報設定 (10分)

1. Replicateアカウント作成 → APIトークン取得
2. n8nで「Credentials」追加
3. Supabase URLとService Keyを設定

### ステップ4: テスト実行 (5分)

1. Webhookノードの「Test URL」をコピー
2. `.env`に追加: `VITE_N8N_WEBHOOK_URL=...`
3. フロントエンドで「Generate Videos」をクリック

## トラブルシューティング

### FFmpegが見つからない

```bash
# Ubuntu/Debian
sudo apt install ffmpeg

# macOS
brew install ffmpeg

# Docker
# カスタムDockerfile必要
```

### Replicate APIエラー

- APIトークンを確認
- クォータ上限をチェック
- プロンプトが長すぎないか確認

### 動画が生成されない

- n8nのExecution Logを確認
- 各ノードの出力をチェック
- Supabase Storageの権限を確認

## 次のステップ

- [ ] `N8N_SETUP_GUIDE.md`を読む
- [ ] n8nをセットアップ
- [ ] Replicate APIアカウント作成
- [ ] ワークフローをインポート
- [ ] テスト実行（1つの漢字）
- [ ] 本番実行（7つの漢字）

## サポート

詳細なセットアップ手順は `N8N_SETUP_GUIDE.md` を参照してください。
