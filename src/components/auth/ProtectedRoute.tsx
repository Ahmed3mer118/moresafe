import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { PageLoader } from '../ui/PageLoader';
import { ROLES, ROLE_DASHBOARD, type Role } from '../../types';

export function ProtectedRoute({ allowedRoles }: { allowedRoles?: Role[] }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#f4f7fb]">
        <PageLoader />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={ROLE_DASHBOARD[user.role]} replace />;
  }

  return <Outlet />;
}

export function RoleRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={ROLE_DASHBOARD[user.role]} replace />;
}

export const ADMIN_ROLES = [ROLES.ADMIN];
export const FINANCE_ROLES = [ROLES.CHIEF_ACCOUNTANT];
export const PM_ROLES = [ROLES.PROJECT_MANAGER];
export const PA_ROLES = [ROLES.PROJECT_ACCOUNTANT];
