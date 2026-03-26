import PermissionGuard from '@/components/PermissionGuard';

export default function StudentsLayout({ children }: { children: React.ReactNode }) {
    return <PermissionGuard module="students">{children}</PermissionGuard>;
}
