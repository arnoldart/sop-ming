import { Router } from 'express';
import { announcementSchema } from '@sop/shared';
import { requireAuth, requirePermission } from '../auth.js';
import { audit } from '../audit.js';
import { db } from '../db.js';
import { parse, wrap } from '../http.js';

export const announcementRouter = Router();

announcementRouter.get(
  '/',
  requireAuth,
  wrap(async (req, res) => {
    const user = req.user!;
    // HRD dan Auditor melihat semua pengumuman; peran lain hanya yang menyasar
    // departemennya atau tanpa sasaran.
    const seesAll = user.role === 'HRD' || user.role === 'AUDITOR';
    const rows = await db.announcement.findMany({
      where: seesAll
        ? {}
        : {
            OR: [
              { targetDepartmentId: null },
              { targetDepartmentId: user.departmentId ?? '__none__' },
            ],
          },
      include: { createdBy: { select: { name: true } }, sop: { select: { id: true, code: true, title: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json({
      items: rows.map((a) => ({
        id: a.id,
        title: a.title,
        body: a.body,
        createdAt: a.createdAt,
        authorName: a.createdBy.name,
        sop: a.sop,
        targetDepartmentId: a.targetDepartmentId,
      })),
    });
  }),
);

announcementRouter.post(
  '/',
  requirePermission('announcement:write'),
  wrap(async (req, res) => {
    const input = parse(announcementSchema, req.body);
    const created = await db.announcement.create({
      data: {
        title: input.title,
        body: input.body,
        sopId: input.sopId ?? null,
        targetDepartmentId: input.targetDepartmentId ?? null,
        createdById: req.user!.id,
      },
    });
    await audit(req, {
      action: 'ANNOUNCEMENT_CREATED',
      entityType: 'Announcement',
      entityId: created.id,
      after: { title: created.title },
    });
    res.status(201).json({ id: created.id });
  }),
);

announcementRouter.delete(
  '/:id',
  requirePermission('announcement:write'),
  wrap(async (req, res) => {
    const existing = await db.announcement.findUnique({ where: { id: req.params.id } });
    await db.announcement.delete({ where: { id: req.params.id } });
    await audit(req, {
      action: 'ANNOUNCEMENT_DELETED',
      entityType: 'Announcement',
      entityId: req.params.id,
      before: { title: existing?.title },
    });
    res.json({ ok: true });
  }),
);
