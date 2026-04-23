'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

export interface Permission {
    module_name: string;
    can_read: boolean;
    can_write: boolean;
    can_delete: boolean;
}

export interface AuthUser {
    id: number;
    username: string;
    full_name: string;
    email: string;
    role_id: number;
    role_name: string;
    is_active: boolean;
    permissions: Permission[];
}

interface AuthContextType {
    user: AuthUser | null;
    isLoggedIn: boolean;
    isLoading: boolean;
    login: (username: string, password: string) => Promise<{ success: boolean; message?: string }>;
    logout: () => void;
    hasPermission: (module: string, action?: 'read' | 'write' | 'delete') => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_KEY = 'sms_user_session';
const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://shmool.onrender.com";

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    // Restore session from sessionStorage on mount
    useEffect(() => {
        try {
            const stored = sessionStorage.getItem(SESSION_KEY);
            if (stored) {
                setUser(JSON.parse(stored));
            }
        } catch {
            sessionStorage.removeItem(SESSION_KEY);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const login = useCallback(async (username: string, password: string): Promise<{ success: boolean; message?: string }> => {
        try {
            const res = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                return { success: false, message: data.message || 'Login failed' };
            }

            setUser(data);
            sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
            return { success: true };
        } catch (err) {
            return { success: false, message: 'Cannot connect to server. Please try again.' };
        }
    }, []);

    const logout = useCallback(() => {
        setUser(null);
        sessionStorage.removeItem(SESSION_KEY);
        router.push('/login');
    }, [router]);

    // Returns true if Administrator role (full access), OR if role has explicit permission.
    // Supports both module-level ('students') and page-level ('students.admission') keys.
    // Page-level is checked first; if not found, falls back to module-level.
    const hasPermission = useCallback((module: string, action: 'read' | 'write' | 'delete' = 'read'): boolean => {
        if (!user) return false;
        if (user.role_name === 'Administrator') return true;

        const perms = user.permissions || [];

        // 1. Try exact match (e.g., 'students.admission')
        const exact = perms.find(p => p.module_name.toLowerCase() === module.toLowerCase());
        if (exact) {
            if (action === 'read') return exact.can_read;
            if (action === 'write') return exact.can_write;
            if (action === 'delete') return exact.can_delete;
        }

        // 2. Fallback to parent module (e.g., 'students' for 'students.admission')
        const parentModule = module.includes('.') ? module.split('.')[0] : null;
        if (parentModule) {
            const parent = perms.find(p => p.module_name.toLowerCase() === parentModule.toLowerCase());
            if (parent) {
                if (action === 'read') return parent.can_read;
                if (action === 'write') return parent.can_write;
                if (action === 'delete') return parent.can_delete;
            }
        }

        // 3. Module-level check: if called with a bare module key (e.g. 'students') and no
        //    module-level row exists, check if ANY page-level row in that module grants access.
        //    This allows sidebar nav & layout guards to work when only page-level keys are stored.
        if (!module.includes('.')) {
            const prefix = module.toLowerCase() + '.';
            const anyPageAccess = perms.some(p => {
                if (!p.module_name.toLowerCase().startsWith(prefix)) return false;
                if (action === 'read') return p.can_read;
                if (action === 'write') return p.can_write;
                if (action === 'delete') return p.can_delete;
                return false;
            });
            if (anyPageAccess) return true;
        }

        return false;
    }, [user]);

    const ctxValue = useMemo(
        () => ({ user, isLoggedIn: !!user, isLoading, login, logout, hasPermission }),
        [user, isLoading, login, logout, hasPermission]
    );

    return (
        <AuthContext.Provider value={ctxValue}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthContextType {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
    return ctx;
}
