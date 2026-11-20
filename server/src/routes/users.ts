import { Router } from 'express';
import { requirePermission } from '../auth.js';
import { db } from '../db.js';
import { wrap } from '../http.js';

export const userRouter = Router();

userRouter.get(
  '/',
  requirePermission('user:read'),
  wrap(async (_req, res) => {
    const [departments, users] = await Promise.all([
      db.department.findMany({ orderBy: { name: 'asc' } }),
      db.user.findMany({
        include: { department: { select: { name: true } } },
        orderBy: [{ role: 'asc' }, { name: 'asc' }],
      }),
    ]);

    res.json({
      departments: departments.map((d) => ({ id: d.id, code: d.code, name: d.name })),
      // passwordHash tidak pernah ikut keluar dari server.
      users: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        department: u.department?.name ?? null,
        isActive: u.isActive,
        createdAt: u.createdAt,
      })),
    });
  }),
);
