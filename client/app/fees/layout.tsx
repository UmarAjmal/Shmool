import PermissionGuard from '@/components/PermissionGuard';

export default function FeesLayout({ children }: { children: React.ReactNode }) {
    return <PermissionGuard module="fees">{children}</PermissionGuard>;
}
