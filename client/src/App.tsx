import { Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { RequireAuth } from '@/components/layout/RequireAuth';
import { RequireRole } from '@/components/layout/RequireRole';
import { DashboardPage } from '@/pages/Dashboard';
import { Forbidden } from '@/pages/Forbidden';
import { LoginPage } from '@/pages/Login';
import { NotFound } from '@/pages/NotFound';
import { Placeholder } from '@/pages/Placeholder';
import { SopDetailPage } from '@/pages/sop/SopDetailPage';
import { SopEditorPage } from '@/pages/sop/SopEditorPage';
import { SopListPage } from '@/pages/sop/SopListPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route index element={<DashboardPage />} />

          <Route path="sop" element={<SopListPage />} />
          <Route
            path="sop/new"
            element={
              <RequireRole roles={['PIC_SOP']}>
                <SopEditorPage />
              </RequireRole>
            }
          />
          <Route path="sop/:id" element={<SopDetailPage />} />
          <Route
            path="sop/:id/edit"
            element={
              <RequireRole roles={['PIC_SOP']}>
                <SopEditorPage />
              </RequireRole>
            }
          />

          <Route path="pengumuman" element={<Placeholder title="Pengumuman" />} />
          <Route path="laporan" element={<Placeholder title="Laporan pelanggaran" />} />

          <Route
            path="audit"
            element={
              <RequireRole roles={['AUDITOR', 'HRD']}>
                <Placeholder title="Audit Log" />
              </RequireRole>
            }
          />
          <Route
            path="pengguna"
            element={
              <RequireRole roles={['AUDITOR', 'HRD']}>
                <Placeholder title="Pengguna" />
              </RequireRole>
            }
          />

          <Route path="403" element={<Forbidden />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Route>
    </Routes>
  );
}
