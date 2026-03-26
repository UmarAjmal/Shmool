import PermissionGuard from '@/components/PermissionGuard';

export default function AttendanceLayout({ children }: { children: React.ReactNode }) {
    return <PermissionGuard module="attendance">{children}</PermissionGuard>;
}
