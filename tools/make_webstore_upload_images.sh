#!/bin/bash

#######################################
# Google Chrome拡張機能 [ことばうけみまもり｜Xことばに心のワンクッション] 用のアイコン画像生成スクリプト
#
# Scripts:
#   make_webstore_upload_images.sh
#
# Uages:
#   https://github.com/na0AaooQ/kotoba-uke-mimamori-for-x/blob/main/README.md
#
#######################################
set -eu

SOURCE_IMAGE="./webstore_icons_sources/kotoba-uke-mimamori-icon.png"
OUTPUT_DIR="../icons"

if [ ! -f "${SOURCE_IMAGE}" ]; then
  echo "[${SOURCE_IMAGE}] not found."
  exit 1
fi

if [ ! -d "${OUTPUT_DIR}" ] ; then
  mkdir -p "${OUTPUT_DIR}"
fi

# Chrome extension manifest icons
sips -z 16 16 "${SOURCE_IMAGE}" --setProperty format png --out "${OUTPUT_DIR}/icon16.png"
sips -z 32 32 "${SOURCE_IMAGE}" --setProperty format png --out "${OUTPUT_DIR}/icon32.png"
sips -z 48 48 "${SOURCE_IMAGE}" --setProperty format png --out "${OUTPUT_DIR}/icon48.png"
sips -z 128 128 "${SOURCE_IMAGE}" --setProperty format png --out "${OUTPUT_DIR}/icon128.png"

# Optional store / archive assets
sips -z 256 256 "${SOURCE_IMAGE}" --setProperty format png --out "${OUTPUT_DIR}/icon256.png"
sips -z 512 512 "${SOURCE_IMAGE}" --setProperty format png --out "${OUTPUT_DIR}/icon512.png"
sips -z 1024 1024 "${SOURCE_IMAGE}" --setProperty format png --out "${OUTPUT_DIR}/icon1024.png"

echo ""
echo "Generated icon files:"
file "${OUTPUT_DIR}/icon16.png"
file "${OUTPUT_DIR}/icon32.png"
file "${OUTPUT_DIR}/icon48.png"
file "${OUTPUT_DIR}/icon128.png"
file "${OUTPUT_DIR}/icon256.png"
file "${OUTPUT_DIR}/icon512.png"
file "${OUTPUT_DIR}/icon1024.png"
