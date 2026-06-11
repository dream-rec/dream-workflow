# Spec Bootstrap Policy

Trellis creates `.trellis/spec/` templates during initialization. Those templates are placeholders until the project has a reviewed first spec pass.

## First Spec Pass

Generate candidate specs from three sources:

1. User decisions captured through grill-me PRD clarification.
2. Product and technical decisions recorded in `prd.md`, `design.md`, and `implement.md`.
3. Verified project facts from code, tests, configs, docs, and existing conventions.

Do not write speculative architecture as if it is already true.

## New Projects

For new projects, specs should describe decisions that have actually been made:

- Product boundaries and acceptance criteria from the first PRD.
- Chosen tech stack and package structure.
- API, component, state, data, error, logging, test, and validation conventions that are needed now.
- Minimal rules needed for the next task, not a complete imaginary architecture.

## Existing Projects

For existing projects, specs should be evidence-backed:

- Read representative source files before writing conventions.
- Reference concrete file paths and patterns.
- Remove rules that cannot be traced to code, docs, or confirmed user decisions.
- Prefer empty templates over incorrect templates.

## Review Gate

Initial specs are candidates until the user reviews them. After confirmation, future tasks may treat them as project conventions.

## Long-Term Maintenance

Use `trellis-update-spec` after tasks when a reusable learning, decision, gotcha, anti-pattern, or repeated correction should become project memory.
