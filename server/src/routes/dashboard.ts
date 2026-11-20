import { Router } from 'express';
import type { Prisma } from '@prisma/client';
import { requirePermission } from '../auth.js';
import { db } from '../db.js';
import { wrap } from '../http.js';

export const dashboardRouter = Router();

/** Target konfirmasi per departemen: aktif, di luar Auditor & Manajemen. */
async function targetsByDepartment() {
  const rows = await db.user.groupBy({
    by: ['departmentId'],
    where: { isActive: true, role: { notIn: ['AUDITOR', 'MANAJEMEN'] } },
    _count: { _all: true },
  });
  return new Map(rows.map((r) => [r.departmentId ?? '', r._count._all]));
}

dashboardRouter.get(
  '/summary',
  requirePermission('dashboard:read'),
  wrap(async (req, res) => {
    const user = req.user!;
    const publishedFilter: Prisma.SopWhereInput = { currentVersion: { is: { status: 'PUBLISHED' } } };

    const pendingFilter: Prisma.SopWhereInput =
      user.role === 'MANAGER'
        ? { status: 'IN_REVIEW', departmentId: user.departmentId ?? '__none__' }
        : user.role === 'HRD'
          ? { status: 'APPROVED' }
          : user.role === 'PIC_SOP'
            ? { ownerId: user.id, status: { in: ['DRAFT', 'IN_REVIEW'] } }
            : { id: '__none__' };

    const [publishedCount, pendingActions, awaitingMyAck, reportsOpen, announcements] = await Promise.all([
      db.sop.count({ where: publishedFilter }),
      db.sop.findMany({
        where: pendingFilter,
        include: { department: true, currentVersion: { select: { versionNo: true } } },
        orderBy: { updatedAt: 'asc' },
        take: 10,
      }),
      db.sop.findMany({
        where: {
          ...publishedFilter,
          requiresAcknowledgement: true,
          departmentId: user.departmentId ?? '__none__',
          currentVersion: {
            is: {
              status: 'PUBLISHED',
              acknowledgements: { none: { userId: user.id } },
            },
          },
        },
        select: { id: true, code: true, title: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
        take: 5,
      }),
      db.violationReport.count({ where: { status: { in: ['OPEN', 'TRIAGED', 'INVESTIGATING'] } } }),
      db.announcement.findMany({
        where: {
          OR: [{ targetDepartmentId: null }, { targetDepartmentId: user.departmentId ?? '__none__' }],
        },
        include: { createdBy: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 3,
      }),
    ]);

    // Kepatuhan: hanya SOP terbit yang mewajibkan konfirmasi.
    const ackSops = await db.sop.findMany({
      where: { ...publishedFilter, requiresAcknowledgement: true },
      include: {
        department: true,
        currentVersion: { include: { _count: { select: { acknowledgements: true } } } },
      },
    });
    const targets = await targetsByDepartment();

    const complianceRows = ackSops.map((s) => {
      const target = targets.get(s.departmentId) ?? 0;
      const acknowledged = s.currentVersion?._count.acknowledgements ?? 0;
      return {
        id: s.id,
        code: s.code,
        title: s.title,
        department: s.department.name,
        target,
        acknowledged,
        percent: target === 0 ? 100 : Math.round((acknowledged / target) * 100),
      };
    });

    const totalTarget = complianceRows.reduce((sum, r) => sum + r.target, 0);
    const totalAck = complianceRows.reduce((sum, r) => sum + r.acknowledged, 0);

    res.json({
      cards: {
        published: publishedCount,
        pendingForMe: pendingActions.length,
        awaitingMyAcknowledgement: awaitingMyAck.length,
        compliancePercent: totalTarget === 0 ? 100 : Math.round((totalAck / totalTarget) * 100),
        openReports: reportsOpen,
      },
      pendingActions: pendingActions.map((s) => ({
        id: s.id,
        code: s.code,
        title: s.title,
        status: s.status,
        department: s.department.name,
        versionNo: s.currentVersion?.versionNo ?? null,
        updatedAt: s.updatedAt,
      })),
      awaitingAcknowledgement: awaitingMyAck,
      lowestCompliance: [...complianceRows].sort((a, b) => a.percent - b.percent).slice(0, 5),
      announcements: announcements.map((a) => ({
        id: a.id,
        title: a.title,
        body: a.body,
        createdAt: a.createdAt,
        authorName: a.createdBy.name,
        sopId: a.sopId,
      })),
    });
  }),
);
