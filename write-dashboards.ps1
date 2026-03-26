# ── shared.tsx ─────────────────────────────────────────────────────────────
$shared = @"
import React from 'react';

// Constants
export const API    = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';
export const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export function fmt(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1)     + 'K';
  return String(n);
}
export function fmtPKR(n: number) {
  return 'Rs ' + Number(n).toLocaleString('en-PK', { maximumFractionDigits: 0 });
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
  icon: string; label: string; value: string;
  sub?: string; color?: string; accent: string;
}) {
  return (
    <div style={{
      background: '#fff',
      borderRadius: 18,
      padding: '22px 24px 20px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06),0 4px 20px rgba(35,61,77,0.07)',
      border: '1px solid #f1f5f9',
      borderLeft: `4px solid ` + accent,
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
          <i className={`bi ` + icon} style={{ fontSize:17, color: accent }} />
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
              <i className={`bi ` + icon} style={{ fontSize:13, color:'#FE7F2D' }} />
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
  const pct  = total > 0 ? Math.round((present / total) * 100) : 0;
  const r    = 44, sw = 9, circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
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
          <span style={{ background:'#16a34a1a', color:'#16a34a', borderRadius:20, padding:'3px 9px', fontSize:11, fontWeight:700 }}>P {present}</span>
          <span style={{ background:'#dc26261a', color:'#dc2626', borderRadius:20, padding:'3px 9px', fontSize:11, fontWeight:700 }}>A {absent}</span>
          <span style={{ background:'#d976061a', color:'#d97706', borderRadius:20, padding:'3px 9px', fontSize:11, fontWeight:700 }}>L {late}</span>
        </div>
      </div>
    </div>
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
      <div style={{
        background:'linear-gradient(135deg,#233D4D 0%,#215E61 100%)',
        padding:'30px 36px 88px',
        position:'relative' as const, overflow:'hidden',
      }}>
        <div style={{ position:'absolute' as const, top:-70, right:-70, width:260, height:260, borderRadius:'50%', background:'rgba(255,255,255,0.04)', pointerEvents:'none' as const }} />
        <div style={{ position:'absolute' as const, bottom:-90, right:180, width:220, height:220, borderRadius:'50%', background:'rgba(255,255,255,0.03)', pointerEvents:'none' as const }} />
        <div style={{ position:'absolute' as const, top:24, left:'42%', width:140, height:140, borderRadius:'50%', background:'rgba(254,127,45,0.07)', pointerEvents:'none' as const }} />
        <div style={{ position:'relative' as const, zIndex:1, display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap' as const, gap:16 }}>
          <div>
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
      <div style={{ padding:'0 28px', marginTop:-58, position:'relative' as const, zIndex:2 }}>
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
        <style>{`@keyframes dspin{to{transform:rotate(360deg)}}`}</style>
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
              <td style={{ padding:'11px 14px', color:'#475569' }}>{p.class_name||'—'}</td>
              <td style={{ padding:'11px 14px', color:'#475569' }}>{MONTHS[(p.month||1)-1]} {p.year}</td>
              <td style={{ padding:'11px 14px' }}>
                <span style={{ fontWeight:800, color:'#16a34a' }}>{fmtPKR(parseFloat(p.amount_paid))}</span>
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
"@

# ── AdminDashboard.tsx ─────────────────────────────────────────────────────
$admin = @"
'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  API, MONTHS, fmt, fmtPKR, C,
  StatCard, Panel, DonutRing, DashShell, DashLoading, DashError, EmptyChart, RecentPaymentsTable,
} from './shared';

type AdminData = {
  stats: {
    total_students:number; total_staff:number; total_classes:number;
    pending_fees:number; this_month_collected:number; today_collected:number;
  };
  today_student_att: { present:number; absent:number; late:number; on_leave:number; total:number };
  today_staff_att:   { present:number; absent:number; late:number; total:number };
  fee_chart:         { date:string; label:string; amount:number }[];
  student_att_chart: { date:string; label:string; present:number; absent:number; late:number }[];
  staff_att_chart:   { date:string; label:string; present:number; absent:number; late:number }[];
  recent_payments:   any[];
};

const CUSTOM_TOOLTIP = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'#fff', border:'1px solid #f1f5f9', borderRadius:12, padding:'10px 16px', boxShadow:'0 8px 24px rgba(0,0,0,0.1)' }}>
      <div style={{ fontSize:12, color:'#64748b', fontWeight:600, marginBottom:4 }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ fontSize:14, fontWeight:700, color:p.color }}>
          {p.name}: {p.name==='Collected' ? fmtPKR(p.value) : p.value}
        </div>
      ))}
    </div>
  );
};

