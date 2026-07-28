import process from "node:process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertSupportedPlatform,
  normalizePlatform,
} from "../lib/platforms.js";
import {
  ensureTrellisInitialized,
  installTrellisProfile,
} from "../lib/trellis.js";
import { formatRelative } from "../lib/files.js";
import {
  resolveSkills,
  resolveMcps,
  defaultSkillIds,
  defaultMcpIds,
} from "../lib/catalog.js";
import { installCursor } from "../platforms/cursor/index.js";
import { installClaudeCode } from "../platforms/claude-code/index.js";
import { installOpenCode } from "../platforms/opencode/index.js";
import { installCodex } from "../platforms/codex/index.js";
import { runDoctor, formatDoctorReport } from "../doctor/index.js";
import { runInteractive } from "../tui/index.js";
import { installPi, ensurePiConfig, installPiProject } from "../platforms/pi/index.js";

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);

export async function run(argv) {
  // 无参数或仅 --help 以外无 subcommand 时，进入交互式 TUI。
  if (argv.length === 0) {
    const interactive = await runInteractive();
    if (!interactive) {
      return;
    }
    await init(process.cwd(), interactive);
    return;
  }

  // 优先处理全局 help 标志，避免被当作 command 或要求 -p。
  if (argv.includes("--help") || argv.includes("-h")) {
    writeOutput(helpText());
    return;
  }

  const { command, options } = parseArgs(argv);

  if (!command || command === "help") {
    writeOutput(helpText());
    return;
  }

  if (command === "interactive" || command === "tui") {
    const interactive = await runInteractive();
    if (!interactive) {
      return;
    }
    await init(process.cwd(), interactive);
    return;
  }

  const platform = normalizePlatform(options.platform);
  assertSupportedPlatform(platform);

  if (platform === "pi" && command !== "init" && command !== "update" && command !== "doctor") {
    throw new Error("Pi supports: dream-wf init|update|doctor -p pi.");
  }

  const rootDir = process.cwd();
  const mode = options.mode ?? "strict";
  if (!["strict", "advisory"].includes(mode)) {
    throw new Error("Invalid --mode. Use strict or advisory.");
  }

  if (command === "init") {
    await init(rootDir, { ...options, platform, mode });
    return;
  }

  if (command === "doctor") {
    const report = await runDoctor(rootDir, platform);
    writeOutput(formatDoctorReport(report));
    return;
  }

  if (command === "update") {
    await init(rootDir, { ...options, platform, mode });
    return;
  }

  if (command === "uninstall") {
    throw new Error(
      "uninstall is planned but not implemented in this MVP. Remove dream-wf generated files manually if needed.",
    );
  }

  throw new Error(`Unknown command "${command}".\n\n${helpText()}`);
}

async function init(rootDir, options) {
  // Pi 同时安装全局 CLI/扩展，并用 Trellis 原生 --pi 生成项目资产。
  if (options.platform === "pi") {
    writeOutput(formatBanner());
    const skillIds = options.skillIds ?? defaultSkillIds();
    const mcpIds = options.mcpIds ?? defaultMcpIds();
    const skills = resolveSkills(options.skills ? options.skills.map((s) => s.id) : skillIds);
    const mcps = resolveMcps(options.mcps ? options.mcps.map((m) => m.id) : mcpIds);
    const initOptions = { ...options, mode: options.mode ?? "strict", skills, mcps };
    const results = [...await installPi(), await ensurePiConfig()];
    const trellis = await ensureTrellisInitialized(rootDir, initOptions);
    if (!trellis.initialized) {
      writeOutput([
        formatInstallReport(rootDir, results),
        "",
        "Pi 已安装；当前项目尚未初始化 Trellis。",
        `Run: ${trellis.initCommand}`,
        "Then rerun dream-wf init -p pi.",
      ].join("\n"));
      return;
    }
    results.push(await installTrellisProfile(rootDir));
    results.push(...await installPiProject(packageRoot, rootDir, initOptions));
    const report = await runDoctor(rootDir, "pi");
    writeOutput(`${formatInstallReport(rootDir, results)}\n\n${formatDoctorReport(report)}`);
    return;
  }

  // 来自 TUI 的 options 已带 skills/mcps；来自 CLI 的 options 需要解析。
  const platform = options.platform;
  const mode = options.mode ?? "strict";

  const skillIds = options.skillIds ?? defaultSkillIds();
  const mcpIds = options.mcpIds ?? defaultMcpIds();
  const skills = resolveSkills(
    options.skills ? options.skills.map((s) => s.id) : skillIds,
  );
  const mcps = resolveMcps(
    options.mcps ? options.mcps.map((m) => m.id) : mcpIds,
  );

  const initOptions = { ...options, platform, mode, skills, mcps };

  writeOutput(formatBanner());

  const results = [];
  const trellis = await ensureTrellisInitialized(rootDir, initOptions);

  if (!trellis.initialized) {
    writeOutput(
      [
        "Trellis is not initialized in this project.",
        `Run: ${trellis.initCommand}`,
        "Then rerun dream-wf init.",
      ].join("\n"),
    );
    return;
  }

  results.push(await installTrellisProfile(rootDir));

  if (platform === "cursor") {
    results.push(...(await installCursor(packageRoot, rootDir, initOptions)));
  }

  if (platform === "claude") {
    results.push(
      ...(await installClaudeCode(packageRoot, rootDir, initOptions)),
    );
  }

  if (platform === "opencode") {
    results.push(...(await installOpenCode(packageRoot, rootDir, initOptions)));
  }

  if (platform === "codex") {
    results.push(...(await installCodex(packageRoot, rootDir, initOptions)));
  }

  const report = await runDoctor(rootDir, platform);
  writeOutput(
    `${formatInstallReport(rootDir, results)}\n\n${formatDoctorReport(report)}`,
  );
}

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const options = {};

  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];

    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }

    if (arg === "--install-deps") {
      options.installDeps = true;
      continue;
    }

    if (arg === "--skip-deps") {
      options.installDeps = false;
      continue;
    }

    if (arg === "--yes" || arg === "-y") {
      options.yes = true;
      continue;
    }

    if (arg === "--skip-skills") {
      options.skillIds = [];
      continue;
    }

    if (arg === "--skip-mcps") {
      options.mcpIds = [];
      continue;
    }

    if (arg === "-p" || arg === "--platform") {
      const value = rest[index + 1];
      if (!value || value.startsWith("-")) {
        throw new Error(
          "Missing value for -p/--platform. Use -p <cursor|claude|opencode|codex|pi>.",
        );
      }
      options.platform = value;
      index += 1;
      continue;
    }

    if (arg === "--mode") {
      options.mode = readOptionValue(arg, rest, index);
      index += 1;
      continue;
    }

    if (arg.startsWith("--mode=")) {
      options.mode = arg.slice("--mode=".length);
      continue;
    }

    if (arg === "--developer") {
      options.developer = readOptionValue(arg, rest, index);
      index += 1;
      continue;
    }

    if (arg.startsWith("--developer=")) {
      options.developer = arg.slice("--developer=".length);
      continue;
    }

    if (arg === "--skills") {
      options.skillIds = readOptionValue(arg, rest, index)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      index += 1;
      continue;
    }

    if (arg === "--mcps") {
      options.mcpIds = readOptionValue(arg, rest, index)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      index += 1;
      continue;
    }

    throw new Error(`Unexpected argument: ${arg}`);
  }

  return { command, options };
}

