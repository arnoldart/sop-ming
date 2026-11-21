import type { ReactNode } from 'react';
import type { Role } from '@sop/shared';
import { useAuth } from '@/lib/auth';
import { Forbidden } from '@/pages/Forbidden';

export function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { user } = useAuth();

  if (!user || !roles.includes(user.role)) {
    return <Forbidden />;
  }

  return <>{children}</>;
}
