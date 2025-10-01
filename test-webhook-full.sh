#!/bin/bash

# KanjiFlow - 完全テスト（7つの漢字）
# 実際の使用シナリオをテストします

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "========================================="
echo "KanjiFlow Full Test (7 Kanji)"
echo "========================================="
echo ""

WEBHOOK_URL="${1:-http://localhost:5678/webhook/kanji-video-generate}"

echo -e "${YELLOW}Testing webhook at: $WEBHOOK_URL${NC}"
echo -e "${YELLOW}This will generate 7 videos (takes ~5 minutes)${NC}"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Test cancelled"
    exit 0
fi

echo -e "${YELLOW}Sending request with 7 kanji...${NC}"
echo ""

START_TIME=$(date +%s)

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
      },
      {
        "kanji": "火",
        "meaning": "fire",
        "category": "nature",
        "difficulty": "N5",
        "totalStrokes": 4,
        "usageExample": {
          "word": "火曜日",
          "reading": "かようび",
          "translation": "Tuesday"
        }
      },
      {
        "kanji": "木",
        "meaning": "tree",
        "category": "nature",
        "difficulty": "N5",
        "totalStrokes": 4,
        "usageExample": {
          "word": "木曜日",
          "reading": "もくようび",
          "translation": "Thursday"
        }
      },
      {
        "kanji": "金",
        "meaning": "gold",
        "category": "materials",
        "difficulty": "N5",
        "totalStrokes": 8,
        "usageExample": {
          "word": "金曜日",
          "reading": "きんようび",
          "translation": "Friday"
        }
      },
      {
        "kanji": "土",
        "meaning": "earth",
        "category": "nature",
        "difficulty": "N5",
        "totalStrokes": 3,
        "usageExample": {
          "word": "土曜日",
          "reading": "どようび",
          "translation": "Saturday"
        }
      },
      {
        "kanji": "日",
        "meaning": "sun",
        "category": "nature",
        "difficulty": "N5",
        "totalStrokes": 4,
        "usageExample": {
          "word": "日曜日",
          "reading": "にちようび",
          "translation": "Sunday"
        }
      },
      {
        "kanji": "月",
        "meaning": "moon",
        "category": "nature",
        "difficulty": "N5",
        "totalStrokes": 4,
        "usageExample": {
          "word": "月曜日",
          "reading": "げつようび",
          "translation": "Monday"
        }
      }
    ]
  }' > response.json

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo "========================================="
echo -e "${GREEN}✓ Test completed in ${DURATION} seconds!${NC}"
echo "========================================="
echo ""

# レスポンスを整形して表示
if command -v jq &> /dev/null; then
    echo "Response:"
    cat response.json | jq '.'
    echo ""

    # ダウンロードURLを抽出
    echo "Video URLs:"
    cat response.json | jq -r '.downloadUrls[]' 2>/dev/null || cat response.json | jq -r '.videos[].videoUrl' 2>/dev/null
else
    echo "Response saved to: response.json"
    echo "Install jq for pretty printing: brew install jq"
fi

echo ""
echo "Check your Supabase Storage bucket 'kanji-videos' for the generated videos!"
echo ""
