'use client';
import React, { useState } from 'react';

// Constants
export const API    = 'https://shmool.onrender.com';
export const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export function fmt(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1)     + 'K';
  return String(n);
}
export function fmtPKR(n: number) {
  return 'Rs ' + Number(n).toLocaleString('en-PK', { maximumFractionDigits: 0 });
}

export function MaskedAmount({ amount }: { amount: number | string }) {
  const [show, setShow] = useState(false);
  const numericAmount = typeof amount === 'string' ? parseFloat(amount.replace(/[^0-9.-]+/g,"")) : amount;
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span>{show ? fmtPKR(numericAmount) : 'Rs *****'}</span>
      <i 
        className={show ? "bi bi-eye-slash" : "bi bi-eye"} 
        style={{ cursor: 'pointer', color: '#94a3b8', fontSize: '0.85em' }}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShow(!show); }}
      />
    </div>
  );
}

export const C = {
  dark:   '#233D4D',
  teal:   '#215E61',
  orange: '#FE7F2D',
  green:  '#16a34a',
  red:    '#dc2626',
  amber:  '#d97706',
  purple: '#7c3aed',
  indigo: '#4f46e5',
  bg:     '#F5FBE6',
};

// Stat Card
export function StatCard({
  icon, label, value, sub, accent,
}: {
  icon: string; label: string; value: React.ReactNode;
  sub?: React.ReactNode; color?: string; accent: string;
}) {
  return (
    <div style={{
      background: '#fff',
      borderRadius: 18,
      padding: '22px 24px 20px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06),0 4px 20px rgba(35,61,77,0.07)',
      border: '1px solid #f1f5f9',
      borderLeft: '4px solid ' + accent,
      display: 'flex',
      flexDirection: 'column' as const,
      gap: 14,
      transition: 'box-shadow 0.2s,transform 0.2s',
    }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.boxShadow = '0 8px 30px rgba(35,61,77,0.13)';
        el.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06),0 4px 20px rgba(35,61,77,0.07)';
        el.style.transform = 'none';
      }}
    >
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
        <div style={{ fontSize:11, fontWeight:700, color:'#64748b', textTransform:'uppercase' as const, letterSpacing:'0.07em' }}>{label}</div>
        <div style={{
          width:36, height:36, borderRadius:10,
          background: accent + '1a',
          display:'flex', alignItems:'center', justifyContent:'center',
        }}>
          <i className={'bi ' + icon} style={{ fontSize:17, color: accent }} />
        </div>
      </div>
      <div>
        <div style={{ fontSize:30, fontWeight:800, color:'#1a2e3b', lineHeight:1, letterSpacing:'-0.02em' }}>{value}</div>
        {sub && <div style={{ fontSize:12, color:'#94a3b8', marginTop:5, fontWeight:500 }}>{sub}</div>}
      </div>
    </div>
  );
}

// Panel (ChartCard)
export function Panel({
  title, icon, children, action, noPad,
}: {
  title: string; icon?: string; children: React.ReactNode;
  action?: React.ReactNode; noPad?: boolean;
}) {
  return (
    <div style={{
      background:'#fff', borderRadius:18,
      boxShadow:'0 1px 3px rgba(0,0,0,0.05),0 4px 20px rgba(35,61,77,0.06)',
      border:'1px solid #f1f5f9', overflow:'hidden',
      display:'flex', flexDirection:'column' as const,
    }}>
      <div style={{
        display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'15px 22px',
        borderBottom:'1px solid #f1f5f9',
        background:'linear-gradient(135deg,#fafcff 0%,#f8fdf7 100%)',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:9 }}>
          {icon && (
            <div style={{
              width:28, height:28, borderRadius:8, background:'rgba(254,127,45,0.12)',
              display:'flex', alignItems:'center', justifyContent:'center',
            }}>
              <i className={'bi ' + icon} style={{ fontSize:13, color:'#FE7F2D' }} />
            </div>
          )}
          <span style={{ fontWeight:700, fontSize:14, color:'#1a2e3b', letterSpacing:'-0.01em' }}>{title}</span>
        </div>
        {action}
      </div>
      <div style={{ padding: noPad ? 0 : '18px 22px', flex:1 }}>{children}</div>
    </div>
  );
}
export const ChartCard = Panel;

