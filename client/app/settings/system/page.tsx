'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { showToast } from '@/utils/toastHelper';

type SystemSetting = {
    setting_key: string;
    setting_value: string;
    category: string;
    description: string;
    updated_at: string;
};

type DBStats = {
    db_name: string;
    size: string;
    connections: string;
};

type BackupFile = {
    name: string;
    size: string;
    created_at: string;
};

export default function SystemConfigPage() {
    const [settings, setSettings] = useState<SystemSetting[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<DBStats | null>(null);
    const [activeTab, setActiveTab] = useState('security');
    const [formData, setFormData] = useState<any>({});
    const [saving, setSaving] = useState(false);
    const { hasPermission } = useAuth();
    
    // Backup State
    const [backups, setBackups] = useState<BackupFile[]>([]);
    const [creatingBackup, setCreatingBackup] = useState(false);
    const [restoring, setRestoring] = useState(false);
    const [resetting, setResetting] = useState(false);

    useEffect(() => {
        fetchSettings();
        fetchStats();
        fetchBackups();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await fetch('https://shmool.onrender.com/system');
            const data = await res.json();
            setSettings(data);
            
            // Map to key-value for form
            const initialForm: any = {};
            data.forEach((s: SystemSetting) => {
                initialForm[s.setting_key] = s.setting_value;
            });
            setFormData(initialForm);
            setLoading(false);
        } catch (err) {
            console.error(err);
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const res = await fetch('https://shmool.onrender.com/system/db-stats');
            if(res.ok) setStats(await res.json());
        } catch (err) { console.error(err); }
    };

    const fetchBackups = async () => {
        try {
            const res = await fetch('https://shmool.onrender.com/system/backups');
            if (res.ok) {
                const data = await res.json();
                setBackups(data);
            }
        } catch (err) { console.error("Failed to fetch backups", err); }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
             const res = await fetch('https://shmool.onrender.com/system', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            if(res.ok) {
                showToast.success('System configuration updated successfully.');
                fetchSettings(); // refresh
            }
        } catch (err) {
            console.error(err);
            showToast.error('Failed to save settings.');
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (key: string, value: string) => {
        setFormData({ ...formData, [key]: value });
    };

    const handleCreateBackup = async () => {
        setCreatingBackup(true);
        try {
            const res = await fetch('https://shmool.onrender.com/system/backups/create', { method: 'POST' });
            const data = await res.json();
            if (res.ok) {
                showToast.success(data.message);
                fetchBackups();
            } else {
                showToast.error('Error: ' + data.error);
            }
        } catch (err) {
            showToast.error('Failed to create backup');
        } finally {
            setCreatingBackup(false);
        }
    };
    
    const handleDeleteBackup = async (filename: string) => {
        if(!confirm(`Are you sure you want to delete ${filename}?`)) return;
        try {
            const res = await fetch(`https://shmool.onrender.com/system/backups/${filename}`, { method: 'DELETE' });
            if (res.ok) {
                showToast.success('Backup deleted successfully');
                fetchBackups();
            }
        } catch(err) { showToast.error('Failed to delete backup'); }
    };
    
    const handleDownloadBackup = (filename: string) => {
        window.location.href = `https://shmool.onrender.com/system/backups/download/${filename}`;
    };

    const handleRestoreBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        
        const file = e.target.files[0];
        if(!confirm(`WARNING: Restore will overwrite your current database with '${file.name}'. This cannot be undone. Are you sure?`)) {
            e.target.value = ''; // Reset input
            return;
        }

        setRestoring(true);
        const formData = new FormData();
        formData.append('backup_file', file);

        try {
            const res = await fetch('https://shmool.onrender.com/system/backups/restore', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            
            if (res.ok) {
                showToast.success(data.message);
                window.location.reload();
            } else {
                showToast.error('Restore Failed: ' + data.error);
            }
        } catch (err) {
            console.error(err);
            showToast.error('Failed to connect to server for restore.');
        } finally {
            setRestoring(false);
            e.target.value = ''; // Reset input
        }
    };

    const handleResetDatabase = async () => {
        const input = prompt("DANGER: This will delete ALL records in the database and factory reset settings!\nType 'DELETE' to confirm:");
        if (input !== 'DELETE') {
            return;
        }

        setResetting(true);
        // Using alert since react-toastify doesn't natively have a blocking modal
        try {
            const res = await fetch('https://shmool.onrender.com/settings/reset-database', { method: 'POST' });
            const data = await res.json();
            
            if (res.ok) {
                // Clear token/session since admin password might have reset to default
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                alert("Database Factory Reset Successful! You will now be redirected to login. Default admin login is usually admin / admin123");
                window.location.href = '/login';
            } else {
                showToast.error('Error: ' + (data.error || 'Failed to reset'));
            }
        } catch (err) {
            showToast.error('Network error during reset.');
        } finally {
            setResetting(false);
        }
    };

    const renderSettingInput = (setting: SystemSetting) => {
        const key = setting.setting_key;
        const val = formData[key] || '';
        
        if (key === 'maintenance_mode' || key === 'auto_backup_enabled') {
            return (
                <select 
                    className="form-select"
                    value={val}
                    onChange={e => handleChange(key, e.target.value)}
                >
                    <option value="false">Disabled</option>
                    <option value="true">Enabled</option>
                </select>
            );
        }

        if (key === 'backup_frequency') {
            return (
                <select 
                    className="form-select"
                    value={val}
                    onChange={e => handleChange(key, e.target.value)}
                >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                </select>
            );
        }

        if (key === 'backup_time') {
            return (
                <input 
                    type="time" 
                    className="form-control" 
                    value={val}
                    onChange={e => handleChange(key, e.target.value)}
                />
            );
        }

        if (key === 'backup_path') {
            return (
                <div className="input-group">
                    <span className="input-group-text bg-light text-muted"><i className="bi bi-folder2-open"></i></span>
                    <input 
                        type="text" 
                        className="form-control font-monospace" 
                        placeholder="e.g. C:\Backups\SchoolSettings"
                        value={val}
                        onChange={e => handleChange(key, e.target.value)}
                    />
                </div>
            );
        }

        return (
            <input 
                type="text" 
                className="form-control" 
                value={val}
                onChange={e => handleChange(key, e.target.value)}
            />
        );
    };

    if (loading) return <div className="p-5 text-center"><div className="spinner-border text-primary"></div></div>;

    // Filter settings by category
    const securitySettings = settings.filter(s => s.category === 'security');
    const dbSettings = settings.filter(s => s.category === 'database' || s.category === 'system');

    return (
        <div className="container-fluid animate__animated animate__fadeIn">
             <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
                <div>
                    <h2 className="h3 mb-0 text-primary-dark">System Configuration</h2>
                    <p className="text-muted">Manage security policies, sessions, and database maintenance.</p>
                </div>
                {/* Save Button for Global Config */}
                 {hasPermission('settings', 'write') && (
                 <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                    {saving ? <div className="spinner-border spinner-border-sm me-2"></div> : <i className="bi bi-save me-2"></i>}
                    Save Configuration
                </button>
                 )}
            </div>

            <div className="card card-custom">
                <div className="card-header bg-white border-bottom-0 pb-0 overflow-auto">
                    <ul className="nav nav-tabs card-header-tabs flex-nowrap">
                        <li className="nav-item">
                            <button 
                                className={`nav-link ${activeTab === 'security' ? 'active fw-bold text-primary-dark' : 'text-muted'}`}
                                onClick={() => setActiveTab('security')}
                            >
                                <i className="bi bi-shield-lock me-2"></i>Security & Sessions
                            </button>
                        </li>
                        <li className="nav-item">
                            <button 
                                className={`nav-link ${activeTab === 'maintenance' ? 'active fw-bold text-primary-dark' : 'text-muted'}`}
                                onClick={() => setActiveTab('maintenance')}
                            >
                                <i className="bi bi-database-gear me-2"></i>Database & Maintenance
                            </button>
                        </li>
                    </ul>
                </div>

                <div className="card-body p-4">
                        
                    {/* Security Tab */}
                    {activeTab === 'security' && (
                        <div className="animate__animated animate__fadeIn">
                            <h5 className="mb-4 text-primary-teal">Login & Session Policies</h5>
                            <div className="row g-4">
                                {securitySettings.map(setting => (
                                    <div key={setting.setting_key} className="col-12 col-md-6">
                                        <label className="form-label fw-semibold">
                                            {setting.setting_key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                                        </label>
                                        {renderSettingInput(setting)}
                                        <small className="text-muted">{setting.description}</small>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Maintenance Tab */}
                    {activeTab === 'maintenance' && (
                        <div className="animate__animated animate__fadeIn">
                            {/* Stats & Actions */}
                            <div className="row g-3 mb-5">
                                <div className="col-12 col-md-5">
                                    <div className="card bg-light border-0 shadow-sm h-100">
                                        <div className="card-body">
                                            <h6 className="card-subtitle mb-3 text-muted">Database Health</h6>
                                            {stats ? (
                                                <>
                                                    <div className="d-flex justify-content-between mb-2">
                                                        <span>Name</span> <span className="fw-bold">{stats.db_name}</span>
                                                    </div>
                                                    <div className="d-flex justify-content-between mb-2">
                                                        <span>Size</span> <span className="fw-bold">{stats.size}</span>
                                                    </div>
                                                    <div className="d-flex justify-content-between">
                                                        <span>Connections</span> <span className="fw-bold">{stats.connections}</span>
                                                    </div>
                                                </>
                                            ) : <div className="text-center"><span className="spinner-border spinner-border-sm"></span></div>}
                                        </div>
                                    </div>
                                </div>
                                <div className="col-12 col-md-7">
                                     <div className="card border-0 shadow-sm h-100">
                                        <div className="card-body">
                                           <div className="d-flex justify-content-between align-items-center mb-3">
                                                <h6 className="card-subtitle text-muted mb-0">Manual Backup</h6>
                                {hasPermission('settings', 'write') && (
                                <button
                                                    className="btn btn-sm btn-success" 
                                                    onClick={handleCreateBackup}
                                                    disabled={creatingBackup}
                                                >
                                                    {creatingBackup ? <span className="spinner-border spinner-border-sm me-2"></span> : <i className="bi bi-plus-circle me-1"></i>}
                                                    Create New Backup
                                                </button>
                                )}
                                           </div>
                                           <div className="d-flex justify-content-between align-items-center mb-3 pt-3 border-top">
                                                <div>
                                                    <h6 className="card-subtitle text-muted mb-0">Restore Database</h6>
                                                    <small className="text-danger d-block">Overwrites existing data!</small>
                                                </div>
                                {hasPermission('settings', 'write') && (
                                <label className={`btn btn-sm btn-outline-danger ${restoring ? 'disabled' : ''}`}>
                                    {restoring ? <span className="spinner-border spinner-border-sm me-2"></span> : <i className="bi bi-upload me-1"></i>}
                                    Upload & Restore
                                              <input type="file" hidden accept=".sql" onChange={handleRestoreBackup} disabled={restoring} />
                                          </label>
                                      )}
                                      </div>

                                      {/* DANGER ZONE */}
                                      <div className="d-flex justify-content-between align-items-center mt-3 pt-3 border-top">
                                          <div>
                                              <h6 className="card-subtitle text-danger fw-bold mb-0">Factory Reset Database</h6>
                                              <small className="text-secondary d-block">Wipes all tables & auto-seeds initial data. Cannot be undone!</small>
                                          </div>
                                          {hasPermission('settings', 'delete') && (
                                              <button 
                                                  className={`btn btn-sm btn-danger ${resetting ? 'disabled' : ''}`}
                                                  onClick={handleResetDatabase}
                                              >
                                                  {resetting ? <span className="spinner-border spinner-border-sm me-2"></span> : <i className="bi bi-exclamation-triangle-fill me-1"></i>}
                                                  Reset Database
                                              </button>
                                          )}
                                      </div>
                                      {/* END DANGER ZONE */}
                                  </div>
                               </div>
                            </div>
                        </div>

                        {/* Backups List */}
                            <h5 className="mb-3 text-primary-teal">Available Backups</h5>
                            <div className="table-responsive mb-5 border rounded">
                                <table className="table table-hover mb-0">
                                    <thead className="bg-light">
                                        <tr>
                                            <th>Filename</th>
                                            <th>Size</th>
                                            <th style={{width: '200px'}}>Created At</th>
                                            <th className="text-end" style={{width: '150px'}}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {backups.length === 0 ? (
                                            <tr><td colSpan={4} className="text-center py-3 text-muted">No backups found.</td></tr>
                                        ) : (
                                            backups.map(file => (
                                                <tr key={file.name}>
                                                    <td className="align-middle">
                                                        <i className="bi bi-file-earmark-zip text-secondary me-2"></i>
                                                        {file.name}
                                                    </td>
                                                    <td className="align-middle">
                                                        {file.size}
                                                    </td>
                                                    <td className="align-middle text-muted small">
                                                        {new Date(file.created_at).toLocaleString()}
                                                    </td>
                                                    <td className="text-end">
                                                        <div className="btn-group btn-group-sm">
                                                            <button 
                                                                className="btn btn-outline-primary" 
                                                                title="Download"
                                                                onClick={() => handleDownloadBackup(file.name)}
                                                            >
                                                                <i className="bi bi-download"></i>
                                                            </button>
                                                            {hasPermission('settings', 'delete') && (
                                                            <button 
                                                                className="btn btn-outline-danger" 
                                                                title="Delete"
                                                                onClick={() => handleDeleteBackup(file.name)}
                                                            >
                                                                <i className="bi bi-trash"></i>
                                                            </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Config Form */}
                            <h5 className="mb-3 text-primary-teal">Maintenance Configuration</h5>
                            <div className="row g-4">
                                    {dbSettings.map(setting => (
                                    <div key={setting.setting_key} className="col-12 col-md-6">
                                        <label className="form-label fw-semibold">
                                            {setting.setting_key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                                        </label>
                                        {renderSettingInput(setting)}
                                        <small className="text-muted">{setting.description}</small>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
