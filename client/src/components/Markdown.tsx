import type { ReactNode } from 'react';

/** Inline: **tebal** dan `kode`. Teks dirender sebagai React node, jadi aman dari HTML. */
function inline(text: string, keyPrefix: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean);
  return parts.map((part, i) => {
    const key = `${keyPrefix}-${i}`;
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={key} className="font-medium text-ink">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={key} className="rounded-xs bg-canvas-soft px-1 py-0.5 font-mono text-[13px]">
          {part.slice(1, -1)}
        </code>
      );
    }
    return <span key={key}>{part}</span>;
  });
}

/**
 * Renderer markdown minimal: heading, daftar berurut/tidak, paragraf.
 * ponytail: tanpa parser pihak ketiga — format SOP hanya butuh enam konstruksi ini.
 */
export function Markdown({ text }: { text: string }) {
  const lines = text.split('\n');
  const blocks: ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flushList = () => {
    if (!list) return;
    const Tag = list.ordered ? 'ol' : 'ul';
    blocks.push(
      <Tag key={`list-${blocks.length}`}>
        {list.items.map((item, i) => (
          <li key={i}>{inline(item, `li-${blocks.length}-${i}`)}</li>
        ))}
      </Tag>,
    );
    list = null;
  };

  lines.forEach((raw, index) => {
    const line = raw.trimEnd();

    if (!line.trim()) {
      flushList();
      return;
    }

    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      flushList();
      const level = heading[1].length;
      const content = inline(heading[2], `h-${index}`);
      if (level === 1) blocks.push(<h1 key={index}>{content}</h1>);
      else if (level === 2) blocks.push(<h2 key={index}>{content}</h2>);
      else blocks.push(<h3 key={index} className="mb-1 text-[16px] font-medium">{content}</h3>);
      return;
    }

    const ordered = /^\d+\.\s+(.*)$/.exec(line);
    if (ordered) {
      if (!list || !list.ordered) {
        flushList();
        list = { ordered: true, items: [] };
      }
      list.items.push(ordered[1]);
      return;
    }

    const bullet = /^[-*]\s+(.*)$/.exec(line);
    if (bullet) {
      if (!list || list.ordered) {
        flushList();
        list = { ordered: false, items: [] };
      }
      list.items.push(bullet[1]);
      return;
    }

    flushList();
    blocks.push(<p key={index}>{inline(line, `p-${index}`)}</p>);
  });

  flushList();

  return <div className="prose-sop max-w-none">{blocks}</div>;
}
