'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

type Term = { id: number; term_name: string; start_date?: string | null; end_date?: string | null };
type ClassItem = { class_id: number; class_name: string };
type SectionItem = { section_id: number; section_name: string; class_id: number };
type SubjectItem = {
    subject_id: number;
    subject_name: string;
    subject_code?: string | null;
    section_id: number;
    section_name: string;
    class_id: number;
    class_name: string;
};
type StudentMarkRow = {
    student_id: number;
    first_name: string;
    last_name: string;
    admission_no?: string | null;
    roll_no?: string | null;
    mark_id?: number | null;
    total_marks?: number | null;
    obtained_marks?: number | null;
};

type SheetResponse = {
    readonly: boolean;
    has_any_marks: boolean;
    total_marks: number | null;
    students: StudentMarkRow[];
};

const API = `${process.env.NEXT_PUBLIC_API_URL || "https://shmool.onrender.com"}'}`;

export default function ExaminationMarksPage() {
    const { user, hasPermission } = useAuth();

    const [loadingContext, setLoadingContext] = useState(true);
    const [loadingSheet, setLoadingSheet] = useState(false);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const [isAdmin, setIsAdmin] = useState(false);
    const [activeYearName, setActiveYearName] = useState('');
    const [terms, setTerms] = useState<Term[]>([]);
    const [classes, setClasses] = useState<ClassItem[]>([]);
    const [sections, setSections] = useState<SectionItem[]>([]);
    const [subjects, setSubjects] = useState<SubjectItem[]>([]);

    const [selectedTerm, setSelectedTerm] = useState('');
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedSection, setSelectedSection] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');

    const [sheetReadonly, setSheetReadonly] = useState(false);
    const [sheetHasAnyMarks, setSheetHasAnyMarks] = useState(false);
    const [totalMarks, setTotalMarks] = useState('100');
    const [students, setStudents] = useState<StudentMarkRow[]>([]);
    const [obtainedMap, setObtainedMap] = useState<Record<number, string>>({});

    const [msg, setMsg] = useState<{ type: 'success' | 'danger' | 'warning'; text: string } | null>(null);

    const canUsePage = !!user;

    const filteredSections = useMemo(() => {
        if (!selectedClass) return [];
        return sections.filter(s => s.class_id === Number(selectedClass));
    }, [sections, selectedClass]);

    const filteredSubjects = useMemo(() => {
        if (!selectedClass || !selectedSection) return [];
        return subjects.filter(s => s.class_id === Number(selectedClass) && s.section_id === Number(selectedSection));
    }, [subjects, selectedClass, selectedSection]);

    const readyToLoadSheet = !!(selectedTerm && selectedClass && selectedSection && selectedSubject && user?.id);

    const loadContext = async () => {
        if (!user?.id) {
            setLoadingContext(false);
            return;
        }
        setLoadingContext(true);
        setMsg(null);
        try {
            const r = await fetch(`${API}/exams/context?user_id=${user.id}`);
            const d = await r.json();
            if (!r.ok) throw new Error(d.error || 'Failed to load examination context');

            setIsAdmin(!!d.is_admin);
            setActiveYearName(d.active_year?.year_name || '');
            setTerms(d.terms || []);
            setClasses(d.classes || []);
            setSections(d.sections || []);
            setSubjects(d.subjects || []);

            const termList = d.terms || [];
            const classList = d.classes || [];

            setSelectedTerm(prev => {
                if (prev && termList.some((t: Term) => String(t.id) === prev)) return prev;
                return termList.length > 0 ? String(termList[0].id) : '';
            });

            setSelectedClass(prev => {
                if (prev && classList.some((c: ClassItem) => String(c.class_id) === prev)) return prev;
                return classList.length > 0 ? String(classList[0].class_id) : '';
            });
        } catch (e: any) {
            setMsg({ type: 'danger', text: e.message || 'Failed to load context' });
        } finally {
            setLoadingContext(false);
        }
    };

    const loadSheet = async () => {
        if (!readyToLoadSheet || !user?.id) return;
        setLoadingSheet(true);
        setMsg(null);
        try {
            const params = new URLSearchParams({
                user_id: String(user.id),
                term_id: selectedTerm,
                class_id: selectedClass,
                section_id: selectedSection,
                subject_id: selectedSubject
            });
            const r = await fetch(`${API}/exams/marking-sheet?${params.toString()}`);
            const d: SheetResponse | any = await r.json();
            if (!r.ok) throw new Error(d.error || 'Failed to load marking sheet');

            setSheetReadonly(!!d.readonly);
            setSheetHasAnyMarks(!!d.has_any_marks);
            setTotalMarks(d.total_marks !== null && d.total_marks !== undefined ? String(d.total_marks) : '100');
            setStudents(d.students || []);

            const nextMap: Record<number, string> = {};
            (d.students || []).forEach((s: StudentMarkRow) => {
                nextMap[s.student_id] = s.obtained_marks !== null && s.obtained_marks !== undefined ? String(s.obtained_marks) : '';
            });
            setObtainedMap(nextMap);
        } catch (e: any) {
            setStudents([]);
            setObtainedMap({});
            setSheetHasAnyMarks(false);
            setSheetReadonly(false);
            setMsg({ type: 'danger', text: e.message || 'Failed to load sheet' });
        } finally {
            setLoadingSheet(false);
        }
    };

    useEffect(() => {
        loadContext();
    }, [user?.id]);

    useEffect(() => {
        setSelectedSection('');
        setSelectedSubject('');
        setStudents([]);
        setObtainedMap({});
        setSheetHasAnyMarks(false);
        setSheetReadonly(false);
    }, [selectedClass]);

    useEffect(() => {
        setSelectedSubject('');
        setStudents([]);
        setObtainedMap({});
        setSheetHasAnyMarks(false);
        setSheetReadonly(false);
    }, [selectedSection]);

    useEffect(() => {
        setStudents([]);
        setObtainedMap({});
        setSheetHasAnyMarks(false);
        setSheetReadonly(false);
    }, [selectedTerm, selectedSubject]);

    useEffect(() => {
        if (filteredSections.length === 1 && !selectedSection) {
            setSelectedSection(String(filteredSections[0].section_id));
        }
    }, [filteredSections, selectedSection]);

    useEffect(() => {
        if (filteredSubjects.length === 1 && !selectedSubject) {
            setSelectedSubject(String(filteredSubjects[0].subject_id));
        }
    }, [filteredSubjects, selectedSubject]);

    useEffect(() => {
        if (readyToLoadSheet) {
            loadSheet();
        }
    }, [readyToLoadSheet, selectedTerm, selectedClass, selectedSection, selectedSubject]);

    const handleLoadSheet = async () => {
        await loadSheet();
    };

    const handleObtainedChange = (studentId: number, value: string) => {
        setObtainedMap(prev => ({ ...prev, [studentId]: value }));
    };

    const handleSave = async () => {
        if (!user?.id || !readyToLoadSheet) return;
        if (!Number.isFinite(Number(totalMarks)) || Number(totalMarks) <= 0) {
            setMsg({ type: 'danger', text: 'Total marks must be greater than 0.' });
            return;
        }

        const tm = Number(totalMarks);
        const payloadMarks = students.map(s => {
            const val = obtainedMap[s.student_id];
            if (val === '' || val === undefined || val === null) {
                return { student_id: s.student_id, obtained_marks: NaN };
            }
            const n = Number(val);
            return { student_id: s.student_id, obtained_marks: n };
        });

        for (const row of payloadMarks) {
            if (!Number.isFinite(row.obtained_marks) || row.obtained_marks < 0 || row.obtained_marks > tm) {
                setMsg({ type: 'danger', text: `Invalid marks for one or more students. Must be between 0 and ${tm}.` });
                return;
            }
        }

        setSaving(true);
        setMsg(null);
        try {
            const r = await fetch(`${API}/exams/marks/save`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: user.id,
                    term_id: Number(selectedTerm),
                    class_id: Number(selectedClass),
                    section_id: Number(selectedSection),
                    subject_id: Number(selectedSubject),
                    total_marks: tm,
                    marks: payloadMarks
                })
            });
            const d = await r.json();
            if (!r.ok) throw new Error(d.error || 'Failed to save marks');

            setMsg({ type: 'success', text: d.message || 'Marks saved successfully.' });
            await loadSheet();
        } catch (e: any) {
            setMsg({ type: 'danger', text: e.message || 'Save failed' });
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteSheet = async () => {
        if (!user?.id || !readyToLoadSheet) return;
        if (!window.confirm('Delete this complete marks sheet? This will remove all student marks for selected term/class/section/subject.')) return;

        setDeleting(true);
        setMsg(null);
        try {
            const params = new URLSearchParams({
                user_id: String(user.id),
                term_id: selectedTerm,
                class_id: selectedClass,
                section_id: selectedSection,
                subject_id: selectedSubject
            });
            const r = await fetch(`${API}/exams/marks/sheet?${params.toString()}`, { method: 'DELETE' });
            const d = await r.json();
            if (!r.ok) throw new Error(d.error || 'Delete failed');

            setMsg({ type: 'success', text: d.message || 'Marks deleted successfully.' });
            await loadSheet();
        } catch (e: any) {
            setMsg({ type: 'danger', text: e.message || 'Delete failed' });
        } finally {
            setDeleting(false);
        }
    };

    if (!canUsePage) {
        return (
            <div className="container py-4">
                <div className="alert alert-danger mb-0">You do not have permission to access Examination Marks.</div>
            </div>
        );
    }

    const presentCount = students.length
        ? students.filter(s => {
            const raw = obtainedMap[s.student_id];
            const n = Number(raw);
            return Number.isFinite(n) && n > 0;
        }).length
        : 0;

    const avgMarks = students.length
        ? (() => {
            const nums = students
                .map(s => Number(obtainedMap[s.student_id]))
                .filter(n => Number.isFinite(n));
            if (!nums.length) return 0;
            return +(nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2);
        })()
        : 0;

    return (
        <div className="page-wrap" style={{ backgroundColor: 'var(--bg-main)', minHeight: '100vh' }}>
            <div className="d-flex align-items-center justify-content-between mb-4">
                <div>
                    <h4 className="mb-1 fw-bold" style={{ color: 'var(--primary-dark)' }}>
                        <i className="bi bi-journal-check me-2" style={{ color: 'var(--accent-orange)' }} />
                        Examination Marks
                    </h4>
                    <div className="text-muted small">Enter and manage term-wise subject marks</div>
                </div>
                <span className="badge rounded-pill bg-light text-dark border">
                    Academic Year: {activeYearName || '—'}
                </span>
            </div>

            {msg && (
                <div className={`alert alert-${msg.type} alert-dismissible`} role="alert">
                    {msg.text}
                    <button type="button" className="btn-close" onClick={() => setMsg(null)} />
                </div>
            )}

            <div className="card border-0 shadow-sm mb-4">
                <div className="card-header bg-white border-bottom py-3" style={{ borderLeft: '4px solid var(--primary-teal)' }}>
                    <h6 className="mb-0 fw-bold" style={{ color: 'var(--primary-dark)' }}>
                        <i className="bi bi-funnel-fill me-2" style={{ color: 'var(--primary-teal)' }} />
                        Filter Marking Sheet
                    </h6>
                </div>
                <div className="card-body">
                    <div className="row g-3 align-items-end">
                        <div className="col-md-3">
                            <label className="form-label fw-semibold">Term</label>
                            <select className="form-select" value={selectedTerm} onChange={(e) => setSelectedTerm(e.target.value)} disabled={loadingContext}>
                                <option value="">Select Term</option>
                                {terms.map(t => <option key={t.id} value={t.id}>{t.term_name}</option>)}
                            </select>
                        </div>
                        <div className="col-md-3">
                            <label className="form-label fw-semibold">Class</label>
                            <select className="form-select" value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} disabled={loadingContext}>
                                <option value="">Select Class</option>
                                {classes.map(c => <option key={c.class_id} value={c.class_id}>{c.class_name}</option>)}
                            </select>
                        </div>
                        <div className="col-md-3">
                            <label className="form-label fw-semibold">Section</label>
                            <select className="form-select" value={selectedSection} onChange={(e) => setSelectedSection(e.target.value)} disabled={!selectedClass || loadingContext}>
                                <option value="">Select Section</option>
                                {filteredSections.map(s => <option key={s.section_id} value={s.section_id}>{s.section_name}</option>)}
                            </select>
                        </div>
                        <div className="col-md-3">
                            <label className="form-label fw-semibold">Subject</label>
                            <select className="form-select" value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} disabled={!selectedSection || loadingContext}>
                                <option value="">Select Subject</option>
                                {filteredSubjects.map(s => <option key={s.subject_id} value={s.subject_id}>{s.subject_name}{s.subject_code ? ` (${s.subject_code})` : ''}</option>)}
                            </select>
                        </div>
                        <div className="col-12 d-flex gap-2">
                            <button className="btn btn-primary-custom fw-bold" onClick={handleLoadSheet} disabled={!readyToLoadSheet || loadingSheet || loadingContext}>
                                {loadingSheet ? (<><span className="spinner-border spinner-border-sm me-2" />Loading...</>) : 'Load Students'}
                            </button>
                            <button className="btn btn-secondary-custom" onClick={loadContext} disabled={loadingContext}>Refresh Context</button>
                        </div>
                    </div>
                </div>
            </div>

            {readyToLoadSheet && (
                <div className="card border-0 shadow-sm">
                    <div className="card-header bg-white d-flex justify-content-between align-items-center border-bottom" style={{ borderLeft: '4px solid var(--accent-orange)' }}>
                        <div className="fw-semibold" style={{ color: 'var(--primary-dark)' }}>
                            Marking Sheet ({students.length} students)
                        </div>
                        <div className="d-flex align-items-center gap-2">
                            <div className="input-group input-group-sm" style={{ width: 180 }}>
                                <span className="input-group-text">Out of</span>
                                <input
                                    type="number"
                                    className="form-control"
                                    value={totalMarks}
                                    min={1}
                                    onChange={(e) => setTotalMarks(e.target.value)}
                                    disabled={sheetReadonly || saving || loadingSheet}
                                />
                            </div>
                            {!sheetReadonly && hasPermission('academic', 'write') && (
                                <button className="btn btn-primary-custom btn-sm fw-bold" onClick={handleSave} disabled={saving || loadingSheet || students.length === 0}>
                                    {saving ? (<><span className="spinner-border spinner-border-sm me-2" />Saving...</>) : 'Save Marks'}
                                </button>
                            )}
                            {isAdmin && sheetHasAnyMarks && hasPermission('academic', 'delete') && (
                                <button className="btn btn-outline-danger btn-sm" onClick={handleDeleteSheet} disabled={deleting || loadingSheet}>
                                    {deleting ? 'Deleting...' : 'Delete Sheet'}
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="card-body p-0">
                        {sheetReadonly && (
                            <div className="alert alert-warning m-3 mb-0">
                                This sheet is locked for your account. You can only view marks now.
                            </div>
                        )}

                        {students.length > 0 && (
                            <div className="px-3 px-md-4 py-3 border-bottom bg-light">
                                <div className="row g-2">
                                    <div className="col-6 col-md-3">
                                        <div className="small text-muted">Students</div>
                                        <div className="fw-bold" style={{ color: 'var(--primary-dark)' }}>{students.length}</div>
                                    </div>
                                    <div className="col-6 col-md-3">
                                        <div className="small text-muted">Entered Marks</div>
                                        <div className="fw-bold" style={{ color: 'var(--primary-teal)' }}>
                                            {students.filter(s => obtainedMap[s.student_id] !== '' && obtainedMap[s.student_id] !== undefined).length}
                                        </div>
                                    </div>
                                    <div className="col-6 col-md-3">
                                        <div className="small text-muted">Average</div>
                                        <div className="fw-bold" style={{ color: 'var(--accent-orange)' }}>{avgMarks}</div>
                                    </div>
                                    <div className="col-6 col-md-3">
                                        <div className="small text-muted">Above Zero</div>
                                        <div className="fw-bold" style={{ color: 'var(--primary-dark)' }}>{presentCount}</div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {students.length === 0 ? (
                            <div className="text-center py-5 text-muted">Load a valid term/class/section/subject to view students.</div>
                        ) : (
                            <div className="table-responsive">
                                <table className="table table-hover align-middle mb-0">
                                    <thead style={{ background: 'var(--primary-dark)', color: '#fff' }}>
                                        <tr>
                                            <th className="ps-4">Roll No</th>
                                            <th>Admission No</th>
                                            <th>Student Name</th>
                                            <th style={{ width: 180 }}>Obtained Marks</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {students.map((s) => (
                                            <tr key={s.student_id}>
                                                <td className="ps-4">{s.roll_no || '—'}</td>
                                                <td>{s.admission_no || '—'}</td>
                                                <td>{s.first_name} {s.last_name}</td>
                                                <td>
                                                    <input
                                                        type="number"
                                                        className="form-control form-control-sm"
                                                        min={0}
                                                        max={Number(totalMarks) || undefined}
                                                        step="0.01"
                                                        value={obtainedMap[s.student_id] ?? ''}
                                                        disabled={sheetReadonly || saving || loadingSheet}
                                                        onChange={(e) => handleObtainedChange(s.student_id, e.target.value)}
                                                    />
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
        </div>
    );
}


