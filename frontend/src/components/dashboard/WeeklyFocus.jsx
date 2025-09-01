import { useMemo } from 'react'

export default function WeeklyFocus({ days, referenceDay }){
  const week = useMemo(() => buildWeek(days, referenceDay), [days, referenceDay])
  const avgCoverage = Math.round((week.reduce((s,d)=> s + (d.coverage_pct||0), 0) / (week.length||1)) * 100)
  const hitCount = week.filter(d=> d.hit_target).length

  return (
    <section className="weekly-focus" aria-label="Foco semanal">
      <header className="wf-header">
        <strong>Semana</strong>
        <span className="wf-kpis">Cobertura média: <b>{avgCoverage}%</b> • Metas batidas: <b>{hitCount}/{week.length}</b></span>
      </header>
      <div className="wf-ribbon">
        {week.map((d,i)=> (
          <div key={i} className="wf-cell" title={`${d.day} • cobertura ${Math.round((d.coverage_pct||0)*100)}%`}>
            <div className={`heat heat-${bucket(d.target_pct)}`}></div>
            <div className="fill" style={{ width: `${Math.round((d.coverage_pct||0)*100)}%` }}></div>
            {d.has_negative && <span className="dot"/>}
            {d.hit_target && <span className="star">✦</span>}
          </div>
        ))}
      </div>
      <style>{`
        .weekly-focus{ background:rgba(255,255,255,.03); border:1px solid rgba(255,255,255,.08); border-radius:12px; padding:12px; margin-bottom:12px }
        .wf-header{ display:flex; justify-content:space-between; align-items:center; margin-bottom:8px }
        .wf-kpis{ color: var(--text-2) }
        .wf-ribbon{ display:grid; grid-template-columns: repeat(7, 1fr); gap:6px }
        .wf-cell{ position:relative; height:18px; background:#141826; border:1px solid rgba(255,255,255,.08); border-radius:6px; overflow:hidden }
        .wf-cell .heat{ position:absolute; inset:0; opacity:.6 }
        .wf-cell .fill{ position:absolute; left:0; bottom:0; height:4px; background:linear-gradient(90deg,#20c997,#0dcaf0) }
        .wf-cell .dot{ position:absolute; right:4px; top:4px; width:6px; height:6px; border-radius:999px; background:#ff4d94; border:1px solid rgba(255,255,255,.5) }
        .wf-cell .star{ position:absolute; right:12px; top:1px; font-size:10px; color:#00eaff }
        .heat-0{ background:#141826 }
        .heat-1{ background:#2e3a6a }
        .heat-2{ background:#4751b5 }
        .heat-3{ background:#6b5bd3 }
        .heat-4{ background:#8a5df0 }
      `}</style>
    </section>
  )
}

function buildWeek(days, refStr){
  const ref = refStr ? new Date(refStr) : new Date()
  // Monday-first week
  const dayOfWeek = (ref.getDay()+6)%7
  const monday = new Date(ref); monday.setDate(ref.getDate() - dayOfWeek)
  const result = []
  for (let i=0;i<7;i++){
    const d = new Date(monday); d.setDate(monday.getDate()+i)
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    const found = days.find(x=> x.day === key)
    result.push(found || { day: key, coverage_pct: 0, target_pct: 0, hit_target: false, has_negative: false })
  }
  return result
}

function bucket(p){ if (!p) return 0; if (p<0.25) return 1; if (p<0.5) return 2; if (p<0.75) return 3; return 4 }
