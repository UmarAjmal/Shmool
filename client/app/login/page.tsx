'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
    const { login, isLoggedIn, isLoading } = useAuth();
    const router = useRouter();

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // If already logged in, redirect to home
    useEffect(() => {
        if (!isLoading && isLoggedIn) {
            router.replace('/');
        }
    }, [isLoading, isLoggedIn, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!username.trim() || !password) {
            setError('Please enter both username and password.');
            return;
        }
        setSubmitting(true);
        const result = await login(username.trim(), password);
        setSubmitting(false);
        if (result.success) {
            router.replace('/');
        } else {
            setError(result.message || 'Login failed');
        }
    };

    if (isLoading) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#233D4D' }}>
                <div className="spinner-border text-light" role="status" />
            </div>
        );
    }

    return (
        <div className="login-wrapper">
            {/* Background decoration */}
            <div className="bg-decoration" />

            <div className="login-container">
                {/* Left Branding Panel */}
                <div className="brand-panel">
                    <div className="brand-content">
                        <div className="school-icon mb-3">
                            <i className="bi bi-mortarboard-fill" style={{ fontSize: '3.5rem', color: '#FE7F2D' }} />
                        </div>
                        <h1 className="school-name">Smart School<br />System</h1>
                        <p className="school-tagline">Manage students, staff, academics and finances — all in one place.</p>
                        <div className="brand-divider" />
                        <div className="feature-list">
                            <div className="feature-item">
                                <i className="bi bi-people-fill feature-icon" />
                                <span>Student & Staff Management</span>
                            </div>
                            <div className="feature-item">
                                <i className="bi bi-calendar3 feature-icon" />
                                <span>Academic Scheduling</span>
                            </div>
                            <div className="feature-item">
                                <i className="bi bi-cash-stack feature-icon" />
                                <span>Fee & Finance Tracking</span>
                            </div>
                            <div className="feature-item">
                                <i className="bi bi-bar-chart-fill feature-icon" />
                                <span>Reports & Analytics</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Login Form */}
                <div className="form-panel">
                    <div className="login-card">
                        <div className="login-card-header">
                            <div className="login-logo">
                                <i className="bi bi-shield-lock-fill" style={{ fontSize: '1.8rem', color: '#FE7F2D' }} />
                            </div>
                            <h2 className="login-title">Welcome Back</h2>
                            <p className="login-subtitle">Sign in to your account to continue</p>
                        </div>

                        <form onSubmit={handleSubmit} noValidate>
                            {error && (
                                <div className="alert alert-danger d-flex align-items-center gap-2 py-2 mb-3" role="alert">
                                    <i className="bi bi-exclamation-triangle-fill" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <div className="form-group mb-3">
                                <label className="form-label fw-semibold">Username</label>
                                <div className="input-icon-wrapper">
                                    <i className="bi bi-person-fill input-icon-left" />
                                    <input
                                        type="text"
                                        className="form-control login-input"
                                        placeholder="Enter your username"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        autoComplete="username"
                                        autoFocus
                                        disabled={submitting}
                                    />
                                </div>
                            </div>

                            <div className="form-group mb-4">
                                <label className="form-label fw-semibold">Password</label>
                                <div className="input-icon-wrapper">
                                    <i className="bi bi-lock-fill input-icon-left" />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        className="form-control login-input"
                                        placeholder="Enter your password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        autoComplete="current-password"
                                        disabled={submitting}
                                    />
                                    <button
                                        type="button"
                                        className="input-icon-right-btn"
                                        onClick={() => setShowPassword(!showPassword)}
                                        tabIndex={-1}
                                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    >
                                        <i className={`bi ${showPassword ? 'bi-eye-slash-fill' : 'bi-eye-fill'}`} />
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="btn login-btn w-100"
                                disabled={submitting}
                            >
                                {submitting ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm me-2" role="status" />
                                        Signing in...
                                    </>
                                ) : (
                                    <>
                                        <i className="bi bi-box-arrow-in-right me-2" />
                                        Sign In
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="login-footer mt-4">
                            <i className="bi bi-info-circle me-1" />
                            Default credentials: <strong>root</strong> / <strong>root123</strong>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx>{`
                .login-wrapper {
                    min-height: 100vh;
                    display: flex;
                    align-items: stretch;
                    position: relative;
                    overflow: hidden;
                    background: #1a2f3b;
                }

                .bg-decoration {
                    position: fixed;
                    inset: 0;
                    background: 
                        radial-gradient(circle at 20% 50%, rgba(33, 94, 97, 0.35) 0%, transparent 55%),
                        radial-gradient(circle at 80% 20%, rgba(254, 127, 45, 0.15) 0%, transparent 50%),
                        radial-gradient(circle at 60% 80%, rgba(35, 61, 77, 0.6) 0%, transparent 60%);
                    pointer-events: none;
                    z-index: 0;
                }

                .login-container {
                    display: flex;
                    width: 100%;
                    max-width: 1100px;
                    margin: auto;
                    min-height: 100vh;
                    position: relative;
                    z-index: 1;
                }

                /* ---- Brand Panel ---- */
                .brand-panel {
                    flex: 1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 60px 50px;
                    background: linear-gradient(145deg, rgba(35,61,77,0.85) 0%, rgba(33,94,97,0.75) 100%);
                    backdrop-filter: blur(8px);
                    border-right: 1px solid rgba(255,255,255,0.07);
                }

                .brand-content {
                    max-width: 380px;
                }

                .school-icon {
                    width: 70px;
                    height: 70px;
                    background: rgba(254,127,45,0.15);
                    border-radius: 18px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border: 1px solid rgba(254,127,45,0.3);
                }

                .school-name {
                    font-size: 2.2rem;
                    font-weight: 800;
                    color: #F5FBE6;
                    line-height: 1.2;
                    margin-bottom: 12px;
                }

                .school-tagline {
                    color: rgba(245,251,230,0.65);
                    font-size: 1rem;
                    line-height: 1.6;
                    margin-bottom: 0;
                }

                .brand-divider {
                    height: 1px;
                    background: linear-gradient(to right, transparent, rgba(254,127,45,0.4), transparent);
                    margin: 28px 0;
                }

                .feature-list {
                    display: flex;
                    flex-direction: column;
                    gap: 14px;
                }

                .feature-item {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    color: rgba(245,251,230,0.8);
                    font-size: 0.95rem;
                }

                .feature-icon {
                    font-size: 1.1rem;
                    color: #FE7F2D;
                    min-width: 20px;
                }

                /* ---- Form Panel ---- */
                .form-panel {
                    flex: 0 0 430px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 40px 40px;
                    background: rgba(245,251,230,0.05);
                }

                .login-card {
                    width: 100%;
                    max-width: 370px;
                    background: rgba(255,255,255,0.97);
                    border-radius: 20px;
                    padding: 40px 36px;
                    box-shadow: 0 24px 80px rgba(0,0,0,0.35), 0 4px 20px rgba(0,0,0,0.2);
                }

                .login-card-header {
                    text-align: center;
                    margin-bottom: 28px;
                }

                .login-logo {
                    width: 56px;
                    height: 56px;
                    background: linear-gradient(135deg, #233D4D, #215E61);
                    border-radius: 14px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 16px;
                }

                .login-title {
                    font-size: 1.55rem;
                    font-weight: 700;
                    color: #233D4D;
                    margin-bottom: 6px;
                }

                .login-subtitle {
                    color: #6b7280;
                    font-size: 0.875rem;
                    margin: 0;
                }

                .form-label {
                    color: #374151;
                    font-size: 0.875rem;
                    margin-bottom: 6px;
                }

                .input-icon-wrapper {
                    position: relative;
                }

                .input-icon-left {
                    position: absolute;
                    left: 12px;
                    top: 50%;
                    transform: translateY(-50%);
                    color: #9ca3af;
                    font-size: 1rem;
                    pointer-events: none;
                    z-index: 2;
                }

                .input-icon-right-btn {
                    position: absolute;
                    right: 10px;
                    top: 50%;
                    transform: translateY(-50%);
                    background: none;
                    border: none;
                    color: #9ca3af;
                    cursor: pointer;
                    padding: 4px;
                    z-index: 2;
                    transition: color 0.2s;
                }
                .input-icon-right-btn:hover { color: #215E61; }

                .login-input {
                    padding-left: 38px;
                    padding-right: 38px;
                    height: 44px;
                    border: 1.5px solid #d1d5db;
                    border-radius: 10px;
                    font-size: 0.9rem;
                    transition: border-color 0.2s, box-shadow 0.2s;
                    background: #f9fafb;
                }
                .login-input:focus {
                    border-color: #215E61;
                    box-shadow: 0 0 0 3px rgba(33,94,97,0.12);
                    background: white;
                    outline: none;
                }
                .login-input:disabled {
                    opacity: 0.65;
                }

                .login-btn {
                    background: linear-gradient(135deg, #215E61, #233D4D);
                    color: white;
                    border: none;
                    height: 46px;
                    border-radius: 10px;
                    font-size: 0.95rem;
                    font-weight: 600;
                    letter-spacing: 0.3px;
                    transition: all 0.2s;
                    box-shadow: 0 4px 15px rgba(33,94,97,0.35);
                }
                .login-btn:hover:not(:disabled) {
                    background: linear-gradient(135deg, #1a4d50, #1c3040);
                    box-shadow: 0 6px 20px rgba(33,94,97,0.45);
                    transform: translateY(-1px);
                    color: white;
                }
                .login-btn:active:not(:disabled) {
                    transform: translateY(0);
                }
                .login-btn:disabled {
                    opacity: 0.75;
                    cursor: not-allowed;
                }

                .login-footer {
                    text-align: center;
                    font-size: 0.8rem;
                    color: #9ca3af;
                    padding-top: 16px;
                    border-top: 1px solid #f3f4f6;
                }

                /* ---- Responsive ---- */
                @media (max-width: 768px) {
                    .brand-panel {
                        display: none;
                    }
                    .form-panel {
                        flex: 1;
                        padding: 30px 20px;
                    }
                    .login-wrapper {
                        background: linear-gradient(145deg, #233D4D, #215E61);
                    }
                }

                @media (max-width: 480px) {
                    .form-panel { padding: 20px 14px; }
                    .login-card { padding: 28px 20px; border-radius: 18px; }
                    .login-title { font-size: 1.3rem; }
                    .login-input, .login-btn { font-size: 16px !important; }
                }
            `}</style>
        </div>
    );
}
