# Dream WF PRD Policy

This project uses `dream-wf` on top of Trellis.

## Policy

- Keep Trellis task lifecycle and artifacts.
- Use grill-me style clarification during PRD creation and refinement.
- Do not start planning by writing a speculative initial PRD.
- Ask one high-value question first.
- Provide 2-3 options and a recommended answer for each question.
- Inspect code, docs, config, existing specs, and task history before asking the user.
- Update `prd.md` only after each confirmed answer, confirmed existing fact, or explicit decision.
- Treat task creation consent and implementation approval as separate gates.
- Do not start implementation until the PRD is confirmed.

## Initial Spec Candidates

During bootstrap or planning, spec candidates may come from:

- User answers.
- PRD decisions.
- Design decisions.
- Verified codebase facts.
- Existing tests, configs, docs, and conventions.

Initial spec candidates require user review before they become stable project conventions.
