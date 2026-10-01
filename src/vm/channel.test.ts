import { afterEach, describe, expect, it, vi } from 'vitest';
import { AgentChannel, fromBase64, toBase64 } from './channel.ts';

/** Plays lp-agent: decodes each request line and answers it. */
function agent(answer: (script: string) => { code: number; output: string } | null) {
  const sent: string[] = [];
  const channel = new AgentChannel((bytes) => {
    const line = new TextDecoder().decode(bytes);
    sent.push(line);
    const [id, payload] = line.trim().split(' ');
    const result = answer(fromBase64(payload));
    if (result) queueMicrotask(() => reply(`@@${id} ${result.code} ${toBase64(result.output)}\n`));
  });
  const reply = (text: string) => { for (const char of text) channel.receive(char.charCodeAt(0)); };
  return { channel, sent, reply };
}

describe('AgentChannel', () => {
  afterEach(() => vi.useRealTimers());

  it('round-trips scripts and output with umlauts and newlines', async () => {
    const { channel } = agent((script) => ({ code: 3, output: `${script}\nprüfung: ✗` }));
    expect(await channel.run('systemctl is-active app')).toEqual({ code: 3, output: 'systemctl is-active app\nprüfung: ✗' });
  });

  it('sends one request at a time and matches answers by id', async () => {
    const pending: string[] = [];
    const { channel, sent, reply } = agent((script) => { pending.push(script); return null; });
    const first = channel.run('eins');
    const second = channel.run('zwei');
    expect(sent).toHaveLength(1);
    reply(`@@2 0 ${toBase64('falsche id')}\n`);
    reply('irgendein Rauschen\n');
    reply(`@@1 0 ${toBase64('erste')}\n`);
    expect(await first).toEqual({ code: 0, output: 'erste' });
    expect(sent).toHaveLength(2);
    reply(`@@2 1 \n`);
    expect(await second).toEqual({ code: 1, output: '' });
    expect(pending).toEqual(['eins', 'zwei']);
  });

  it('announces a booted agent', async () => {
    const { channel, reply } = agent(() => null);
    const ready = channel.ready();
    reply('@@ready\r\n');
    await expect(ready).resolves.toBeUndefined();
  });

  it('gives up after the timeout and moves on to the next request', async () => {
    vi.useFakeTimers();
    const { channel, sent, reply } = agent(() => null);
    const stuck = channel.run('sleep 999', 1000);
    const next = channel.run('true');
    vi.advanceTimersByTime(1000);
    await expect(stuck).rejects.toThrow('Die VM antwortet nicht.');
    expect(sent).toHaveLength(2);
    reply(`@@2 0 \n`);
    await expect(next).resolves.toEqual({ code: 0, output: '' });
  });

  it('rejects everything pending on reset', async () => {
    const { channel } = agent(() => null);
    const first = channel.run('eins');
    const second = channel.run('zwei');
    channel.reset();
    await expect(first).rejects.toThrow('Die VM wurde neu gestartet.');
    await expect(second).rejects.toThrow('Die VM wurde neu gestartet.');
  });
});
