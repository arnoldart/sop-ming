import type { Prisma, SopStatus } from '@prisma/client';
import {
  allowedActions,
  findRule,
  type SessionUser,
  type SopAction,
  type SopStatus as SharedStatus,
} from '@sop/shared';
import { db } from '../db.js';
import { audit } from '../audit.js';
import { AppError, conflict, forbidden, notFound } from '../http.js';

const isPrivileged = (u: SessionUser) => u.role === 'HRD';

/** Nama aksi di audit log memakai bentuk lampau agar terbaca di UI. */
const AUDIT_ACTION: Record<SopAction, string> = {
  SUBMIT: 'SOP_SUBMITTED',
  APPROVE: 'SOP_APPROVED',
  REJECT: 'SOP_REJECTED',
  PUBLISH: 'SOP_PUBLISHED',
};
const canSeeEverything = (u: SessionUser) => u.role === 'HRD' || u.role === 'AUDITOR' || u.role === 'MANAJEMEN';

/* ---------------- Baca ---------------- */

export interface ListQuery {
  q?: string;
  department?: string;
  status?: SopStatus;
  requiresAck?: boolean;
  page?: number;
  limit?: number;
}

export async function listSops(user: SessionUser, query: ListQuery) {
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(50, Math.max(1, query.limit ?? 20));

  const filters: Prisma.SopWhereInput[] = [];

  // Visibilitas: yang belum privileged hanya melihat versi yang sudah terbit,
  // ditambah SOP departemennya sendiri (draft/review) bila berperan PIC/Manager.
  if (!canSeeEverything(user)) {
    const ownDept: Prisma.SopWhereInput = {
      departmentId: user.departmentId ?? '__none__',
      status: { in: ['DRAFT', 'IN_REVIEW', 'APPROVED'] },
    };
    filters.push({
      OR: [
        { currentVersion: { is: { status: 'PUBLISHED' } } },
        ...(user.role === 'PIC_SOP' || user.role === 'MANAGER' ? [ownDept] : []),
      ],
    });
  }

  if (query.q) {
    const q = query.q.trim();
    filters.push({
      OR: [
        { code: { contains: q, mode: 'insensitive' } },
        { title: { contains: q, mode: 'insensitive' } },
        { summary: { contains: q, mode: 'insensitive' } },
        { currentVersion: { is: { content: { contains: q, mode: 'insensitive' } } } },
      ],
    });
  }
  if (query.department) filters.push({ departmentId: query.department });
  if (query.status) filters.push({ status: query.status });
  if (query.requiresAck !== undefined) {
    filters.push({ requiresAcknowledgement: query.requiresAck });
  }

  const where: Prisma.SopWhereInput = filters.length ? { AND: filters } : {};

  const [total, rows] = await Promise.all([
    db.sop.count({ where }),
    db.sop.findMany({
      where,
      include: {
        department: true,
        owner: { select: { name: true } },
        currentVersion: {
          include: { _count: { select: { acknowledgements: true } } },
        },
      },
      orderBy: [{ updatedAt: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  // Satu query untuk menandai mana yang sudah dikonfirmasi pengguna ini.
  const versionIds = rows.map((r) => r.currentVersionId).filter((v): v is string => !!v);
  const myAcks = versionIds.length
    ? await db.acknowledgement.findMany({
        where: { userId: user.id, sopVersionId: { in: versionIds } },
        select: { sopVersionId: true },
      })
    : [];
  const ackedSet = new Set(myAcks.map((a) => a.sopVersionId));

  return {
    total,
    page,
    limit,
    items: rows.map((r) => ({
      id: r.id,
      code: r.code,
      title: r.title,
      summary: r.summary,
      status: r.status,
      department: { id: r.department.id, name: r.department.name },
      ownerName: r.owner.name,
      requiresAcknowledgement: r.requiresAcknowledgement,
      isPublished: r.currentVersion?.status === 'PUBLISHED',
      versionNo: r.currentVersion?.versionNo ?? null,
      effectiveDate: r.currentVersion?.effectiveDate ?? null,
      acknowledgementCount: r.currentVersion?._count.acknowledgements ?? 0,
      acknowledgedByMe: r.currentVersionId ? ackedSet.has(r.currentVersionId) : false,
    })),
  };
}

/** Target konfirmasi = pengguna aktif di departemen SOP, di luar Auditor & Manajemen. */
async function acknowledgementTargets(departmentId: string) {
  return db.user.findMany({
    where: {
      departmentId,
      isActive: true,
      role: { notIn: ['AUDITOR', 'MANAJEMEN'] },
    },
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: 'asc' },
  });
}

export async function getSop(user: SessionUser, id: string) {
  const sop = await db.sop.findUnique({
    where: { id },
    include: {
      department: true,
      owner: { select: { id: true, name: true } },
      currentVersion: true,
      versions: { orderBy: { versionNo: 'desc' } },
    },
  });
  if (!sop) throw notFound('SOP');

  const isPublishedOnly = !canSeeEverything(user) && sop.currentVersion?.status !== 'PUBLISHED';
  const isOwnDepartment = sop.departmentId === user.departmentId;
  if (isPublishedOnly && !(isOwnDepartment && (user.role === 'PIC_SOP' || user.role === 'MANAGER'))) {
    throw notFound('SOP');
  }

  const versionIds = sop.versions.map((v) => v.id);
  const approvals = await db.sopApproval.findMany({
    where: { sopVersionId: { in: versionIds } },
    include: { actor: { select: { name: true, role: true } } },
    orderBy: { createdAt: 'asc' },
  });

  const myAck = sop.currentVersionId
    ? await db.acknowledgement.findUnique({
        where: {
          sopVersionId_userId: { sopVersionId: sop.currentVersionId, userId: user.id },
        },
      })
    : null;

  const canSeeCompliance = ['PIC_SOP', 'MANAGER', 'HRD'].includes(user.role);
  let compliance: { total: number; acknowledged: number; pending: { name: string; email: string }[] } | null = null;

  if (canSeeCompliance && sop.currentVersionId) {
    const [targets, acks] = await Promise.all([
      acknowledgementTargets(sop.departmentId),
      db.acknowledgement.findMany({
        where: { sopVersionId: sop.currentVersionId },
        select: { userId: true },
      }),
    ]);
    const ackedIds = new Set(acks.map((a) => a.userId));
    compliance = {
      total: targets.length,
      acknowledged: targets.filter((t) => ackedIds.has(t.id)).length,
      pending: targets.filter((t) => !ackedIds.has(t.id)).map((t) => ({ name: t.name, email: t.email })),
    };
  }

  return {
    id: sop.id,
    code: sop.code,
    title: sop.title,
    summary: sop.summary,
    status: sop.status,
    department: { id: sop.department.id, name: sop.department.name },
    owner: sop.owner,
    requiresAcknowledgement: sop.requiresAcknowledgement,
    reviewPeriodMonths: sop.reviewPeriodMonths,
    nextReviewAt: sop.nextReviewAt,
    currentVersion: sop.currentVersion,
    // Versi kerja yang sedang disunting (dipakai editor). Bisa berbeda dari currentVersion
    // saat SOP terbit sedang disiapkan versi barunya.
    draftVersion: sop.versions.find((v) => v.status === 'DRAFT') ?? null,
    versions: sop.versions.map((v) => ({
      id: v.id,
      versionNo: v.versionNo,
      status: v.status,
      changeSummary: v.changeSummary,
      effectiveDate: v.effectiveDate,
      publishedAt: v.publishedAt,
      createdAt: v.createdAt,
    })),
    approvals: approvals.map((a) => ({
      id: a.id,
      action: a.action,
      note: a.note,
      createdAt: a.createdAt,
      actorName: a.actor.name,
      actorRole: a.actor.role,
    })),
    acknowledgedByMe: !!myAck,
    acknowledgedAt: myAck?.acknowledgedAt ?? null,
    compliance,
    allowedActions: allowedActions(sop.status as SharedStatus).filter((a) => {
      const rule = findRule(a, sop.status as SharedStatus);
      return rule?.roles.includes(user.role) ?? false;
    }),
  };
}

/* ---------------- Tulis ---------------- */

export async function createSop(
  user: SessionUser,
  input: { code: string; title: string; summary: string; content: string; requiresAcknowledgement: boolean; reviewPeriodMonths: number },
) {
  if (!user.departmentId) throw forbidden('Akun Anda belum terhubung ke departemen');

  const exists = await db.sop.findUnique({ where: { code: input.code } });
  if (exists) throw conflict('CONFLICT', `Kode SOP ${input.code} sudah dipakai`);

  const sop = await db.sop.create({
    data: {
      code: input.code,
      title: input.title,
      summary: input.summary,
      departmentId: user.departmentId,
      ownerId: user.id,
      requiresAcknowledgement: input.requiresAcknowledgement,
      reviewPeriodMonths: input.reviewPeriodMonths,
      status: 'DRAFT',
      versions: {
        create: {
          versionNo: 1,
          content: input.content,
          changeSummary: 'Versi awal',
          status: 'DRAFT',
          createdById: user.id,
        },
      },
    },
    include: { versions: true },
  });

  await db.sop.update({
    where: { id: sop.id },
    data: { currentVersionId: sop.versions[0].id },
  });

  await audit(null, {
    actorId: user.id,
    action: 'SOP_CREATED',
    entityType: 'Sop',
    entityId: sop.id,
    after: { code: sop.code, title: sop.title, status: sop.status },
  });

  return { id: sop.id };
}

/** Versi kerja = versi berstatus DRAFT milik SOP tersebut. */
async function draftVersion(sopId: string) {
  const version = await db.sopVersion.findFirst({
    where: { sopId, status: 'DRAFT' },
    orderBy: { versionNo: 'desc' },
  });
  if (!version) throw conflict('INVALID_TRANSITION', 'Tidak ada versi draft untuk SOP ini');
  return version;
}

export async function updateSop(
  user: SessionUser,
  id: string,
  input: Partial<{ title: string; summary: string; content: string; requiresAcknowledgement: boolean; reviewPeriodMonths: number }>,
) {
  const sop = await db.sop.findUnique({ where: { id }, include: { currentVersion: true } });
  if (!sop) throw notFound('SOP');
  if (sop.ownerId !== user.id) throw forbidden('Hanya PIC pemilik SOP yang dapat menyunting');
  if (sop.status !== 'DRAFT') {
    throw conflict('INVALID_TRANSITION', 'SOP hanya dapat disunting pada status DRAFT');
  }

  const version = await draftVersion(id);

  await db.$transaction([
    db.sop.update({
      where: { id },
      data: {
        title: input.title ?? undefined,
        summary: input.summary ?? undefined,
        requiresAcknowledgement: input.requiresAcknowledgement ?? undefined,
        reviewPeriodMonths: input.reviewPeriodMonths ?? undefined,
      },
    }),
    db.sopVersion.update({
      where: { id: version.id },
      data: { content: input.content ?? undefined },
    }),
  ]);

  const changed = Object.keys(input).filter((k) => input[k as keyof typeof input] !== undefined);
  await audit(null, {
    actorId: user.id,
    action: 'SOP_UPDATED',
    entityType: 'Sop',
    entityId: id,
    before: { title: sop.title, summary: sop.summary, status: sop.status },
    after: { changedFields: changed },
  });

  return { ok: true };
}

/**
 * Satu-satunya pintu perubahan status. Semua route memanggil fungsi ini.
 * Menolak transisi yang tidak ada di TRANSITION_RULES (409) dan peran yang tidak berhak (403).
 */
export async function transition(
  user: SessionUser,
  id: string,
  action: SopAction,
  payload: { note?: string; effectiveDate?: Date } = {},
) {
  const sop = await db.sop.findUnique({ where: { id } });
  if (!sop) throw notFound('SOP');

  const rule = findRule(action, sop.status as SharedStatus);
  if (!rule) {
    throw conflict(
      'INVALID_TRANSITION',
      `Aksi ${action} tidak diizinkan dari status ${sop.status}`,
    );
  }
  if (!rule.roles.includes(user.role)) throw forbidden(`Peran ${user.role} tidak dapat melakukan ${action}`);

  // Batas kepemilikan/kedepepartemenan.
  if (action === 'SUBMIT' && sop.ownerId !== user.id) {
    throw forbidden('Hanya PIC pemilik SOP yang dapat mengajukan');
  }
  if (user.role === 'MANAGER' && sop.departmentId !== user.departmentId) {
    throw forbidden('Anda hanya dapat menyetujui SOP departemen Anda');
  }
  if (action === 'REJECT' && !payload.note) {
    throw new AppError(422, 'VALIDATION_ERROR', 'Alasan penolakan wajib diisi');
  }

  const version = await draftVersion(id).catch(() => null);
  const now = new Date();

  await db.$transaction(async (tx) => {
    await tx.sop.update({
      where: { id },
      data: { status: rule.to },
    });

    if (action === 'PUBLISH') {
      if (!version) throw conflict('INVALID_TRANSITION', 'Tidak ada versi untuk diterbitkan');
      const effectiveDate = payload.effectiveDate ?? now;

      // Versi terbit sebelumnya digantikan, bukan dihapus.
      await tx.sopVersion.updateMany({
        where: { sopId: id, status: 'PUBLISHED' },
        data: { status: 'SUPERSEDED' },
      });
      await tx.sopVersion.update({
        where: { id: version.id },
        data: {
          status: 'PUBLISHED',
          effectiveDate,
          publishedById: user.id,
          publishedAt: now,
        },
      });
      await tx.sop.update({
        where: { id },
        data: {
          currentVersionId: version.id,
          nextReviewAt: new Date(
            effectiveDate.getTime() + sop.reviewPeriodMonths * 30 * 24 * 60 * 60 * 1000,
          ),
        },
      });
    }

    if (version) {
      await tx.sopApproval.create({
        data: {
          sopVersionId: version.id,
          actorId: user.id,
          action,
          note: payload.note ?? '',
          createdAt: now,
        },
      });
    }
  });

  await audit(null, {
    actorId: user.id,
    action: AUDIT_ACTION[action],
    entityType: 'Sop',
    entityId: id,
    before: { status: sop.status },
    after: { status: rule.to, note: payload.note ?? null },
  });

  return { ok: true, status: rule.to };
}

export async function createNewVersion(user: SessionUser, id: string, changeSummary: string) {
  const sop = await db.sop.findUnique({
    where: { id },
    include: { versions: { orderBy: { versionNo: 'desc' }, take: 1 } },
  });
  if (!sop) throw notFound('SOP');
  if (sop.ownerId !== user.id) throw forbidden('Hanya PIC pemilik SOP yang dapat membuat versi baru');
  if (sop.status !== 'PUBLISHED') {
    throw conflict('INVALID_TRANSITION', 'Versi baru hanya dapat dibuat dari SOP yang sudah terbit');
  }

  const last = sop.versions[0];
  const created = await db.sopVersion.create({
    data: {
      sopId: id,
      versionNo: last.versionNo + 1,
      content: last.content,
      changeSummary,
      status: 'DRAFT',
      createdById: user.id,
    },
  });

  // currentVersionId sengaja tetap menunjuk versi terbit terakhir agar
  // kepatuhan konfirmasi tidak ikut ter-reset sebelum versi baru terbit.
  await db.sop.update({ where: { id }, data: { status: 'DRAFT' } });

  await audit(null, {
    actorId: user.id,
    action: 'SOP_VERSION_CREATED',
    entityType: 'Sop',
    entityId: id,
    after: { versionNo: created.versionNo, changeSummary },
  });

  return { id: created.id, versionNo: created.versionNo };
}

export async function acknowledge(user: SessionUser, id: string) {
  const sop = await db.sop.findUnique({ where: { id }, include: { currentVersion: true } });
  if (!sop) throw notFound('SOP');
  if (sop.currentVersion?.status !== 'PUBLISHED') {
    throw conflict('INVALID_TRANSITION', 'Hanya SOP terbit yang dapat dikonfirmasi');
  }
  if (!sop.requiresAcknowledgement) {
    throw conflict('INVALID_TRANSITION', 'SOP ini tidak mewajibkan konfirmasi');
  }
  if (user.departmentId !== sop.departmentId) {
    throw forbidden('Konfirmasi hanya untuk karyawan departemen terkait');
  }

  // Idempoten: unique (sopVersionId, userId) membuat klik ganda tidak menambah baris.
  const existing = await db.acknowledgement.findUnique({
    where: { sopVersionId_userId: { sopVersionId: sop.currentVersion.id, userId: user.id } },
  });
  if (existing) return { ok: true, alreadyAcknowledged: true, acknowledgedAt: existing.acknowledgedAt };

  const created = await db.acknowledgement.create({
    data: { sopVersionId: sop.currentVersion.id, userId: user.id },
  });

  await audit(null, {
    actorId: user.id,
    action: 'SOP_ACKNOWLEDGED',
    entityType: 'Sop',
    entityId: id,
    after: { versionNo: sop.currentVersion.versionNo },
  });

  return { ok: true, alreadyAcknowledged: false, acknowledgedAt: created.acknowledgedAt };
}
