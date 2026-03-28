#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./release-common.sh
source "${SCRIPT_DIR}/release-common.sh"

require_cmd ssh

target_release="${1:-previous}"

ssh "$REMOTE_HOST" "sudo env TARGET_RELEASE='${target_release}' REMOTE_RELEASES_DIR='${REMOTE_RELEASES_DIR}' REMOTE_CURRENT_LINK='${REMOTE_CURRENT_LINK}' SERVICE_NAME='${SERVICE_NAME}' PORT='${PORT}' REMOTE_DATA_DIR='${REMOTE_DATA_DIR}' bash -s" <<'EOF2'
set -euo pipefail

current_target="$(readlink -f "${REMOTE_CURRENT_LINK}" 2>/dev/null || true)"
if [ "${TARGET_RELEASE}" = "previous" ]; then
  mapfile -t releases < <(ls -1dt "${REMOTE_RELEASES_DIR}"/* 2>/dev/null || true)
  target_dir=''
  for candidate in "${releases[@]}"; do
    if [ -n "${current_target}" ] && [ "$(readlink -f "$candidate")" = "${current_target}" ]; then
      continue
    fi
    target_dir="$candidate"
    break
  done
else
  target_dir="${REMOTE_RELEASES_DIR}/${TARGET_RELEASE}"
fi

[ -n "${target_dir:-}" ] || { echo 'No rollback target found' >&2; exit 1; }
[ -d "$target_dir" ] || { echo "Rollback target missing: $target_dir" >&2; exit 1; }

ln -sfn "$target_dir" "${REMOTE_CURRENT_LINK}"
systemctl restart "${SERVICE_NAME}"
systemctl is-active --quiet "${SERVICE_NAME}"

if command -v curl >/dev/null 2>&1; then
  curl -fsS "http://127.0.0.1:${PORT}/" >/dev/null
fi

systemctl --no-pager --full status "${SERVICE_NAME}" | sed -n '1,12p'
EOF2

log "rollback complete: ${target_release}"
