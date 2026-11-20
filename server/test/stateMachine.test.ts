import { describe, expect, it } from 'vitest';
import { allowedActions, findRule, SOP_STATUSES, TRANSITION_RULES, type SopStatus } from '@sop/shared';

describe('state machine SOP', () => {
  it('hanya mengizinkan lima transisi', () => {
    expect(TRANSITION_RULES).toHaveLength(5);
  });

  it('memetakan setiap aksi sah ke status tujuan yang benar', () => {
    expect(findRule('SUBMIT', 'DRAFT')).toMatchObject({ to: 'IN_REVIEW' });
    expect(findRule('APPROVE', 'IN_REVIEW')).toMatchObject({ to: 'APPROVED' });
    expect(findRule('REJECT', 'IN_REVIEW')).toMatchObject({ to: 'DRAFT' });
    expect(findRule('REJECT', 'APPROVED')).toMatchObject({ to: 'DRAFT' });
    expect(findRule('PUBLISH', 'APPROVED')).toMatchObject({ to: 'PUBLISHED' });
  });

  it('menolak transisi di luar diagram', () => {
    const invalid: [Parameters<typeof findRule>[0], SopStatus][] = [
      ['SUBMIT', 'IN_REVIEW'],
      ['SUBMIT', 'PUBLISHED'],
      ['APPROVE', 'DRAFT'],
      ['APPROVE', 'APPROVED'],
      ['PUBLISH', 'DRAFT'],
      ['PUBLISH', 'IN_REVIEW'],
      ['REJECT', 'DRAFT'],
    ];
    for (const [action, from] of invalid) {
      expect(findRule(action, from), `${action} dari ${from}`).toBeUndefined();
    }
  });

  it('memberi daftar aksi per status untuk dipakai UI', () => {
    expect(allowedActions('DRAFT')).toEqual(['SUBMIT']);
    expect(allowedActions('IN_REVIEW').sort()).toEqual(['APPROVE', 'REJECT']);
    expect(allowedActions('APPROVED').sort()).toEqual(['PUBLISH', 'REJECT']);
    expect(allowedActions('PUBLISHED')).toEqual([]);
    expect(allowedActions('SUPERSEDED')).toEqual([]);
    expect(allowedActions('ARCHIVED')).toEqual([]);
  });

  it('menjaga setiap status tetap terdefinisi di daftar status', () => {
    for (const rule of TRANSITION_RULES) {
      expect(SOP_STATUSES).toContain(rule.from);
      expect(SOP_STATUSES).toContain(rule.to);
    }
  });

  it('membatasi peran pada tiap transisi', () => {
    expect(findRule('SUBMIT', 'DRAFT')!.roles).toEqual(['PIC_SOP']);
    expect(findRule('APPROVE', 'IN_REVIEW')!.roles).toEqual(['MANAGER']);
    expect(findRule('PUBLISH', 'APPROVED')!.roles).toEqual(['HRD']);
    expect(findRule('REJECT', 'APPROVED')!.roles).toEqual(['HRD']);
  });
});
