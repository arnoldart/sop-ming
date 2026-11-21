import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { ROLE_LABEL } from '@sop/shared';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export function Forbidden() {
  const { user } = useAuth();

  return (
    <div className="grid min-h-[60vh] place-items-center">
      <Card className="w-full max-w-[480px] items-center gap-3 p-8 text-center">
        <span className="grid size-10 place-items-center rounded-full bg-secondary">
          <Lock className="size-4 text-muted-foreground" aria-hidden />
        </span>
        <p className="text-xs font-medium tracking-[0.08em] text-muted-foreground">403</p>
        <h2 className="text-xl">Akses ditolak</h2>
        <p className="max-w-[360px] text-sm text-muted-foreground">
          {user
            ? `Peran ${ROLE_LABEL[user.role]} tidak memiliki izin untuk membuka halaman ini.`
            : 'Anda tidak memiliki izin untuk membuka halaman ini.'}
        </p>
        <div className="mt-2 flex items-center gap-2">
          <Button asChild>
            <Link to="/">Ke dashboard</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/sop">Daftar SOP</Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}
