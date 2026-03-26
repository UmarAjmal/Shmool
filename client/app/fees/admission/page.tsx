'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface Ledger {
    ledger_id: number;
    student_id: number;
    first_name: string;
    last_name: string;
    admission_no: string;
    father_name: string;
    student_mobile: string;
    monthly_fee: number;
    class_name: string;
    section_name: string;
    total_amount: number;
    paid_amount: number;
    remaining_amount: number;
    status: 'unpaid' | 'partial' | 'paid';
    admission_date: string;
}

interface Stats {
    unpaid_count: string;
    partial_count: string;
    paid_count: string;
    total_billed: string;
    total_collected: string;
    total_outstanding: string;
}

interface PaymentForm {
    amount_paid: string;
    payment_method: string;
    received_by: string;
    reference_no: string;
    notes: string;
    payment_date: string;
}

export default function AdmissionFeePage() {
    const router = useRouter();
    const { hasPermission } = useAuth();
    const [ledgers, setLedgers] = useState<Ledger[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState(''); // '' = unpaid+partial (default)
    const [search, setSearch] = useState('');

    // Payment Modal
    const [showPayModal, setShowPayModal] = useState(false);
    const [selectedLedger, setSelectedLedger] = useState<Ledger | null>(null);
    const [payForm, setPayForm] = useState<PaymentForm>({
        amount_paid: '', payment_method: 'cash',
        received_by: '', reference_no: '', notes: '',
        payment_date: new Date().toISOString().split('T')[0]
    });
    const [paying, setPaying] = useState(false);
    const [payError, setPayError] = useState('');
    const [paySuccess, setPaySuccess] = useState('');

    useEffect(() => { fetchData(); }, [filterStatus]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const q = filterStatus ? `?status=${filterStatus}` : '';
            const r = await fetch(`http://localhost:5000/fee-slips/admission-fees${q}`);
            const data = await r.json();
            setLedgers(data.ledgers || []);
            setStats(data.stats || null);
        } catch { }
        finally { setLoading(false); }
    };

    const openPayModal = (ledger: Ledger) => {
        setSelectedLedger(ledger);
        setPayForm({
            amount_paid: ledger.remaining_amount.toString(),
            payment_method: 'cash', received_by: '', reference_no: '', notes: '',
            payment_date: new Date().toISOString().split('T')[0]
        });
        setPayError(''); setPaySuccess('');
        setShowPayModal(true);
    };

    const handlePay = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedLedger) return;
        setPaying(true); setPayError(''); setPaySuccess('');
        try {
            const res = await fetch(`http://localhost:5000/fee-slips/admission-fees/${selectedLedger.ledger_id}/pay`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payForm)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setPaySuccess(data.message);
            setTimeout(() => { setShowPayModal(false); fetchData(); }, 1500);
        } catch (err: any) {
            setPayError(err.message);
        } finally { setPaying(false); }
    };

    const fmt = (n: number | string) => new Intl.NumberFormat('en-PK', {
        style: 'currency', currency: 'PKR', minimumFractionDigits: 0
    }).format(parseFloat(n?.toString() || '0'));

    const statusBadge = (s: string) => {
        if (s === 'paid') return <span className="badge rounded-pill bg-success">Paid</span>;
        if (s === 'partial') return <span className="badge rounded-pill bg-warning text-dark">Partial</span>;
        return <span className="badge rounded-pill bg-danger">Unpaid</span>;
    };

    const filtered = ledgers.filter(l => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
            l.first_name?.toLowerCase().includes(q) ||
            l.last_name?.toLowerCase().includes(q) ||
            l.admission_no?.toLowerCase().includes(q) ||
            l.father_name?.toLowerCase().includes(q) ||
            l.class_name?.toLowerCase().includes(q)
        );
    });

    return (
        <div className="container-fluid p-4 animate__animated animate__fadeIn">
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2 className="fw-bold mb-1" style={{ color: 'var(--primary-dark)' }}>
                        <i className="bi bi-credit-card-2-front me-2"></i>Admission Fee Ledger
                    </h2>
                    <p className="text-muted small mb-0">Track one-time admission fee outstanding per student — auto-linked on admission.</p>
                </div>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="row g-3 mb-4">
                    {[
                        { label: 'Total Billed', value: fmt(stats.total_billed), color: 'var(--primary-dark)', icon: 'bi-file-earmark-text' },
                        { label: 'Collected', value: fmt(stats.total_collected), color: '#198754', icon: 'bi-check-circle' },
                        { label: 'Outstanding', value: fmt(stats.total_outstanding), color: '#dc3545', icon: 'bi-exclamation-circle' },
                        { label: 'Unpaid Students', value: parseInt(stats.unpaid_count) + parseInt(stats.partial_count), color: 'var(--accent-orange)', icon: 'bi-people' },
                    ].map((s, i) => (
                        <div className="col-md-3 col-6" key={i}>
                            <div className="card border-0 shadow-sm h-100 animate__animated animate__fadeInUp"
                                style={{ animationDelay: `${i * 0.08}s`, borderLeft: `4px solid ${s.color}` }}>
                                <div className="card-body d-flex align-items-center gap-3">
                                    <div className="rounded-circle d-flex align-items-center justify-content-center"
                                        style={{ width: 46, height: 46, minWidth: 46, backgroundColor: `${s.color}18` }}>
                                        <i className={`bi ${s.icon} fs-5`} style={{ color: s.color }}></i>
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-muted small fw-bold text-uppercase text-truncate">{s.label}</div>
                                        <div className="fw-bold" style={{ color: s.color, fontSize: '1.1rem' }}>{s.value}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Filters */}
            <div className="card border-0 shadow-sm mb-4">
                <div className="card-body py-3 px-4">
                    <div className="row g-2 align-items-center">
                        <div className="col-md-5">
                            <div className="input-group">
                                <span className="input-group-text bg-light border-end-0"><i className="bi bi-search text-muted"></i></span>
                                <input type="text" className="form-control border-start-0 bg-light"
                                    placeholder="Search by name, admission no, father name..."
                                    value={search} onChange={e => setSearch(e.target.value)} />
                            </div>
                        </div>
                        <div className="col-md-3">
                            <select className="form-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                                <option value="">Pending (Unpaid + Partial)</option>
                                <option value="unpaid">Unpaid Only</option>
                                <option value="partial">Partial Only</option>
                                <option value="paid">Paid Only</option>
                                <option value="all">All Students</option>
                            </select>
                        </div>
                        <div className="col-md-2">
                            <span className="text-muted small">{filtered.length} students shown</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="card border-0 shadow-sm animate__animated animate__fadeInUp">
                <div className="card-body p-0">
                    {loading ? (
                        <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center py-5">
                            <i className="bi bi-inbox fs-1 text-muted d-block mb-2"></i>
                            <p className="text-muted mb-0">No admission fee records found.</p>
                            <small className="text-muted">Records are auto-created when students are admitted with an admission fee.</small>
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <table className="table table-hover align-middle mb-0">
                                <thead className="bg-light">
                                    <tr>
                                        <th className="ps-4 py-3 text-secondary">Student</th>
                                        <th className="py-3 text-secondary">Class</th>
                                        <th className="py-3 text-secondary">Monthly Fee</th>
                                        <th className="py-3 text-secondary">Admission Fee</th>
                                        <th className="py-3 text-secondary">Paid</th>
                                        <th className="py-3 text-secondary">
                                            <span className="text-danger fw-bold">Remaining</span>
                                        </th>
                                        <th className="py-3 text-secondary">Status</th>
                                        <th className="pe-4 py-3 text-end text-secondary">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map(ledger => (
                                        <tr key={ledger.ledger_id}
                                            className={ledger.status !== 'paid' ? 'table-danger bg-opacity-10' : ''}>
                                            <td className="ps-4">
                                                <div className="d-flex align-items-center gap-2">
                                                    <div className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white"
                                                        style={{ width: 36, height: 36, minWidth: 36, fontSize: '0.85rem',
                                                            backgroundColor: 'var(--primary-teal)' }}>
                                                        {ledger.first_name[0]}{ledger.last_name?.[0] || ''}
                                                    </div>
                                                    <div>
                                                        <div className="fw-bold text-dark">{ledger.first_name} {ledger.last_name}</div>
                                                        <div className="text-muted small">{ledger.admission_no}</div>
                                                        <div className="text-muted small"><i className="bi bi-person me-1"></i>{ledger.father_name}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="text-muted small">
                                                <span className="badge bg-light text-dark border">{ledger.class_name}</span>
                                                {ledger.section_name && <span className="badge bg-light text-dark border ms-1">{ledger.section_name}</span>}
                                            </td>
                                            <td>
                                                <span className="fw-bold" style={{ color: 'var(--primary-teal)' }}>
                                                    {fmt(ledger.monthly_fee)}
                                                </span>
                                                <div className="text-muted small">per month</div>
                                            </td>
                                            <td className="fw-bold text-dark">{fmt(ledger.total_amount)}</td>
                                            <td className="text-success fw-bold">{fmt(ledger.paid_amount)}</td>
                                            <td>
                                                {ledger.status === 'paid' ? (
                                                    <span className="text-success fw-bold">—</span>
                                                ) : (
                                                    <span className="fw-bold text-danger fs-6">{fmt(ledger.remaining_amount)}</span>
                                                )}
                                            </td>
                                            <td>{statusBadge(ledger.status)}</td>
                                            <td className="pe-4 text-end">
                                                <button className="btn btn-sm btn-light me-1"
                                                    onClick={() => router.push(`/students/profile/${ledger.student_id}`)}
                                                    title="View Profile">
                                                    <i className="bi bi-person text-secondary"></i>
                                                </button>
                                                {ledger.status !== 'paid' && hasPermission('fees', 'write') && (
                                                    <button className="btn btn-sm btn-primary-custom"
                                                        onClick={() => openPayModal(ledger)}
                                                        title="Receive Payment">
                                                        <i className="bi bi-cash-coin me-1"></i>Receive
                                                    </button>
                                                )}
                                                {ledger.status === 'paid' && (
                                                    <span className="badge rounded-pill bg-success bg-opacity-10 text-success border border-success small px-3 py-2">
                                                        <i className="bi bi-check2 me-1"></i>Cleared
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Payment Modal */}
            {showPayModal && selectedLedger && (
                <>
                    <div className="modal-backdrop fade show"></div>
                    <div className="modal fade show d-block" tabIndex={-1}>
                        <div className="modal-dialog modal-dialog-centered">
                            <div className="modal-content border-0 shadow-lg">
                                <div className="modal-header text-white" style={{ backgroundColor: 'var(--primary-dark)' }}>
                                    <h5 className="modal-title">
                                        <i className="bi bi-cash-coin me-2"></i>Receive Admission Fee Payment
                                    </h5>
                                    <button className="btn-close btn-close-white" onClick={() => setShowPayModal(false)}></button>
                                </div>
                                <div className="modal-body p-4">
                                    {/* Student Summary */}
                                    <div className="rounded-3 p-3 mb-4" style={{ backgroundColor: 'var(--bg-main)' }}>
                                        <div className="fw-bold text-dark mb-1">
                                            {selectedLedger.first_name} {selectedLedger.last_name}
                                            <span className="text-muted small fw-normal ms-2">{selectedLedger.admission_no}</span>
                                        </div>
                                        <div className="text-muted small mb-3">
                                            {selectedLedger.class_name} • Father: {selectedLedger.father_name}
                                        </div>
                                        <div className="row g-2 text-center">
                                            {[
                                                { label: 'Total Admission Fee', value: fmt(selectedLedger.total_amount), color: 'var(--primary-dark)' },
                                                { label: 'Already Paid', value: fmt(selectedLedger.paid_amount), color: '#198754' },
                                                { label: 'Remaining', value: fmt(selectedLedger.remaining_amount), color: '#dc3545' },
                                            ].map((s, i) => (
                                                <div className="col-4" key={i}>
                                                    <div className="small text-muted">{s.label}</div>
                                                    <div className="fw-bold" style={{ color: s.color }}>{s.value}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {payError && <div className="alert alert-danger py-2">{payError}</div>}
                                    {paySuccess && <div className="alert alert-success py-2"><i className="bi bi-check-circle me-2"></i>{paySuccess}</div>}

                                    <form onSubmit={handlePay} className="row g-3">
                                        <div className="col-12">
                                            <label className="form-label fw-bold small text-muted">Amount Receiving <span className="text-danger">*</span></label>
                                            <div className="input-group">
                                                <span className="input-group-text bg-light fw-bold">PKR</span>
                                                <input type="number" className="form-control fw-bold fs-5" required min="1"
                                                    max={selectedLedger.remaining_amount}
                                                    value={payForm.amount_paid}
                                                    onChange={e => setPayForm(p => ({ ...p, amount_paid: e.target.value }))}
                                                    placeholder="0" />
                                            </div>
                                            <small className="text-muted">Max: {fmt(selectedLedger.remaining_amount)}</small>
                                        </div>
                                        <div className="col-6">
                                            <label className="form-label fw-bold small text-muted">Payment Method</label>
                                            <select className="form-select" value={payForm.payment_method}
                                                onChange={e => setPayForm(p => ({ ...p, payment_method: e.target.value }))}>
                                                <option value="cash">Cash</option>
                                                <option value="bank">Bank Transfer</option>
                                                <option value="online">Online</option>
                                                <option value="cheque">Cheque</option>
                                            </select>
                                        </div>
                                        <div className="col-6">
                                            <label className="form-label fw-bold small text-muted">Payment Date</label>
                                            <input type="date" className="form-control" value={payForm.payment_date}
                                                onChange={e => setPayForm(p => ({ ...p, payment_date: e.target.value }))} />
                                        </div>
                                        <div className="col-6">
                                            <label className="form-label fw-bold small text-muted">Received By</label>
                                            <input type="text" className="form-control" value={payForm.received_by}
                                                onChange={e => setPayForm(p => ({ ...p, received_by: e.target.value }))}
                                                placeholder="Staff name" />
                                        </div>
                                        <div className="col-6">
                                            <label className="form-label fw-bold small text-muted">Reference / Receipt No</label>
                                            <input type="text" className="form-control" value={payForm.reference_no}
                                                onChange={e => setPayForm(p => ({ ...p, reference_no: e.target.value }))}
                                                placeholder="Optional" />
                                        </div>
                                        <div className="col-12">
                                            <label className="form-label fw-bold small text-muted">Notes</label>
                                            <textarea className="form-control" rows={2} value={payForm.notes}
                                                onChange={e => setPayForm(p => ({ ...p, notes: e.target.value }))}
                                                placeholder="Optional note..."></textarea>
                                        </div>
                                        <div className="col-12 d-flex gap-2 justify-content-end mt-2">
                                            <button type="button" className="btn btn-secondary-custom px-4"
                                                onClick={() => setShowPayModal(false)}>Cancel</button>
                                            {hasPermission('fees', 'write') && (
                                            <button type="submit" className="btn btn-primary-custom px-4"
                                                disabled={paying}>
                                                {paying ? <><span className="spinner-border spinner-border-sm me-2"></span>Processing...</> : <><i className="bi bi-check2 me-2"></i>Confirm Payment</>}
                                            </button>
                                            )}
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
