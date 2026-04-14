'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import AnimatedBackground from '@/components/AnimatedBackground';

export default function LoginPage() {
    const { login, isLoggedIn, isLoading } = useAuth();
    const router = useRouter();

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

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
            <div className="loader-screen">
                <div className="spinner-border text-light" role="status" />
            </div>
        );
    }

    return (
        <div className="login-page">
            <AnimatedBackground />
            
            <div className="content-wrapper">
                <main className="glass-board">
                    <div className="brand-panel">
                        <div className="brand-content">
                            <div className="icon-wrap">
                                <i className="bi bi-mortarboard-fill" />
                            </div>
                            <h1>Smart School<br />System</h1>
                            <p>Manage students, staff, academics and finances — all in one place effortlessly.</p>
                            <div className="features">
                                <span><i className="bi bi-check-circle-fill"/> Student & Staff Management</span>
                                <span><i className="bi bi-check-circle-fill"/> Academic Scheduling</span>
                                <span><i className="bi bi-check-circle-fill"/> Fee & Finance Tracking</span>
                                <span><i className="bi bi-check-circle-fill"/> Reports & Analytics</span>
                            </div>
                        </div>
                    </div>

                    <div className="form-panel">
                        <div className="form-header">
                            <div className="login-icon"><i className="bi bi-shield-lock-fill" /></div>
                            <h2>Welcome Back</h2>
                            <p>Sign in to your account</p>
                        </div>

                        <form onSubmit={handleSubmit} noValidate>
                            {error && (
                                <div className="alert alert-danger d-flex align-items-center py-2 mb-3" role="alert">
                                    <i className="bi bi-exclamation-triangle-fill me-2" /> {error}
                                </div>
                            )}

                            <div className="form-group mb-3">
                                <label>Username</label>
                                <div className="input-wrapper">
                                    <i className="bi bi-person-fill icon-left" />
                                    <input type="text" className="form-control custom-input" placeholder="Enter username" value={username} onChange={(e) => setUsername(e.target.value)} disabled={submitting} autoFocus />
                                </div>
                            </div>

                            <div className="form-group mb-4">
                                <label>Password</label>
                                <div className="input-wrapper">
                                    <i className="bi bi-lock-fill icon-left" />
                                    <input type={showPassword ? 'text' : 'password'} className="form-control custom-input" placeholder="Enter password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={submitting} />
                                    <button type="button" className="btn-show" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>
                                        <i className={`bi ${showPassword ? 'bi-eye-slash-fill' : 'bi-eye-fill'}`} />
                                    </button>
                                </div>
                            </div>

                            <button type="submit" className="btn btn-primary w-100 btn-login" disabled={submitting}>
                                {submitting ? <span className="spinner-border spinner-border-sm" /> : 'Sign In'}
                            </button>
                        </form>
                        <div className="alert alert-info mt-4 py-2 text-center footer-info">
                            <small>Default credentials: <strong>root</strong> / <strong>root123</strong></small>
                        </div>
                    </div>
                </main>

                <footer className="dev-footer">
                    <div className="creator-card">
                        <img src="https://raw.githubusercontent.com/AbdullahWali79/AbdullahImages/main/Professional.jpeg" alt="PM" />
                        <div className="creator-info">
                            <small>Project Manager / Supervisor</small>
                            <a href="https://muhammadabdullahwali.vercel.app/" target="_blank" rel="noopener noreferrer">Muhammad Abdullah</a>
                            <span>AI Automation & Custom Software</span>
                        </div>
                    </div>

                    <div className="creator-card">
                        <img src="https://avatars.githubusercontent.com/u/126502013?v=4" alt="Dev" />
                        <div className="creator-info">
                            <small>Full Stack Developer</small>
                            <a href="https://github.com/UmarAjmal" target="_blank" rel="noopener noreferrer">M. Umar Ajmal</a>
                            <span>Software Eng. & Machine Learning</span>
                        </div>
                    </div>

                    <div className="creator-card">
                        <div className="avatar-placeholder">A</div>
                        <div className="creator-info">
                            <small>SEO Expert</small>
                            <strong className="text-white">Abdullah</strong>
                            <span>Search Engine Optimization</span>
                        </div>
                    </div>
                </footer>
            </div>

            <style jsx>{`
                .loader-screen {
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: #233D4D;
                }
                .login-page {
                    position: relative;
                    min-height: 100vh;
                    background: #1a2f3b;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    overflow-x: hidden;
                    font-family: 'Inter', system-ui, sans-serif;
                }
                .content-wrapper {
                    position: relative;
                    z-index: 10;
                    width: 100%;
                    max-width: 1000px;
                    padding: 40px 20px 20px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 40px;
                }
                .glass-board {
                    display: flex;
                    width: 100%;
                    background: rgba(255, 255, 255, 0.05);
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                    border-radius: 24px;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                    overflow: hidden;
                }
                .brand-panel {
                    flex: 1.2;
                    padding: 50px;
                    color: white;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                }
                .icon-wrap i {
                    font-size: 3.5rem;
                    color: #FE7F2D;
                }
                .brand-panel h1 {
                    font-size: 2.5rem;
                    font-weight: 700;
                    margin: 20px 0 15px;
                    line-height: 1.2;
                }
                .brand-panel p {
                    font-size: 1rem;
                    color: rgba(255,255,255,0.8);
                    margin-bottom: 30px;
                }
                .features {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }
                .features span {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    font-size: 0.95rem;
                    color: rgba(255,255,255,0.9);
                }
                .features i {
                    color: #FE7F2D;
                }
                .form-panel {
                    flex: 1;
                    background: white;
                    padding: 50px 40px;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                }
                .form-header {
                    text-align: center;
                    margin-bottom: 30px;
                }
                .login-icon i {
                    font-size: 2rem;
                    color: #215E61;
                }
                .form-header h2 {
                    margin: 15px 0 5px;
                    font-weight: 700;
                    color: #1f2937;
                }
                .form-header p {
                    color: #6b7280;
                    font-size: 0.95rem;
                }
                .form-group label {
                    font-size: 0.85rem;
                    font-weight: 600;
                    color: #374151;
                    margin-bottom: 8px;
                }
                .input-wrapper {
                    position: relative;
                }
                .icon-left {
                    position: absolute;
                    left: 14px;
                    top: 50%;
                    transform: translateY(-50%);
                    color: #9ca3af;
                }
                .custom-input {
                    padding-left: 40px;
                    height: 46px;
                    border-radius: 8px;
                    background: #f9fafb;
                    border: 1px solid #d1d5db;
                    font-size: 0.95rem;
                }
                .custom-input:focus {
                    background: white;
                    border-color: #215E61;
                    box-shadow: 0 0 0 3px rgba(33, 94, 97, 0.1);
                }
                .btn-show {
                    position: absolute;
                    right: 10px;
                    top: 50%;
                    transform: translateY(-50%);
                    background: none;
                    border: none;
                    color: #9ca3af;
                }
                .btn-login {
                    height: 48px;
                    background: linear-gradient(135deg, #215E61, #233D4D);
                    border: none;
                    border-radius: 8px;
                    font-weight: 600;
                    font-size: 1rem;
                    margin-top: 10px;
                    box-shadow: 0 4px 12px rgba(33, 94, 97, 0.3);
                    color: white;
                }
                .btn-login:hover:not(:disabled) {
                    transform: translateY(-1px);
                    box-shadow: 0 6px 16px rgba(33, 94, 97, 0.4);
                    background: linear-gradient(135deg, #1c4d50, #1c3040);
                }
                .footer-info {
                    background: #f0f9ff;
                    color: #1e40af;
                    border: none;
                    border-radius: 8px;
                }
                .dev-footer {
                    display: flex;
                    justify-content: center;
                    flex-wrap: wrap;
                    gap: 20px;
                    width: 100%;
                }
                .creator-card {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    padding: 10px 15px;
                    border-radius: 50px;
                    transition: all 0.3s;
                }
                .creator-card:hover {
                    background: rgba(255, 255, 255, 0.1);
                    transform: translateY(-2px);
                }
                .creator-card img, .avatar-placeholder {
                    width: 44px;
                    height: 44px;
                    border-radius: 50%;
                    object-fit: cover;
                    border: 2px solid #FE7F2D;
                }
                .avatar-placeholder {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: #FE7F2D;
                    color: white;
                    font-weight: bold;
                    font-size: 1.2rem;
                }
                .creator-info {
                    display: flex;
                    flex-direction: column;
                    line-height: 1.2;
                }
                .creator-info small {
                    font-size: 0.65rem;
                    text-transform: uppercase;
                    color: rgba(255,255,255,0.6);
                    font-weight: 600;
                }
                .creator-info a, .creator-info strong {
                    font-size: 0.95rem;
                    color: white;
                    text-decoration: none;
                    font-weight: 700;
                }
                .creator-info a:hover {
                    color: #FE7F2D;
                }
                .creator-info span {
                    font-size: 0.7rem;
                    color: rgba(255,255,255,0.8);
                }

                @media (max-width: 768px) {
                    .glass-board {
                        flex-direction: column;
                    }
                    .brand-panel {
                        padding: 40px 30px;
                    }
                    .form-panel {
                        padding: 40px 30px;
                    }
                    .creator-card {
                        width: 100%;
                        max-width: 350px;
                    }
                }
            `}</style>
        </div>
    );
}