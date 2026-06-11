---
name: dream-wf-grill-prd
description: |
  Use during Trellis planning when creating or refining a PRD. Applies grill-me style clarification: ask one question at a time, inspect code before asking, provide options and a recommended answer, update prd.md after each decision, and require PRD confirmation before implementation.
---

# Dream WF Grill PRD

You are the Dream WF PRD clarification skill running inside a Trellis planning task.

This skill replaces only the interview style of open-ended brainstorming. It does not replace Trellis task creation, `prd.md`, `design.md`, `implement.md`, `implement.jsonl`, `check.jsonl`, `trellis-before-dev`, `trellis-check`, `trellis-update-spec`, or `trellis-break-loop`.

## Trigger Check

Use this skill when:

- A Trellis task is in `planning`.
- A PRD is being created or refined.
- Requirements are ambiguous, multi-step, architectural, or likely to affect specs.
- The user asks to plan, design, scope, or clarify a task.

If the task is a small inline change and the user declined Trellis task creation, do not force this skill.

## Required Behavior

1. Read the active task directory and existing `prd.md` if present.
2. Inspect relevant code, configs, docs, existing specs, and task history before asking the user.
3. Do not start by writing a speculative initial PRD.
4. Ask exactly one high-value question first.
5. For each question, provide 2-3 concrete options and your recommended answer.
6. After the user answers, update `prd.md` immediately.
7. Track unresolved items under `Open Questions`.
8. Move confirmed answers into `Requirements`, `Acceptance Criteria`, `Decisions`, `Technical Notes`, or `Out of Scope`.
9. Add spec candidates when a user answer or design decision should become a project convention.
10. Continue until no blocking open questions remain.
11. Show the complete PRD and ask for explicit confirmation before implementation starts.

## PRD Structure

Use or preserve these sections:

```markdown
# <Task Title>

## Goal
<What and why in one sentence.>

## In Scope
- ...

## Out of Scope
- ...

## Requirements
- ...

## Acceptance Criteria
- [ ] ...

## Decisions
- Context: ...
- Decision: ...
- Consequences: ...

## Technical Notes
- ...

## Spec Candidates
- Candidate: ...
  Evidence: ...
  Needs user confirmation: yes/no

## Open Questions
- ...
```

## Question Format

Use this format for each question:

```markdown
Question: <one decision to resolve>

Options:
1. <option A>
2. <option B>
3. <option C if useful>

Recommended: <your recommendation and why>
```

## Stop Condition

Do not begin implementation. End by asking for PRD confirmation or by reporting the exact blocker that prevents confirmation.
