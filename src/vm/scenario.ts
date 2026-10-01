// Scenario steps that run through lp-agent, shared by the exercise in the browser and `pnpm vm:verify`.
import type { ScenarioCheck } from '../content/types.ts';
import type { AgentChannel } from './channel.ts';

export type CheckResult = { name: string; ok: boolean; output: string };

/** Builds the fault into a freshly restored VM. The clock comes first, so new log lines carry today's date. */
export async function prepareScenario(agent: AgentChannel, setup: string, now = Date.now()): Promise<void> {
  await agent.run(`date -s @${Math.floor(now / 1000)} >/dev/null`);
  const result = await agent.run(setup, 120_000);
  if (result.code !== 0) throw new Error(`Der Aufbau des Szenarios ist fehlgeschlagen (Exit-Code ${result.code}).\n${result.output}`);
}

/** Runs every check, also after a failed one, so the learner sees the whole picture. */
export async function runChecks(agent: AgentChannel, checks: ScenarioCheck[]): Promise<CheckResult[]> {
  const results: CheckResult[] = [];
  for (const check of checks) {
    const { code, output } = await agent.run(check.run, 60_000);
    results.push({ name: check.name, ok: code === 0, output: output.trim() });
  }
  return results;
}
