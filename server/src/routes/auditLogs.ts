import { Router } from 'express';
import type { Prisma } from '@prisma/client';
import { requirePermission } from '../auth.js';
import { db } from '../db.js';
import { wrap } from '../http.js';

export const auditRouter = Router();

auditRouter.get(
  '/',
  requirePermission('audit:read'),
  wrap(async (req, res) => {
    const page = Math.max(1, Number(req.query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 30)));

    const where: Prisma.AuditLogWhereInput = {};
    if (typeof req.query.action === 'string' && req.query.action) {
      where.action = { contains: req.query.action.toUpperCase(), mode: 'insensitive' };
    }
    if (typeof req.query.entityType === 'string' && req.query.entityType) {
      where.entityType = req.query.entityType;
    }
    if (typeof req.query.actorId === 'string' && req.query.actorId) {
      where.actorId = req.query.actorId;
    }
    if (typeof req.query.from === 'string' || typeof req.query.to === 'string') {
      where.createdAt = {
        gte: req.query.from ? new Date(String(req.query.from)) : undefined,
        lte: req.query.to ? new Date(String(req.query.to)) : undefined,
      };
    }

    const [total, rows] = await Promise.all([
      db.auditLog.count({ where }),
      db.auditLog.findMany({
        where,
        include: { actor: { select: { name: true, role: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    res.json({
      total,
      page,
      limit,
      items: rows.map((r) => ({
        id: r.id,
        action: r.action,
        entityType: r.entityType,
        entityId: r.entityId,
        actorName: r.actor?.name ?? 'Sistem',
        actorRole: r.actor?.role ?? null,
        before: r.before,
        after: r.after,
        ip: r.ip,
        createdAt: r.createdAt,
      })),
    });
  }),
);

auditRouter.get(
  '/entities',
  requirePermission('audit:read'),
  wrap(async (_req, res) => {
    const rows = await db.auditLog.groupBy({ by: ['entityType'], _count: { _all: true } });
    res.json({ items: rows.map((r) => ({ entityType: r.entityType, count: r._count._all })) });
  }),
);
