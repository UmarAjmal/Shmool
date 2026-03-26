import PermissionGuard from '@/components/PermissionGuard';

export default function HrmLayout({ children }: { children: React.ReactNode }) {
    return <PermissionGuard module="hrm">{children}</PermissionGuard>;
}
