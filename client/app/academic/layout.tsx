import PermissionGuard from '@/components/PermissionGuard';

export default function AcademicLayout({ children }: { children: React.ReactNode }) {
    return <PermissionGuard module="academic">{children}</PermissionGuard>;
}
