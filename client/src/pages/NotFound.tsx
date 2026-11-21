import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function NotFound() {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <div className="max-w-[420px] text-center">
        <p className="text-xs font-medium tracking-[0.08em] text-muted-foreground">404</p>
        <h2 className="mt-1 text-xl">Halaman tidak ditemukan</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Alamat yang Anda buka tidak tersedia atau sudah dipindahkan.
        </p>
        <Button asChild className="mt-4">
          <Link to="/">Ke dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
