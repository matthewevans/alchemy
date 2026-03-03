#!/usr/bin/env bash
# Convert all non-m4a audio files in public/audio/sfx/ to M4A (AAC).
# Skips files that already have a .m4a version.
# Requires: ffmpeg

set -euo pipefail

AUDIO_DIR="$(cd "$(dirname "$0")/.." && pwd)/public/audio/sfx"

if ! command -v ffmpeg &>/dev/null; then
  echo "Error: ffmpeg is required. Install with: brew install ffmpeg" >&2
  exit 1
fi

converted=0
skipped=0

find "$AUDIO_DIR" -type f \( -name '*.ogg' -o -name '*.wav' -o -name '*.mp3' -o -name '*.flac' \) | while read -r src; do
  out="${src%.*}.m4a"

  if [ -f "$out" ]; then
    skipped=$((skipped + 1))
    continue
  fi

  if ffmpeg -y -i "$src" -c:a aac -b:a 128k "$out" 2>/dev/null; then
    echo "Converted: ${src#$AUDIO_DIR/}"
    converted=$((converted + 1))
  else
    echo "FAILED:    ${src#$AUDIO_DIR/}" >&2
  fi
done

echo ""
echo "Done. Converted: $converted, Skipped (already exists): $skipped"
echo ""
echo "Next steps:"
echo "  1. Update .ogg/.wav references in catalog.json and src/audio/sounds.ts to .m4a"
echo "  2. Delete the original files if no longer needed"
