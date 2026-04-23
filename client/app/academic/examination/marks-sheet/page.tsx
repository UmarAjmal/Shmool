'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const API = `${process.env.NEXT_PUBLIC_API_URL || "https://shmool.onrender.com"}'}`;

type Term = { id: number; term_name: string };
type ClassItem = { class_id: number; class_name: string };
type SectionItem = { section_id: number; section_name: string; class_id: number };

type SubjectCol = { subject_id: number; subject_name: string; subject_code?: string | null };

type StudentRow = {
    student_id: number;
    first_name: string;
    last_name: string;
    admission_no?: string | null;
    roll_no?: string | null;
    subject_marks: { subject_id: number; obtained_marks: number | null; total_marks: number | null }[];
    grand_obtained: number;
    grand_total: number;
    position: number | null;
    ordinal_position: string | null;
    percentage: number | null;
    grade: string | null;
};

type SheetMeta = {
    term_id: number;
    term_name: string;
    year_name: string;
    class_id: number;
    class_name: string;
    section_id: number;
    section_name: string;
};

type SchoolInfo = {
    school_name?: string;
    school_address?: string;
    phone_number?: string;
    school_phone2?: string;
    school_phone3?: string;
    school_logo_url?: string;
};

type SheetPayload = {
    meta: SheetMeta;
    school: SchoolInfo;
    subjects: SubjectCol[];
    students: StudentRow[];
};

function esc(text: unknown) {
    return String(text ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function fmtN(v: number | null | undefined): string {
    if (v === null || v === undefined) return '';
    const n = Number(v);
    if (!Number.isFinite(n)) return '';
    return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.00$/, '');
}

const API_BASE_MS = `${process.env.NEXT_PUBLIC_API_URL || "https://shmool.onrender.com"}'}`;

function buildPrintHtml(payload: SheetPayload): string {
    const { meta, school, subjects, students } = payload;
    const schoolName = school.school_name || 'Smart School';
    const address = school.school_address || '';
    const phones = [school.phone_number, school.school_phone2, school.school_phone3].filter(Boolean).join(' | ');
    const rawLogo = school.school_logo_url || '';
    const logo = rawLogo ? (rawLogo.startsWith('http') ? rawLogo : `${API_BASE_MS}${rawLogo}`) : '';

    // grand total of total_marks across all subjects (any student with marks defines total per subject)
    const subjectTotalMap = new Map<number, number>();
    for (const student of students) {
        for (const sm of student.subject_marks) {
            if (sm.total_marks !== null && !subjectTotalMap.has(sm.subject_id)) {
                subjectTotalMap.set(sm.subject_id, sm.total_marks);
            }
        }
    }
    const overallTotal = subjects.reduce((sum, s) => sum + (subjectTotalMap.get(s.subject_id) || 0), 0);

    const theadCols = subjects.map(s => `<th>${esc(s.subject_name)}</th>`).join('');
    const tbodyRows = students.map((student, idx) => {
        const markCols = subjects.map(s => {
            const sm = student.subject_marks.find(m => m.subject_id === s.subject_id);
            return `<td class="center">${sm && sm.obtained_marks !== null ? esc(fmtN(sm.obtained_marks)) : ''}</td>`;
        }).join('');
        return `
            <tr>
                <td class="center">${esc(student.roll_no || String(idx + 1))}</td>
                <td class="name-col">${esc(`${student.first_name} ${student.last_name}`)}</td>
                ${markCols}
                <td class="center bold">${student.grand_total > 0 ? esc(fmtN(student.grand_obtained)) : ''}</td>
                <td class="center bold">${esc(student.ordinal_position || '')}</td>
            </tr>
        `;
    }).join('');

    return `<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<title>Marks Sheet – ${esc(meta.class_name)} ${esc(meta.section_name)}</title>
<style>
  @page { size: A4 landscape; margin: 8mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: "Times New Roman", serif; color: #000; background: #fff; font-size: 11pt; }

  /* Toolbar (hidden on print) */
  .toolbar {
    position: fixed; top: 0; left: 0; right: 0;
    background: #215E61; color: #fff;
    padding: 8px 16px; display: flex; align-items: center; gap: 12px;
    font-family: Arial, sans-serif; font-size: 13px; z-index: 9999;
  }
  .toolbar button {
    background: #FE7F2D; color: #fff; border: none;
    padding: 6px 20px; border-radius: 4px;
    font-size: 13px; font-weight: bold; cursor: pointer;
  }
  .toolbar button:hover { background: #c9621e; }
  @media print {
    .toolbar { display: none !important; }
    .page-wrap { padding-top: 0 !important; }
  }

  .page-wrap { padding-top: 46px; }

  /* Header */
  .school-header {
    display: flex; align-items: center; gap: 12px;
    border-bottom: 2px solid #000; padding-bottom: 6px; margin-bottom: 6px;
  }
  .school-logo { width: 90px; height: 90px; object-fit: contain; flex-shrink: 0; }
  .school-logo-placeholder { width: 90px; height: 90px; flex-shrink: 0; }
  .school-title { flex: 1; }
  .school-title h1 { font-size: 28pt; font-weight: 900; line-height: 1; }
  .school-title .addr { font-size: 11pt; margin-top: 2px; }

  .sheet-title { text-align: center; font-size: 14pt; font-weight: bold; margin: 8px 0 2px; }
  .sheet-meta { text-align: center; font-size: 11pt; margin-bottom: 8px; }
  .sheet-meta span { margin: 0 10px; }

  /* Table */
  table { width: 100%; border-collapse: collapse; font-size: 10pt; }
  th, td { border: 1px solid #000; padding: 4px 5px; vertical-align: middle; }
  th { font-weight: bold; text-align: center; background: #f5f5f5; }
  .roll-col { width: 38px; }
  .name-col { text-align: left; min-width: 100px; }
  .center { text-align: center; }
  .bold { font-weight: bold; }
  tbody tr:nth-child(even) { background: #fafafa; }
</style>
</head>
<body>
  <div class="toolbar">
    <span>📋 Marks Sheet ${esc(meta.class_name)} / ${esc(meta.section_name)} / ${esc(meta.term_name)} (${esc(meta.year_name)})</span>
    <button onclick="window.print()">🖨️ Print</button>
  </div>

  <div class="page-wrap">
    <div class="school-header">
      ${logo ? `<img src="${esc(logo)}" alt="logo" class="school-logo"/>` : '<div class="school-logo-placeholder"></div>'}
      <div class="school-title">
        <h1>${esc(schoolName)}</h1>
        ${address ? `<div class="addr">${esc(address)}</div>` : ''}
        ${phones ? `<div class="addr">${esc(phones)}</div>` : ''}
      </div>
    </div>

    <div class="sheet-title">Detailed Marks Sheet of Obtained Marks in Exam.</div>
    <div class="sheet-meta">
      <span><b>Class:</b> ${esc(meta.class_name)}</span>
      <span><b>Section:</b> ${esc(meta.section_name)}</span>
      <span><b>Exam Term:</b> ${esc(meta.term_name)}</span>
      <span><b>Year:</b> ${esc(meta.year_name)}</span>
      ${overallTotal > 0 ? `<span><b>Total Marks:</b> ${esc(String(overallTotal))}</span>` : ''}
    </div>

    <table>
      <thead>
        <tr>
          <th class="roll-col">Roll No</th>
          <th class="name-col">Name</th>
          ${theadCols}
          <th>Total Marks</th>
          <th>Position</th>
        </tr>
      </thead>
      <tbody>
        ${tbodyRows}
      </tbody>
    </table>
  </div>
</body>
</html>`;
}

