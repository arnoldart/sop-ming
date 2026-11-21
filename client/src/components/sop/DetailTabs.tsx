import type { SopDetail } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { Markdown } from '@/components/Markdown';
import { ApprovalTimeline } from '@/components/sop/ApprovalTimeline';
import { CompliancePanel } from '@/components/sop/CompliancePanel';
import { VersionHistory } from '@/components/sop/VersionHistory';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const DETAIL_TABS = [
  { value: 'isi', label: 'Isi' },
  { value: 'riwayat', label: 'Riwayat Versi' },
  { value: 'approval', label: 'Approval' },
  { value: 'konfirmasi', label: 'Konfirmasi' },
] as const;

export type DetailTab = (typeof DETAIL_TABS)[number]['value'];

export function isDetailTab(value: string | null): value is DetailTab {
  return DETAIL_TABS.some((tab) => tab.value === value);
}

/**
 * Isi SOP diawali heading `# judul` yang sama dengan judul halaman, jadi baris itu
 * dibuang agar judul tidak tampil dua kali di dalam kartu.
 */
function withoutLeadingTitle(content: string, title: string) {
  const [first, ...rest] = content.split('\n');
  const heading = first.replace(/^#\s+/, '').trim();
  if (!first.startsWith('# ') || heading.toLowerCase() !== title.trim().toLowerCase()) {
    return content;
  }
  return rest.join('\n').replace(/^\n+/, '');
}

function ContentPanel({ sop }: { sop: SopDetail }) {
  const published = sop.currentVersion;
  const draft = sop.draftVersion;
  const shown = draft ?? published;
  const content = shown?.content;
  const previous = published
    ? sop.versions.find((version) => version.versionNo === published.versionNo - 1)
    : undefined;

  return (
    <section className="rounded-xl border border-[#ededed] bg-card">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[#ededed] px-6 py-4">
        <h2 className="text-[15px] font-medium">Isi SOP</h2>
        {shown ? (
          <span className="text-xs text-muted-foreground">
            Diperbarui {formatDate(shown.publishedAt ?? shown.createdAt)}
          </span>
        ) : null}
      </header>

      <div className="px-6 py-6">
        {draft && published ? (
          <p className="mb-5 rounded-md border border-[#ededed] bg-secondary px-3 py-2 text-[13px] text-muted-foreground">
            Draf v{draft.versionNo} sedang disiapkan. Isi di bawah adalah draf; versi terbit masih v
            {published.versionNo}.
          </p>
        ) : null}

        {content ? (
          <Markdown text={withoutLeadingTitle(content, sop.title)} />
        ) : (
          <p className="text-sm text-muted-foreground">Belum ada isi untuk versi ini.</p>
        )}

        {published && published.versionNo > 1 && published.changeSummary ? (
          <p className="mt-8 border-t border-[#ededed] pt-4 text-[13px] leading-5 text-muted-foreground">
            Versi ini menggantikan versi {published.versionNo - 1}
            {previous?.effectiveDate ? ` yang terbit ${formatDate(previous.effectiveDate)}` : ''}.
            Ringkasan perubahan: {published.changeSummary}
          </p>
        ) : null}
      </div>
    </section>
  );
}

export function DetailTabs({
  sop,
  tab,
  onTabChange,
}: {
  sop: SopDetail;
  tab: DetailTab;
  onTabChange: (tab: DetailTab) => void;
}) {
  return (
    <Tabs value={tab} onValueChange={(value) => onTabChange(value as DetailTab)}>
      <TabsList
        variant="line"
        className="mb-4 h-11 w-full justify-start gap-7 rounded-none border-b border-[#ededed] px-0 py-0"
      >
        {DETAIL_TABS.map((item) => (
          <TabsTrigger
            key={item.value}
            value={item.value}
            className="-mb-px h-11 flex-none rounded-none border-b-2 border-transparent px-0 text-sm text-muted-foreground after:hidden data-active:border-b-foreground data-active:font-medium data-active:text-foreground"
          >
            {item.label}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="isi">
        <ContentPanel sop={sop} />
      </TabsContent>
      <TabsContent value="riwayat">
        <VersionHistory versions={sop.versions} />
      </TabsContent>
      <TabsContent value="approval">
        <ApprovalTimeline approvals={sop.approvals} />
      </TabsContent>
      <TabsContent value="konfirmasi">
        <CompliancePanel sop={sop} />
      </TabsContent>
    </Tabs>
  );
}
