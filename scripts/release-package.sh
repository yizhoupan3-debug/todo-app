#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./release-common.sh
source "${SCRIPT_DIR}/release-common.sh"

bash "${SCRIPT_DIR}/release-check.sh"

cd "$PROJECT_ROOT"
ensure_dirs

release_id="$(release_id_from_ref)"
version="$(project_version)"
sha="$(git_sha)"
branch="$(git_branch)"
generated_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
work_dir="${RELEASE_TMP_DIR}/${release_id}"
app_dir="${work_dir}/app"
archive_path="${ARTIFACT_DIR}/${release_id}.tar.gz"
notes_path="${ARTIFACT_DIR}/${release_id}.notes.md"
checksum_path="${archive_path}.sha256"

rm -rf "$work_dir"
mkdir -p "$app_dir"

git archive --format=tar HEAD | tar -xf - -C "$app_dir"

previous_tag="$(latest_tag)"
if [ -n "$previous_tag" ]; then
  commit_range="${previous_tag}..HEAD"
else
  commit_range="HEAD~20..HEAD"
fi

if ! git rev-parse --verify ${commit_range%%..*} >/dev/null 2>&1; then
  commit_range="HEAD"
fi

commit_lines="$(git log --no-merges --pretty='- %h %s' ${commit_range} 2>/dev/null || git log --no-merges --pretty='- %h %s' -n 20)"

cat > "${app_dir}/RELEASE_INFO.json" <<JSON
{
  "releaseId": "${release_id}",
  "version": "${version}",
  "gitSha": "${sha}",
  "branch": "${branch}",
  "generatedAt": "${generated_at}"
}
JSON

cat > "$notes_path" <<EOF2
# Release Notes — ${release_id}

- Version: ${version}
- Git SHA: ${sha}
- Branch: ${branch}
- Generated At (UTC): ${generated_at}
- Previous Tag: ${previous_tag:-none}

## Included Commits
${commit_lines}
EOF2

cp "$notes_path" "${app_dir}/CHANGELOG_RELEASE.md"

COPYFILE_DISABLE=1 tar -czf "$archive_path" -C "$app_dir" .
shasum -a 256 "$archive_path" > "$checksum_path"

log "release package ready"
log "notes: ${notes_path}"
log "checksum: ${checksum_path}"
printf '%s\n' "$archive_path"
