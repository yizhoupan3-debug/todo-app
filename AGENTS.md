# Local Codex Hygiene Rules

These rules narrow how Codex should persist runtime state inside this repo.

## Artifact sink

- All **repo-local Codex runtime artifacts** must live under `.codex/`, not the repo root.
- Use these paths when persistence is actually needed:
  - `.codex/.supervisor_state.json`
  - `.codex/.app_supervisor_state.json`
  - `.codex/SESSION_SUMMARY.md`
  - `.codex/NEXT_ACTIONS.json`
  - `.codex/EVIDENCE_INDEX.json`
  - `.codex/TRACE_METADATA.json`
  - `.codex/RESUME_PACKET.md`
  - `.codex/STATE_DELTA.json`
  - `.codex/context_snapshot.json`
  - `.codex/.execution_audit_state.json`
  - `.codex/audit_report.md`
- If legacy root-level copies exist, move them into `.codex/` and remove the root copies.

## Default persistence policy

- Small and medium tasks should default to **chat-only continuity**.
- Do **not** create `SESSION_SUMMARY.md`, `NEXT_ACTIONS.json`, `EVIDENCE_INDEX.json`, or `TRACE_METADATA.json` by default for routine fixes.
- Only persist when at least one of these is true:
  - the task is long-running or resumable
  - the task explicitly needs checkpoint / rollback / audit evidence
  - the user asks for durable artifacts
  - the verification surface is large enough that chat-only state would be brittle

## Complex-controller threshold

- Treat `execution-controller-coding` as a **large-task controller**, not the default for every cross-file edit.
- In this repo, “complex execution” means the task satisfies **at least two** of:
  - expected to touch more than 3 files
  - spans multiple subsystems or phases
  - needs resume / checkpoint / rollback semantics
  - needs multi-surface verification such as tests + browser + logs
  - explicitly asks for run-until-done, orchestration, or delegation
- Routine 1–3 file edits should go directly to the narrow domain owner without controller artifacts.

## Delegation

- Check delegation only when bounded parallel slices materially help.
- Do not split tiny, tightly coupled, or mostly sequential work.

## Scope note

- These hygiene rules apply to **Codex runtime artifacts**.
- Application runtime logs, release bundles, and product data should continue using their own purpose-built directories.
