# AI Notes (Learning Record)

This folder keeps an *editable*, publishable learning record of the AI-assisted development process for this repo.

Goals:

- Capture decisions, tradeoffs, and verification steps.
- Make it easy to reproduce changes or debug regressions later.
- Keep it safe to publish.

## Redaction rules (important)

Before publishing:

- Remove or mask secrets: tokens, passwords, private URLs, SSH hosts, keystore info.
- Prefer describing steps over pasting raw terminal history.
- If you must reference an internal value, use placeholders like `***`.

## Files

- `SESSION_2026-01-15.zh.md` — 中文会话/实现纪要（推荐作为发布版本）
- `SESSION_2026-01-15.md` — English version

## Template for future sessions

Create a new file:

- `SESSION_YYYY-MM-DD.zh.md`
- `SESSION_YYYY-MM-DD.md`

Recommended sections:

- Goals / non-goals
- Architecture touched
- Key design decisions
- Changes by file
- Tests & validation
- Gotchas / follow-ups
