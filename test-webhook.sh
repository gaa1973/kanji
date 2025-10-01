#!/bin/bash

# KanjiFlow - Webhook テストスクリプト
# n8nワークフローが正しく動作するかテストします

set -e

# カラー定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "========================================="
echo "KanjiFlow Webhook Test"
echo "========================================="
echo ""

# Webhook URLの設定
WEBHOOK_URL="${1:-http://localhost:5678/webhook/kanji-video-generate}"

echo -e "${YELLOW}Testing webhook at: $WEBHOOK_URL${NC}"
echo ""

# テストデータ（1つの漢字）
echo -e "${YELLOW}Sending test request with 1 kanji (水)...${NC}"
echo ""

curl -X POST "$WEBHOOK_URL" \
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
  }' | jq '.' || {
    echo ""
    echo -e "${RED}✗ Test failed!${NC}"
    echo ""
    echo "Troubleshooting:"
    echo "1. Check if n8n is running: docker ps | grep n8n-kanji-free"
    echo "2. Check n8n logs: docker logs n8n-kanji-free"
    echo "3. Check if workflow is active in n8n UI"
    echo "4. Verify webhook URL matches the one in n8n"
    exit 1
  }

echo ""
echo -e "${GREEN}✓ Test completed!${NC}"
echo ""
echo "If you see a success response above, the workflow is working!"
echo ""
echo "Next: Test with 7 kanji characters"
echo "Run: bash test-webhook-full.sh"
echo ""
