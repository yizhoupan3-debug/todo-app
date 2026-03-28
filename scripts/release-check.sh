#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./release-common.sh
source "${SCRIPT_DIR}/release-common.sh"

require_cmd git npm node ssh tar scp

ALLOW_DIRTY="${ALLOW_DIRTY:-0}"
ALLOW_NON_MAIN="${ALLOW_NON_MAIN:-0}"
ALLOW_TEST_FAILURE="${ALLOW_TEST_FAILURE:-0}"
RELEASE_VERIFY_CMD="${RELEASE_VERIFY_CMD:-npm run test:backend}"

cd "$PROJECT_ROOT"

git rev-parse --is-inside-work-tree >/dev/null

branch="$(git_branch)"
version="$(project_version)"
sha="$(git_sha)"
release_id="$(release_id_from_ref)"

log "branch=${branch} version=${version} sha=${sha} release_id=${release_id}"

if [ "$ALLOW_NON_MAIN" != "1" ] && [ "$branch" != "main" ]; then
  fail "release 默认只允许从 main 发版；当前分支为 ${branch}。如需继续，请设置 ALLOW_NON_MAIN=1"
fi

if [ "$ALLOW_DIRTY" != "1" ] && [ -n "$(git status --short)" ]; then
  git status --short
  fail 'release 要求工作区干净；请先提交或暂存改动。如确需继续，请设置 ALLOW_DIRTY=1'
fi

if git remote get-url origin >/dev/null 2>&1; then
  git fetch --quiet origin main || warn 'git fetch origin main 失败，继续使用本地 refs 做检查'
  if git show-ref --verify --quiet refs/remotes/origin/main; then
    read -r ahead_count behind_count <<<"$(git rev-list --left-right --count HEAD...origin/main)"
    if [ "${behind_count}" -gt 0 ]; then
      fail "当前分支落后 origin/main ${behind_count} 个提交；请先同步后再发版"
    fi
    log "origin/main 对比：ahead=${ahead_count} behind=${behind_count}"
  fi
fi

ssh -o BatchMode=yes -o ConnectTimeout=5 "$REMOTE_HOST" 'echo connected >/dev/null' \
  || fail "无法连接远端主机 ${REMOTE_HOST}"

if [ -n "$RELEASE_VERIFY_CMD" ]; then
  log "running verify command: ${RELEASE_VERIFY_CMD}"
  if ! bash -lc "$RELEASE_VERIFY_CMD"; then
    if [ "$ALLOW_TEST_FAILURE" = "1" ]; then
      warn 'verify 命令失败，但已设置 ALLOW_TEST_FAILURE=1，继续发版'
    else
      fail 'verify 命令失败；如确认是基线问题且需要强制发版，请设置 ALLOW_TEST_FAILURE=1'
    fi
  fi
fi

log 'release precheck passed'
