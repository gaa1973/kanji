#!/bin/bash

# KanjiFlow - 完全無料版 n8nセットアップスクリプト
# このスクリプトはDockerを使ってn8nサーバーを起動します

set -e

echo "========================================="
echo "KanjiFlow Free Video Generator Setup"
echo "========================================="
echo ""

# カラー定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 関数定義
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}→ $1${NC}"
}

# Dockerがインストールされているか確認
print_info "Checking Docker installation..."
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed!"
    echo ""
    echo "Please install Docker first:"
    echo "  macOS: brew install --cask docker"
    echo "  Ubuntu: sudo apt install docker.io"
    echo "  Windows: Download from https://www.docker.com/products/docker-desktop"
    exit 1
fi
print_success "Docker is installed"

# Dockerが起動しているか確認
print_info "Checking Docker daemon..."
if ! docker info &> /dev/null; then
    print_error "Docker daemon is not running!"
    echo "Please start Docker Desktop or run: sudo systemctl start docker"
    exit 1
fi
print_success "Docker daemon is running"

# 作業ディレクトリ作成
WORK_DIR="$HOME/n8n-kanji-free"
print_info "Creating work directory at $WORK_DIR..."
mkdir -p "$WORK_DIR"
cd "$WORK_DIR"
print_success "Work directory created"

# Dockerfile作成
print_info "Creating Dockerfile with FFmpeg and ImageMagick..."
cat > Dockerfile << 'EOF'
FROM n8nio/n8n:latest

USER root

# FFmpeg, ImageMagick, 日本語フォントをインストール
RUN apk add --no-cache \
    ffmpeg \
    imagemagick \
    font-noto-cjk \
    curl \
    zip \
    python3

# 音声ファイル用ディレクトリ作成
RUN mkdir -p /home/node/.n8n/audio && \
    chown -R node:node /home/node/.n8n

USER node

EXPOSE 5678

CMD ["n8n"]
EOF
print_success "Dockerfile created"

# 環境変数ファイル作成
print_info "Creating environment file..."
cat > .env << 'EOF'
# n8n Basic Authentication
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=kanji2024

# Timezone
GENERIC_TIMEZONE=Asia/Tokyo
TZ=Asia/Tokyo

# Supabase Configuration
# 以下を自分の値に置き換えてください
SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY

# n8n Configuration
N8N_HOST=localhost
N8N_PORT=5678
N8N_PROTOCOL=http
WEBHOOK_URL=http://localhost:5678/
EOF
print_success "Environment file created at .env"

echo ""
print_info "Please edit .env file and add your Supabase credentials:"
echo "  SUPABASE_URL=https://xxxxx.supabase.co"
echo "  SUPABASE_SERVICE_ROLE_KEY=eyJhbGc..."
echo ""
read -p "Press Enter after editing .env file..."

# Dockerイメージをビルド
print_info "Building Docker image (this may take a few minutes)..."
docker build -t n8n-kanji-free . || {
    print_error "Failed to build Docker image"
    exit 1
}
print_success "Docker image built successfully"

# 既存のコンテナを停止・削除
if docker ps -a | grep -q n8n-kanji-free; then
    print_info "Stopping existing container..."
    docker stop n8n-kanji-free &> /dev/null || true
    docker rm n8n-kanji-free &> /dev/null || true
    print_success "Existing container removed"
fi

# コンテナを起動
print_info "Starting n8n container..."
docker run -d \
  --name n8n-kanji-free \
  -p 5678:5678 \
  --env-file .env \
  -v "$HOME/n8n-data-free:/home/node/.n8n" \
  n8n-kanji-free || {
    print_error "Failed to start container"
    exit 1
}

# 起動待機
print_info "Waiting for n8n to start..."
sleep 5

# コンテナが起動しているか確認
if docker ps | grep -q n8n-kanji-free; then
    print_success "n8n container is running!"
else
    print_error "Container failed to start"
    echo "Check logs with: docker logs n8n-kanji-free"
    exit 1
fi

echo ""
echo "========================================="
print_success "Setup completed successfully!"
echo "========================================="
echo ""
echo "Next steps:"
echo ""
echo "1. Download free music from Pixabay:"
echo "   https://pixabay.com/music/search/lofi/"
echo ""
echo "2. Copy audio files to container:"
echo "   docker cp ~/Downloads/music.mp3 n8n-kanji-free:/home/node/.n8n/audio/LoFi_Japanese_Chill.mp3"
echo "   docker cp ~/Downloads/brush.wav n8n-kanji-free:/home/node/.n8n/audio/brush_strike.wav"
echo ""
echo "3. Access n8n at: http://localhost:5678"
echo "   Username: admin"
echo "   Password: kanji2024"
echo ""
echo "4. Import workflow:"
echo "   - Click 'Workflows' → 'Import from File'"
echo "   - Select: n8n-free-workflow.json"
echo ""
echo "5. Configure Supabase credential:"
echo "   - Click 'Credentials' → 'Add Credential'"
echo "   - Select 'HTTP Header Auth'"
echo "   - Name: Authorization"
echo "   - Value: Bearer YOUR_SUPABASE_SERVICE_ROLE_KEY"
echo ""
echo "Useful commands:"
echo "  View logs:    docker logs -f n8n-kanji-free"
echo "  Stop n8n:     docker stop n8n-kanji-free"
echo "  Start n8n:    docker start n8n-kanji-free"
echo "  Remove all:   docker stop n8n-kanji-free && docker rm n8n-kanji-free"
echo ""
