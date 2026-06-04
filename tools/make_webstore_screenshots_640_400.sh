#!/bin/bash

#######################################
# Google Chrome拡張機能 [ことばうけみまもり｜Xことばに心のワンクッション] のChrome ウェブストア掲載用の画像生成スクリプト
#
# Scripts:
#   make_webstore_screenshots_640_400.sh
#
# Uages:
#   https://github.com/na0AaooQ/kotoba-uke-mimamori-for-x/blob/main/README.md
#
#######################################
set -eu

IMAGE_SIZE_WIDTH="640"
IMAGE_SIZE_HEIGHT="400"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SOURCE_DIR="${SCRIPT_DIR}/webstore_screenshot_sources"
OUTPUT_DIR="${SCRIPT_DIR}/webstore_screenshot_outputs"

origin_image_files=(
  "kotoba-uke-webstore-screenshot-01-cushion-ja-start"
  "kotoba-uke-webstore-screenshot-02-popup-ja"
  "kotoba-uke-webstore-screenshot-03-options-ja"
  "kotoba-uke-webstore-screenshot-04-cushion-ja"
  "kotoba-uke-webstore-screenshot-05-collapsed-ja"
  "kotoba-uke-webstore-screenshot-06-popup-en"
  "kotoba-uke-webstore-screenshot-07-cushion-en"
  "kotoba-uke-webstore-screenshot-08-collapsed-en"
)

mkdir -p "${OUTPUT_DIR}"

generated_files=()

for image_file_name in "${origin_image_files[@]}" ; do
  source_file="${SOURCE_DIR}/${image_file_name}.png"
  output_file="${OUTPUT_DIR}/${image_file_name}_${IMAGE_SIZE_WIDTH}x${IMAGE_SIZE_HEIGHT}.png"

  if [ -f "${source_file}" ] ; then
    sips -z "${IMAGE_SIZE_HEIGHT}" "${IMAGE_SIZE_WIDTH}" "${source_file}" --setProperty format png --out "${output_file}"
    generated_files+=("${output_file}")
  else
    echo "[${source_file}] not found."
  fi
done

echo ""

python3 - "${generated_files[@]}" <<'PY'
from PIL import Image
import sys

for f in sys.argv[1:]:
    img = Image.open(f).convert("RGB")
    img.save(f)
    print(f"RGB変換完了: {f}")
PY

echo ""
echo "Generated screenshot files:"
for f in "${generated_files[@]}" ; do
  file "${f}"
done
