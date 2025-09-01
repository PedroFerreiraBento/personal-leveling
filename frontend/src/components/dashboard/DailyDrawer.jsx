import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import axios from 'axios'

export default function DailyDrawer({ date, onClose, data, userId }){
  const [dayData, setDayData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    function onKey(e){ if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    // lock body scroll while open
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prevOverflow }
  }, [onClose])

  useEffect(() => {
    if (!date) return
    let canceled = false
    async function load(){
      setLoading(true); setError('')
      try{
        const res = await axios.get(`/api/analytics/day`, { params: { user_id: userId, day: date } })
        if (!canceled) setDayData(res.data)
      }catch(e){ if (!canceled) setError('Falha ao carregar dia'); }
      finally{ if (!canceled) setLoading(false) }
    }
    load();
    return () => { canceled = true }
  }, [date, userId])

  if (!date) return null

  const d = new Date(date)
  // Day bounds (LOCAL) for clamping
  const [yy, mm, dd] = (date || '').split('-').map(Number)
  const dayStart = Number.isFinite(yy) ? new Date(yy, (mm||1)-1, dd||1, 0,0,0) : new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0,0,0)
  const title = dayStart.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })
  const dayEnd = new Date(dayStart.getFullYear(), dayStart.getMonth(), dayStart.getDate(), 24, 0, 0)

  // Build simple 24h timeline bars from segments
  const segments = dayData?.segments || []
  const timeline = useMemo(() => segments.map(s => toBar(s, date)), [segments, date])

  // Coverage based on 24h baseline
  const coverage24 = useMemo(() => {
    const used = (dayData?.used_minutes ?? data?.used_minutes)
    if (!Number.isFinite(used)) return 0
    return Math.min(1, Math.max(0, used / (24*60)))
  }, [dayData?.used_minutes, data?.used_minutes])

  const [selectedRange, setSelectedRange] = useState(null) // {start:Date,end:Date,label:string}
  const selectedItems = useMemo(() => {
    if (!selectedRange) return []
    return segments
      .map(s => {
        const s1 = new Date(s.start), e1 = new Date(s.end)
        const overlap = overlapMinutes(s1, e1, selectedRange.start, selectedRange.end)
        return overlap > 0 ? { ...s, overlap_minutes: overlap } : null
      })
      .filter(Boolean)
      .sort((a,b)=> b.overlap_minutes - a.overlap_minutes)
  }, [segments, selectedRange])

  return createPortal((
    <div className="drawer-overlay" onClick={onClose}>
      <aside className="drawer" onClick={(e)=> e.stopPropagation()} aria-modal="true" role="dialog">
        <header className="drawer-header">
          <strong style={{textTransform:'capitalize'}}>{title}</strong>
          <button className="btn btn-secondary" onClick={onClose}>Fechar</button>
        </header>

        <section className="drawer-body">
          {loading && <div className="placeholder">Carregando…</div>}
          {error && <div className="placeholder">{error}</div>}

          <div className="kpis">
            <div className="kpi"><span>Tempo usado</span><b>{formatHm(dayData?.used_minutes ?? data?.used_minutes)}</b></div>
            <div className="kpi"><span>Janela ativa</span><b>{formatHm(dayData?.active_window_minutes ?? data?.active_window_minutes)}</b></div>
            <div className="kpi"><span>Cobertura (24h)</span><b>{pct(coverage24)}</b></div>
            <div className="kpi"><span># lançamentos</span><b>{dayData?.count ?? data?.count ?? '—'}</b></div>
          </div>

          <div className="timeline24">
            <div className="hours">
              {Array.from({length:25}).map((_,i)=> (
                <div key={i} className="tick" style={{left: `${(i/24)*100}%`}}>{i%6===0? i: ''}</div>
              ))}
            </div>
            <div className="bars">
              {timeline.filter(Boolean).map((b, i)=> (
                <div
                  key={i}
                  className={`bar${selectedRange && b.label===selectedRange.label? ' active':''}`}
                  style={{ left: b.left+'%', width: b.width+'%' }}
                  title={`${b.label}`}
                  onClick={()=> setSelectedRange({ start: b.start, end: b.end, label: b.label })}
                ></div>
              ))}
            </div>
          </div>

          {selectedRange && createPortal((
            <div className="over-range" onClick={()=> setSelectedRange(null)}>
              <div className="over-card" onClick={(e)=> e.stopPropagation()} role="dialog" aria-modal="true">
                <div className="rd-header">
                  <div className="rd-title">{selectedRange.label}</div>
                  <button className="btn btn-ghost btn-sm" onClick={()=> setSelectedRange(null)}>Fechar</button>
                </div>
                <ul className="rd-list">
                  {selectedItems.length === 0 && <li className="rd-empty">Sem atividades nesse período</li>}
                  {selectedItems.map((s, i)=> (
                    <li key={i} className="rd-item">
                      <div className="rd-line">
                        <span className="rd-activity">{s.activity_title || 'Atividade'}</span>
                        <span className="rd-min">{formatHm(s.overlap_minutes)}</span>
                      </div>
                      <div className="rd-when">{formatDateTime(s.start)} → {formatDateTime(s.end)}</div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ), document.body)}

          <div className="segments">
            <h4>Lançamentos do dia</h4>
            <ul className="seg-list">
              {segments.length === 0 && <li className="seg empty">Sem lançamentos nesse dia</li>}
              {segments.map((s, i) => {
                const s1 = new Date(s.start); const e1 = new Date(s.end)
                const cs = new Date(Math.max(s1.getTime(), dayStart.getTime()))
                const ce = new Date(Math.min(e1.getTime(), dayEnd.getTime()))
                const dur = overlapMinutes(s1, e1, dayStart, dayEnd)
                const labelEnd = e1 > dayEnd ? '23:59' : timeOnly(ce)
                const labelStart = s1 < dayStart ? '00:00' : timeOnly(cs)
                return (
                  <li key={i} className="seg">
                    <div className="seg-time">
                      <span className="when">{formatDate(cs)} {labelStart} → {formatDate(ce)} {labelEnd}</span>
                      <span className="dur">{formatHm(dur)}</span>
                    </div>
                    <div className="seg-title">{s.activity_title || 'Atividade'}</div>
                  </li>
                )
              })}
            </ul>
          </div>
        </section>
      </aside>
      <style>{`
        .drawer-overlay{ position:fixed; inset:0; background:rgba(0,0,0,.45); display:flex; justify-content:flex-end; z-index:2147483645 }
        .drawer{ width:min(560px, 100%); height:100%; background:rgba(20,24,34,.9); backdrop-filter: blur(8px); border-left:1px solid rgba(255,255,255,.1); display:flex; flex-direction:column; color: var(--text-1) }
        .drawer-header{ display:flex; align-items:center; justify-content:space-between; padding:16px; border-bottom:1px solid rgba(255,255,255,.08); color: var(--text-1) }
        .drawer-body{ padding:16px; display:flex; flex-direction:column; gap:16px; color: var(--text-1) }
        .kpis{ display:grid; grid-template-columns: repeat(2, 1fr); gap:12px }
        .kpi{ background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.18); border-radius:10px; padding:10px; display:flex; flex-direction:column; gap:4px; color: var(--text-1) }
        .kpi span{ color: var(--text-1) }
        .placeholder{ background:rgba(255,255,255,.05); border:1px dashed rgba(255,255,255,.25); border-radius:10px; padding:12px; color: var(--text-1) }
        .timeline24{ position:relative; height:64px; background:rgba(255,255,255,.03); border:1px solid rgba(255,255,255,.08); border-radius:12px; overflow:hidden }
        .timeline24 .hours{ position:absolute; inset:0; pointer-events:none; z-index:2 }
        .timeline24 .hours .tick{ position:absolute; top:0; height:100%; width:1px; background:rgba(255,255,255,.06); color:var(--text-2); font-size:10px; display:flex; align-items:flex-start; }
        .timeline24 .bars{ position:absolute; inset:0; z-index:1 }
        .timeline24 .bar{ position:absolute; top:0; height:100%; background:linear-gradient(180deg, rgba(32,201,151,.28), rgba(13,202,240,.28)); border-radius:8px; opacity:.35; transition:opacity .12s ease, box-shadow .12s ease }
        .timeline24 .bar:hover{ opacity:.85; box-shadow: 0 0 0 1px rgba(13,202,240,.25), 0 6px 18px rgba(0,0,0,.25) }
        .timeline24 .bar.active{ opacity:.9; box-shadow: 0 0 0 1px rgba(13,202,240,.35), 0 8px 24px rgba(0,0,0,.3) }
        .segments{ display:flex; flex-direction:column; gap:8px }
        .segments h4{ margin:0 0 4px 0 }
        .seg-list{ list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:8px }
        .seg{ background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.12); border-radius:10px; padding:10px 12px; display:flex; flex-direction:column; gap:4px }
        .seg.empty{ color: var(--text-2); font-style: italic }
        .seg-time{ display:flex; align-items:baseline; justify-content:space-between; gap:10px; color: var(--text-2) }
        .seg-time .when{ font-variant-numeric: tabular-nums }
        .seg-time .dur{ background:rgba(0,157,255,.10); color:#aeeaff; border:1px solid rgba(0,157,255,.25); padding:2px 8px; border-radius:999px; font-size:.85rem }
        .seg-title{ font-weight:600 }

        /* Range overcontent */
        .over-range{ position:fixed; inset:0; background:rgba(0,0,0,.45); display:flex; align-items:center; justify-content:center; z-index:2147483645 }
        .over-card{ width:min(560px,92vw); max-height:min(86vh, 820px); display:flex; flex-direction:column; background:rgba(17,26,44,.94); border:1px solid rgba(255,255,255,.08); border-radius:12px; padding:12px; backdrop-filter: blur(8px) }
        .rd-header{ display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:6px; position:sticky; top:0 }
        .rd-title{ font-weight:600; color: var(--text-1) }
        .rd-list{ list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:8px }
        .rd-item{ background:rgba(255,255,255,.03); border:1px solid rgba(255,255,255,.08); border-radius:10px; padding:8px 10px }
        .rd-line{ display:flex; align-items:center; justify-content:space-between }
        .rd-activity{ color: var(--text-1) }
        .rd-min{ background:rgba(0,157,255,.10); color:#aeeaff; border:1px solid rgba(0,157,255,.25); padding:2px 8px; border-radius:999px; font-size:.85rem }
        .rd-when{ color: var(--text-2); font-size:.85rem; margin-top:2px }
      `}</style>
    </div>
  ), document.body)
}

function pct(v){ if (v==null) return '—'; return Math.round(v*100)+'%' }
function formatHm(min){ if (!Number.isFinite(min)) return '0m'; const h=Math.floor(min/60); const m=min%60; return (h? (h+'h '):'') + (m? (m+'m'):'') }
function toBar(seg, dayStr){
  const s = new Date(seg.start); const e = new Date(seg.end)
  // Use LOCAL midnight of the selected day to align ticks with local hours
  // Build from the original YYYY-MM-DD string to avoid UTC parsing quirks
  const [yy, mm, dd] = (dayStr || '').split('-').map(Number)
  const startDay = Number.isFinite(yy) ? new Date(yy, (mm||1)-1, dd||1, 0,0,0) : new Date(s.getFullYear(), s.getMonth(), s.getDate(), 0,0,0)
  const endDay = new Date(startDay.getFullYear(), startDay.getMonth(), startDay.getDate(), 24, 0, 0)

  // Clamp to day bounds
  const cs = new Date(Math.max(s.getTime(), startDay.getTime()))
  const ce = new Date(Math.min(e.getTime(), endDay.getTime()))

  const left = ((cs - startDay) / (24*60*60*1000)) * 100
  const width = Math.max(0.5, ((ce - cs) / (24*60*60*1000)) * 100)
  // Hide bars too curtas para utilidade visual (ex.: < 1% do dia ≈ 14.4min)
  if (width < 1) return null

  const startLabel = s < startDay ? '00:00' : timeOnly(cs)
  const endLabel = e > endDay ? '23:59' : timeOnly(ce)
  return {
    left: Math.max(0, Math.min(100, left)),
    width: Math.max(0, Math.min(100-left, width)),
    label: `${startLabel}–${endLabel}`,
    start: cs,
    end: ce
  }
}

function formatDateTime(iso){
  const d = new Date(iso)
  return d.toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })
}

function timeOnly(d){
  try{ return new Date(d).toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' }) }catch{ return '' }
}

function formatDate(d){
  try{ return new Date(d).toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric' }) }catch{ return '' }
}

function overlapMinutes(s1, e1, s2, e2){
  const s = Math.max(s1.getTime(), s2.getTime());
  const e = Math.min(e1.getTime(), e2.getTime());
  return e > s ? Math.round((e - s)/60000) : 0;
}
