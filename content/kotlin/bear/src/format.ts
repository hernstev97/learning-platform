export const escape = (value: string) => value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
export function highlight(code: string): string {
  // Split exercise markers first so holes inside strings remain interactive.
  return code.split(/(⟦\d+⟧)/g).map((chunk) => {
    const gap = chunk.match(/^⟦(\d+)⟧$/);
    if (gap) return `<a class="code-gap" href="#answer-g${gap[1]}" data-gap-link="g${gap[1]}" aria-label="Zu Lücke ${gap[1]}">${gap[1]}</a>`;
    return chunk.split(/(\/\/[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|@[A-Za-z]+|\b(?:val|var|fun|class|data|interface|sealed|suspend|return|if|else|when|for|in|by|override|private|is|true|false|null|object|try|catch|finally|throw|const|while|continue|internal|enum|as)\b|\b\d+(?:\.\d+)?(?:[fFLl])?\b)/g).map((part) => {
      let type = '';
      if (/^\/\//.test(part)) type = 'comment';
      else if (/^["']/.test(part)) type = 'string';
      else if (/^@/.test(part)) type = 'annotation';
      else if (/^\d/.test(part)) type = 'number';
      else if (/^(val|var|fun|class|data|interface|sealed|suspend|return|if|else|when|for|in|by|override|private|is|true|false|null|object|try|catch|finally|throw|const|while|continue|internal|enum|as)$/.test(part)) type = 'keyword';
      return type ? `<span class="syntax-${type}">${escape(part)}</span>` : escape(part);
    }).join('');
  }).join('');
}
