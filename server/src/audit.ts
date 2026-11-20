import type { Request } from 'express';
import { db } from './db.js';

interface AuditInput {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
}

/**
 * Satu-satunya pintu penulisan audit. Append-only: tidak ada update/delete.
 * Dipanggil dari service, bukan route, agar setiap mutasi pasti tercatat.
 */
export async function audit(req: Request | null, input: AuditInput) {
  await db.auditLog.create({
    data: {
      actorId: input.actorId ?? req?.user?.id ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      before: input.before === undefined ? undefined : (input.before as object),
      after: input.after === undefined ? undefined : (input.after as object),
      ip: req?.ip ?? null,
    },
  });
}

/** Bungkus mutasi + audit dalam satu transaksi supaya tidak ada perubahan tanpa jejak. */
export async function inTx<T>(
  fn: (tx: Parameters<Parameters<typeof db.$transaction>[0]>[0]) => Promise<T>,
): Promise<T> {
  return db.$transaction(fn);
}
