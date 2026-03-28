#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./release-common.sh
source "${SCRIPT_DIR}/release-common.sh"

require_cmd ssh scp tar

archive_path="${RELEASE_ARCHIVE:-}"
if [ -z "$archive_path" ]; then
  archive_path="$(bash "${SCRIPT_DIR}/release-package.sh" | tail -n 1)"
fi

archive_path="$(cd "$(dirname "$archive_path")" && pwd)/$(basename "$archive_path")"
[ -f "$archive_path" ] || fail "release archive 不存在: ${archive_path}"

release_id="$(basename "$archive_path" .tar.gz)"
remote_tmp="/tmp/${release_id}.tar.gz"

log "uploading ${archive_path} -> ${REMOTE_HOST}:${remote_tmp}"
scp -q "$archive_path" "${REMOTE_HOST}:${remote_tmp}"

ssh "$REMOTE_HOST" "sudo env \
  RELEASE_ID='${release_id}' \
  REMOTE_TMP='${remote_tmp}' \
  REMOTE_APP_ROOT='${REMOTE_APP_ROOT}' \
  REMOTE_RELEASES_DIR='${REMOTE_RELEASES_DIR}' \
  REMOTE_CURRENT_LINK='${REMOTE_CURRENT_LINK}' \
  REMOTE_SHARED_DIR='${REMOTE_SHARED_DIR}' \
  REMOTE_DATA_DIR='${REMOTE_DATA_DIR}' \
  SERVICE_NAME='${SERVICE_NAME}' \
  PORT='${PORT}' \
  KEEP_RELEASES='${KEEP_RELEASES}' \
  bash -s" <<'EOF2'
set -euo pipefail

release_dir="${REMOTE_RELEASES_DIR}/${RELEASE_ID}"
mkdir -p "${REMOTE_APP_ROOT}" "${REMOTE_RELEASES_DIR}" "${REMOTE_SHARED_DIR}" "${REMOTE_DATA_DIR}"

if [ -f "${REMOTE_APP_ROOT}/.env" ] && [ ! -f "${REMOTE_SHARED_DIR}/.env" ]; then
  cp "${REMOTE_APP_ROOT}/.env" "${REMOTE_SHARED_DIR}/.env"
fi

previous_target="$(readlink -f "${REMOTE_CURRENT_LINK}" 2>/dev/null || true)"
rollback_needed=0
rollback() {
  if [ "${rollback_needed}" -eq 1 ] && [ -n "${previous_target}" ]; then
    ln -sfn "${previous_target}" "${REMOTE_CURRENT_LINK}"
    systemctl restart "${SERVICE_NAME}" || true
  fi
}
trap rollback EXIT

rm -rf "${release_dir}"
mkdir -p "${release_dir}"
tar -xzf "${REMOTE_TMP}" -C "${release_dir}"
rm -f "${REMOTE_TMP}"

rm -rf "${release_dir}/data"
ln -sfn "${REMOTE_DATA_DIR}" "${release_dir}/data"
if [ -f "${REMOTE_SHARED_DIR}/.env" ]; then
  ln -sfn "${REMOTE_SHARED_DIR}/.env" "${release_dir}/.env"
fi

cd "${release_dir}"
npm install --omit=dev

rollback_needed=1
ln -sfn "${release_dir}" "${REMOTE_CURRENT_LINK}"

cat > "/etc/systemd/system/${SERVICE_NAME}.service" <<SERVICE_EOF
[Unit]
Description=Todo App
After=network.target

[Service]
Type=simple
WorkingDirectory=${REMOTE_CURRENT_LINK}
ExecStart=/usr/bin/node server/server.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=${PORT}
Environment=TODO_APP_DATA_DIR=${REMOTE_DATA_DIR}

[Install]
WantedBy=multi-user.target
SERVICE_EOF

systemctl daemon-reload
systemctl enable "${SERVICE_NAME}" >/dev/null
systemctl restart "${SERVICE_NAME}"
systemctl is-active --quiet "${SERVICE_NAME}"

if command -v curl >/dev/null 2>&1; then
  healthy=0
  for _ in 1 2 3 4 5 6 7 8 9 10; do
    if curl -fsS "http://127.0.0.1:${PORT}/" >/dev/null 2>&1; then
      healthy=1
      break
    fi
    sleep 1
  done
  if [ "${healthy}" -ne 1 ]; then
    echo "Health check failed for http://127.0.0.1:${PORT}/" >&2
    exit 1
  fi
fi

rollback_needed=0
systemctl --no-pager --full status "${SERVICE_NAME}" | sed -n '1,12p'

if [ -d "${REMOTE_RELEASES_DIR}" ]; then
  mapfile -t old_releases < <(ls -1dt "${REMOTE_RELEASES_DIR}"/* 2>/dev/null | tail -n +$((KEEP_RELEASES + 1)) || true)
  if [ "${#old_releases[@]}" -gt 0 ]; then
    rm -rf "${old_releases[@]}"
  fi
fi
EOF2

log "release deployed successfully: ${release_id}"
log "current symlink: ${REMOTE_CURRENT_LINK}"
