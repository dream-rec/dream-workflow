#!/usr/bin/env python3

import json
import os
import re
import sys
from pathlib import Path

MUTATING_TOOLS = {"Write", "Edit", "MultiEdit", "Delete"}
MUTATING_SHELL = re.compile(r"\b(rm|mv|cp|mkdir|touch|npm\s+install|pnpm\s+add|yarn\s+add|bun\s+add|git\s+commit|git\s+push)\b")


def find_root(cwd):
    current = Path(cwd).resolve()
    for candidate in [current, *current.parents]:
        if (candidate / ".trellis").exists():
            return candidate
    return current


def active_tasks(root):
    tasks_dir = root / ".trellis" / "tasks"
    if not tasks_dir.exists():
        return []

    result = []
    for task_json in tasks_dir.glob("*/task.json"):
        try:
            data = json.loads(task_json.read_text())
        except Exception:
            continue
        if data.get("status") in {"planning", "in_progress"}:
            result.append((task_json.parent, data))
    return result


def is_prd_confirmed(task_dir):
    prd = task_dir / "prd.md"
    if not prd.exists():
        return False
    text = prd.read_text(errors="ignore").lower()
    markers = ["prd confirmed", "confirmed: true", "status: confirmed", "用户已确认", "已确认"]
    return any(marker in text for marker in markers)


def is_planning_artifact(root, tool_input):
    if not isinstance(tool_input, dict):
        return False

    candidate = tool_input.get("path") or tool_input.get("file_path") or tool_input.get("target_file") or ""
    if not candidate:
        return False

    try:
        file_path = Path(candidate)
        if not file_path.is_absolute():
            file_path = (root / file_path).resolve()
        relative = file_path.relative_to(root).as_posix()
    except Exception:
        return False

    if not relative.startswith(".trellis/tasks/"):
        return False

    name = Path(relative).name
    return (
        name in {"prd.md", "design.md", "implement.md", "implement.jsonl", "check.jsonl"}
        or "/research/" in relative
    )


def deny(message):
    print(json.dumps({
        "permission": "deny",
        "user_message": message,
        "agent_message": message
    }))
    sys.exit(0)


def allow():
    print(json.dumps({"permission": "allow"}))
    sys.exit(0)


def main():
    try:
        payload = json.load(sys.stdin)
    except Exception:
        allow()

    tool_name = payload.get("tool_name") or payload.get("tool", "")
    tool_input = payload.get("tool_input") or payload.get("input") or {}
    cwd = payload.get("cwd") or os.getcwd()
    root = find_root(cwd)

    is_mutating = tool_name in MUTATING_TOOLS
    command = tool_input.get("command", "") if isinstance(tool_input, dict) else ""
    if tool_name in {"Shell", "Bash"} and MUTATING_SHELL.search(command):
        is_mutating = True

    if not is_mutating:
        allow()

    tasks = active_tasks(root)
    if not tasks:
        deny("dream-wf strict: mutating actions require an active Trellis task. Create or start a Trellis task first, or explicitly switch dream-wf to advisory mode.")

    planning_tasks = [(task_dir, task) for task_dir, task in tasks if task.get("status") == "planning"]
    if planning_tasks:
        if is_planning_artifact(root, tool_input):
            allow()
        unconfirmed = [task for task_dir, task in planning_tasks if not is_prd_confirmed(task_dir)]
        if unconfirmed:
            deny("dream-wf strict: implementation is blocked while this task is in planning and its PRD is not confirmed. Continue grill-me PRD clarification first. Planning artifacts under .trellis/tasks/** are allowed.")

    allow()


if __name__ == "__main__":
    main()
