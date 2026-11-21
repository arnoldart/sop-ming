import { Search } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const ALL = 'all';

/** Status yang benar-benar dipakai kolom `Sop.status` (alur kerja, bukan status versi). */
const STATUS_OPTIONS = ['DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED'] as const;

const STATUS_FILTER_LABEL: Record<string, string> = {
  DRAFT: 'Draft',
  IN_REVIEW: 'Menunggu persetujuan',
  APPROVED: 'Siap terbit',
  PUBLISHED: 'Terbit',
};

export interface SopFilterProps {
  search: string;
  onSearchChange: (value: string) => void;
  department?: string;
  onDepartmentChange: (value?: string) => void;
  status?: string;
  onStatusChange: (value?: string) => void;
  requiresAck: boolean;
  onRequiresAckChange: (value: boolean) => void;
  departments: { id: string; name: string }[];
}

export function SopFilters({
  search,
  onSearchChange,
  department,
  onDepartmentChange,
  status,
  onStatusChange,
  requiresAck,
  onRequiresAckChange,
  departments,
}: SopFilterProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative w-full sm:w-[300px]">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Cari kode atau judul…"
          aria-label="Cari kode atau judul SOP"
          className="pl-9"
        />
      </div>

      <Select
        value={department ?? ALL}
        onValueChange={(value) => onDepartmentChange(value === ALL ? undefined : value)}
      >
        <SelectTrigger className="w-full sm:w-[180px]" aria-label="Filter departemen">
          <SelectValue placeholder="Semua departemen" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Semua departemen</SelectItem>
          {departments.map((item) => (
            <SelectItem key={item.id} value={item.id}>
              {item.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={status ?? ALL}
        onValueChange={(value) => onStatusChange(value === ALL ? undefined : value)}
      >
        <SelectTrigger className="w-full sm:w-[180px]" aria-label="Filter status">
          <SelectValue placeholder="Semua status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Semua status</SelectItem>
          {STATUS_OPTIONS.map((value) => (
            <SelectItem key={value} value={value}>
              {STATUS_FILTER_LABEL[value]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <label htmlFor="filter-requires-ack" className="flex items-center gap-2 text-sm">
        <Checkbox
          id="filter-requires-ack"
          checked={requiresAck}
          onCheckedChange={(checked) => onRequiresAckChange(checked === true)}
        />
        Wajib konfirmasi
      </label>
    </div>
  );
}
