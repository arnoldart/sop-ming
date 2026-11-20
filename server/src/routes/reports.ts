import { Router } from 'express';
import { followUpSchema, reportSchema } from '@sop/shared';
import { requireAuth, requirePermission } from '../auth.js';
import { audit } from '../audit.js';
import { db } from '../db.js';
import { forbidden, notFound, parse, wrap } from '../http.js';

export const reportRouter = Router();

reportRouter.get(
  '/',
  requireAuth,
  wrap(async (req, res) => {
    const user = req.user!;
    const canTriage = user.role === 'MANAGER' || user.role === 'HRD';
    // Pelapor hanya melihat laporannya sendiri. Identitas pelapor anonim tidak pernah dikirim.
    const rows = await db.violationReport.findMany({
      where: canTriage ? {} : { reporterId: user.id },
      include: {
        sop: { select: { id: true, code: true, title: true } },
        assignedTo: { select: { name: true } },
        followUps: { orderBy: { createdAt: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json({
      canTriage,
      items: rows.map((r) => ({
        id: r.id,
        description: r.description,
        status: r.status,
        createdAt: r.createdAt,
        sop: r.sop,
        anonymous: r.reporterId === null,
        assignedTo: r.assignedTo?.name ?? null,
        followUps: r.followUps.map((f) => ({
          id: f.id,
          fromStatus: f.fromStatus,
          toStatus: f.toStatus,
          note: f.note,
          createdAt: f.createdAt,
        })),
      })),
    });
  }),
);

reportRouter.post(
  '/',
  requirePermission('report:create'),
  wrap(async (req, res) => {
    const input = parse(reportSchema, req.body);
    const created = await db.violationReport.create({
      data: {
        reporterId: input.anonymous ? null : req.user!.id,
        sopId: input.sopId ?? null,
        description: input.description,
      },
    });
    // Laporan anonim tidak menyimpan aktor di audit log.
    await audit(req, {
      actorId: input.anonymous ? null : req.user!.id,
      action: 'REPORT_CREATED',
      entityType: 'ViolationReport',
      entityId: created.id,
      after: { anonymous: input.anonymous },
    });
    res.status(201).json({ id: created.id });
  }),
);

reportRouter.post(
  '/:id/follow-ups',
  requirePermission('report:triage'),
  wrap(async (req, res) => {
    const input = parse(followUpSchema, req.body);
    const report = await db.violationReport.findUnique({ where: { id: req.params.id } });
    if (!report) throw notFound('Laporan');
    if (report.status === input.status) {
      throw forbidden('Status tujuan sama dengan status saat ini');
    }

    const followUp = await db.reportFollowUp.create({
      data: {
        reportId: report.id,
        actorId: req.user!.id,
        fromStatus: report.status,
        toStatus: input.status,
        note: input.note,
      },
    });
    await db.violationReport.update({
      where: { id: report.id },
      data: { status: input.status, assignedToId: report.assignedToId ?? req.user!.id },
    });
    await audit(req, {
      action: 'REPORT_STATUS_CHANGED',
      entityType: 'ViolationReport',
      entityId: report.id,
      before: { status: report.status },
      after: { status: input.status, note: input.note },
    });

    res.status(201).json({ id: followUp.id, status: input.status });
  }),
);
