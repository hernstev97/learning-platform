// Scenario steps that run through lp-agent, shared by the exercise in the browser and `pnpm vm:verify`.
import type { ScenarioCheck } from '../content/types.ts';
import type { AgentChannel } from './channel.ts';

export type CheckResult = { name: string; ok: boolean; output: string };

/**
 * Builds the fault into a freshly restored VM. The clock comes first, so new log lines carry today's date. It runs a
 * second ahead: the 9p file system stamps new files with the host's time, and a file from "the future" makes `ls -l`
 * show the year instead of the time.
 */
export async function prepareScenario(agent: AgentChannel, setup: string, now = Date.now()): Promise<void> {
  await agent.run(`date -s @${((now + 1000) / 1000).toFixed(3)} >/dev/null`);
  const result = await agent.run(setup, 120_000);
  if (result.code !== 0) throw new Error(`Der Aufbau des Szenarios ist fehlgeschlagen (Exit-Code ${result.code}).\n${result.output}`);
}

/** Runs every check, also after a failed one, so the learner sees the whole picture. */
export async function runChecks(agent: AgentChannel, checks: ScenarioCheck[]): Promise<CheckResult[]> {
  // lp-agent only runs in normal operation. During a reboot or in rescue or emergency mode every check would wait
  // for its full timeout; one short question first tells the learner what is going on. 20 s leave room for a VM that
  // a scenario keeps busy on purpose.
  await agent.run('true', 20_000).catch(() => {
    throw new Error('Die VM antwortet nicht. Startet das System gerade neu, oder steckt es im Rescue- oder Emergency-Modus? Warte auf den Prompt oder bringe das System in den normalen Betrieb, dann prüfe erneut.');
  });
  const results: CheckResult[] = [];
  for (const check of checks) {
    const { code, output } = await agent.run(check.run, 60_000);
    results.push({ name: check.name, ok: code === 0, output: output.trim() });
  }
  return results;
}
