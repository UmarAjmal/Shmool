'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

type ClassItem   = { class_id: number; class_name: string };
type SectionItem = { section_id: number; section_name: string; class_id: number };
type SubjectItem = {
    subject_id: number; subject_name: string; subject_code?: string | null;
    section_id: number; class_id: number;
};

type TestPaper = {
    test_id: number; test_name: string; description?: string | null;
    total_marks: number; created_at: string; created_by_name: string;
    marks_entered: number;
};

type StudentMarkRow = {
    student_id: number; first_name: string; last_name: string;
    admission_no?: string | null; roll_no?: string | null;
    test_mark_id?: number | null; obtained_marks?: number | null; remarks?: string | null;
};

type SheetData = {
    test: TestPaper & { class_name: string; section_name: string; subject_name: string };
    readonly: boolean;
    students: StudentMarkRow[];
};

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function TestMarkingPage() {
    const { user } = useAuth();

    // ── context state ────────────────────────────────────────────────────────
    const [loadingCtx, setLoadingCtx] = useState(true);
    const [isAdmin, setIsAdmin]       = useState(false);
    const [classes, setClasses]       = useState<ClassItem[]>([]);
    const [sections, setSections]     = useState<SectionItem[]>([]);
    const [subjects, setSubjects]     = useState<SubjectItem[]>([]);

    // ── filter selectors ─────────────────────────────────────────────────────
    const [selClass,   setSelClass]   = useState('');
    const [selSection, setSelSection] = useState('');
    const [selSubject, setSelSubject] = useState('');

    // ── tests list ───────────────────────────────────────────────────────────
    const [loadingTests, setLoadingTests] = useState(false);
    const [tests, setTests]               = useState<TestPaper[]>([]);

    // ── create-test form ─────────────────────────────────────────────────────
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [formName,  setFormName]   = useState('');
    const [formDesc,  setFormDesc]   = useState('');
    const [formTotal, setFormTotal]  = useState('');
    const [creating,  setCreating]   = useState(false);

    // ── marking sheet ────────────────────────────────────────────────────────
    const [selectedTest,  setSelectedTest]  = useState<number | null>(null);
    const [loadingSheet,  setLoadingSheet]  = useState(false);
    const [sheet,         setSheet]         = useState<SheetData | null>(null);
    const [obtainedMap,   setObtainedMap]   = useState<Record<number, string>>({});
    const [remarksMap,    setRemarksMap]    = useState<Record<number, string>>({});
    const [saving,        setSaving]        = useState(false);
    const [deleting,      setDeleting]      = useState(false);

    // ── messages ─────────────────────────────────────────────────────────────
    const [msg, setMsg] = useState<{ type: 'success' | 'danger' | 'warning'; text: string } | null>(null);

    // ── derived lists ─────────────────────────────────────────────────────────
    const filteredSections = useMemo(() =>
        selClass ? sections.filter(s => s.class_id === Number(selClass)) : [],
        [sections, selClass]
    );

    const filteredSubjects = useMemo(() =>
        (selClass && selSection)
            ? subjects.filter(s => s.class_id === Number(selClass) && s.section_id === Number(selSection))
            : [],
        [subjects, selClass, selSection]
    );

    const readyToList = !!(selClass && selSection && selSubject && user?.id);

    // ── load context ──────────────────────────────────────────────────────────
    const loadContext = async () => {
        if (!user?.id) { setLoadingCtx(false); return; }
        setLoadingCtx(true);
        setMsg(null);
        try {
            const r = await fetch(`${API}/exams/tests/context?user_id=${user.id}`);
            const d = await r.json();
            if (!r.ok) throw new Error(d.error || 'Failed to load context');
            setIsAdmin(!!d.is_admin);
            setClasses(d.classes  || []);
            setSections(d.sections || []);
            setSubjects(d.subjects || []);
        } catch (e: any) {
            setMsg({ type: 'danger', text: e.message || 'Failed to load context' });
        } finally {
            setLoadingCtx(false);
        }
    };

    useEffect(() => { loadContext(); }, [user?.id]);

    // cascade resets
    useEffect(() => { setSelSection(''); setSelSubject(''); setTests([]); setSelectedTest(null); setSheet(null); }, [selClass]);
    useEffect(() => { setSelSubject(''); setTests([]); setSelectedTest(null); setSheet(null); }, [selSection]);
    useEffect(() => { setTests([]); setSelectedTest(null); setSheet(null); }, [selSubject]);

    useEffect(() => {
        if (filteredSections.length === 1 && !selSection)
            setSelSection(String(filteredSections[0].section_id));
    }, [filteredSections]);

    useEffect(() => {
        if (filteredSubjects.length === 1 && !selSubject)
            setSelSubject(String(filteredSubjects[0].subject_id));
    }, [filteredSubjects]);

    // ── load tests list ────────────────────────────────────────────────────────
    const loadTests = async () => {
        if (!readyToList || !user?.id) return;
        setLoadingTests(true);
        setMsg(null);
        try {
            const p = new URLSearchParams({ user_id: String(user.id), class_id: selClass, section_id: selSection, subject_id: selSubject });
            const r = await fetch(`${API}/exams/tests?${p}`);
            const d = await r.json();
            if (!r.ok) throw new Error(d.error || 'Failed to load tests');
            setTests(d.tests || []);
        } catch (e: any) {
            setMsg({ type: 'danger', text: e.message || 'Failed to load tests' });
        } finally {
            setLoadingTests(false);
        }
    };

    useEffect(() => {
        if (readyToList) loadTests();
    }, [selClass, selSection, selSubject, user?.id]);

    // ── create test ───────────────────────────────────────────────────────────
    const handleCreate = async () => {
        if (!user?.id || !readyToList) return;
        if (!formName.trim()) { setMsg({ type: 'warning', text: 'Test name is required.' }); return; }
        const total = Number(formTotal);
        if (!Number.isFinite(total) || total <= 0) { setMsg({ type: 'warning', text: 'Total marks must be greater than 0.' }); return; }

        setCreating(true);
        setMsg(null);
        try {
            const r = await fetch(`${API}/exams/tests`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: user.id,
                    class_id: Number(selClass),
                    section_id: Number(selSection),
                    subject_id: Number(selSubject),
                    test_name: formName.trim(),
                    description: formDesc.trim() || null,
                    total_marks: total
                })
            });
            const d = await r.json();
            if (!r.ok) throw new Error(d.error || 'Failed to create test');

            setFormName(''); setFormDesc(''); setFormTotal('');
            setShowCreateForm(false);
            setMsg({ type: 'success', text: 'Test created. Select it below to enter marks.' });
            await loadTests();
            // auto-open newly created test
            setSelectedTest(d.test_id);
        } catch (e: any) {
            setMsg({ type: 'danger', text: e.message || 'Create failed' });
        } finally {
            setCreating(false);
        }
    };

    // ── open marking sheet ─────────────────────────────────────────────────────
    const loadSheet = async (testId: number) => {
        if (!user?.id) return;
        setLoadingSheet(true);
        setMsg(null);
        try {
            const r = await fetch(`${API}/exams/tests/${testId}/sheet?user_id=${user.id}`);
            const d = await r.json();
            if (!r.ok) throw new Error(d.error || 'Failed to load sheet');
            setSheet(d);
            const om: Record<number, string> = {};
            const rm: Record<number, string> = {};
            for (const s of (d.students || [])) {
                om[s.student_id] = s.obtained_marks !== null && s.obtained_marks !== undefined ? String(s.obtained_marks) : '';
                rm[s.student_id] = s.remarks || '';
            }
            setObtainedMap(om);
            setRemarksMap(rm);
        } catch (e: any) {
            setSheet(null);
            setMsg({ type: 'danger', text: e.message || 'Failed to load marks sheet' });
        } finally {
            setLoadingSheet(false);
        }
    };

    useEffect(() => {
        if (selectedTest !== null) loadSheet(selectedTest);
        else                       setSheet(null);
    }, [selectedTest]);

    // ── save marks ─────────────────────────────────────────────────────────────
    const handleSave = async () => {
        if (!user?.id || !sheet) return;
        const totalMarks = Number(sheet.test.total_marks);

        for (const s of sheet.students) {
            const val = obtainedMap[s.student_id];
            if (val !== '' && val !== undefined) {
                const n = Number(val);
                if (!Number.isFinite(n) || n < 0 || n > totalMarks) {
                    setMsg({ type: 'danger', text: `Invalid marks for ${s.first_name} ${s.last_name}. Must be 0–${totalMarks}.` });
                    return;
                }
            }
        }

        setSaving(true);
        setMsg(null);
        try {
            const marks = sheet.students.map(s => ({
                student_id: s.student_id,
                obtained_marks: obtainedMap[s.student_id] !== '' ? obtainedMap[s.student_id] : null,
                remarks: remarksMap[s.student_id] || null
            }));

            const r = await fetch(`${API}/exams/tests/${sheet.test.test_id}/save`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: user.id, marks })
            });
            const d = await r.json();
            if (!r.ok) throw new Error(d.error || 'Failed to save marks');

            setMsg({ type: 'success', text: d.message || 'Marks saved.' });
            await loadSheet(sheet.test.test_id);
            await loadTests();
        } catch (e: any) {
            setMsg({ type: 'danger', text: e.message || 'Save failed' });
        } finally {
            setSaving(false);
        }
    };

    // ── delete test (admin) ────────────────────────────────────────────────────
    const handleDeleteTest = async (testId: number) => {
        if (!user?.id) return;
        if (!window.confirm('Delete this test and all its marks? This cannot be undone.')) return;
        setDeleting(true);
        setMsg(null);
        try {
            const r = await fetch(`${API}/exams/tests/${testId}?user_id=${user.id}`, { method: 'DELETE' });
            const d = await r.json();
            if (!r.ok) throw new Error(d.error || 'Delete failed');
            if (selectedTest === testId) { setSelectedTest(null); setSheet(null); }
            setMsg({ type: 'success', text: d.message || 'Test deleted.' });
            await loadTests();
        } catch (e: any) {
            setMsg({ type: 'danger', text: e.message || 'Delete failed' });
        } finally {
            setDeleting(false);
        }
    };

    // ── helpers ───────────────────────────────────────────────────────────────
    const fmtDate = (iso: string) => {
        try { return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); }
        catch { return iso; }
    };

    if (!user) {
        return (
            <div className="container py-4">
                <div className="alert alert-danger mb-0">You do not have permission to access Test Marking.</div>
            </div>
        );
    }

    return (
        <div className="page-wrap" style={{ backgroundColor: 'var(--bg-main)', minHeight: '100vh' }}>

            {/* ── Page header ─────────────────────────────────────────────── */}
            <div className="d-flex align-items-center justify-content-between mb-4">
                <div>
                    <h4 className="mb-1 fw-bold" style={{ color: 'var(--primary-dark)' }}>
                        <i className="bi bi-pencil-square me-2" style={{ color: 'var(--accent-orange)' }} />
                        Test Marking
                    </h4>
                    <div className="text-muted small">Create tests and enter student marks</div>
                </div>
                {isAdmin && <span className="badge rounded-pill bg-warning text-dark border"><i className="bi bi-shield-fill me-1"/>Admin Mode</span>}
            </div>

            {/* ── Alert ──────────────────────────────────────────────────── */}
            {msg && (
                <div className={`alert alert-${msg.type} alert-dismissible`} role="alert">
                    {msg.text}
                    <button type="button" className="btn-close" onClick={() => setMsg(null)} />
                </div>
            )}

            {/* ── Filter Card ─────────────────────────────────────────────── */}
            <div className="card border-0 shadow-sm mb-4">
                <div className="card-header bg-white border-bottom py-3" style={{ borderLeft: '4px solid var(--primary-teal)' }}>
                    <h6 className="mb-0 fw-bold" style={{ color: 'var(--primary-dark)' }}>
                        <i className="bi bi-funnel-fill me-2" style={{ color: 'var(--primary-teal)' }}/>
                        Select Class / Section / Subject
                    </h6>
                </div>
                <div className="card-body">
                    <div className="row g-3 align-items-end">
                        <div className="col-md-4">
                            <label className="form-label fw-semibold">Class</label>
                            <select className="form-select" value={selClass} onChange={e => setSelClass(e.target.value)} disabled={loadingCtx}>
                                <option value="">Select Class</option>
                                {classes.map(c => <option key={c.class_id} value={c.class_id}>{c.class_name}</option>)}
                            </select>
                        </div>
                        <div className="col-md-4">
                            <label className="form-label fw-semibold">Section</label>
                            <select className="form-select" value={selSection} onChange={e => setSelSection(e.target.value)} disabled={!selClass || loadingCtx}>
                                <option value="">Select Section</option>
                                {filteredSections.map(s => <option key={s.section_id} value={s.section_id}>{s.section_name}</option>)}
                            </select>
                        </div>
                        <div className="col-md-4">
                            <label className="form-label fw-semibold">Subject</label>
                            <select className="form-select" value={selSubject} onChange={e => setSelSubject(e.target.value)} disabled={!selSection || loadingCtx}>
                                <option value="">Select Subject</option>
                                {filteredSubjects.map(s => (
                                    <option key={s.subject_id} value={s.subject_id}>
                                        {s.subject_name}{s.subject_code ? ` (${s.subject_code})` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Tests List ─────────────────────────────────────────────── */}
            {readyToList && (
                <div className="card border-0 shadow-sm mb-4">
                    <div className="card-header bg-white d-flex justify-content-between align-items-center border-bottom" style={{ borderLeft: '4px solid var(--accent-orange)' }}>
                        <h6 className="mb-0 fw-bold" style={{ color: 'var(--primary-dark)' }}>
                            <i className="bi bi-list-check me-2" style={{ color: 'var(--accent-orange)' }} />
                            Tests
                            {!loadingTests && <span className="ms-2 badge bg-secondary rounded-pill">{tests.length}</span>}
                        </h6>
                        <button
                            className="btn btn-sm btn-primary-custom fw-semibold"
                            onClick={() => { setShowCreateForm(v => !v); setMsg(null); }}
                        >
                            <i className={`bi ${showCreateForm ? 'bi-x-lg' : 'bi-plus-lg'} me-1`}/>
                            {showCreateForm ? 'Cancel' : 'New Test'}
                        </button>
                    </div>

                    {/* ── Create Form ───────────────────────────────────── */}
                    {showCreateForm && (
                        <div className="card-body border-bottom" style={{ background: 'var(--bg-soft, #f8f9fa)' }}>
                            <div className="row g-3 align-items-end">
                                <div className="col-md-4">
                                    <label className="form-label fw-semibold">Test Name <span className="text-danger">*</span></label>
                                    <input
                                        type="text" className="form-control"
                                        placeholder="e.g. Chapter 3 Quiz"
                                        value={formName} onChange={e => setFormName(e.target.value)}
                                        maxLength={200}
                                    />
                                </div>
                                <div className="col-md-4">
                                    <label className="form-label fw-semibold">Description</label>
                                    <input
                                        type="text" className="form-control"
                                        placeholder="Optional description"
                                        value={formDesc} onChange={e => setFormDesc(e.target.value)}
                                    />
                                </div>
                                <div className="col-md-2">
                                    <label className="form-label fw-semibold">Total Marks <span className="text-danger">*</span></label>
                                    <input
                                        type="number" className="form-control"
                                        placeholder="e.g. 50"
                                        value={formTotal} onChange={e => setFormTotal(e.target.value)}
                                        min={1}
                                    />
                                </div>
                                <div className="col-md-2">
                                    <button
                                        className="btn btn-success fw-semibold w-100"
                                        onClick={handleCreate}
                                        disabled={creating}
                                    >
                                        {creating ? <><span className="spinner-border spinner-border-sm me-1"/>Creating…</> : <><i className="bi bi-check2 me-1"/>Create</>}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="card-body p-0">
                        {loadingTests ? (
                            <div className="text-center py-5 text-muted">
                                <span className="spinner-border spinner-border-sm me-2"/>Loading tests…
                            </div>
                        ) : tests.length === 0 ? (
                            <div className="text-center py-5 text-muted">
                                <i className="bi bi-inbox fs-2 d-block mb-2"/>
                                No tests found. Click <strong>New Test</strong> to create one.
                            </div>
                        ) : (
                            <div className="table-responsive">
                                <table className="table table-hover mb-0 align-middle">
                                    <thead className="table-light">
                                        <tr>
                                            <th>#</th>
                                            <th>Test Name</th>
                                            <th>Description</th>
                                            <th className="text-center">Total Marks</th>
                                            <th className="text-center">Marks Entered</th>
                                            <th>Created By</th>
                                            <th>Date</th>
                                            <th className="text-center">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {tests.map((t, idx) => (
                                            <tr
                                                key={t.test_id}
                                                style={{ cursor: 'pointer', background: selectedTest === t.test_id ? 'var(--primary-teal-soft, #e8f5f5)' : '' }}
                                                onClick={() => setSelectedTest(selectedTest === t.test_id ? null : t.test_id)}
                                            >
                                                <td className="text-muted">{idx + 1}</td>
                                                <td className="fw-semibold" style={{ color: 'var(--primary-teal)' }}>
                                                    {t.test_name}
                                                    {selectedTest === t.test_id && <i className="bi bi-caret-right-fill ms-2 text-warning"/>}
                                                </td>
                                                <td className="text-muted small">{t.description || '—'}</td>
                                                <td className="text-center">
                                                    <span className="badge bg-primary rounded-pill">{t.total_marks}</span>
                                                </td>
                                                <td className="text-center">
                                                    <span className={`badge rounded-pill ${t.marks_entered > 0 ? 'bg-success' : 'bg-secondary'}`}>
                                                        {t.marks_entered}
                                                    </span>
                                                </td>
                                                <td className="small">{t.created_by_name}</td>
                                                <td className="small text-muted">{fmtDate(t.created_at)}</td>
                                                <td className="text-center" onClick={e => e.stopPropagation()}>
                                                    <button
                                                        className="btn btn-sm btn-outline-primary me-1"
                                                        title="Open marks sheet"
                                                        onClick={() => setSelectedTest(selectedTest === t.test_id ? null : t.test_id)}
                                                    >
                                                        <i className="bi bi-pencil-fill"/>
                                                    </button>
                                                    {isAdmin && (
                                                        <button
                                                            className="btn btn-sm btn-outline-danger"
                                                            title="Delete test"
                                                            onClick={() => handleDeleteTest(t.test_id)}
                                                            disabled={deleting}
                                                        >
                                                            <i className="bi bi-trash-fill"/>
                                                        </button>
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
            )}

            {/* ── Marking Sheet ───────────────────────────────────────────── */}
            {selectedTest !== null && (
                <div className="card border-0 shadow-sm">
                    <div className="card-header bg-white d-flex justify-content-between align-items-center border-bottom"
                        style={{ borderLeft: '4px solid var(--primary-teal)' }}>
                        <div>
                            <h6 className="mb-0 fw-bold" style={{ color: 'var(--primary-dark)' }}>
                                <i className="bi bi-journal-check me-2" style={{ color: 'var(--primary-teal)' }}/>
                                Marks Sheet
                                {sheet && <span className="ms-2 text-muted fw-normal small">— {sheet.test.test_name}</span>}
                            </h6>
                            {sheet && (
                                <div className="small text-muted mt-1">
                                    {sheet.test.class_name} · {sheet.test.section_name} · {sheet.test.subject_name} &nbsp;|&nbsp;
                                    Total Marks: <strong>{sheet.test.total_marks}</strong>
                                    {sheet.readonly && <span className="ms-2 badge bg-danger">Locked</span>}
                                    {isAdmin && <span className="ms-2 badge bg-warning text-dark">Admin — always editable</span>}
                                </div>
                            )}
                        </div>
                        <button className="btn btn-sm btn-outline-secondary" onClick={() => { setSelectedTest(null); setSheet(null); }}>
                            <i className="bi bi-x-lg me-1"/>Close
                        </button>
                    </div>

                    <div className="card-body p-0">
                        {loadingSheet ? (
                            <div className="text-center py-5 text-muted">
                                <span className="spinner-border spinner-border-sm me-2"/>Loading students…
                            </div>
                        ) : !sheet ? (
                            <div className="text-center py-4 text-muted">Failed to load sheet.</div>
                        ) : sheet.students.length === 0 ? (
                            <div className="text-center py-5 text-muted">
                                <i className="bi bi-people fs-2 d-block mb-2"/>
                                No active students found in this class/section.
                            </div>
                        ) : (
                            <>
                                <div className="table-responsive">
                                    <table className="table table-hover mb-0 align-middle">
                                        <thead className="table-light">
                                            <tr>
                                                <th style={{ width: 50 }}>#</th>
                                                <th>Name</th>
                                                <th>Adm. No</th>
                                                <th>Roll No</th>
                                                <th className="text-center" style={{ width: 130 }}>
                                                    Obtained Marks
                                                    <span className="text-muted fw-normal small"> /{sheet.test.total_marks}</span>
                                                </th>
                                                <th style={{ minWidth: 200 }}>Remarks</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {sheet.students.map((s, idx) => {
                                                const isReadonly = sheet.readonly;
                                                const obtained = obtainedMap[s.student_id] ?? '';
                                                const remarks  = remarksMap[s.student_id]  ?? '';
                                                const numVal   = Number(obtained);
                                                const isOver   = obtained !== '' && Number.isFinite(numVal) && numVal > Number(sheet.test.total_marks);
                                                const isNeg    = obtained !== '' && Number.isFinite(numVal) && numVal < 0;
                                                const isInvalid = isOver || isNeg;

                                                return (
                                                    <tr key={s.student_id}>
                                                        <td className="text-muted">{idx + 1}</td>
                                                        <td className="fw-semibold">
                                                            {s.first_name} {s.last_name}
                                                        </td>
                                                        <td className="text-muted small">{s.admission_no || '—'}</td>
                                                        <td className="text-muted small">{s.roll_no || '—'}</td>
                                                        <td className="text-center">
                                                            {isReadonly ? (
                                                                <span className="fw-semibold" style={{ color: 'var(--primary-teal)' }}>
                                                                    {obtained !== '' ? obtained : <span className="text-muted">—</span>}
                                                                </span>
                                                            ) : (
                                                                <input
                                                                    type="number"
                                                                    className={`form-control form-control-sm text-center${isInvalid ? ' is-invalid' : ''}`}
                                                                    style={{ width: 100, margin: '0 auto' }}
                                                                    min={0}
                                                                    max={Number(sheet.test.total_marks)}
                                                                    step="0.5"
                                                                    value={obtained}
                                                                    onChange={e => setObtainedMap(prev => ({ ...prev, [s.student_id]: e.target.value }))}
                                                                    placeholder="—"
                                                                />
                                                            )}
                                                        </td>
                                                        <td>
                                                            {isReadonly ? (
                                                                <span className="text-muted small">{remarks || '—'}</span>
                                                            ) : (
                                                                <input
                                                                    type="text"
                                                                    className="form-control form-control-sm"
                                                                    maxLength={300}
                                                                    value={remarks}
                                                                    onChange={e => setRemarksMap(prev => ({ ...prev, [s.student_id]: e.target.value }))}
                                                                    placeholder="Optional remark"
                                                                />
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                {/* ── Footer / Summary + Save ─────────────── */}
                                <div className="card-footer bg-white d-flex flex-wrap align-items-center justify-content-between gap-2 py-3">
                                    <div className="d-flex gap-3 small text-muted">
                                        <span><strong>{sheet.students.length}</strong> students</span>
                                        <span>
                                            Entered: <strong>
                                                {sheet.students.filter(s => obtainedMap[s.student_id] !== '').length}
                                            </strong>
                                        </span>
                                        {(() => {
                                            const nums = sheet.students
                                                .map(s => Number(obtainedMap[s.student_id]))
                                                .filter(n => Number.isFinite(n) && obtainedMap[sheet.students.find(x => x.student_id)?.student_id ?? -1] !== '');
                                            const filled = sheet.students.filter(s => {
                                                const v = obtainedMap[s.student_id];
                                                return v !== '' && Number.isFinite(Number(v));
                                            });
                                            if (filled.length === 0) return null;
                                            const avg = filled.reduce((a, s) => a + Number(obtainedMap[s.student_id]), 0) / filled.length;
                                            return <span>Avg: <strong>{avg.toFixed(1)}</strong></span>;
                                        })()}
                                    </div>

                                    {sheet.readonly ? (
                                        <span className="badge bg-danger py-2 px-3">
                                            <i className="bi bi-lock-fill me-1"/>Locked — View Only
                                        </span>
                                    ) : (
                                        <button
                                            className="btn btn-primary-custom fw-bold px-4"
                                            onClick={handleSave}
                                            disabled={saving}
                                        >
                                            {saving
                                                ? <><span className="spinner-border spinner-border-sm me-2"/>Saving…</>
                                                : <><i className="bi bi-check2-circle me-2"/>
                                                    {isAdmin ? 'Save Marks' : 'Submit & Lock'}
                                                </>
                                            }
                                        </button>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
