#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

REMOTE_HOST="${REMOTE_HOST:-aliyun-todo}"
REMOTE_APP_ROOT="${REMOTE_APP_ROOT:-/opt/todo-app}"
REMOTE_RELEASES_DIR="${REMOTE_RELEASES_DIR:-${REMOTE_APP_ROOT}/releases}"
REMOTE_CURRENT_LINK="${REMOTE_CURRENT_LINK:-${REMOTE_APP_ROOT}/current}"
REMOTE_SHARED_DIR="${REMOTE_SHARED_DIR:-${REMOTE_APP_ROOT}/shared}"
REMOTE_DATA_DIR="${REMOTE_DATA_DIR:-/var/lib/todo-app}"
SERVICE_NAME="${SERVICE_NAME:-todo-app}"
PORT="${PORT:-80}"
KEEP_RELEASES="${KEEP_RELEASES:-5}"

ARTIFACT_DIR="${ARTIFACT_DIR:-${PROJECT_ROOT}/artifacts/releases}"
RELEASE_TMP_DIR="${RELEASE_TMP_DIR:-${PROJECT_ROOT}/.release-tmp}"

log() {
  printf '[release] %s\n' "$*"
}

warn() {
  printf '[release][warn] %s\n' "$*" >&2
}

fail() {
  printf '[release][error] %s\n' "$*" >&2
  exit 1
}

require_cmd() {
  local missing=0
  for cmd in "$@"; do
    if ! command -v "$cmd" >/dev/null 2>&1; then
      warn "missing command: $cmd"
      missing=1
    fi
  done
  if [ "$missing" -ne 0 ]; then
    fail 'required tools missing'
  fi
}

project_version() {
  node -p "require('${PROJECT_ROOT//\'/\\\'}\/package.json').version"
}

git_sha() {
  git -C "$PROJECT_ROOT" rev-parse --short HEAD
}

git_branch() {
  git -C "$PROJECT_ROOT" rev-parse --abbrev-ref HEAD
}

release_timestamp() {
  date -u +%Y%m%dT%H%M%SZ
}

release_id_from_ref() {
  local version sha ts
  version="$(project_version)"
  sha="$(git_sha)"
  ts="$(release_timestamp)"
  printf 'v%s-%s-%s' "$version" "$ts" "$sha"
}

ensure_dirs() {
  mkdir -p "$ARTIFACT_DIR" "$RELEASE_TMP_DIR"
}

latest_tag() {
  git -C "$PROJECT_ROOT" describe --tags --abbrev=0 2>/dev/null || true
}
