#!/usr/bin/env bash
#
# HA-BPMN-Manager: Plugin Packaging Tool (Linux/macOS/CI)
#
# Packages the clean runtime plugin directory into a production-ready
# WordPress plugin ZIP archive (release/ha-bpmn-manager.zip & release/ha-bpmn-manager-v<VERSION>.zip).
# Excludes development files, node_modules, and git files.
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
PLUGIN_DIR="${ROOT_DIR}/plugin"
RELEASE_DIR="${ROOT_DIR}/release"

# 1. Determine Version
VERSION="${1:-}"
if [ -z "${VERSION}" ]; then
  VERSION=$(grep -i "Stable tag:" "${PLUGIN_DIR}/readme.txt" | head -n 1 | sed -e 's/.*:[[:space:]]*//' | tr -d '\r\n ')
fi

if [ -z "${VERSION}" ]; then
  VERSION=$(grep -i "define( 'HA_BPMN_VERSION'" "${PLUGIN_DIR}/ha-bpmn-manager.php" | head -n 1 | sed -e "s/.*'HA_BPMN_VERSION',[[:space:]]*'//" -e "s/'[[:space:]]*);.*//" | tr -d '\r\n ')
fi

echo "=========================================="
echo " HA-BPMN-Manager: Plugin Packaging Tool"
echo " Target Version: ${VERSION}"
echo "=========================================="

# 2. Verify plugin files
if [ ! -f "${PLUGIN_DIR}/ha-bpmn-manager.php" ]; then
  echo "::error::Main plugin file not found at ${PLUGIN_DIR}/ha-bpmn-manager.php"
  exit 1
fi

mkdir -p "${RELEASE_DIR}"
TARGET_ZIP="${RELEASE_DIR}/ha-bpmn-manager-v${VERSION}.zip"
TARGET_LATEST_ZIP="${RELEASE_DIR}/ha-bpmn-manager.zip"

rm -f "${TARGET_ZIP}" "${TARGET_LATEST_ZIP}"

# 3. Create temporary staging directory with clean WordPress slug
TEMP_STAGE=$(mktemp -d /tmp/ha_bpmn_pkg_XXXXXX)
STAGE_DIR="${TEMP_STAGE}/ha-bpmn-manager"

cleanup() {
  rm -rf "${TEMP_STAGE}"
}
trap cleanup EXIT

mkdir -p "${STAGE_DIR}"
echo "[INFO] Staging clean plugin runtime files from '${PLUGIN_DIR}'..."

# Copy runtime files
cp -R "${PLUGIN_DIR}/." "${STAGE_DIR}/"

# Remove any unwanted files
find "${STAGE_DIR}" -type f \( -name "*.map" -o -name ".DS_Store" -o -name "Thumbs.db" -o -name ".git*" \) -delete
find "${STAGE_DIR}" -type d -name ".git" -prune -exec rm -rf {} + 2>/dev/null || true

echo "[INFO] Compressing into '${TARGET_ZIP}'..."
(
  cd "${TEMP_STAGE}"
  zip -r -q "${TARGET_ZIP}" ha-bpmn-manager/
)

cp "${TARGET_ZIP}" "${TARGET_LATEST_ZIP}"

ZIP_SIZE_BYTES=$(stat -c%s "${TARGET_ZIP}" 2>/dev/null || stat -f%z "${TARGET_ZIP}" 2>/dev/null)
ZIP_SIZE_KB=$(( ZIP_SIZE_BYTES / 1024 ))
ZIP_SIZE_MB=$(( ZIP_SIZE_KB / 1024 ))

echo "=========================================="
echo " [SUCCESS] Packaging complete!"
echo " Release Archive: ${TARGET_ZIP} (${ZIP_SIZE_KB} KB / ${ZIP_SIZE_MB} MB)"
echo " Latest Archive:  ${TARGET_LATEST_ZIP}"
echo " Standard Slug:   ha-bpmn-manager/"
echo " Ready to install via WP-Admin: Plugins -> Add New -> Upload Plugin"
echo "=========================================="
