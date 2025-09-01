import { useMemo } from 'react'
import './MonthlyCalendar.css'

// data: array of { day: 'YYYY-MM-DD', used_minutes, active_window_minutes, coverage_pct, target_minutes, target_pct, has_negative, has_timer, hit_target, top_categories }
export default function MonthlyCalendar({ year, month, data = [], onSelectDay, onQuickNew }) {
  const byDay = useMemo(() => {
    const map = new Map()
    for (const d of data) map.set(d.day, d)
    return map
  }, [data])

  const first = useMemo(() => new Date(year, month - 1, 1), [year, month])
  const startWeekday = (first.getDay() + 6) % 7 // make Monday=0
  const daysInMonth = new Date(year, month, 0).getDate()
  const cells = []
  for (let i = 0; i < startWeekday; i++) cells.push(null)
  for (let day = 1; day <= daysInMonth; day++) cells.push(day)
  while (cells.length % 7 !== 0) cells.push(null)

  // Divergent heat based on net_norm in [-1,1]
  const heatClassFromNet = (net) => {
    if (net == null) return 'heat-zero'
    const v = Math.max(-1, Math.min(1, net))
    if (v <= -0.6) return 'heat-neg2'
    if (v <= -0.2) return 'heat-neg1'
    if (v < 0.2) return 'heat-zero'
    if (v < 0.6) return 'heat-pos1'
    return 'heat-pos2'
  }
  const fillClass = (cov) => {
    if (cov == null) return 'fill-none'
    if (cov < 0.4) return 'fill-low'
    if (cov < 0.8) return 'fill-mid'
    if (cov <= 1.0) return 'fill-high'
    return 'fill-over'
  }

  const y = year
  const m = String(month).padStart(2, '0')

  return (
    <div className="month-cal">
      <div className="month-grid">
        {['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'].map((d)=> (
          <div key={d} className="dow">{d}</div>
        ))}
        {cells.map((d, idx) => {
          const dateStr = d ? `${y}-${m}-${String(d).padStart(2,'0')}` : ''
          const agg = d ? byDay.get(dateStr) : null
          const heatCls = agg ? heatClassFromNet(agg.net_norm) : 'heat-zero'
          const cov24 = agg ? Math.max(0, Math.min(1, (agg.used_minutes||0) / (24*60))) : 0
          const fillCls = agg ? fillClass(cov24) : 'fill-none'
          const fillStyle = agg ? { ['--fill-pct']: `${Math.max(0, Math.min(100, cov24*100))}%` } : undefined
          const title = agg ? (
            `Net de Atributos (28d pct): ${pct((agg.net_norm+1)/2)}  [negativo ↔ positivo]\n` +
            `Tempo usado: ${formatHm(agg.used_minutes)} (${pct(agg.target_pct)})\n` +
            `Cobertura (24h): ${pct(cov24)}\n` +
            (agg.top_categories?.length ? `Top: ${formatTop(agg.top_categories)}` : '')
          ) : ''

          return (
            <div key={idx} className={`day-cell ${heatCls} ${d ? '' : 'empty'}`} title={title}
              onClick={() => d && onSelectDay?.(dateStr)}
              onAuxClick={(e) => { if (e.altKey && d) { e.preventDefault(); onQuickNew?.(dateStr) } }}
            >
              {d && (
                <>
                  <div className="cell-header">
                    <span className="day-num">{d}</span>
                    <div className="badges">
                      {agg?.has_negative ? <span className="badge neg" title="Com negativas">●</span> : null}
                      {agg?.hit_target ? <span className="badge hit" title="Meta batida">✦</span> : null}
                      {agg?.has_timer ? <span className="badge timer" title="Com timer">⏱</span> : null}
                    </div>
                  </div>
                  <div className={`fill ${fillCls}`} style={fillStyle}></div>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function pct(v){ if (v==null) return '—'; return Math.round(v*100)+'%' }
function formatHm(min){ if (!Number.isFinite(min)) return '0m'; const h=Math.floor(min/60); const m=min%60; return (h? (h+'h '):'') + (m? (m+'m'):'') }
function formatTop(arr){
  // expects [{name, minutes}] or ["Foco 2h10", ...]
  if (!Array.isArray(arr) || arr.length===0) return ''
  if (typeof arr[0] === 'string') return arr.slice(0,2).join(' • ')
  return arr.slice(0,2).map(x=> `${x.name} ${formatHm(x.minutes)}`).join(' • ')
}