function readOptionValue(arg, rest, index) {
  const value = rest[index + 1];
  if (!value || value.startsWith("-")) {
    throw new Error(`Missing value for ${arg}.`);
  }
  return value;
}

function formatInstallReport(rootDir, results) {
  const lines = ["dream-wf install report:"];
  for (const result of results.flat().filter(Boolean)) {
    const suffix = result.reason ? ` (${result.reason})` : "";
    lines.push(
      `- ${result.action}: ${formatRelative(rootDir, result.path)}${suffix}`,
    );
  }
  return lines.join("\n");
}

function writeOutput(message) {
  process.stdout.write(`${message}\n`);
}

function formatBanner() {
  const banner = [
    "███████╗  ███████╗   ███████╗  ███████╗  ███╗   ███╗",
    "██╔═══██╗ ██╔═══██╗ ██╔═════╝ ██╔═══██╗ ████╗ ████║",
    "██║    ██║██████╔═╝ ███████╗  ███████╔╝ ██╔████╔██║",
    "██║    ██║██╔═══██╗ ██╔════╝  ██╔═══██╗ ██║╚██╔╝██║",
    "███████╔╝ ██║   ██║ ███████╗  ██║   ██║ ██║ ╚═╝ ██║",
    "╚══════╝  ╚═╝   ╚═╝ ╚══════╝  ╚═╝   ╚═╝ ╚═╝     ╚═╝",
    "  Dream WorkFlow v0.1.3",
  ].join("\n");

  if (!process.stdout.isTTY || process.env.NO_COLOR) {
    return banner;
  }

  return `\u001B[35m${banner}\u001B[0m`;
}

function helpText() {
  return [
    "dream-wf v0.1.3 · Trellis workflow 安装聚合器",
    "",
    "Usage:",
    "  dream-wf                         # 交互式 TUI（推荐）",
    "  dream-wf interactive             # 同上",
    "  dream-wf init -p <cursor|claude|opencode|codex|pi> [options]",
    "  dream-wf doctor -p <cursor|claude|opencode|codex|pi>",
    "  dream-wf update -p <cursor|claude|opencode|codex|pi>",
    "",
    "Options:",
    "  -p, --platform <platform>       cursor|claude|opencode|codex|pi",
    "  --mode strict|advisory          默认 strict",
    "  --skills <id,id,...>            指定要安装的 skill id（默认全部）",
    "  --mcps <id,id,...>              指定要配置的 mcp id（默认全部）",
    "  --skip-skills                    不安装任何 skill",
    "  --skip-mcps                     不配置任何 mcp",
    "  --install-deps --developer <n>  自动初始化 Trellis",
    "",
    "Skill ids:",
    "  trellis-dream-wf-patch, dream-wf-mcp-policy",
    "",
    "MCP ids:",
    "  fast-context, grok-search",
    "",
    "Examples:",
    "  npx dream-wf",
    "  npx dream-wf init -p cursor",
    "  npx dream-wf init -p pi",
    "  npx dream-wf init -p claude --skills trellis-dream-wf-patch --mcps fast-context",
    "  npx dream-wf doctor -p codex",
  ].join("\n");
}
