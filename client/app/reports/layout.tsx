import PermissionGuard from '@/components/PermissionGuard';

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
    return <PermissionGuard module="reports">{children}</PermissionGuard>;
}
