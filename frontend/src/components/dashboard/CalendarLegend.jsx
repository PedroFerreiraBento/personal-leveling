export default function CalendarLegend(){
  return (
    <div className="calendar-legend">
      <div className="legend-row">
        <span className="legend-title">Heat (Net de Atributos)</span>
        <div className="swatches" aria-label="Escala divergente">
          <span className="swatch heat-neg2" aria-hidden="true"></span>
          <span className="swatch heat-neg1" aria-hidden="true"></span>
          <span className="swatch heat-zero" aria-hidden="true"></span>
          <span className="swatch heat-pos1" aria-hidden="true"></span>
          <span className="swatch heat-pos2" aria-hidden="true"></span>
        </div>
        <span className="legend-desc">Vermelho = líquido negativo, Cinza = neutro, Verde = positivo (normalizado por percentil de 28 dias)</span>
      </div>

      <div className="legend-row">
        <span className="legend-title">Fill (cobertura)</span>
        <span className="swatch fill" aria-hidden="true"></span>
        <span>Barra Fill — % do dia (24h) coberto</span>
        <span className="legend-desc">Ex.: 50% cobre metade das 24h</span>
      </div>

      <div className="legend-row">
        <span className="legend-title">Badges</span>
        <span className="badge-item"><span className="badge-dot" aria-hidden="true"></span><span>Atividade negativa</span></span>
        <span className="badge-item"><span className="badge-star" aria-hidden="true">✦</span><span>Meta alcançada</span></span>
        <span className="badge-item"><span className="badge-timer" aria-hidden="true">⏱</span><span>Entradas por timer</span></span>
      </div>

      <style>{`
        .calendar-legend{ display:flex; flex-direction:column; gap:10px; margin-top:8px; color:var(--text-2) }
        .legend-row{ display:flex; align-items:center; gap:10px; flex-wrap:wrap }
        .legend-title{ font-weight:600; color:var(--text-1) }
        .swatches{ display:flex; gap:4px }
        .swatch{ width:18px; height:10px; border-radius:3px; border:1px solid rgba(255,255,255,.12); display:inline-block; position: static !important; vertical-align: middle }
        .swatch.heat-neg2{ background:#7f1d1d }
        .swatch.heat-neg1{ background:#ef4444 }
        .swatch.heat-zero{ background:#303240 }
        .swatch.heat-pos1{ background:#10b981 }
        .swatch.heat-pos2{ background:#065f46 }
        .swatch.fill{ background:linear-gradient(90deg,#20c997,#0dcaf0) }
        .legend-item{ display:inline-flex; align-items:center; gap:6px; background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.08); border-radius:8px; padding:4px 8px }
        .badge-item{ display:inline-flex; align-items:center; gap:6px; background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.08); border-radius:8px; padding:4px 8px }
        .badge-dot{ width:8px; height:8px; border-radius:999px; background:#ff4d94; display:inline-block; border:1px solid rgba(255,255,255,.5) }
        .badge-star{ color:#00eaff; font-size:12px }
        .badge-timer{ color:#93a2ff; font-size:12px }
        .legend-desc{ margin-left:4px }
      `}</style>
    </div>
  )
}
