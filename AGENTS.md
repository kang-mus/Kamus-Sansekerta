# Agent Skills (OpenCode)

This project uses skills from `addyosmani/agent-skills` installed under `.agents/skills/` (OpenCode auto-discovers `.agents/skills/<name>/SKILL.md`).

Shared checklists live in `.agents/references/`.

## Core Rules

- If a task matches a skill, invoke it with the `skill` tool before acting.
- Skills are located in `.agents/skills/<skill-name>/SKILL.md`.
- Follow the skill workflow strictly; do not partially apply it.
- Never skip required steps such as spec, plan, or test when a skill demands them.

## Intent -> Skill Mapping

Map the user's intent to the matching skill automatically:

- Feature / new functionality -> `spec-driven-development`, then `incremental-implementation` and `test-driven-development`
- Planning / breakdown -> `planning-and-task-breakdown`
- Vague idea -> `idea-refine`, `interview-me`
- Bug / failure / unexpected behavior -> `debugging-and-error-recovery`
- Code review -> `code-review-and-quality`
- Refactoring / simplification -> `code-simplification`
- API or interface design -> `api-and-interface-design`
- UI work -> `frontend-ui-engineering`
- Security work -> `security-and-hardening`
- Performance work -> `performance-optimization`
- Shipping / deploy -> `shipping-and-launch`, `git-workflow-and-versioning`

## Execution Model

For every request:

1. Determine if any skill applies (even a small chance).
2. Load the skill with `skill({ name: "^<skill-name^>" })`.
3. Follow the skill workflow exactly.
4. Only proceed to implementation once required steps are complete.
