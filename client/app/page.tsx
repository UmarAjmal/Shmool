'use client';
import { useAuth } from '@/contexts/AuthContext';
import AdminDashboard      from '@/components/dashboards/AdminDashboard';
import TeacherDashboard    from '@/components/dashboards/TeacherDashboard';
import AccountantDashboard from '@/components/dashboards/AccountantDashboard';
import GenericDashboard    from '@/components/dashboards/GenericDashboard';
import { DashLoading }     from '@/components/dashboards/shared';

export default function Dashboard() {
  const { user, isLoading } = useAuth();

  if (isLoading || !user) return <DashLoading />;

  const role = user.role_name?.toLowerCase() || '';
  const name = user.full_name || user.username || 'User';

  if (role.includes('admin') || role.includes('principal') || role.includes('super')) {
    return <AdminDashboard userName={name} />;
  }

  if (role.includes('teacher')) {
    return <TeacherDashboard userId={user.id} />;
  }

  if (
    role.includes('accountant') ||
    role.includes('finance')    ||
    role.includes('cashier')
  ) {
    return <AccountantDashboard userName={name} />;
  }

  return <GenericDashboard userName={name} role={user.role_name || 'Staff'} />;
}