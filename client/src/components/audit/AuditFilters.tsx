import { Search } from 'lucide-react';
import { ENTITY_LABEL } from '@/lib/format';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const ALL = 'all';

export interface AuditFilterProps {
  action: string;
  onActionChange: (value: string) => void;
  entityType?: string;
  onEntityTypeChange: (value?: string) => void;
  actorId?: string;
  onActorIdChange: (value?: string) => void;
  entities: { entityType: string; count: number }[];
  actors: { id: string; name: string }[];
  total?: number;
}

export function AuditFilters({
  action,
  onActionChange,
  entityType,
  onEntityTypeChange,
  actorId,
  onActorIdChange,
  entities,
  actors,
  total,
}: AuditFilterProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select
        value={actorId ?? ALL}
        onValueChange={(value) => onActorIdChange(value === ALL ? undefined : value)}
      >
        <SelectTrigger className="w-full sm:w-[200px]" aria-label="Filter aktor">
          <SelectValue placeholder="Semua aktor" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Semua aktor</SelectItem>
          {actors.map((item) => (
            <SelectItem key={item.id} value={item.id}>
              {item.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={entityType ?? ALL}
        onValueChange={(value) => onEntityTypeChange(value === ALL ? undefined : value)}
      >
        <SelectTrigger className="w-full sm:w-[200px]" aria-label="Filter entitas">
          <SelectValue placeholder="Semua entitas" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Semua entitas</SelectItem>
          {entities.map((item) => (
            <SelectItem key={item.entityType} value={item.entityType}>
              {ENTITY_LABEL[item.entityType] ?? item.entityType} ({item.count})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="relative w-full sm:w-[260px]">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          value={action}
          onChange={(event) => onActionChange(event.target.value)}
          placeholder="Cari nama aksi…"
          aria-label="Cari nama aksi audit"
          className="pl-9 font-mono text-[13px]"
        />
      </div>

      {typeof total === 'number' ? (
        <span className="ml-auto text-[13px] text-muted-foreground tabular-nums">
          {total} entri
        </span>
      ) : null}
    </div>
  );
}