export default function ClassMarksSheetPage() {
    const { user } = useAuth();

    const [loadingCtx, setLoadingCtx] = useState(true);
    const [loading, setLoading] = useState(false);
    const [printing, setPrinting] = useState(false);

    const [terms, setTerms] = useState<Term[]>([]);
    const [classes, setClasses] = useState<ClassItem[]>([]);
    const [sections, setSections] = useState<SectionItem[]>([]);
    const [activeYearName, setActiveYearName] = useState('');

    const [selectedTerm, setSelectedTerm] = useState('');
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedSection, setSelectedSection] = useState('');

    const [sheet, setSheet] = useState<SheetPayload | null>(null);
    const [msg, setMsg] = useState<{ type: 'success' | 'danger' | 'warning'; text: string } | null>(null);

    const canUsePage = !!user;

    const filteredSections = useMemo(() => {
        if (!selectedClass) return [];
        return sections.filter(s => s.class_id === Number(selectedClass));
    }, [sections, selectedClass]);

    const ready = !!(selectedTerm && selectedClass && selectedSection && user?.id);

    // ── context load ──────────────────────────────────────────────────────────
    const loadContext = async () => {
        if (!user?.id) { setLoadingCtx(false); return; }
        setLoadingCtx(true);
        setMsg(null);
        try {
            const r = await fetch(`${API}/exams/context?user_id=${user.id}`);
            const d = await r.json();
            if (!r.ok) throw new Error(d.error || 'Failed to load context');

            const nextTerms: Term[] = Array.isArray(d.terms) ? d.terms : [];
            const nextClasses: ClassItem[] = Array.isArray(d.classes) ? d.classes : [];
            const nextSections: SectionItem[] = Array.isArray(d.sections) ? d.sections : [];

            setTerms(nextTerms);
            setClasses(nextClasses);
            setSections(nextSections);
            setActiveYearName(d.active_year?.year_name || '');

            setSelectedTerm(prev =>
                prev && nextTerms.some(t => String(t.id) === prev) ? prev
                    : nextTerms.length > 0 ? String(nextTerms[0].id) : ''
            );
            setSelectedClass(prev =>
                prev && nextClasses.some(c => String(c.class_id) === prev) ? prev
                    : nextClasses.length > 0 ? String(nextClasses[0].class_id) : ''
            );
        } catch (e: any) {
            setMsg({ type: 'danger', text: e.message || 'Failed to load context' });
        } finally {
            setLoadingCtx(false);
        }
    };

    // ── marks sheet load ──────────────────────────────────────────────────────
    const loadSheet = async () => {
        if (!ready || !user?.id) return;
        setLoading(true);
        setSheet(null);
        setMsg(null);
        try {
            const params = new URLSearchParams({
                user_id: String(user.id),
                term_id: selectedTerm,
                class_id: selectedClass,
                section_id: selectedSection
            });
            const r = await fetch(`${API}/exams/class-marks-sheet?${params.toString()}`);
            const d = await r.json();
            if (!r.ok) throw new Error(d.error || 'Failed to load marks sheet');
            setSheet(d as SheetPayload);
        } catch (e: any) {
            setMsg({ type: 'danger', text: e.message || 'Failed to load marks sheet' });
        } finally {
            setLoading(false);
        }
    };

    // ── print ─────────────────────────────────────────────────────────────────
    const handlePrint = async () => {
        if (!ready || !user?.id) return;
        setPrinting(true);
        setMsg(null);
        try {
            const params = new URLSearchParams({
                user_id: String(user.id),
                term_id: selectedTerm,
                class_id: selectedClass,
                section_id: selectedSection
            });
            const r = await fetch(`${API}/exams/class-marks-sheet?${params.toString()}`);
            const d = await r.json();
            if (!r.ok) throw new Error(d.error || 'Failed to load marks sheet');

            const html = buildPrintHtml(d as SheetPayload);
            const win = window.open('', '_blank', 'width=1200,height=850');
            if (!win) {
                setMsg({ type: 'danger', text: 'Popup blocked. Please allow popups and try again.' });
                return;
            }
            win.document.open();
            win.document.write(html);
            win.document.close();
            win.focus();
        } catch (e: any) {
            setMsg({ type: 'danger', text: e.message || 'Print failed' });
        } finally {
            setPrinting(false);
        }
    };

    // ── effects ───────────────────────────────────────────────────────────────
    useEffect(() => { loadContext(); }, [user?.id]);

    useEffect(() => {
        setSelectedSection('');
        setSheet(null);
    }, [selectedClass]);

    useEffect(() => {
        setSheet(null);
    }, [selectedTerm, selectedSection]);

    useEffect(() => {
        if (filteredSections.length === 1 && !selectedSection) {
            setSelectedSection(String(filteredSections[0].section_id));
        }
    }, [filteredSections, selectedSection]);

    useEffect(() => {
        if (ready) loadSheet();
    }, [ready, selectedTerm, selectedClass, selectedSection]);

    if (!canUsePage) {
        return (
            <div className="container py-4">
                <div className="alert alert-danger">You do not have permission to access Class Marks Sheet.</div>
            </div>
        );
    }

    return (
        <div className="page-wrap" style={{ backgroundColor: 'var(--bg-main)', minHeight: '100vh' }}>
            {/* Page Header */}
            <div className="d-flex align-items-center justify-content-between mb-4">
                <div>
                    <h4 className="mb-1 fw-bold" style={{ color: 'var(--primary-dark)' }}>
                        <i className="bi bi-table me-2" style={{ color: 'var(--accent-orange)' }} />
                        Class Marks Sheet
                    </h4>
                    <div className="text-muted small">Detailed marks sheet for selected term, class and section</div>
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

            {/* Filters */}
            <div className="card border-0 shadow-sm mb-4">
                <div className="card-header bg-white border-bottom py-3" style={{ borderLeft: '4px solid var(--primary-teal)' }}>
                    <h6 className="mb-0 fw-bold" style={{ color: 'var(--primary-dark)' }}>
                        <i className="bi bi-funnel-fill me-2" style={{ color: 'var(--primary-teal)' }} />
                        Filter Marks Sheet
                    </h6>
                </div>
                <div className="card-body">
                    <div className="row g-3 align-items-end">
                        <div className="col-md-3">
                            <label className="form-label fw-semibold">Term</label>
                            <select className="form-select" value={selectedTerm}
                                onChange={e => setSelectedTerm(e.target.value)} disabled={loadingCtx}>
                                <option value="">Select Term</option>
                                {terms.map(t => <option key={t.id} value={t.id}>{t.term_name}</option>)}
                            </select>
                        </div>
                        <div className="col-md-3">
                            <label className="form-label fw-semibold">Class</label>
                            <select className="form-select" value={selectedClass}
                                onChange={e => setSelectedClass(e.target.value)} disabled={loadingCtx}>
                                <option value="">Select Class</option>
                                {classes.map(c => <option key={c.class_id} value={c.class_id}>{c.class_name}</option>)}
                            </select>
                        </div>
                        <div className="col-md-3">
                            <label className="form-label fw-semibold">Section</label>
                            <select className="form-select" value={selectedSection}
                                onChange={e => setSelectedSection(e.target.value)}
                                disabled={!selectedClass || loadingCtx}>
                                <option value="">Select Section</option>
                                {filteredSections.map(s => (
                                    <option key={s.section_id} value={s.section_id}>{s.section_name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="col-md-3 d-flex gap-2 flex-wrap align-items-end">
                            <button className="btn btn-primary-custom fw-bold" onClick={loadSheet}
                                disabled={!ready || loading || loadingCtx}>
                                {loading
                                    ? <><span className="spinner-border spinner-border-sm me-2" />Loading...</>
                                    : 'Load Sheet'}
                            </button>
                            <button className="btn btn-secondary-custom" onClick={loadContext} disabled={loadingCtx}>
                                Refresh
                            </button>
                            <button className="btn btn-outline-success fw-bold" onClick={handlePrint}
                                disabled={!ready || printing || loadingCtx}>
                                {printing
                                    ? <><span className="spinner-border spinner-border-sm me-2" />Opening...</>
                                    : <><i className="bi bi-printer me-1" />Print</>}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sheet Preview */}
            {ready && (
                <div className="card border-0 shadow-sm">
                    <div className="card-header bg-white border-bottom d-flex justify-content-between align-items-center"
                        style={{ borderLeft: '4px solid var(--accent-orange)' }}>
                        <div className="fw-semibold" style={{ color: 'var(--primary-dark)' }}>
                            {loading ? 'Loading...' : sheet
                                ? `${sheet.meta.class_name} meta.section_name} — ${sheet.meta.term_name}  (${sheet.students.length} students, ${sheet.subjects.length} subjects)`
                                : 'Marks Sheet'}
                        </div>
                        {sheet && !loading && (
                            <button className="btn btn-outline-success btn-sm fw-bold" onClick={handlePrint} disabled={printing}>
                                {printing ? 'Opening...' : <><i className="bi bi-printer me-1" />Print Sheet</>}
                            </button>
                        )}
                    </div>

                    <div className="card-body p-0">
                        {loading ? (
                            <div className="py-5 text-center text-muted">
                                <span className="spinner-border me-2" />Loading marks sheet…
                            </div>
                        ) : !sheet ? (
                            <div className="py-5 text-center text-muted">Select term, class and section to view the marks sheet.</div>
                        ) : sheet.students.length === 0 ? (
                            <div className="py-5 text-center text-muted">No active students found for selected filters.</div>
                        ) : (
                            <div className="table-responsive">
                                <table className="table table-bordered table-sm align-middle mb-0" style={{ fontSize: '0.85rem' }}>
                                    <thead>
                                        <tr style={{ background: 'var(--primary-dark)', color: '#fff' }}>
                                            <th style={{ width: 60 }} className="text-center">Roll No</th>
                                            <th style={{ minWidth: 160 }}>Student Name</th>
                                            {sheet.subjects.map(s => (
                                                <th key={s.subject_id} className="text-center" style={{ minWidth: 80 }}>
                                                    {s.subject_name}
                                                </th>
                                            ))}
                                            <th className="text-center" style={{ minWidth: 90 }}>Total Marks</th>
                                            <th className="text-center" style={{ minWidth: 80 }}>Position</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sheet.students.map((student, idx) => (
                                            <tr key={student.student_id}>
                                                <td className="text-center">{student.roll_no || idx + 1}</td>
                                                <td className="fw-semibold">
                                                    {student.first_name} {student.last_name}
                                                </td>
                                                {sheet.subjects.map(s => {
                                                    const sm = student.subject_marks.find(m => m.subject_id === s.subject_id);
                                                    return (
                                                        <td key={s.subject_id} className="text-center">
                                                            {sm && sm.obtained_marks !== null ? fmtN(sm.obtained_marks) : ''}
                                                        </td>
                                                    );
                                                })}
                                                <td className="text-center fw-bold">
                                                    {student.grand_total > 0 ? fmtN(student.grand_obtained) : ''}
                                                </td>
                                                <td className="text-center">
                                                    {student.ordinal_position
                                                        ? <span className="badge fw-bold"
                                                            style={{ backgroundColor: 'var(--primary-teal)', color: '#fff' }}>
                                                            {student.ordinal_position}
                                                          </span>
                                                        : <span className="text-muted">—</span>}
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


