#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DRY_RUN=0
INCLUDE_RELEASE_ARTIFACTS=0

usage() {
  cat <<'EOF'
Usage:
  bash scripts/clean-local-junk.sh [--dry-run] [--include-release-artifacts]

What it removes:
  - .DS_Store
  - *.orig
  - *.rej
  - optionally: .release-tmp and artifacts/releases
EOF
}

while (($# > 0)); do
  case "$1" in
    --dry-run)
      DRY_RUN=1
      ;;
    --include-release-artifacts)
      INCLUDE_RELEASE_ARTIFACTS=1
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      printf 'Unknown argument: %s\n\n' "$1" >&2
      usage >&2
      exit 1
      ;;
  esac
  shift
done

JUNK_FILES=()
while IFS= read -r -d '' file; do
  JUNK_FILES+=("$file")
done < <(
  find "$ROOT_DIR" \
    \( -path "$ROOT_DIR/.git" -o -path "$ROOT_DIR/node_modules" -o -path "$ROOT_DIR/.codex" \) -prune -o \
    \( -name '.DS_Store' -o -name '*.orig' -o -name '*.rej' \) -print0
)

RELEASE_TARGETS=()
if [[ $INCLUDE_RELEASE_ARTIFACTS -eq 1 ]]; then
  [[ -e "$ROOT_DIR/.release-tmp" ]] && RELEASE_TARGETS+=("$ROOT_DIR/.release-tmp")
  [[ -e "$ROOT_DIR/artifacts/releases" ]] && RELEASE_TARGETS+=("$ROOT_DIR/artifacts/releases")
fi

if [[ ${#JUNK_FILES[@]} -eq 0 && ${#RELEASE_TARGETS[@]} -eq 0 ]]; then
  printf 'No local junk found.\n'
  exit 0
fi

printf 'Planned removals:\n'
for path in "${JUNK_FILES[@]}"; do
  printf '  %s\n' "${path#"$ROOT_DIR"/}"
done
if [[ ${#RELEASE_TARGETS[@]} -gt 0 ]]; then
  for path in "${RELEASE_TARGETS[@]}"; do
    printf '  %s\n' "${path#"$ROOT_DIR"/}"
  done
fi

if [[ $DRY_RUN -eq 1 ]]; then
  printf '\nDry run only. Nothing removed.\n'
  exit 0
fi

for path in "${JUNK_FILES[@]}"; do
  rm -f "$path"
done
if [[ ${#RELEASE_TARGETS[@]} -gt 0 ]]; then
  for path in "${RELEASE_TARGETS[@]}"; do
    rm -rf "$path"
  done
fi

printf '\nCleanup complete.\n'
