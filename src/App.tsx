import { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { UiProvider } from './context/UiContext';
import { LoginPage } from './routes/lazyPages';
import { RouteSuspense } from './components/ui/RouteSuspense';
import {
  ProtectedRoute,
  RoleRedirect,
  ADMIN_ROLES,
  FINANCE_ROLES,
  PM_ROLES,
  PA_ROLES,
} from './components/auth/ProtectedRoute';
import {
  AdminLayout,
  FinanceLayout,
  PMLayout,
  PALayout,
  adminRoutes,
  financeRoutes,
  pmRoutes,
  paRoutes,
} from './routes/dashboardRoutes';

function App() {
  return (
    <AuthProvider>
      <UiProvider>
        <BrowserRouter>
          <Suspense fallback={null}>
            <Routes>
              <Route
                path="/login"
                element={
                  <RouteSuspense>
                    <LoginPage />
                  </RouteSuspense>
                }
              />
              <Route path="/" element={<RoleRedirect />} />

              <Route element={<ProtectedRoute allowedRoles={ADMIN_ROLES} />}>
                <Route path="/dashboard/admin" element={<AdminLayout />}>
                  {adminRoutes.map((r) =>
                    r.index ? (
                      <Route key="index" index element={r.element} />
                    ) : (
                      <Route key={r.path} path={r.path} element={r.element} />
                    ),
                  )}
                </Route>
              </Route>

              <Route element={<ProtectedRoute allowedRoles={FINANCE_ROLES} />}>
                <Route path="/dashboard/finance" element={<FinanceLayout />}>
                  {financeRoutes.map((r) =>
                    r.index ? (
                      <Route key="index" index element={r.element} />
                    ) : (
                      <Route key={r.path} path={r.path} element={r.element} />
                    ),
                  )}
                </Route>
              </Route>

              <Route element={<ProtectedRoute allowedRoles={PM_ROLES} />}>
                <Route path="/dashboard/project-manager" element={<PALayout />}>
                  {paRoutes.map((r) =>
                    r.index ? (
                      <Route key="index" index element={r.element} />
                    ) : (
                      <Route key={r.path} path={r.path} element={r.element} />
                    ),
                  )}
                </Route>
              </Route>

              <Route element={<ProtectedRoute allowedRoles={PA_ROLES} />}>
                <Route path="/dashboard/project-accountant" element={<PMLayout />}>
                  {pmRoutes.map((r) =>
                    r.index ? (
                      <Route key="index" index element={r.element} />
                    ) : (
                      <Route key={r.path} path={r.path} element={r.element} />
                    ),
                  )}
                </Route>
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </UiProvider>
    </AuthProvider>
  );
}

export default App;
