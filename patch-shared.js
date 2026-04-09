const fs = require('fs');

let c = fs.readFileSync('client/components/dashboards/shared.tsx', 'utf8');

const startStr = 'export function DonutRing({';
const endStr = '  );\r\n}\r\n\r\n// Page Shell';

const startIdx = c.indexOf(startStr);
const endIdx = c.indexOf(endStr);

if (startIdx !== -1 && endIdx !== -1) {
  const newCode = `export function DonutRing({
  present, absent, late, total, label, color,
}: {
  present:number; absent:number; late:number; total:number; label:string; color:string;
}) {
  const [popup, setPopup] = useState<{ isOpen: boolean, type: string, status: string }>({ isOpen: false, type: '', status: '' });
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const pct  = total > 0 ? Math.round((present / total) * 100) : 0;
  const r    = 44, sw = 9, circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;

  const handleOpen = (status: string) => {
    const type = label.toLowerCase().includes('staff') ? 'staff' : 'student';
    setPopup({ isOpen: true, type, status });
    setLoading(true);
    fetch(\`\${API}/dashboard/attendance-details?type=\${type}&status=\${status}\`)
      .then(res => res.json())
      .then(d => { setData(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(e => { console.error(e); setLoading(false); });
  };

  const getWaLink = (phone: string) => {
    if (!phone) return '#';
    const cleaned = phone.replace(/\\D/g, ''); 
    const finalPhone = cleaned.startsWith('0') ? \`92\${cleaned.substring(1)}\` : cleaned;
    return \`https://wa.me/\${finalPhone}\`;
  }

  return (
    <>
      <div style={{ display:'flex', flexDirection:'column' as const, alignItems:'center', gap:10 }}>
        <div style={{ position:'relative' as const, width:108, height:108 }}>
          <svg width={108} height={108} style={{ transform:'rotate(-90deg)' }}>
            <circle cx={54} cy={54} r={r} fill="none" stroke="#f1f5f9" strokeWidth={sw} /> 
            <circle cx={54} cy={54} r={r} fill="none" stroke={color} strokeWidth={sw}      
              strokeDasharray={dash + ' ' + (circ - dash)} strokeLinecap="round"
              style={{ transition:'stroke-dasharray 1s ease' }} />
          </svg>
          <div style={{
            position:'absolute' as const, inset:0, display:'flex',
            flexDirection:'column' as const, alignItems:'center', justifyContent:'center', gap:1,
          }}>
            <span style={{ fontSize:22, fontWeight:800, color:'#1a2e3b', lineHeight:1 }}>{pct}%</span>
            <span style={{ fontSize:10, color:'#94a3b8', fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.05em' }}>rate</span>
          </div>
        </div>
        <div style={{ textAlign:'center' as const }}>
          <div style={{ fontWeight:700, fontSize:13, color:'#1a2e3b', marginBottom:6 }}>{label}</div>
          <div style={{ display:'flex', gap:7, justifyContent:'center' }}>
            <span onClick={() => handleOpen('Present')} title="Click to view details" style={{ cursor:'pointer', background:'#16a34a1a', color:'#16a34a', borderRadius:20, padding:'3px 9px', fontSize:11, fontWeight:700, transition:'0.2s' }}>P {present}</span>
            <span onClick={() => handleOpen('Absent')} title="Click to view details" style={{ cursor:'pointer', background:'#dc26261a', color:'#dc2626', borderRadius:20, padding:'3px 9px', fontSize:11, fontWeight:700, transition:'0.2s' }}>A {absent}</span>
            <span onClick={() => handleOpen('Late')} title="Click to view details" style={{ cursor:'pointer', background:'#d976061a', color:'#d97706', borderRadius:20, padding:'3px 9px', fontSize:11, fontWeight:700, transition:'0.2s' }}>L {late}</span>
          </div>
        </div>
      </div>

      {popup.isOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
        }}>
          <div style={{
            background: '#ffffff', borderRadius: 16, width: '100%', maxWidth: 650,
            maxHeight: '85vh', display: 'flex', flexDirection: 'column',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)', overflow: 'hidden'
          }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background:'#f8fafc' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                 <div style={{ width:40, height:40, borderRadius:'50%', background: popup.status === 'Present' ? '#16a34a1a' : popup.status === 'Absent' ? '#dc26261a' : '#d976061a', color: popup.status === 'Present' ? '#16a34a' : popup.status === 'Absent' ? '#dc2626' : '#d97706', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>
                    <i className={popup.status === 'Present' ? "bi bi-check2-circle" : popup.status === 'Absent' ? "bi bi-x-circle" : "bi bi-clock-history"} />
                 </div>
                 <div>
                    <h2 style={{ margin: 0, fontSize: 18, color: '#0f172a', fontWeight:800 }}>
                      {popup.status} {label}
                    </h2>
                    <div style={{ fontSize:12, color:'#64748b', fontWeight:600, marginTop:2 }}>
                       {loading ? 'Fetching records...' : \`Total: \${data.length} records found\`}
                    </div>
                 </div>
              </div>
              <button onClick={() => setPopup({ ...popup, isOpen: false })} style={{ background: '#f1f5f9', border: 'none', width:36, height:36, borderRadius:'50%', cursor: 'pointer', color: '#64748b', display:'flex', alignItems:'center', justifyContent:'center', transition:'background 0.2s' }}>
                 <i className="bi bi-x-lg" style={{ fontSize:16, fontWeight:800 }} />
              </button>
            </div>
            
            <div style={{ padding: 24, overflowY: 'auto', flex: 1, background: '#f8fafc' }}>
              {loading ? (
                 <div style={{ textAlign: 'center', padding: 50, color: '#64748b' }}>
                    <div className="spinner-border spinner-border-sm" style={{ width: '2rem', height: '2rem', borderWidth:'0.2em', color:'#2563eb', marginBottom:16 }} />
                    <div>Loading records...</div>
                 </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {data.map((item, i) => (
                      <div key={i} style={{ 
                        background: '#fff', padding: '16px 20px', borderRadius: 12, border: '1px solid #e2e8f0',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                      }}>
                        <div>
                          <div style={{ fontWeight: 800, color: '#0f172a', fontSize: 15, marginBottom: 6 }}>{item.name}</div>
                          
                          <div style={{ fontSize: 13, color: '#475569', display: 'flex', flexWrap:'wrap', gap: '4px 16px' }}>
                             
                             {item.class_name && (
                               <span style={{ display:'flex', alignItems:'center', gap:5 }}>
                                 <i className="bi bi-mortarboard" style={{ color:'#94a3b8' }} /> 
                                 <span style={{ fontWeight:600 }}>{item.class_name} {item.section_name ? \`(\${item.section_name})\`:''}</span>
                               </span>
                             )}
                             
                             <span style={{ display:'flex', alignItems:'center', gap:5 }}>
                               <i className="bi bi-person-heart" style={{ color:'#94a3b8' }} /> 
                               <span style={{ fontWeight:600 }}>{item.guardian || (popup.type === 'staff' ? 'Staff' : 'N/A')}</span>
                             </span>
                             
                             <span style={{ display:'flex', alignItems:'center', gap:5 }}>
                               <i className="bi bi-telephone-fill" style={{ color:'#94a3b8' }} /> 
                               <span style={{ fontWeight:600, color:'#334155' }}>{item.phone || 'No phone'}</span>
                             </span>
                             
                          </div>
                        </div>

                        {item.phone && (
                          <a href={getWaLink(item.phone)} target="_blank" rel="noreferrer" style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            width: 44, height: 44, borderRadius: '50%', background: '#25D366', color: '#fff',
                            textDecoration: 'none', flexShrink: 0, boxShadow:'0 4px 10px rgba(37,211,102,0.3)',
                            transform: 'scale(1)', transition: 'all 0.2s', alignSelf:'flex-start'
                          }} title="Message on WhatsApp"
                          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.boxShadow = '0 6px 14px rgba(37,211,102,0.4)'; }}
                          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 10px rgba(37,211,102,0.3)'; }}>
                            <i className="bi bi-whatsapp" style={{ fontSize: 22 }} />
                          </a>
                        )}
                      </div>
                  ))}
                  {data.length === 0 && (
                     <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px 20px', background:'#fff', borderRadius:12, border:'1px dashed #cbd5e1' }}>
                       <i className="bi bi-inbox" style={{ fontSize:40, color:'#cbd5e1', display:'block', marginBottom:12 }} />
                       No records found for this status.
                     </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
`;

  const firstPart = c.substring(0, startIdx);
  const lastPart = c.substring(endIdx + 4);
  fs.writeFileSync('client/components/dashboards/shared.tsx', firstPart + newCode + lastPart, 'utf8');
  console.log('Replaced DonutRing successfully!');
} else {
  console.log('Start or end strings not found:', startIdx, endIdx);
}
