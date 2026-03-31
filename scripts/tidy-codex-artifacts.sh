#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET_DIR="${ROOT_DIR}/.codex"
DRY_RUN="${1:-}"

mkdir -p "${TARGET_DIR}"
touch "${TARGET_DIR}/.gitkeep"

ARTIFACTS=(
  ".supervisor_state.json"
  ".app_supervisor_state.json"
  "SESSION_SUMMARY.md"
  "NEXT_ACTIONS.json"
  "EVIDENCE_INDEX.json"
  "TRACE_METADATA.json"
  ".execution_audit_state.json"
  "RESUME_PACKET.md"
  "STATE_DELTA.json"
  "context_snapshot.json"
  "audit_report.md"
)

log() {
  printf '%s\n' "$1"
}

move_artifact() {
  local rel="$1"
  local src="${ROOT_DIR}/${rel}"
  local base dest stamp

  [[ -e "${src}" ]] || return 0

  base="$(basename "${rel}")"
  dest="${TARGET_DIR}/${base}"

  if [[ -e "${dest}" ]]; then
    if cmp -s "${src}" "${dest}"; then
      if [[ "${DRY_RUN}" == "--dry-run" ]]; then
        log "[dry-run] duplicate -> remove root copy ${rel}"
      else
        rm -f "${src}"
        log "removed duplicate root artifact ${rel}"
      fi
      return 0
    fi

    stamp="$(date +%Y%m%dT%H%M%S)"
    dest="${TARGET_DIR}/${base}.legacy-root-${stamp}"
  fi

  if [[ "${DRY_RUN}" == "--dry-run" ]]; then
    log "[dry-run] move ${rel} -> ${dest#${ROOT_DIR}/}"
  else
    mv "${src}" "${dest}"
    log "moved ${rel} -> ${dest#${ROOT_DIR}/}"
  fi
}

for artifact in "${ARTIFACTS[@]}"; do
  move_artifact "${artifact}"
done
