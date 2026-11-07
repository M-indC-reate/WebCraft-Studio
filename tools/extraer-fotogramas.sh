#!/usr/bin/env bash
# Convierte el vídeo de la animación en las secuencias de fotogramas WebP.
# Uso:  bash tools/extraer-fotogramas.sh assets/hero/video.mp4
# Escritorio: 96 fotogramas 1600x900 · Móvil: 48 fotogramas 720x960 (recorte vertical central)
set -euo pipefail
VIDEO="${1:?Indica la ruta del vídeo}"
DIR="$(cd "$(dirname "$0")/.." && pwd)/assets/hero"
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$VIDEO")
FPS_D=$(python3 -c "print(96/$DUR)"); FPS_M=$(python3 -c "print(48/$DUR)")
rm -rf "$DIR/escritorio" "$DIR/movil"; mkdir -p "$DIR/escritorio" "$DIR/movil"
ffmpeg -loglevel error -i "$VIDEO" -vf "fps=$FPS_D,scale=1600:900:flags=lanczos" \
  -frames:v 96 -c:v libwebp -quality 72 -compression_level 6 "$DIR/escritorio/f_%03d.webp"
ffmpeg -loglevel error -i "$VIDEO" -vf "fps=$FPS_M,crop=ih*3/4:ih,scale=720:960:flags=lanczos" \
  -frames:v 48 -c:v libwebp -quality 70 -compression_level 6 "$DIR/movil/f_%03d.webp"
echo "Escritorio: $(ls "$DIR/escritorio" | wc -l) fotogramas ($(du -sh "$DIR/escritorio" | cut -f1))"
echo "Móvil: $(ls "$DIR/movil" | wc -l) fotogramas ($(du -sh "$DIR/movil" | cut -f1))"
