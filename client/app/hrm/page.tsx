'use client';
import Link from 'next/link';

export default function HRMPage() {
    return (
        <div className="container-fluid animate__animated animate__fadeIn">
            <h2 className="h3 mb-4 text-primary-dark">Human Resource Management</h2>
            
            <div className="row g-4">
                <div className="col-md-6 col-lg-5">
                    <Link href="/hrm/departments" className="text-decoration-none">
                        <div className="card h-100 border-0 shadow-sm hover-card">
                            <div className="card-body p-4 d-flex align-items-center">
                                <div className="bg-primary-subtle p-3 rounded-circle me-3">
                                    <i className="bi bi-building fs-3 text-primary"></i>
                                </div>
                                <div>
                                    <h5 className="card-title fw-bold text-dark mb-1">Departments</h5>
                                    <p className="card-text text-muted">Manage organizational structure and departments.</p>
                                </div>
                            </div>
                        </div>
                    </Link>
                </div>

                <div className="col-md-6 col-lg-5">
                    <Link href="/hrm/employees" className="text-decoration-none">
                        <div className="card h-100 border-0 shadow-sm hover-card">
                            <div className="card-body p-4 d-flex align-items-center">
                                <div className="bg-success-subtle p-3 rounded-circle me-3">
                                    <i className="bi bi-people fs-3 text-success"></i>
                                </div>
                                <div>
                                    <h5 className="card-title fw-bold text-dark mb-1">Employees</h5>
                                    <p className="card-text text-muted">Manage staff, designations, and system access.</p>
                                </div>
                            </div>
                        </div>
                    </Link>
                </div>
            </div>

            <style jsx>{`
                .hover-card { transition: transform 0.2s; }
                .hover-card:hover { transform: translateY(-5px); }
            `}</style>
        </div>
    );
}
