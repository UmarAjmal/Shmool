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
    fetch(API + '/dashboard')
      .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
      .then(d => { setData(d); setLoad(false); })
      .catch(e => { setErr(String(e)); setLoad(false); });
  }, []);

  const today = new Date().toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
  if (loading) return <DashLoading />;
  if (err)     return <DashError msg={err} />;

  const s = data!.stats;
  return (
    <DashShell title={'Welcome, ' + userName} greeting={role} subtitle={today}>

      {/* Stats */}
      <div className="dash-stat-grid" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:14, marginBottom:20 }}>
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
              background:'#fff', border:'1.5px solid ' + link.color + '22',
              boxShadow:'0 2px 10px ' + link.color + '18',
              transition:'all 0.22s',
            }}
              onMouseEnter={e=>{
                const el=e.currentTarget as HTMLElement;
                el.style.background=link.color; el.style.transform='translateY(-3px)';
                el.style.boxShadow='0 8px 24px ' + link.color + '40';
                el.querySelectorAll<HTMLElement>('i,span').forEach(c=>{c.style.color='#fff';});
              }}
              onMouseLeave={e=>{
                const el=e.currentTarget as HTMLElement;
                el.style.background='#fff'; el.style.transform='none';
                el.style.boxShadow='0 2px 10px ' + link.color + '18';
                el.querySelectorAll<HTMLElement>('i,span').forEach(c=>{c.style.color='';});
              }}
            >
              <i className={'bi ' + link.icon} style={{ fontSize:28, color:link.color, transition:'color 0.22s' }} />
              <span style={{ fontSize:12, fontWeight:700, color:'#374151', textAlign:'center' as const, lineHeight:1.4, transition:'color 0.22s' }}>{link.label}</span>
            </Link>
          ))}
        </div>
      </Panel>
    </DashShell>
  );
}