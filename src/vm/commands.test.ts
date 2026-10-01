import { describe, expect, it } from 'vitest';
import { vmCommands } from './commands.ts';

describe('vmCommands', () => {
  it('takes only the commands of a console session, with continued lines', () => {
    const session = ['$ ls /srv', 'data  www', '$ sudo find /srv -name "*.log" \\', '    -mtime +7', './alt.log', '# hostnamectl', '$ echo fertig'].join('\n');
    expect(vmCommands(session, 'console')).toBe('ls /srv\nsudo find /srv -name "*.log" \\\n    -mtime +7\necho fertig');
  });

  it('runs a bash block as it is', () => {
    expect(vmCommands('for f in *.txt; do\n  wc -l "$f"\ndone\n\n', 'shell')).toBe('for f in *.txt; do\n  wc -l "$f"\ndone');
  });
});
