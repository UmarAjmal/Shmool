'use client';
import PermissionGuard from '@/components/PermissionGuard';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
    return (
        <PermissionGuard module="settings">
        <div className="settings-container">
            {/* Content Area */}
            <div className="settings-content">
                {children}
            </div>

            <style jsx>{`
                .settings-container {
                    max-width: 1200px;
                    margin: 0 auto;
                }
            `}</style>
        </div>
        </PermissionGuard>
    );
}
