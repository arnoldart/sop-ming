import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { PANDUAN, type PanduanBlock } from '@/content/panduan';
import { cn } from '@/lib/utils';

const DEFAULT_SECTION = PANDUAN[0]?.id ?? 'memulai';

/**
 * Panduan pemakaian, bukan dokumentasi teknis. Satu artikel ditampilkan pada
 * satu waktu; daftar isi di kiri memilih artikel lewat hash URL agar bisa
 * ditautkan langsung (mis. /panduan#karyawan).
 */
export function PanduanPage() {
  const { hash } = useLocation();
  const navigate = useNavigate();
  const activeId = hash.replace('#', '') || DEFAULT_SECTION;
  const active = PANDUAN.find((section) => section.id === activeId) ?? PANDUAN[0];

  // Kembali ke atas supaya judul halaman tidak tertutup topbar saat berganti bagian.
  useEffect(() => {
    if (!hash) return;
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [hash]);

  return (
    <>
      <PageHeader
        title="Panduan Pengguna"
        description="Cara memakai MING SOP Center sesuai peran Anda. Panduan ini hanya-baca."
      />

      <div className="grid gap-6 lg:grid-cols-[264px_minmax(0,1fr)] lg:items-start">
        <nav
          aria-label="Daftar isi panduan"
          className="rounded-xl border border-[#ededed] bg-card p-4 lg:sticky lg:top-24"
        >
          <p className="px-2 pb-2 text-[11px] font-medium tracking-[0.06em] text-muted-foreground uppercase">
            Daftar isi
          </p>
          <ul className="space-y-0.5">
            {PANDUAN.map((section) => {
              const isActive = section.id === active?.id;
              return (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    aria-current={isActive ? 'true' : undefined}
                    onClick={(event) => {
                      event.preventDefault();
                      navigate({ hash: section.id });
                    }}
                    className={cn(
                      'flex h-8 items-center rounded-md px-2 text-[13px] transition-colors',
                      isActive
                        ? 'bg-[#D8F8E9] font-medium text-foreground'
                        : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                    )}
                  >
                    {section.label}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>

        {active ? (
          <article
            key={active.id}
            data-section={active.id}
            className="rounded-xl border border-[#ededed] bg-card p-6 lg:p-8"
          >
            <span className="inline-flex rounded-full bg-[#D8F8E9] px-2.5 py-1 text-xs font-medium">
              {active.badge}
            </span>
            <h2 className="mt-3 text-[22px] leading-7 font-medium">{active.title}</h2>
            <div className="mt-4 space-y-4">
              {active.blocks.map((block, index) => (
                <Block key={index} block={block} />
              ))}
            </div>
          </article>
        ) : null}
      </div>
    </>
  );
}

function Block({ block }: { block: PanduanBlock }) {
  switch (block.type) {
    case 'paragraph':
      return <p className="text-sm leading-6">{block.text}</p>;

    case 'heading':
      return <h3 className="pt-2 text-[15px] font-medium">{block.text}</h3>;

    case 'steps':
      return (
        <ol className="space-y-3">
          {block.items.map((item, index) => (
            <li key={index} className="flex gap-3">
              <span
                className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border border-[#ededed] bg-[#fafafa] text-xs tabular-nums"
                aria-hidden
              >
                {index + 1}
              </span>
              <p className="text-sm leading-6">{item}</p>
            </li>
          ))}
        </ol>
      );

    case 'image':
      return (
        <figure className="space-y-2">
          <a href={block.src} target="_blank" rel="noreferrer" className="block cursor-zoom-in">
            <img
              src={block.src}
              alt={block.alt}
              loading="lazy"
              decoding="async"
              className="w-full rounded-lg border border-[#ededed]"
            />
          </a>
          <figcaption className="text-xs text-muted-foreground">{block.caption ?? block.alt}</figcaption>
        </figure>
      );

    case 'callout':
      return (
        <div className="rounded-lg border border-[#ededed] bg-[#fafafa] px-4 py-3 text-[13px] leading-6 text-muted-foreground">
          {block.text}
        </div>
      );

    case 'terms':
      return (
        <dl className="space-y-3">
          {block.items.map((item) => (
            <div key={item.term}>
              <dt className="text-sm font-medium">{item.term}</dt>
              <dd className="mt-0.5 text-sm leading-6 text-muted-foreground">{item.text}</dd>
            </div>
          ))}
        </dl>
      );

    case 'statusTable':
      return (
        <div className="overflow-x-auto rounded-lg border border-[#ededed]">
          <table className="w-full min-w-[520px] border-collapse text-sm">
            <thead className="bg-[#fafafa]">
              <tr>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium tracking-[0.04em] text-muted-foreground uppercase">
                  Status
                </th>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium tracking-[0.04em] text-muted-foreground uppercase">
                  Arti
                </th>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium tracking-[0.04em] text-muted-foreground uppercase">
                  Yang mengubah
                </th>
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row) => (
                <tr key={row.status} className="border-t border-[#ededed]">
                  <td className="px-4 py-3 font-medium whitespace-nowrap">{row.status}</td>
                  <td className="px-4 py-3 text-muted-foreground">{row.meaning}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{row.actor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    default:
      return null;
  }
}
