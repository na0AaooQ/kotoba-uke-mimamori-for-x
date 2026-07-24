#!/bin/bash

set -eu

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
PACKAGE_NAME="kotoba-uke-mimamori-for-x"
PACKAGE_ROOT="${PACKAGE_ROOT:-/tmp/kotoba-uke-mimamori-cws-package}"
PACKAGE_DIR="${PACKAGE_ROOT}/${PACKAGE_NAME}"

MANIFEST_PATH="${REPO_ROOT}/manifest.json"

if [ ! -f "${MANIFEST_PATH}" ]; then
  echo "[manifest.json] not found. Please run this script from this repository."
  exit 1
fi

VERSION="$(
  sed -n 's/.*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "${MANIFEST_PATH}" | head -n 1
)"

if [ -z "${VERSION}" ]; then
  echo "Could not read version from manifest.json."
  exit 1
fi

ZIP_PATH="${ZIP_PATH:-${REPO_ROOT}/${PACKAGE_NAME}-v${VERSION}.zip}"

case "${ZIP_PATH}" in
  /*) ;;
  *) ZIP_PATH="$(pwd)/${ZIP_PATH}" ;;
esac

ZIP_DIR="$(dirname "${ZIP_PATH}")"

if [ -z "${PACKAGE_ROOT}" ] || [ "${PACKAGE_ROOT}" = "/" ]; then
  echo "Unsafe PACKAGE_ROOT: [${PACKAGE_ROOT}]"
  exit 1
fi

PACKAGE_ITEMS=(
  "manifest.json"
  "_locales"
  "icons"
  "popup.html"
  "popup.css"
  "popup.js"
  "options.html"
  "options.js"
  "settings.js"
  "risk-detector.js"
  "cushion-guidance.js"
  "i18n.js"
  "overlay.js"
  "content.js"
)

rm -rf "${PACKAGE_ROOT}"
mkdir -p "${PACKAGE_DIR}"
mkdir -p "${ZIP_DIR}"

for item in "${PACKAGE_ITEMS[@]}"; do
  if [ ! -e "${REPO_ROOT}/${item}" ]; then
    echo "[${item}] not found."
    exit 1
  fi

  cp -R "${REPO_ROOT}/${item}" "${PACKAGE_DIR}/"
done

find "${PACKAGE_DIR}" -name ".DS_Store" -delete

rm -f "${ZIP_PATH}"

(
  cd "${PACKAGE_DIR}"
  zip -r "${ZIP_PATH}" . -x "*.DS_Store"
)

echo ""
echo "Created package:"
echo "${ZIP_PATH}"
echo ""
echo "Package contents:"
unzip -l "${ZIP_PATH}"
