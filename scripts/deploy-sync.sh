#!/usr/bin/env bash

set -euo pipefail

REMOTE_HOST="${REMOTE_HOST:-aliyun-todo}"
REMOTE_DIR="${REMOTE_DIR:-/opt/todo-app}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

echo "Syncing ${PROJECT_ROOT} -> ${REMOTE_HOST}:${REMOTE_DIR}"

ssh "${REMOTE_HOST}" "
  sudo bash -lc '
    set -e
    test -n \"${REMOTE_DIR}\"
    test \"${REMOTE_DIR}\" != \"/\"
    mkdir -p \"${REMOTE_DIR}\"
    find \"${REMOTE_DIR}\" -mindepth 1 -maxdepth 1 \
      ! -name data \
      ! -name .env \
      -exec rm -rf {} +
  '
"

COPYFILE_DISABLE=1 bsdtar \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='data' \
  --exclude='.DS_Store' \
  --format ustar \
  -czf - -C "${PROJECT_ROOT}" . \
  | ssh "${REMOTE_HOST}" "sudo tar -xzf - -C '${REMOTE_DIR}'"

echo "Installing dependencies on remote host"
ssh "${REMOTE_HOST}" "sudo bash -lc 'cd \"${REMOTE_DIR}\" && npm install'"

echo "Sync complete"
