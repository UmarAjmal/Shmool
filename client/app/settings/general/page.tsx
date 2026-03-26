'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const API = 'http://localhost:5000';

export default function GeneralSettings() {
    const [settings, setSettings] = useState({
        school_name: '',
        address: '',
        contact_number: '',
        email: '',
        tagline: '',
        website: '',
        facebook_link: '',
        twitter_link: '',
        instagram_link: '',
        logo_url: ''
    });

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [logoPreview, setLogoPreview] = useState<string>('');
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const logoInputRef = useRef<HTMLInputElement>(null);
    const { hasPermission } = useAuth();

    useEffect(() => {
        fetch(`${API}/settings`)
            .then(res => res.json())
            .then(data => {
                if (data && data.school_name) setSettings(data);
                if (data && data.logo_url) setLogoPreview(`${API}${data.logo_url}`);
                setLoading(false);
            })
            .catch(err => {
                console.error('Error fetching settings:', err);
                setLoading(false);
            });
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setSettings({ ...settings, [e.target.name]: e.target.value });
    };

    const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (ev) => setLogoPreview(ev.target?.result as string);
        reader.readAsDataURL(file);

        setUploadingLogo(true);
        try {
            const formData = new FormData();
            formData.append('logo', file);
            const res = await fetch(`${API}/settings/logo`, { method: 'POST', body: formData });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Upload failed');
            setSettings(prev => ({ ...prev, logo_url: data.logo_url }));
            setLogoPreview(`${API}${data.logo_url}?t=${Date.now()}`);
            setMessage({ type: 'success', text: 'Logo uploaded successfully!' });
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Logo upload failed.' });
        } finally {
            setUploadingLogo(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);
        await new Promise(r => setTimeout(r, 400));
        try {
            const res = await fetch(`${API}/settings`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings)
            });
            if (res.ok) {
                setMessage({ type: 'success', text: 'Configuration saved successfully!' });
                const data = await res.json();
                setSettings(data);
            } else {
                setMessage({ type: 'error', text: 'Failed to update settings.' });
            }
        } catch {
            setMessage({ type: 'error', text: 'Server connection error.' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
            <div className="spinner" />
        </div>
    );

    return (
        <div className="fade-in-up settings-page-wrap">

            <div style={{ marginBottom: '30px', borderBottom: '1px solid var(--primary-teal)', paddingBottom: '15px' }}>
                <h2 style={{ color: 'var(--primary-dark)', fontSize: '1.8rem', fontWeight: 'bold' }}>General Information</h2>
                <p style={{ color: 'var(--text-gray-medium)', marginTop: '5px' }}>Manage your school&apos;s primary details and public profile.</p>
            </div>

            {message && (
                <div className={`notification ${message.type === 'success' ? 'success' : 'error'}`}>
                    {message.type === 'success' ? '✅' : '⚠️'} {message.text}
                </div>
            )}

            <form onSubmit={handleSubmit}>

                {/* Logo Upload Section */}
                <div className="settings-card">
                    <div className="card-header">
                        <span style={{ fontSize: '1.5rem', marginRight: '10px' }}>🖼️</span>
                        <h3>School Logo</h3>
                    </div>
                    <div className="card-body">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
                            <div style={{
                                width: 110, height: 110, border: '2px dashed #d1d5db', borderRadius: 12,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: '#f9fafb', overflow: 'hidden', flexShrink: 0
                            }}>
                                {uploadingLogo ? (
                                    <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
                                ) : logoPreview ? (
                                    <img src={logoPreview} alt="School Logo"
                                        style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                ) : (
                                    <span style={{ fontSize: '2.5rem', color: '#d1d5db' }}>🏫</span>
                                )}
                            </div>
                            <div>
                                <p style={{ color: 'var(--text-gray-medium)', fontSize: '0.9rem', marginBottom: 10 }}>
                                    Upload a PNG, JPG or SVG. Max 2&nbsp;MB.<br />
                                    This logo will appear on Result Cards and Marks Sheets.
                                </p>
                                <input
                                    ref={logoInputRef}
                                    type="file"
                                    accept="image/*"
                                    style={{ display: 'none' }}
                                    onChange={handleLogoChange}
                                />
                                <button
                                    type="button"
                                    className="btn-modern secondary"
                                    onClick={() => logoInputRef.current?.click()}
                                    disabled={uploadingLogo}
                                    style={{ padding: '9px 20px' }}
                                >
                                    {uploadingLogo ? 'Uploading…' : logoPreview ? '🔄 Change Logo' : '📤 Upload Logo'}
                                </button>
                                {logoPreview && (
                                    <button
                                        type="button"
                                        style={{ marginLeft: 10, background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.85rem' }}
                                        onClick={() => {
                                            setLogoPreview('');
                                            setSettings(prev => ({ ...prev, logo_url: '' }));
                                            if (logoInputRef.current) logoInputRef.current.value = '';
                                        }}
                                    >
                                        ✕ Remove
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* School Identity */}
                <div className="settings-card">
                    <div className="card-header">
                        <span style={{ fontSize: '1.5rem', marginRight: '10px' }}>🏛️</span>
                        <h3>School Identity</h3>
                    </div>
                    <div className="card-body grid-2">
                        <div className="form-group">
                            <label>School Name</label>
                            <input type="text" name="school_name"
                                value={settings.school_name || ''} onChange={handleChange}
                                className="input-modern" placeholder="e.g. Springfield High" required />
                        </div>
                        <div className="form-group">
                            <label>Tagline / Motto</label>
                            <input type="text" name="tagline"
                                value={settings.tagline || ''} onChange={handleChange}
                                className="input-modern" placeholder="e.g. Shaping Future Leaders" />
                        </div>
                    </div>
                </div>

                {/* Contact Information */}
                <div className="settings-card">
                    <div className="card-header">
                        <span style={{ fontSize: '1.5rem', marginRight: '10px' }}>📍</span>
                        <h3>Contact Information</h3>
                    </div>
                    <div className="card-body grid-2">
                        <div className="form-group">
                            <label>Email Address</label>
                            <input type="email" name="email"
                                value={settings.email || ''} onChange={handleChange}
                                className="input-modern" placeholder="admin@school.com" />
                        </div>
                        <div className="form-group">
                            <label>Phone Number</label>
                            <input type="text" name="contact_number"
                                value={settings.contact_number || ''} onChange={handleChange}
                                className="input-modern" placeholder="+1 (555) 000-0000" />
                        </div>
                        <div className="form-group full-width">
                            <label>Physical Address</label>
                            <textarea name="address"
                                value={settings.address || ''} onChange={handleChange}
                                className="input-modern textarea" placeholder="Full street address..." />
                        </div>
                    </div>
                </div>

                {/* Digital & Social */}
                <div className="settings-card">
                    <div className="card-header">
                        <span style={{ fontSize: '1.5rem', marginRight: '10px' }}>🌐</span>
                        <h3>Digital &amp; Social</h3>
                    </div>
                    <div className="card-body">
                        <div className="form-group">
                            <label>Official Website</label>
                            <input type="url" name="website"
                                value={settings.website || ''} onChange={handleChange}
                                className="input-modern" placeholder="https://" />
                        </div>
                        <div className="grid-3" style={{ marginTop: '20px' }}>
                            <div className="form-group">
                                <label>Facebook</label>
                                <input type="url" name="facebook_link"
                                    value={settings.facebook_link || ''} onChange={handleChange}
                                    className="input-modern" placeholder="Profile URL" />
                            </div>
                            <div className="form-group">
                                <label>Twitter (X)</label>
                                <input type="url" name="twitter_link"
                                    value={settings.twitter_link || ''} onChange={handleChange}
                                    className="input-modern" placeholder="Profile URL" />
                            </div>
                            <div className="form-group">
                                <label>Instagram</label>
                                <input type="url" name="instagram_link"
                                    value={settings.instagram_link || ''} onChange={handleChange}
                                    className="input-modern" placeholder="Profile URL" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Action Bar */}
                <div className="action-bar">
                    {hasPermission('settings', 'write') && (
                    <button type="submit" className={`btn-modern primary ${saving ? 'loading' : ''}`} disabled={saving}>
                        {saving ? 'Saving Changes...' : 'Save Configuration'}
                    </button>
                    )}
                </div>
            </form>

            <style jsx>{`
                .fade-in-up { animation: fadeInUp 0.5s ease-out forwards; }
                .settings-card {
                    background: white; border-radius: 12px;
                    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03);
                    margin-bottom: 25px; border: 1px solid rgba(0,0,0,0.05);
                    animation: fadeInUp 0.5s ease-out forwards; opacity: 0;
                }
                .settings-card:hover { box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05); }
                .card-header {
                    padding: 20px 25px; border-bottom: 1px solid #f3f4f6;
                    display: flex; align-items: center;
                    background: linear-gradient(to right,#fff,#f9fafb);
                    border-radius: 12px 12px 0 0;
                }
                .card-header h3 { color: var(--primary-teal); margin: 0; font-size: 1.1rem; font-weight: 600; }
                .card-body { padding: 25px; }
                .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
                .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; }
                .full-width { grid-column: 1 / -1; }
                .form-group label { display: block; font-size: 0.9rem; font-weight: 500; color: var(--text-gray-dark); margin-bottom: 8px; }
                .form-group:focus-within label { color: var(--primary-teal); }
                .input-modern {
                    width: 100%; padding: 12px 15px; border: 2px solid #e5e7eb; border-radius: 8px;
                    font-size: 0.95rem; color: var(--text-primary); background-color: #f9fafb; transition: all 0.2s ease;
                }
                .input-modern:focus {
                    background-color: white; border-color: var(--primary-teal);
                    box-shadow: 0 0 0 3px rgba(33,94,97,0.1); outline: none;
                }
                .input-modern.textarea { min-height: 100px; resize: vertical; font-family: inherit; }
                .action-bar { display: flex; justify-content: flex-end; margin-top: 30px; padding-bottom: 50px; }
                .btn-modern { padding: 12px 25px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s; border: 1px solid transparent; }
                .btn-modern.primary { background-color: var(--primary-teal); color: white; box-shadow: 0 4px 6px -1px rgba(33,94,97,0.4); }
                .btn-modern.primary:hover:not(:disabled) { transform: translateY(-1px); }
                .btn-modern.secondary { background-color: white; color: var(--text-gray-medium); border-color: #e5e7eb; }
                .btn-modern.secondary:hover { background-color: #f3f4f6; }
                .btn-modern:disabled { opacity: 0.7; cursor: not-allowed; }
                .notification { padding: 15px; border-radius: 8px; margin-bottom: 20px; font-weight: 500; }
                .notification.success { background-color: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
                .notification.error { background-color: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
                .spinner {
                    border: 4px solid #f3f3f3; border-top: 4px solid var(--primary-teal);
                    border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite;
                }
                @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                @media (max-width: 640px) {
                    .grid-2 { grid-template-columns: 1fr; gap: 12px; }
                    .grid-3 { grid-template-columns: 1fr; gap: 12px; }
                    .card-body { padding: 16px; }
                    .card-header { padding: 14px 16px; }
                    .action-bar { flex-direction: column; align-items: stretch; }
                    .btn-modern { width: 100%; text-align: center; justify-content: center; }
                }
            `}</style>
        </div>
    );
}
