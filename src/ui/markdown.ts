/**
 * Minimal Markdown-subset renderer for Fragment document bodies (letters,
 * notebook pages, historical records). Deliberately not a full Markdown
 * implementation — see docs/engineering/adr/0006-fragment-system.md for
 * why a dependency was rejected for Phase 1. Supports: #/##/### headings,
 * **bold**, *italic*, blank-line-separated paragraphs, single newlines as
 * line breaks. Nothing else (no lists, tables, links, code).
 */
export function renderMarkdownSubset(source: string): string {
  const escaped = escapeHtml(source.trim());
  const blocks = escaped.split(/\n{2,}/);

  return blocks
    .map((block) => {
      const headingMatch = block.match(/^(#{1,3})\s+(.*)$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        return `<h${level}>${inline(headingMatch[2])}</h${level}>`;
      }
      const withBreaks = block.split('\n').map(inline).join('<br>');
      return `<p>${withBreaks}</p>`;
    })
    .join('\n');
}

function inline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
