'use client';
import { useState, useEffect } from 'react';

type Permission = {
    module_name: string;
    can_read: boolean;
    can_write: boolean;
    can_delete: boolean;
};

type Role = {
    id: number;
    role_name: string;
    description: string;
    is_system_default: boolean;
    permissions: Permission[];
};

export default function RolesPage() {
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<'list' | 'form'>('list');
    const [formData, setFormData] = useState<Role>({ 
        id: 0, 
        role_name: '', 
        description: '', 
        is_system_default: false,
        permissions: [] 
    });

    const modules = ['dashboard', 'students', 'teachers', 'academic', 'settings', 'users_roles', 'fees'];

    useEffect(() => {
        fetchRoles();
    }, []);

    const fetchRoles = async () => {
        try {
            const res = await fetch('http://localhost:5000/roles');
            const data = await res.json();
            setRoles(data);
            setLoading(false);
        } catch (err) {
            console.error(err);
        }
    };

    const handleEdit = (role: Role) => {
        // Prepare permissions (merge with defaults so all modules show up)
        const rolePerms = role.permissions || [];
        const completePerms = modules.map(mod => {
            const existing = rolePerms.find(p => p.module_name === mod);
            return existing || { module_name: mod, can_read: false, can_write: false, can_delete: false };
        });

        setFormData({ ...role, permissions: completePerms });
        setView('form');
    };

    const handleCreate = () => {
        setFormData({
            id: 0,
            role_name: '',
            description: '',
            is_system_default: false,
            permissions: modules.map(mod => ({
                module_name: mod, can_read: false, can_write: false, can_delete: false
            }))
        });
        setView('form');
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure? This cannot be undone.")) return;
         try {
            const res = await fetch(`http://localhost:5000/roles/${id}`, { method: 'DELETE' });
            if (res.ok) fetchRoles();
            else alert(await res.json());
        } catch (err) { console.error(err); }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const url = formData.id === 0 ? 'http://localhost:5000/roles' : `http://localhost:5000/roles/${formData.id}`;
        const method = formData.id === 0 ? 'POST' : 'PUT';
        
        try {
            await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            setView('list');
            fetchRoles();
        } catch (err) { console.error(err); }
    };

    const togglePerm = (moduleIndex: number, field: 'can_read' | 'can_write' | 'can_delete') => {
        const newPerms = [...formData.permissions];
        newPerms[moduleIndex][field] = !newPerms[moduleIndex][field];
        setFormData({ ...formData, permissions: newPerms });
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="container-fluid animate__animated animate__fadeIn">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="h3 mb-0 text-primary-dark">Role Management</h2>
                {view === 'list' && (
                    <button className="btn btn-primary-custom" onClick={handleCreate}>
                        <i className="bi bi-plus-lg me-2"></i>Create New Role
                    </button>
                )}
            </div>

            {view === 'list' && (
                <div className="row g-4">
                    {roles.map(role => (
                        <div key={role.id} className="col-md-6 col-lg-4">
                            <div className="card card-custom h-100">
                                <div className="card-body">
                                    <div className="d-flex justify-content-between align-items-start mb-2">
                                        <h5 className="card-title mb-0 fw-bold text-primary-dark">{role.role_name}</h5>
                                        {role.is_system_default && (
                                            <span className="badge badge-role">System Default</span>
                                        )}
                                    </div>
                                    <p className="card-text text-muted small mb-4">{role.description}</p>
                                    
                                    <div className="d-flex justify-content-between mt-auto">
                                        <button className="btn btn-sm btn-secondary-custom" onClick={() => handleEdit(role)}>
                                            Configure Permissions
                                        </button>
                                        {!role.is_system_default && (
                                            <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(role.id)}>
                                                Delete
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {view === 'form' && (
                <div className="card card-custom p-4 animate__animated animate__fadeInUp">
                    <div className="d-flex align-items-center mb-4">
                         <button className="btn btn-sm btn-light me-3" onClick={() => setView('list')}>
                            &larr; Back
                         </button>
                         <h3 className="h4 mb-0 text-primary-dark">{formData.id === 0 ? 'Create New Role' : 'Edit Role'}</h3>
                    </div>
                    
                    <form onSubmit={handleSave}>
                        <div className="row g-3 mb-4">
                             <div className="col-md-6">
                                <label className="form-label fw-semibold">Role Name</label>
                                <input 
                                    className="form-control" required
                                    value={formData.role_name}
                                    onChange={e => setFormData({...formData, role_name: e.target.value})}
                                    disabled={formData.is_system_default} 
                                    placeholder="e.g. Accountant, Librarian"
                                />
                             </div>
                             <div className="col-md-6">
                                <label className="form-label fw-semibold">Description</label>
                                <input 
                                    className="form-control" 
                                    value={formData.description}
                                    onChange={e => setFormData({...formData, description: e.target.value})}
                                    placeholder="Short description of responsibilities"
                                />
                             </div>
                        </div>

                        <h5 className="mb-3 text-secondary border-bottom pb-2">Module Permissions</h5>
                        <div className="table-responsive">
                            <table className="table table-hover align-middle">
                                <thead className="table-light">
                                    <tr>
                                        <th>Module</th>
                                        <th className="text-center">Read Access</th>
                                        <th className="text-center">Write/Edit</th>
                                        <th className="text-center">Delete</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {formData.permissions.map((perm, idx) => (
                                        <tr key={perm.module_name}>
                                            <td className="fw-medium text-capitalize text-primary-dark">
                                                {perm.module_name.replace('_', ' ')}
                                            </td>
                                            <td className="text-center">
                                                <div className="form-check d-flex justify-content-center">
                                                    <input className="form-check-input" type="checkbox" checked={perm.can_read} onChange={() => togglePerm(idx, 'can_read')} />
                                                </div>
                                            </td>
                                            <td className="text-center">
                                                <div className="form-check d-flex justify-content-center">
                                                    <input className="form-check-input" type="checkbox" checked={perm.can_write} onChange={() => togglePerm(idx, 'can_write')} />
                                                </div>
                                            </td>
                                            <td className="text-center">
                                                <div className="form-check d-flex justify-content-center">
                                                    <input className="form-check-input" type="checkbox" checked={perm.can_delete} onChange={() => togglePerm(idx, 'can_delete')} />
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                         <div className="d-flex justify-content-end gap-2 mt-4">
                            <button type="button" className="btn btn-light" onClick={() => setView('list')}>Cancel</button>
                            <button type="submit" className="btn btn-primary-custom px-4">Save Changes</button>
                         </div>
                    </form>
                </div>
            )}
        </div>
    );
}