function ActionBtn({ href, icon, label, primary }: { href:string; icon:string; label:string; primary?:boolean }) {
  const bg   = primary ? C.orange : 'rgba(255,255,255,0.15)';
  const bdr  = primary ? 'none'   : '1px solid rgba(255,255,255,0.25)';
  return (
    <Link href={href} style={{
      display:'flex', alignItems:'center', gap:7,
      background:bg, color:'#fff', border:bdr,
      borderRadius:12, padding:'10px 20px',
      fontWeight:700, fontSize:13, textDecoration:'none',
      boxShadow: primary ? '0 4px 14px rgba(254,127,45,0.4)' : 'none',
      backdropFilter:'blur(8px)',
      transition:'all 0.2s',
    }}
      onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.transform='translateY(-1px)';}}
      onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.transform='none';}}
    >
      <i className={`bi ` + icon} />{label}
    </Link>
  );
}

export default function AdminDashboard({ userName }: { userName: string }) {
  const [data, setData]     = useState<AdminData | null>(null);
  const [loading, setLoad]  = useState(true);
  const [err, setErr]       = useState('');
  const [attTab, setAttTab] = useState<'students'|'staff'>('students');

  useEffect(() => {
    fetch(`+"`"+`${API}/dashboard`+"`"+`)
      .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
      .then(d => { setData(d); setLoad(false); })
      .catch(e => { setErr(String(e)); setLoad(false); });
  }, []);

  if (loading) return <DashLoading />;
  if (err)     return <DashError msg={err} />;

  const s      = data!.stats;
  const sa     = data!.today_student_att;
  const ea     = data!.today_staff_att;
  const attData= (attTab==='students' ? data!.student_att_chart : data!.staff_att_chart).slice(-14);
  const today  = new Date().toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'});

  return (
    <DashShell
      title="School Dashboard"
      greeting={`Welcome back, ${userName}`}
      subtitle={today}
      actions={<>
        <ActionBtn href="/students/admission"  icon="bi-person-plus-fill"    label="New Admission" primary />
        <ActionBtn href="/attendance/students" icon="bi-calendar-check-fill" label="Attendance" />
        <ActionBtn href="/fees/collect"        icon="bi-cash-coin"           label="Collect Fee" />
      </>}
    >
      {/* KPI Row */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(210px,1fr))', gap:14, marginBottom:20 }}>
        <StatCard icon="bi-people-fill"            label="Total Students"       value={fmt(s.total_students)}         sub="Active enrolled"       accent={C.teal}   />
        <StatCard icon="bi-person-badge-fill"      label="Total Staff"          value={fmt(s.total_staff)}            sub="Active employees"      accent={C.dark}   />
        <StatCard icon="bi-building"               label="Classes"              value={fmt(s.total_classes)}          sub="All sections"          accent={C.purple} />
        <StatCard icon="bi-cash-coin"              label="Today Collected"      value={fmtPKR(s.today_collected)}     sub="Fee received today"    accent={C.green}  />
        <StatCard icon="bi-graph-up-arrow"         label={MONTHS[new Date().getMonth()] + ' Collected'} value={fmtPKR(s.this_month_collected)} sub="This month" accent={C.orange} />
        <StatCard icon="bi-exclamation-circle-fill" label="Pending Fees"        value={fmtPKR(s.pending_fees)}        sub="Unpaid + partial"      accent={C.red}    />
      </div>

      {/* Attendance + Payments row */}
      <div style={{ display:'grid', gridTemplateColumns:'300px 1fr', gap:14, marginBottom:20, alignItems:'start' }}>

        {/* Attendance Donuts */}
        <Panel title="Today's Attendance" icon="bi-calendar-check-fill">
          <div style={{ display:'flex', justifyContent:'space-around', padding:'12px 4px 6px' }}>
            <DonutRing present={sa.present} absent={sa.absent} late={sa.late} total={sa.total} label="Students" color={C.teal} />
            <div style={{ width:1, background:'#f1f5f9', margin:'0 4px' }} />
            <DonutRing present={ea.present} absent={ea.absent} late={ea.late} total={ea.total} label="Staff"    color={C.orange} />
          </div>
          <div style={{ marginTop:14, padding:'10px 14px', background:'#f8fdf7', borderRadius:10, fontSize:12, color:'#64748b', display:'flex', gap:7, alignItems:'center' }}>
            <i className="bi bi-info-circle" style={{ color:C.teal }} />
            Based on today's records
          </div>
        </Panel>

        {/* Recent Payments */}
        <Panel title="Recent Fee Payments" icon="bi-receipt" noPad
          action={
            <Link href="/fees/collect" style={{ fontSize:12, color:C.orange, fontWeight:700, textDecoration:'none', display:'flex', alignItems:'center', gap:4 }}>
              View All <i className="bi bi-arrow-right-short" style={{ fontSize:15 }} />
            </Link>
          }>
          <RecentPaymentsTable rows={data!.recent_payments.slice(0,6)} />
        </Panel>
      </div>

      {/* Fee Area Chart */}
      <div style={{ marginBottom:20 }}>
        <Panel title="Daily Fee Collection — Last 14 Days" icon="bi-graph-up-arrow"
          action={<span style={{ fontSize:12, color:'#94a3b8', fontWeight:600 }}>{fmtPKR(s.this_month_collected)} this month</span>}>
          {data!.fee_chart.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={data!.fee_chart.slice(-14)} margin={{top:8,right:16,left:8,bottom:0}}>
                <defs>
                  <linearGradient id="feeGrd" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor={C.orange} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={C.orange} stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize:11, fill:'#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={fmt} tick={{ fontSize:11, fill:'#94a3b8' }} axisLine={false} tickLine={false} width={50} />
                <Tooltip content={<CUSTOM_TOOLTIP />} />
                <Area type="monotone" dataKey="amount" name="Collected"
                  stroke={C.orange} strokeWidth={2.5} fill="url(#feeGrd)"
                  dot={{ r:3.5, fill:'#fff', stroke:C.orange, strokeWidth:2 }}
                  activeDot={{ r:6, fill:C.orange, stroke:'#fff', strokeWidth:2 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Panel>
      </div>

      {/* Attendance Bar Chart */}
      <div style={{ marginBottom:20 }}>
        <Panel title="Attendance Trend — Last 14 Days" icon="bi-person-check-fill"
          action={
            <div style={{ display:'flex', gap:6 }}>
              {(['students','staff'] as const).map(t => (
                <button key={t} onClick={()=>setAttTab(t)} style={{
                  padding:'5px 14px', borderRadius:20, border:'none', fontSize:12,
                  fontWeight:700, cursor:'pointer', transition:'all 0.2s',
                  background: attTab===t ? C.dark : '#f1f5f9',
                  color:      attTab===t ? '#fff'  : '#64748b',
                  boxShadow:  attTab===t ? '0 2px 8px rgba(35,61,77,0.25)' : 'none',
                }}>{t==='students'?'Students':'Staff'}</button>
              ))}
            </div>
          }>
          {attData.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={attData} margin={{top:8,right:16,left:0,bottom:0}} barCategoryGap="32%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize:11, fill:'#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize:11, fill:'#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CUSTOM_TOOLTIP />} />
                <Legend wrapperStyle={{ fontSize:12, paddingTop:14 }} />
                <Bar dataKey="present" name="Present" fill={C.teal}  radius={[5,5,0,0]} maxBarSize={28} />
                <Bar dataKey="absent"  name="Absent"  fill={C.red}   radius={[5,5,0,0]} maxBarSize={28} />
                <Bar dataKey="late"    name="Late"    fill={C.amber} radius={[5,5,0,0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Panel>
      </div>

      {/* Quick Actions */}
      <Panel title="Quick Actions" icon="bi-lightning-charge-fill">
        <div style={{ display:'flex', flexWrap:'wrap', gap:12, padding:'4px 0' }}>
          {[
            { href:'/students/admission',  icon:'bi-person-plus-fill',    label:'New Admission',   bg:C.teal   },
            { href:'/attendance/students', icon:'bi-calendar-check-fill', label:'Take Attendance', bg:C.dark   },
            { href:'/fees/generate',       icon:'bi-file-earmark-plus',   label:'Generate Slips',  bg:C.orange },
            { href:'/fees/collect',        icon:'bi-cash-coin',           label:'Collect Fee',     bg:C.green  },
            { href:'/academic/classes',    icon:'bi-building',            label:'Manage Classes',  bg:C.purple },
            { href:'/hrm/employees',       icon:'bi-person-badge-fill',   label:'Employees',       bg:C.indigo },
          ].map(a => (
            <Link key={a.href} href={a.href} style={{
              display:'flex', alignItems:'center', gap:9,
              background:'#fff', border:`1.5px solid ` + a.bg + '30',
              borderRadius:13, padding:'11px 18px', textDecoration:'none',
              boxShadow:`0 2px 8px ` + a.bg + '22',
              transition:'all 0.2s',
            }}
              onMouseEnter={e=>{
                const el=e.currentTarget as HTMLElement;
                el.style.background=a.bg; el.style.transform='translateY(-2px)';
                el.style.boxShadow=`0 6px 20px ` + a.bg + '45';
                el.querySelectorAll<HTMLElement>('i,span').forEach(c=>{c.style.color='#fff';});
              }}
              onMouseLeave={e=>{
                const el=e.currentTarget as HTMLElement;
                el.style.background='#fff'; el.style.transform='none';
                el.style.boxShadow=`0 2px 8px ` + a.bg + '22';
                el.querySelectorAll<HTMLElement>('i,span').forEach(c=>{c.style.color='';});
              }}
            >
              <i className={`bi ` + a.icon} style={{ fontSize:17, color:a.bg, transition:'color 0.2s' }} />
              <span style={{ fontSize:13, fontWeight:700, color:'#374151', transition:'color 0.2s' }}>{a.label}</span>
            </Link>
          ))}
        </div>
      </Panel>
    </DashShell>
  );
}
"@

# ── TeacherDashboard.tsx ───────────────────────────────────────────────────
$teacher = @"
'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  API, fmt, C,
  StatCard, Panel, DashShell, DashLoading, DashError,
} from './shared';

type TeacherData = {
  teacher:    { name:string; designation:string; employee_id:string };
  classes:    { id:number; class_name:string; section_name:string; total_students:number; subject_name:string }[];
  subjects:   { id:number; subject_name:string; class_name:string; section_name:string }[];
  my_att_today: { status:string; check_in:string } | null;
  class_att_today: { class_id:number; class_name:string; section_name:string; total:number; present:number; absent:number; late:number; marked:number }[];
  recent_att: { date:string; class_name:string; section_name:string; total:number; present:number; absent:number }[];
};

const ATT_META: Record<string, { label:string; color:string; icon:string }> = {
  present:    { label:'Present',    color:'#16a34a', icon:'bi-patch-check-fill'    },
  absent:     { label:'Absent',     color:'#dc2626', icon:'bi-x-circle-fill'       },
  late:       { label:'Late',       color:'#d97706', icon:'bi-clock-fill'          },
  on_leave:   { label:'On Leave',   color:'#7c3aed', icon:'bi-calendar-x-fill'     },
  not_marked: { label:'Not Marked', color:'#94a3b8', icon:'bi-question-circle-fill' },
};

export default function TeacherDashboard({ userId }: { userId: number }) {
  const [data, setData]   = useState<TeacherData | null>(null);
  const [loading, setLoad] = useState(true);
  const [err, setErr]     = useState('');

  useEffect(() => {
    fetch(`+"`"+`${API}/dashboard/teacher?user_id=${userId}`+"`"+`)
      .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
      .then(d => { setData(d); setLoad(false); })
      .catch(e => { setErr(String(e)); setLoad(false); });
  }, [userId]);

  if (loading) return <DashLoading />;
  if (err)     return <DashError msg={err} />;

  const t          = data!.teacher;
  const myAtt      = data!.my_att_today;
  const attKey     = myAtt?.status ?? 'not_marked';
  const attMeta    = ATT_META[attKey] ?? ATT_META.not_marked;
  const totalStudents = data!.classes.reduce((a, c) => a + (c.total_students || 0), 0);
  const today      = new Date().toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
  const markedToday= data!.class_att_today.filter(c => c.marked).length;

  return (
    <DashShell
      title={`Welcome, ${t.name}`}
      greeting={t.designation || 'Teacher'}
      subtitle={today}
      actions={
        <Link href="/attendance/students" style={{
          display:'flex', alignItems:'center', gap:7,
          background:C.orange, color:'#fff', borderRadius:12,
          padding:'10px 20px', fontWeight:700, fontSize:13, textDecoration:'none',
          boxShadow:'0 4px 14px rgba(254,127,45,0.4)',
        }}>
          <i className="bi bi-calendar-check-fill" /> Mark Attendance
        </Link>
      }
    >
      {/* KPI Row */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:14, marginBottom:20 }}>
        <StatCard icon="bi-people-fill"         label="My Students"     value={fmt(totalStudents)}           sub="Across all classes"    accent={C.teal}   />
        <StatCard icon="bi-building"            label="Classes Assigned" value={fmt(data!.classes.length)}  sub="Teaching today"        accent={C.dark}   />
        <StatCard icon="bi-journal-bookmark"    label="Subjects"        value={fmt(data!.subjects.length)}  sub="Assigned to me"        accent={C.orange} />
        <StatCard icon="bi-calendar-check-fill" label="Marked Today"    value={fmt(markedToday) + ' / ' + fmt(data!.classes.length)} sub="Attendance progress" accent={C.green} />

        {/* My attendance status card */}
        <div style={{
          background:'#fff', borderRadius:18, padding:'22px 24px 20px',
          boxShadow:'0 1px 3px rgba(0,0,0,0.06),0 4px 20px rgba(35,61,77,0.07)',
          border:'1px solid #f1f5f9', borderLeft:`4px solid ` + attMeta.color,
          display:'flex', flexDirection:'column' as const, gap:12,
        }}>
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
            <div style={{ fontSize:11, fontWeight:700, color:'#64748b', textTransform:'uppercase' as const, letterSpacing:'0.07em' }}>My Attendance</div>
            <div style={{ width:36, height:36, borderRadius:10, background: attMeta.color + '1a', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <i className={`bi ` + attMeta.icon} style={{ fontSize:17, color:attMeta.color }} />
            </div>
          </div>
          <div>
            <div style={{ fontSize:26, fontWeight:800, color:attMeta.color, lineHeight:1 }}>{attMeta.label}</div>
            {myAtt?.check_in && <div style={{ fontSize:12, color:'#94a3b8', marginTop:5 }}>Check-in: {myAtt.check_in}</div>}
          </div>
        </div>
      </div>

      {/* Today's class attendance table */}
      <div style={{ marginBottom:20 }}>
        <Panel title="Today's Class Attendance" icon="bi-calendar-check-fill"
          action={<span style={{ fontSize:12, color:'#94a3b8', fontWeight:600 }}>{today}</span>}
          noPad>
          {data!.class_att_today.length === 0 ? (
            <div style={{ textAlign:'center' as const, padding:'36px 0', color:'#94a3b8' }}>
              <i className="bi bi-inbox" style={{ fontSize:30, display:'block', marginBottom:8 }} />
              <div style={{ fontSize:13 }}>No attendance records for today yet</div>
            </div>
          ) : (
            <table style={{ width:'100%', borderCollapse:'collapse' as const, fontSize:13 }}>
              <thead>
                <tr>
                  {['Class','Section','Total','Present','Absent','Late','Status'].map(h => (
                    <th key={h} style={{
                      padding:'10px 16px', textAlign:'left' as const, color:'#64748b',
                      fontWeight:700, fontSize:11, textTransform:'uppercase' as const,
                      letterSpacing:'0.05em', borderBottom:'2px solid #f1f5f9', whiteSpace:'nowrap' as const,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data!.class_att_today.map(r => (
                  <tr key={r.class_id}
                    style={{ borderBottom:'1px solid #f8fafc', transition:'background 0.15s' }}
                    onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background='#f8fdf7';}}
                    onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background='transparent';}}
                  >
                    <td style={{ padding:'12px 16px', fontWeight:700, color:'#1a2e3b' }}>{r.class_name}</td>
                    <td style={{ padding:'12px 16px', color:'#475569' }}>{r.section_name||'—'}</td>
                    <td style={{ padding:'12px 16px', color:'#475569', fontWeight:600 }}>{r.total}</td>
                    <td style={{ padding:'12px 16px' }}>
                      <span style={{ fontWeight:700, color:'#16a34a', background:'#16a34a1a', padding:'3px 10px', borderRadius:20, fontSize:12 }}>{r.present}</span>
                    </td>
                    <td style={{ padding:'12px 16px' }}>
                      <span style={{ fontWeight:700, color:'#dc2626', background:'#dc26261a', padding:'3px 10px', borderRadius:20, fontSize:12 }}>{r.absent}</span>
                    </td>
                    <td style={{ padding:'12px 16px' }}>
                      <span style={{ fontWeight:700, color:'#d97706', background:'#d976061a', padding:'3px 10px', borderRadius:20, fontSize:12 }}>{r.late}</span>
                    </td>
                    <td style={{ padding:'12px 16px' }}>
                      <span style={{
                        fontSize:11, padding:'4px 12px', borderRadius:20, fontWeight:700,
                        background: r.marked ? '#16a34a1a' : '#94a3b81a',
                        color:      r.marked ? '#16a34a'   : '#94a3b8',
                      }}>{r.marked ? 'Marked' : 'Pending'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
      </div>

      {/* Classes + Subjects grid */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:20 }}>
        <Panel title="My Classes" icon="bi-building"
          action={
            <Link href="/attendance/students" style={{ fontSize:12, color:C.orange, fontWeight:700, textDecoration:'none', display:'flex', alignItems:'center', gap:4 }}>
              Take Attendance <i className="bi bi-arrow-right-short" style={{ fontSize:15 }} />
            </Link>
          }>
          <div style={{ display:'flex', flexDirection:'column' as const, gap:8 }}>
            {data!.classes.length === 0 ? (
              <div style={{ textAlign:'center' as const, padding:'24px 0', color:'#94a3b8', fontSize:13 }}>No classes assigned</div>
            ) : data!.classes.map(c => (
              <div key={c.id} style={{
                display:'flex', alignItems:'center', justifyContent:'space-between',
                background:'#f8fdf7', borderRadius:12, padding:'12px 16px',
                border:'1px solid #e8f5e9', transition:'all 0.2s',
              }}
                onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background='#f0faf1';}}
                onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background='#f8fdf7';}}
              >
                <div>
                  <div style={{ fontWeight:700, fontSize:14, color:'#1a2e3b' }}>
                    {c.class_name}{c.section_name ? ` — ${c.section_name}` : ''}
                  </div>
                  {c.subject_name && <div style={{ fontSize:12, color:'#94a3b8', marginTop:2 }}>{c.subject_name}</div>}
                </div>
                <span style={{ fontSize:12, fontWeight:700, color:C.teal, background:C.teal+'18', borderRadius:20, padding:'4px 12px', whiteSpace:'nowrap' as const }}>
                  {c.total_students||0} students
                </span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="My Subjects" icon="bi-journal-bookmark-fill">
          <div style={{ display:'flex', flexDirection:'column' as const, gap:8 }}>
            {data!.subjects.length === 0 ? (
              <div style={{ textAlign:'center' as const, padding:'24px 0', color:'#94a3b8', fontSize:13 }}>No subjects assigned</div>
            ) : data!.subjects.map((s, i) => (
              <div key={s.id} style={{
                display:'flex', alignItems:'center', justifyContent:'space-between',
                background:'#fafbff', borderRadius:12, padding:'12px 16px',
                border:'1px solid #eef2ff', transition:'all 0.2s',
              }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{
                    width:32, height:32, borderRadius:9, flexShrink:0,
                    background: [C.teal,C.orange,C.purple,C.indigo,C.green][i%5] + '20',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:14, fontWeight:800, color: [C.teal,C.orange,C.purple,C.indigo,C.green][i%5],
                  }}>
                    {s.subject_name.charAt(0)}
                  </div>
                  <div style={{ fontWeight:700, fontSize:13, color:'#1a2e3b' }}>{s.subject_name}</div>
                </div>
                <span style={{ fontSize:12, color:'#94a3b8' }}>{s.class_name}{s.section_name ? ` · ${s.section_name}` : ''}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* Recent Attendance */}
      {data!.recent_att.length > 0 && (
        <Panel title="Recent Attendance Records" icon="bi-clock-history" noPad>
          <table style={{ width:'100%', borderCollapse:'collapse' as const, fontSize:13 }}>
            <thead>
              <tr>
                {['Date','Class','Section','Total','Present','Absent'].map(h => (
                  <th key={h} style={{ padding:'10px 16px', textAlign:'left' as const, color:'#64748b', fontWeight:700, fontSize:11, textTransform:'uppercase' as const, letterSpacing:'0.05em', borderBottom:'2px solid #f1f5f9', whiteSpace:'nowrap' as const }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data!.recent_att.map((r, i) => (
                <tr key={i} style={{ borderBottom:'1px solid #f8fafc', transition:'background 0.15s' }}
                  onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background='#f8fdf7';}}
                  onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background='transparent';}}
                >
                  <td style={{ padding:'11px 16px', color:'#475569' }}>{new Date(r.date).toLocaleDateString('en-GB',{day:'2-digit',month:'short'})}</td>
                  <td style={{ padding:'11px 16px', fontWeight:700, color:'#1a2e3b' }}>{r.class_name}</td>
                  <td style={{ padding:'11px 16px', color:'#475569' }}>{r.section_name||'—'}</td>
                  <td style={{ padding:'11px 16px', color:'#475569' }}>{r.total}</td>
                  <td style={{ padding:'11px 16px' }}><span style={{ fontWeight:700, color:'#16a34a' }}>{r.present}</span></td>
                  <td style={{ padding:'11px 16px' }}><span style={{ fontWeight:700, color:'#dc2626' }}>{r.absent}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}
    </DashShell>
  );
}
"@

# ── AccountantDashboard.tsx ────────────────────────────────────────────────
$acct = @"
'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import {
  API, MONTHS, fmt, fmtPKR, C,
  StatCard, Panel, DashShell, DashLoading, DashError, EmptyChart, RecentPaymentsTable,
} from './shared';

type AccountantData = {
  stats: { today_collected:number; month_collected:number; pending_fees:number; total_students:number };
  daily_chart:   { date:string; label:string; amount:number }[];
  monthly_chart: { month:string; amount:number }[];
  recent_payments: any[];
};

const CUSTOM_TOOLTIP = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'#fff', border:'1px solid #f1f5f9', borderRadius:12, padding:'10px 16px', boxShadow:'0 8px 24px rgba(0,0,0,0.1)' }}>
      <div style={{ fontSize:12, color:'#64748b', fontWeight:600, marginBottom:4 }}>{label}</div>
      <div style={{ fontSize:14, fontWeight:800, color:C.orange }}>{fmtPKR(payload[0]?.value ?? 0)}</div>
    </div>
  );
};

export default function AccountantDashboard({ userName }: { userName: string }) {
  const [data, setData]   = useState<AccountantData | null>(null);
  const [loading, setLoad] = useState(true);
  const [err, setErr]     = useState('');

  useEffect(() => {
    fetch(`+"`"+`${API}/dashboard/accountant`+"`"+`)
      .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
      .then(d => { setData(d); setLoad(false); })
      .catch(e => { setErr(String(e)); setLoad(false); });
  }, []);

  if (loading) return <DashLoading />;
  if (err)     return <DashError msg={err} />;

  const s        = data!.stats;
  const today    = new Date().toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
  const curMonth = MONTHS[new Date().getMonth()];
  const maxAmt   = Math.max(...data!.monthly_chart.map(r => r.amount), 1);

  return (
    <DashShell
      title="Finance & Fees"
      greeting={`Welcome, ${userName}`}
      subtitle={today}
      actions={<>
        <Link href="/fees/collect" style={{
          display:'flex', alignItems:'center', gap:7,
          background:C.orange, color:'#fff', borderRadius:12,
          padding:'10px 20px', fontWeight:700, fontSize:13, textDecoration:'none',
          boxShadow:'0 4px 14px rgba(254,127,45,0.4)',
        }}>
          <i className="bi bi-cash-coin" /> Collect Fee
        </Link>
        <Link href="/fees/generate" style={{
          display:'flex', alignItems:'center', gap:7,
          background:'rgba(255,255,255,0.18)', color:'#fff', border:'1px solid rgba(255,255,255,0.3)',
          borderRadius:12, padding:'10px 20px', fontWeight:700, fontSize:13, textDecoration:'none',
          backdropFilter:'blur(8px)',
        }}>
          <i className="bi bi-file-earmark-plus" /> Generate Slips
        </Link>
      </>}
    >
      {/* KPI Row */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(210px,1fr))', gap:14, marginBottom:20 }}>
        <StatCard icon="bi-cash-stack"              label="Today Collected"       value={fmtPKR(s.today_collected)}   sub="Received today"    accent={C.green}  />
        <StatCard icon="bi-graph-up-arrow"          label={curMonth + ' Collected'} value={fmtPKR(s.month_collected)} sub="This month total"  accent={C.teal}   />
        <StatCard icon="bi-exclamation-circle-fill" label="Pending Fees"          value={fmtPKR(s.pending_fees)}      sub="Unpaid + partial"  accent={C.red}    />
        <StatCard icon="bi-people-fill"             label="Total Students"        value={fmt(s.total_students)}       sub="Enrolled"          accent={C.orange} />
      </div>

      {/* Daily chart + Recent Payments */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 420px', gap:14, marginBottom:20, alignItems:'start' }}>
        <Panel title="Daily Collection — Last 14 Days" icon="bi-graph-up-arrow"
          action={<span style={{ fontSize:12, color:'#94a3b8', fontWeight:600 }}>{fmtPKR(s.month_collected)} this month</span>}>
          {data!.daily_chart.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={data!.daily_chart.slice(-14)} margin={{top:8,right:16,left:8,bottom:0}}>
                <defs>
                  <linearGradient id="dayGrd" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor={C.orange} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={C.orange} stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize:11, fill:'#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={fmt} tick={{ fontSize:11, fill:'#94a3b8' }} axisLine={false} tickLine={false} width={52} />
                <Tooltip content={<CUSTOM_TOOLTIP />} />
                <Area type="monotone" dataKey="amount"
                  stroke={C.orange} strokeWidth={2.5} fill="url(#dayGrd)"
                  dot={{ r:3.5, fill:'#fff', stroke:C.orange, strokeWidth:2 }}
                  activeDot={{ r:6, fill:C.orange, stroke:'#fff', strokeWidth:2 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Panel>

        <Panel title="Recent Payments" icon="bi-receipt" noPad
          action={
            <Link href="/fees/collect" style={{ fontSize:12, color:C.orange, fontWeight:700, textDecoration:'none', display:'flex', alignItems:'center', gap:3 }}>
              All <i className="bi bi-arrow-right-short" style={{ fontSize:15 }} />
            </Link>
          }>
          <RecentPaymentsTable rows={data!.recent_payments.slice(0,7)} />
        </Panel>
      </div>

      {/* Monthly chart */}
      <div style={{ marginBottom:20 }}>
        <Panel title={`Monthly Collection — Last 6 Months`} icon="bi-calendar3">
          {data!.monthly_chart.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data!.monthly_chart} margin={{top:8,right:16,left:8,bottom:0}} barCategoryGap="40%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize:11, fill:'#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={fmt} tick={{ fontSize:11, fill:'#94a3b8' }} axisLine={false} tickLine={false} width={52} />
                <Tooltip content={<CUSTOM_TOOLTIP />} />
                <Bar dataKey="amount" radius={[7,7,0,0]} maxBarSize={48}>
                  {data!.monthly_chart.map((r, i) => (
                    <Cell key={i} fill={r.amount === maxAmt ? C.orange : C.teal} fillOpacity={r.amount === maxAmt ? 1 : 0.65} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Panel>
      </div>

      {/* Quick Actions */}
      <Panel title="Quick Actions" icon="bi-lightning-charge-fill">
        <div style={{ display:'flex', flexWrap:'wrap', gap:12, padding:'4px 0' }}>
          {[
            { href:'/fees/collect',  icon:'bi-cash-coin',         label:'Collect Fee',    bg:C.orange },
            { href:'/fees/generate', icon:'bi-file-earmark-plus', label:'Generate Slips', bg:C.teal   },
            { href:'/fees/vouchers', icon:'bi-receipt',           label:'Fee Vouchers',   bg:C.dark   },
            { href:'/reports/fees',  icon:'bi-bar-chart-fill',    label:'Fee Reports',    bg:C.green  },
            { href:'/students',      icon:'bi-people-fill',       label:'Students',       bg:C.purple },
          ].map(a => (
            <Link key={a.href} href={a.href} style={{
              display:'flex', alignItems:'center', gap:9,
              background:'#fff', border:`1.5px solid ` + a.bg + '30',
              borderRadius:13, padding:'11px 18px', textDecoration:'none',
              boxShadow:`0 2px 8px ` + a.bg + '22',
              transition:'all 0.2s',
            }}
              onMouseEnter={e=>{
                const el=e.currentTarget as HTMLElement;
                el.style.background=a.bg; el.style.transform='translateY(-2px)';
                el.querySelectorAll<HTMLElement>('i,span').forEach(c=>{c.style.color='#fff';});
              }}
              onMouseLeave={e=>{
                const el=e.currentTarget as HTMLElement;
                el.style.background='#fff'; el.style.transform='none';
                el.querySelectorAll<HTMLElement>('i,span').forEach(c=>{c.style.color='';});
              }}
            >
              <i className={`bi ` + a.icon} style={{ fontSize:17, color:a.bg, transition:'color 0.2s' }} />
              <span style={{ fontSize:13, fontWeight:700, color:'#374151', transition:'color 0.2s' }}>{a.label}</span>
            </Link>
          ))}
        </div>
      </Panel>
    </DashShell>
  );
}
"@

# ── GenericDashboard.tsx ───────────────────────────────────────────────────
$generic = @"
'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { API, fmt, fmtPKR, C, StatCard, Panel, DashShell, DashLoading, DashError } from './shared';

type GenericData = {
  stats: { total_students:number; total_staff:number; total_classes:number; pending_fees:number; this_month_collected:number; today_collected:number };
};

const NAV_LINKS = [
  { href:'/students',              icon:'bi-people-fill',            label:'Students',      color:C.teal   },
  { href:'/academic/classes',      icon:'bi-building',               label:'Classes',       color:C.dark   },
  { href:'/academic/subjects',     icon:'bi-journal-bookmark-fill',  label:'Subjects',      color:C.purple },
  { href:'/attendance/students',   icon:'bi-calendar-check-fill',    label:'Attendance',    color:C.orange },
  { href:'/fees/collect',          icon:'bi-cash-coin',              label:'Fee Collect',   color:C.green  },
  { href:'/hrm/employees',         icon:'bi-person-badge-fill',      label:'Employees',     color:C.indigo },
  { href:'/settings',              icon:'bi-gear-fill',              label:'Settings',      color:'#64748b' },
  { href:'/reports/students',      icon:'bi-bar-chart-fill',         label:'Reports',       color:C.amber  },
];

export default function GenericDashboard({ userName, role }: { userName:string; role:string }) {
  const [data, setData]   = useState<GenericData | null>(null);
  const [loading, setLoad] = useState(true);
  const [err, setErr]     = useState('');

  useEffect(() => {
    fetch(`+"`"+`${API}/dashboard`+"`"+`)
      .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
      .then(d => { setData(d); setLoad(false); })
      .catch(e => { setErr(String(e)); setLoad(false); });
  }, []);

  const today = new Date().toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
  if (loading) return <DashLoading />;
  if (err)     return <DashError msg={err} />;

  const s = data!.stats;
  return (
    <DashShell title={`Welcome, ${userName}`} greeting={role} subtitle={today}>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:14, marginBottom:20 }}>
        <StatCard icon="bi-people-fill"       label="Students"        value={fmt(s.total_students)}         sub="Enrolled"      accent={C.teal}   />
        <StatCard icon="bi-person-badge-fill" label="Staff"           value={fmt(s.total_staff)}            sub="Active"        accent={C.dark}   />
        <StatCard icon="bi-building"          label="Classes"         value={fmt(s.total_classes)}          sub="Total"         accent={C.purple} />
        <StatCard icon="bi-graph-up-arrow"    label="Month Collected" value={fmtPKR(s.this_month_collected)} sub="This month"   accent={C.orange} />
      </div>

      {/* Navigation Grid */}
      <Panel title="Quick Navigation" icon="bi-grid-fill">
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))', gap:12, padding:'4px 0' }}>
          {NAV_LINKS.map(link => (
            <Link key={link.href} href={link.href} style={{
              display:'flex', flexDirection:'column' as const, alignItems:'center', justifyContent:'center',
              gap:10, padding:'22px 12px', borderRadius:16, textDecoration:'none',
              background:'#fff', border:`1.5px solid ` + link.color + '22',
              boxShadow:`0 2px 10px ` + link.color + '18',
              transition:'all 0.22s',
            }}
              onMouseEnter={e=>{
                const el=e.currentTarget as HTMLElement;
                el.style.background=link.color; el.style.transform='translateY(-3px)';
                el.style.boxShadow=`0 8px 24px ` + link.color + '40';
                el.querySelectorAll<HTMLElement>('i,span').forEach(c=>{c.style.color='#fff';});
              }}
              onMouseLeave={e=>{
                const el=e.currentTarget as HTMLElement;
                el.style.background='#fff'; el.style.transform='none';
                el.style.boxShadow=`0 2px 10px ` + link.color + '18';
                el.querySelectorAll<HTMLElement>('i,span').forEach(c=>{c.style.color='';});
              }}
            >
              <i className={`bi ` + link.icon} style={{ fontSize:28, color:link.color, transition:'color 0.22s' }} />
              <span style={{ fontSize:12, fontWeight:700, color:'#374151', textAlign:'center' as const, lineHeight:1.4, transition:'color 0.22s' }}>{link.label}</span>
            </Link>
          ))}
        </div>
      </Panel>
    </DashShell>
  );
}
"@

$base = "d:\peronal\SMS_Pern\client\components\dashboards"
[System.IO.File]::WriteAllText("$base\shared.tsx",         $shared,  [System.Text.Encoding]::UTF8)
[System.IO.File]::WriteAllText("$base\AdminDashboard.tsx", $admin,   [System.Text.Encoding]::UTF8)
[System.IO.File]::WriteAllText("$base\TeacherDashboard.tsx", $teacher, [System.Text.Encoding]::UTF8)
[System.IO.File]::WriteAllText("$base\AccountantDashboard.tsx", $acct, [System.Text.Encoding]::UTF8)
[System.IO.File]::WriteAllText("$base\GenericDashboard.tsx", $generic, [System.Text.Encoding]::UTF8)

Write-Host "All 5 files written:"
Get-ChildItem "$base\*.tsx" | ForEach-Object { Write-Host "  $($_.Name) - $((Get-Content $_.FullName | Measure-Object -Line).Lines) lines" }
