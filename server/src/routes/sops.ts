import { Router } from 'express';
import {
  createSopSchema,
  newVersionSchema,
  publishSchema,
  rejectSchema,
  updateSopSchema,
  type SopAction,
} from '@sop/shared';
import { requirePermission } from '../auth.js';
import { parse, wrap } from '../http.js';
import * as sops from '../services/sopService.js';

export const sopRouter = Router();

sopRouter.get(
  '/',
  requirePermission('sop:read'),
  wrap(async (req, res) => {
    res.json(
      await sops.listSops(req.user!, {
        q: typeof req.query.q === 'string' ? req.query.q : undefined,
        department: typeof req.query.department === 'string' ? req.query.department : undefined,
        status: typeof req.query.status === 'string' ? (req.query.status as never) : undefined,
        requiresAck:
          req.query.requiresAck === 'true' ? true : req.query.requiresAck === 'false' ? false : undefined,
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
      }),
    );
  }),
);

sopRouter.post(
  '/',
  requirePermission('sop:write'),
  wrap(async (req, res) => {
    const input = parse(createSopSchema, req.body);
    res.status(201).json(await sops.createSop(req.user!, input));
  }),
);

sopRouter.get(
  '/:id',
  requirePermission('sop:read'),
  wrap(async (req, res) => {
    res.json(await sops.getSop(req.user!, req.params.id));
  }),
);

sopRouter.patch(
  '/:id',
  requirePermission('sop:write'),
  wrap(async (req, res) => {
    const input = parse(updateSopSchema, req.body);
    res.json(await sops.updateSop(req.user!, req.params.id, input));
  }),
);

const act =
  (action: SopAction, payload: 'none' | 'reject' | 'publish') =>
  wrap(async (req, res) => {
    const data =
      payload === 'reject'
        ? parse(rejectSchema, req.body ?? {})
        : payload === 'publish'
          ? parse(publishSchema, req.body ?? {})
          : {};
    res.json(await sops.transition(req.user!, req.params.id, action, data));
  });

sopRouter.post('/:id/submit', requirePermission('sop:submit'), act('SUBMIT', 'none'));
sopRouter.post('/:id/approve', requirePermission('sop:approve'), act('APPROVE', 'none'));
sopRouter.post('/:id/reject', requirePermission('sop:reject'), act('REJECT', 'reject'));
sopRouter.post('/:id/publish', requirePermission('sop:publish'), act('PUBLISH', 'publish'));

sopRouter.post(
  '/:id/versions',
  requirePermission('sop:write'),
  wrap(async (req, res) => {
    const { changeSummary } = parse(newVersionSchema, req.body);
    res.status(201).json(await sops.createNewVersion(req.user!, req.params.id, changeSummary));
  }),
);

sopRouter.post(
  '/:id/acknowledge',
  requirePermission('sop:ack'),
  wrap(async (req, res) => {
    res.json(await sops.acknowledge(req.user!, req.params.id));
  }),
);
