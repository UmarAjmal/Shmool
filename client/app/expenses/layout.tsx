import PermissionGuard from '@/components/PermissionGuard';

export default function ExpensesLayout({ children }: { children: React.ReactNode }) {
    return <PermissionGuard module="expenses">{children}</PermissionGuard>;
}
