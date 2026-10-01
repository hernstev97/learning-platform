// Commands of a lesson code block marked `vm`, as they are typed into the lesson's terminal and run by `pnpm vm:verify`.

/**
 * A bash block is a script and runs as it is. A console block shows a session: lines starting with "$ " are commands
 * (a trailing backslash continues one on the next line), everything else is output and stays out.
 */
export function vmCommands(code: string, lang: string): string {
  if (lang !== 'console') return code.replace(/\n+$/, '');
  const commands: string[] = [];
  let continued = false;
  for (const line of code.split('\n')) {
    if (continued) commands[commands.length - 1] += `\n${line}`;
    else if (line.startsWith('$ ')) commands.push(line.slice(2));
    else continue;
    continued = line.endsWith('\\');
  }
  return commands.join('\n');
}
