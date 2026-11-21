/**
 * Runs the scripted conversations against the real model and the seeded dev database.
 * It costs money, so it runs only by hand, never in CI or `verify`:
 *
 *   pnpm --filter server assistant:eval              # every case
 *   pnpm --filter server assistant:eval cold sleep   # only these case ids
 *
 * ASSISTANT_MODEL picks the model under test. Exits non-zero when any case fails.
 */
import { config } from "../../src/config/env.js";
import { pool } from "../../src/db/client.js";
import { findProductById, searchCatalogue } from "../../src/db/products.repo.js";
import type { MessagePart } from "../../src/schemas/assistant.schema.js";
import { createAnthropicClient } from "../../src/services/assistant/anthropicClient.js";
import { runTurn, type TurnLog } from "../../src/services/assistant/runTurn.js";
import { CASES, type EvalCase } from "./cases.js";
import { checkTurn } from "./checks.js";
import { addUsage, costUsd, ZERO_USAGE, type Usage } from "./cost.js";
import { gradeTone, judgeInput, JUDGE_MODEL } from "./grade.js";

const print = (line = "") => process.stdout.write(`${line}\n`);
const dollars = (n: number | undefined) => (n === undefined ? "n/a" : `$${n.toFixed(5)}`);

interface CaseResult {
  id: string;
  failures: string[];
  usage: Usage;
  judgeUsage: Usage;
}

async function runCase(
  client: NonNullable<ReturnType<typeof createAnthropicClient>>,
  c: EvalCase,
): Promise<CaseResult> {
  let log: TurnLog | undefined;
  const parts: MessagePart[] = [];
  try {
    const turn = runTurn(c.input, {
      stream: (params, signal) => client.messages.stream(params, { signal }),
      model: config.assistantModel,
      signal: new AbortController().signal,
      searchCatalogue,
      findProductById,
      logTurn: (l) => {
        log = l;
      },
    });
    for await (const part of turn) parts.push(part);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // logTurn still ran, so the tokens spent before the error count toward the cost.
    const usage: Usage = log ?? ZERO_USAGE;
    return { id: c.id, failures: [`error: ${message}`], usage, judgeUsage: ZERO_USAGE };
  }

  const usage: Usage = log ?? ZERO_USAGE;
  const failures = checkTurn({ parts, modelCalled: log !== undefined }, c.expect);
  if (c.expect.urgent || log === undefined) {
    return { id: c.id, failures, usage, judgeUsage: ZERO_USAGE };
  }
  const graded = await gradeTone(
    client,
    judgeInput(c.input.caseFile, c.input.userText, parts, c.expect.tone),
  );
  if (!graded.verdict.pass) failures.push(`tone: ${graded.verdict.reason}`);
  return { id: c.id, failures, usage, judgeUsage: graded.usage };
}

async function main(): Promise<number> {
  const client = createAnthropicClient(config.anthropicApiKey);
  if (!client) {
    process.stderr.write("ANTHROPIC_API_KEY is not set (add it to apps/server/.env).\n");
    return 1;
  }
  const only = process.argv.slice(2);
  const cases = only.length > 0 ? CASES.filter((c) => only.includes(c.id)) : CASES;
  const unknown = only.filter((id) => !CASES.some((c) => c.id === id));
  if (unknown.length > 0) {
    process.stderr.write(`Unknown case ids: ${unknown.join(", ")}\n`);
    return 1;
  }

  const model = config.assistantModel;
  print(`Assistant evals: ${cases.length} cases on ${model}, tone judged by ${JUDGE_MODEL}\n`);
  const results: CaseResult[] = [];
  // One at a time: later cases read the prompt cache the first one wrote.
  for (const c of cases) {
    const result = await runCase(client, c);
    results.push(result);
    const u = result.usage;
    print(
      `${result.failures.length === 0 ? "PASS" : "FAIL"}  ${c.id.padEnd(26)} ` +
        `in ${u.inputTokens} out ${u.outputTokens} cache r/w ${u.cacheReadTokens}/${u.cacheWriteTokens}  ` +
        dollars(costUsd(model, u)),
    );
    for (const failure of result.failures) print(`      - ${failure}`);
  }

  const passed = results.filter((r) => r.failures.length === 0).length;
  const turns = results.reduce((sum, r) => addUsage(sum, r.usage), ZERO_USAGE);
  const judge = results.reduce((sum, r) => addUsage(sum, r.judgeUsage), ZERO_USAGE);
  const turnCost = costUsd(model, turns);
  const judgeCost = costUsd(JUDGE_MODEL, judge);
  print();
  print(`Passed ${passed}/${results.length} (${Math.round((passed / results.length) * 100)}%)`);
  print(
    `Turns: in ${turns.inputTokens} out ${turns.outputTokens} ` +
      `cache r/w ${turns.cacheReadTokens}/${turns.cacheWriteTokens}, ${dollars(turnCost)}` +
      (turnCost === undefined ? "" : ` (${dollars(turnCost / results.length)} per case)`),
  );
  print(`Judge: ${dollars(judgeCost)}`);
  return passed === results.length ? 0 : 1;
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((err: unknown) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