// Donut Ring
export function DonutRing({
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
    fetch(`${API}/dashboard/attendance-details?type=${type}&status=${status}`)
      .then(res => res.json())
      .then(d => { setData(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(e => { console.error(e); setLoading(false); });
  };

  const getWaLink = (phone: string) => {
    if (!phone) return '#';
    const cleaned = phone.replace(/\D/g, ''); 
    const finalPhone = cleaned.startsWith('0') ? `92${cleaned.substring(1)}` : cleaned;
    return `https://wa.me/${finalPhone}`;
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
                       {loading ? 'Fetching records...' : `Total: ${data.length} records found`}
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
                                 <span style={{ fontWeight:600 }}>{item.class_name} {item.section_name ? `(${item.section_name})`:''}</span>
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

// Page Shell
export function DashShell({
  children, title, subtitle, actions, greeting,
}: {
  children: React.ReactNode; title: string;
  subtitle?: string; actions?: React.ReactNode; greeting?: string;
}) {
  return (
    <div style={{ minHeight:'100vh', background:'#eef5ec', padding:'0 0 48px' }}>
      <div className="dash-hero" style={{
        background:'linear-gradient(135deg,#233D4D 0%,#215E61 100%)',
        padding:'30px 36px 88px',
        position:'relative' as const, overflow:'hidden',
      }}>
        <div style={{ position:'absolute' as const, top:-70, right:-70, width:260, height:260, borderRadius:'50%', background:'rgba(255,255,255,0.04)', pointerEvents:'none' as const }} />
        <div style={{ position:'absolute' as const, bottom:-90, right:180, width:220, height:220, borderRadius:'50%', background:'rgba(255,255,255,0.03)', pointerEvents:'none' as const }} />
        <div style={{ position:'absolute' as const, top:24, left:'42%', width:140, height:140, borderRadius:'50%', background:'rgba(254,127,45,0.07)', pointerEvents:'none' as const }} />
        <div style={{ position:'relative' as const, zIndex:1, display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap' as const, gap:16 }}>
          <div style={{ minWidth:0, flex:1 }}>
            {greeting && <div style={{ fontSize:13, color:'rgba(255,255,255,0.6)', fontWeight:500, marginBottom:5 }}>{greeting}</div>}
            <h1 style={{ fontSize:26, fontWeight:800, color:'#fff', margin:0, letterSpacing:'-0.02em' }}>{title}</h1>
            {subtitle && (
              <div style={{ fontSize:13, color:'rgba(255,255,255,0.55)', marginTop:6, display:'flex', alignItems:'center', gap:6 }}>
                <i className="bi bi-calendar3" style={{ fontSize:11 }} />{subtitle}
              </div>
            )}
          </div>
          {actions && <div style={{ display:'flex', gap:10, flexWrap:'wrap' as const }}>{actions}</div>}
        </div>
      </div>
      <div className="dash-content" style={{ padding:'0 28px', marginTop:-58, position:'relative' as const, zIndex:2 }}>
        {children}
      </div>
    </div>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize:11, fontWeight:800, color:'#94a3b8', textTransform:'uppercase' as const, letterSpacing:'0.09em', marginBottom:10, marginTop:8 }}>
      {children}
    </div>
  );
}

export function DashLoading() {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'65vh' }}>
      <div style={{ textAlign:'center' as const }}>
        <div style={{ position:'relative' as const, width:64, height:64, margin:'0 auto 20px' }}>
          <div style={{ position:'absolute' as const, inset:0, borderRadius:'50%', border:'4px solid #215E6120', borderTopColor:'#FE7F2D', animation:'dspin 0.85s linear infinite' }} />
          <div style={{ position:'absolute' as const, inset:8, borderRadius:'50%', border:'3px solid #FE7F2D20', borderTopColor:'#215E61', animation:'dspin 1.1s linear infinite reverse' }} />
          <div style={{ position:'absolute' as const, inset:18, borderRadius:'50%', background:'#233D4D12', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <i className="bi bi-mortarboard-fill" style={{ color:'#233D4D80', fontSize:13 }} />
          </div>
        </div>
        <div style={{ fontWeight:700, color:'#233D4D', fontSize:15 }}>Loading dashboard</div>
        <div style={{ fontSize:12, color:'#94a3b8', marginTop:4 }}>Fetching latest data…</div>
        <style dangerouslySetInnerHTML={{__html:'@keyframes dspin{to{transform:rotate(360deg)}}'}} />
      </div>
    </div>
  );
}

export function DashError({ msg }: { msg: string }) {
  return (
    <div style={{ margin:'24px 0', padding:'20px 24px', background:'#fef2f2', border:'1px solid #fecaca', borderRadius:14, display:'flex', gap:14, alignItems:'flex-start' }}>
      <i className="bi bi-exclamation-triangle-fill" style={{ fontSize:24, color:'#dc2626', flexShrink:0, marginTop:2 }} />
      <div>
        <div style={{ fontWeight:700, color:'#dc2626', fontSize:14, marginBottom:3 }}>Failed to load dashboard</div>
        <div style={{ fontSize:13, color:'#6b7280' }}>{msg}</div>
      </div>
    </div>
  );
}

export function EmptyChart({ text = 'No data available' }: { text?: string }) {
  return (
    <div style={{ display:'flex', flexDirection:'column' as const, alignItems:'center', justifyContent:'center', padding:'52px 20px', color:'#cbd5e1', gap:10 }}>
      <i className="bi bi-bar-chart" style={{ fontSize:40 }} />
      <div style={{ fontSize:13, fontWeight:600, color:'#94a3b8' }}>{text}</div>
    </div>
  );
}

export function RecentPaymentsTable({ rows }: { rows: any[] }) {
  if (rows.length === 0) {
    return (
      <div style={{ textAlign:'center' as const, padding:'32px 0', color:'#94a3b8', fontSize:13 }}>
        <i className="bi bi-inbox" style={{ fontSize:30, display:'block', marginBottom:8 }} />
        No recent payments
      </div>
    );
  }
  return (
    <div style={{ overflowX:'auto' as const }}>
      <table style={{ width:'100%', borderCollapse:'collapse' as const, fontSize:13 }}>
        <thead>
          <tr>
            {['Student','Class','Month','Amount','Method','Date'].map(h => (
              <th key={h} style={{
                padding:'9px 14px', textAlign:'left' as const,
                color:'#64748b', fontWeight:700, fontSize:11,
                textTransform:'uppercase' as const, letterSpacing:'0.05em',
                borderBottom:'2px solid #f1f5f9', whiteSpace:'nowrap' as const,
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((p: any, i: number) => (
            <tr key={p.payment_id ?? i}
              style={{ borderBottom:'1px solid #f8fafc', transition:'background 0.15s' }}
              onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background='#f8fdf7';}}
              onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background='transparent';}}
            >
              <td style={{ padding:'11px 14px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:9 }}>
                  <div style={{
                    width:32, height:32, borderRadius:10, flexShrink:0,
                    background:'linear-gradient(135deg,#215E61,#233D4D)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:12, fontWeight:800, color:'#fff',
                  }}>
                    {(p.student_name||'?').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight:700, color:'#1a2e3b', fontSize:13 }}>{p.student_name}</div>
                    <div style={{ fontSize:11, color:'#94a3b8' }}>{p.admission_no}</div>
                  </div>
                </div>
              </td>
              <td style={{ padding:'11px 14px', color:'#475569' }}>{p.class_name||'â€”'}</td>
              <td style={{ padding:'11px 14px', color:'#475569' }}>{MONTHS[(p.month||1)-1]} {p.year}</td>
              <td style={{ padding:'11px 14px' }}>
                <span style={{ fontWeight:800, color:'#16a34a' }}><MaskedAmount amount={p.amount_paid} /></span>
              </td>
              <td style={{ padding:'11px 14px' }}>
                <span style={{
                  padding:'4px 10px', borderRadius:20, fontSize:11, fontWeight:700, textTransform:'capitalize' as const,
                  background: p.payment_method==='cash' ? '#16a34a1a' : '#4f46e51a',
                  color:      p.payment_method==='cash' ? '#16a34a'   : '#4f46e5',
                }}>{p.payment_method||'cash'}</span>
              </td>
              <td style={{ padding:'11px 14px', color:'#94a3b8', fontSize:12 }}>
                {new Date(p.payment_date).toLocaleDateString('en-US',{month:'short',day:'numeric'})}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
