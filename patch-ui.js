const fs = require('fs');

const files = [
    'client/components/dashboards/StudentDashboard.tsx',
    'client/app/students/profile/[id]/page.tsx'
];

for (const file of files) {
    if (!fs.existsSync(file)) continue;
    let code = fs.readFileSync(file, 'utf-8');

    // 1. Add states
    if (!code.includes('const [familySlips, setFamilySlips] = useState<any[]>([])')) {
        const feeStatesHook = \const [admissionFee, setAdmissionFee] = useState<any>(null);\;
        code = code.replace(feeStatesHook, \\$&\n    const [familySlips, setFamilySlips] = useState<any[]>([]);\n    const [loadingFamilySlips, setLoadingFamilySlips] = useState(false);\);
    }

    // 2. Add fetch function
    if (!code.includes('const fetchFamilySlips = async () => {')) {
        const fetchAdHook = \const fetchAdmissionFee = async () => {\;
        const newFn = \
    const fetchFamilySlips = async () => {
        if (!currentId) return;
        setLoadingFamilySlips(true);
        try {
            const res = await fetch(\\\\/fee-slips/family-summary/\\\\);
            const data = await res.json();
            if (res.ok) setFamilySlips(data.slips || []);
        } catch (e) {
            console.error(e);
        }
        setLoadingFamilySlips(false);
    };

    \;
        code = code.replace(fetchAdHook, newFn + fetchAdHook);
    }

    // 3. Call inside useEffect
    if (!code.includes('fetchFamilySlips();')) {
        code = code.replace('fetchAdmissionFee();', 'fetchAdmissionFee();\n        fetchFamilySlips();');
    }

    // 4. Add UI block in Fees Tab
    // We look for {/* Opening Balance (OPB) Section */} and insert before it
    if (!code.includes('Family Fee History')) {
        const beforeOPB = \{/* Opening Balance (OPB) Section */}\;
        
        const uiBlock = \
                                {/* Family Monthly Fee Slips */}
                                {activeTab === 'fees' && (
                                    <div className="card border-0 shadow-sm rounded-4 mt-4 overflow-hidden animate__animated animate__fadeInUp">
                                        <div className="card-header py-3 d-flex justify-content-between align-items-center" style={{ backgroundColor: 'white', borderLeft: '4px solid var(--primary-teal)' }}>
                                            <h6 className="fw-bold mb-0" style={{ color: 'var(--primary-dark)' }}>
                                                <i className="bi bi-calendar-check me-2" style={{ color: 'var(--primary-teal)' }}></i>
                                                Family Fee History (Current Year)
                                            </h6>
                                        </div>
                                        <div className="card-body p-0">
                                            {loadingFamilySlips ? (
                                                <div className="p-4 text-center">
                                                    <span className="spinner-border spinner-border-sm text-primary"></span> <span className="ms-2">Loading fees...</span>
                                                </div>
                                            ) : familySlips.length === 0 ? (
                                                <div className="p-4 text-center text-muted">No fee records found for this family.</div>
                                            ) : (
                                                <div className="table-responsive">
                                                    <table className="table table-hover align-middle mb-0">
                                                        <thead style={{ backgroundColor: 'rgba(35,61,77,0.05)' }}>
                                                            <tr>
                                                                <th className="ps-4">Month/Year</th>
                                                                <th>Students / Heads Applied</th>
                                                                <th className="text-end">Billed</th>
                                                                <th className="text-end">Paid</th>
                                                                <th className="text-center pe-4">Status</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {familySlips.map((monthSlip, idx) => (
                                                                <tr key={idx}>
                                                                    <td className="ps-4 fw-bold text-dark">
                                                                        {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][monthSlip.month - 1]} {monthSlip.year}
                                                                    </td>
                                                                    <td>
                                                                        <div className="d-flex flex-column gap-2">
                                                                            {monthSlip.students.map((st: any, i: number) => (
                                                                                <div key={i} className="d-flex justify-content-between bg-light p-2 rounded-3 border">
                                                                                    <div>
                                                                                        <span className="fw-semibold text-dark mx-1 text-uppercase" style={{fontSize: '0.8rem'}}>{st.admission_no}</span>
                                                                                        <span className="fw-bold text-primary" style={{fontSize: '0.8rem'}}>&bull; {st.name}</span>
                                                                                        <div className="text-muted" style={{fontSize: '0.75rem'}}>
                                                                                            {st.heads?.map((h: any) => \\\\ (\\\)\\\).join(', ') || 'No heads'}
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </td>
                                                                    <td className="text-end fw-semibold" style={{ color: 'var(--primary-dark)' }}>{fmt(monthSlip.family_total_billed)}</td>
                                                                    <td className="text-end fw-bold" style={{ color: '#0d9e6e' }}>{fmt(monthSlip.family_total_paid)}</td>
                                                                    <td className="text-center pe-4">
                                                                        <span className={\\\adge px-2 py-1 \\\\\\}>
                                                                            {monthSlip.status.toUpperCase()}
                                                                        </span>
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

                                \;
        code = code.replace(beforeOPB, uiBlock + beforeOPB);
    }

    fs.writeFileSync(file, code);
    console.log('Patched', file);
}
