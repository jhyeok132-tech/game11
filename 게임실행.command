#!/bin/bash
# 게임실행.command — 맥(macOS)에서 이 파일을 더블클릭하면 게임이 열립니다.
# ※ 처음 한 번은 "확인되지 않은 개발자" 경고가 뜰 수 있습니다.
#    → 파일을 오른쪽 클릭 → 열기 → 열기를 누르면 됩니다.
cd "$(dirname "$0")" || exit 1

if [ -d "/Applications/Google Chrome.app" ]; then
  open -a "Google Chrome" "index.html"
else
  open "index.html"
fi
