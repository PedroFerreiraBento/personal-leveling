import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'
import CrudLayout from './crud/CrudLayout'
import CrudFilter from './crud/CrudFilter'
import CrudCard from './crud/CrudCard'
import CrudFormModal from './crud/CrudFormModal'

/*
  Lançamentos (placeholder CRUD)
  - Usa estado local para criar/editar/excluir itens imediatamente.
  - Estrutura alinhada com os componentes CRUD existentes.
  - Futuro: trocar por chamadas à API (/api/lancamentos) e aplicar ownership como em Categories/Attributes.
*/

function Lancamentos() {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [activities, setActivities] = useState([])
  const [selectedActivityId, setSelectedActivityId] = useState('')
  const [selectedActivity, setSelectedActivity] = useState(null) // full detail
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notify, setNotify] = useState(null) // { title, message }
  const [showModal, setShowModal] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [filterField, setFilterField] = useState('name')
  const [filterQuery, setFilterQuery] = useState('')

  const NAME_MAX = 64
  const DESC_MAX = 160

  const [draft, setDraft] = useState({
    // identificação simples do lançamento
    name: '',
    short_description: '',
    notes: '',
    activity_id: '',
    // janela de tempo
    start_at: '',
    end_at: '',
    duration_min: 0,
    origin: 'manual', // manual|timer|import
    // valores por medida da atividade
    measures: {}, // { key: number }
    // toggle para usar duração na medida de tempo
    useDurationForMeasure: false,
    durationTargetMeasureKey: '',
  })

  // Strict period validation: end must be strictly greater than start
  function validatePeriod(f){
    try{
      const start = f.start_at ? new Date(f.start_at) : null
      const end = f.end_at ? new Date(f.end_at) : null
      const endEl = document.getElementById('end_at')
      if (start && end && !isNaN(+start) && !isNaN(+end)) {
        if (end <= start) {
          endEl?.setCustomValidity('O fim deve ser maior que o início')
        } else {
          endEl?.setCustomValidity('')
        }
      } else {
        endEl?.setCustomValidity('')
      }
    } catch {}
  }

  // Helpers for datetime-local min handling
  const toLocalDatetimeStr = (d) => {
    if (!d) return ''
    const pad = (n) => String(n).padStart(2, '0')
    const yyyy = d.getFullYear()
    const mm = pad(d.getMonth() + 1)
    const dd = pad(d.getDate())
    const hh = pad(d.getHours())
    const mi = pad(d.getMinutes())
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`
  }
  const addMinutes = (d, m) => new Date(d.getTime() + m * 60000)

  // Inicial: ainda carrega localStorage (fallback) e em seguida busca do servidor
  useEffect(() => {
    try {
      const raw = localStorage.getItem('app:lancamentos')
      if (raw) setItems(JSON.parse(raw))
    } catch {}
  }, [])

  // Carregar do backend para exibir registros reais salvos no banco
  useEffect(() => {
    if (!user?.id) return
    const load = async () => {
      setLoading(true)
      try {
        const { data } = await axios.get(`/api/lancamentos?user_id=${user.id}`)
        setItems(data.data || [])
      } catch (e) {
        console.error('Erro ao listar lançamentos', e)
        setError('Erro ao carregar lançamentos do servidor')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user?.id])

  useEffect(() => {
    try {
      localStorage.setItem('app:lancamentos', JSON.stringify(items))
    } catch {}
  }, [items])

  // carregar atividades para popular o select
  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get(`/api/activities?user_id=${user.id}`)
        setActivities(res.data.data || [])
      } catch (e) {
        console.error('Erro ao carregar atividades', e)
      }
    }
    load()
  }, [user?.id])

  // ao selecionar atividade, buscar detalhes completos (medidas, scoring etc.)
  useEffect(() => {
    if (!selectedActivityId) { setSelectedActivity(null); return }
    const loadDetail = async () => {
      try {
        const { data } = await axios.get(`/api/activities/${selectedActivityId}?user_id=${user.id}`)
        const full = data.data
        setSelectedActivity(full)
        // inicializa estrutura de measures no draft
        const next = {}
        ;(full.measures || []).forEach(m => { next[m.key] = m.default ?? m.defaultValue ?? '' })
        setDraft(prev => ({
          ...prev,
          activity_id: selectedActivityId,
          measures: next,
          // se houver medida com unidade de tempo, sugerir como destino para duração
          durationTargetMeasureKey: (full.measures || []).find(m => isTimeUnit(m.unit))?.key || ''
        }))
      } catch (e) {
        console.error('Erro ao carregar detalhes da atividade', e)
        setSelectedActivity(null)
      }
    }
    loadDetail()
  }, [selectedActivityId, user?.id])

  const isTimeUnit = (u) => {
    const unit = (u || '').toLowerCase()
    return ['min','mins','minute','minutes','time','minutos','m'].includes(unit) || isHourUnit(unit) || unit.includes('tempo')
  }
  const isHourUnit = (u) => {
    const unit = (u || '').toLowerCase()
    return ['h','hr','hrs','hour','hours','hora','horas'].includes(unit)
  }

  const openCreate = () => {
    setDraft({
      name: '',
      short_description: '',
      notes: '',
      activity_id: '',
      start_at: '',
      end_at: '',
      duration_min: 0,
      origin: 'manual',
      measures: {},
      useDurationForMeasure: false,
      durationTargetMeasureKey: '',
    })
    setIsEditing(false)
    setEditingId(null)
    setShowModal(true)
  }

  const openEdit = (item) => {
    setDraft({
      name: item.name || '',
      short_description: item.short_description || '',
      notes: item.notes || '',
      activity_id: item.activity_id || '',
      // normalize to datetime-local (local wall time, no timezone suffix)
      start_at: (()=>{ try { return toLocalDatetimeStr(new Date(item.start_at)) } catch { return item.start_at || '' } })(),
      end_at: (()=>{ try { return toLocalDatetimeStr(new Date(item.end_at)) } catch { return item.end_at || '' } })(),
      duration_min: item.duration_min ?? 0,
      origin: item.origin || 'manual',
      measures: item.measures || {},
      useDurationForMeasure: false,
      durationTargetMeasureKey: '',
    })
    setSelectedActivityId(item.activity_id || '')
    setIsEditing(true)
    setEditingId(item.id)
    setShowModal(true)
  }

  const handleSave = async (payload) => {
    try {
      const { notes, activity_id, start_at, end_at, origin } = payload
      let { measures } = payload
      // validações mínimas
      if (!activity_id) { setError('Selecione uma atividade'); return }
      if (!start_at || !end_at) { setError('Informe início e fim'); return }
      const start = new Date(start_at)
      const end = new Date(end_at)
      if (isNaN(+start) || isNaN(+end) || end <= start) { setError('Período inválido (fim deve ser maior que início)'); return }

      // normalizar medidas de tempo para minutos
      if (selectedActivity) {
        const defs = selectedActivity.measures || []
        const next = { ...(measures || {}) }
        for (const m of defs) {
          const key = m.key
          const unit = (m.unit || '').toLowerCase()
          const raw = next[key]
          if (raw === undefined || raw === null || raw === '') continue
          const val = Number(raw)
          if (!isFinite(val)) continue
          if (isHourUnit(unit)) {
            next[key] = Math.round(val * 60)
          } else if (unit === 'seconds' || unit === 'sec' || unit === 's' || unit === 'seg' || unit === 'segundos') {
            next[key] = Math.round(val / 60)
          } else {
            // assume minutos já
            next[key] = val
          }
        }
        measures = next
      }

      // call backend with ISO timestamps
      const { data } = await axios.post('/api/lancamentos', {
        user_id: user.id,
        activity_id,
        start_at: start.toISOString(),
        end_at: end.toISOString(),
        origin,
        notes,
        measures
      })

      if (data && data.id) {
        setItems(prev => [{ ...data }, ...prev])
      }
      setShowModal(false)
      setIsEditing(false)
      setEditingId(null)
      setDraft({ name: '', short_description: '', notes: '', activity_id: '', start_at: '', end_at: '', duration_min: 0, origin: 'manual', measures: {}, useDurationForMeasure: false, durationTargetMeasureKey: '' })
      setSelectedActivityId('')
    } catch (e) {
      const msg = e?.response?.data?.error || 'Erro ao salvar no servidor'
      setError(msg)
      setNotify({ title: 'Falha ao salvar lançamento', message: msg })
      console.error(e)
    }
  }

  const handleDelete = (id) => {
    try {
      setItems(prev => prev.filter(it => it.id !== id))
    } catch (e) {
      setError('Erro ao deletar')
      console.error(e)
    }
  }

  const filtered = useMemo(() => {
    return items.filter(i => String(i[filterField] || '').toLowerCase().includes(filterQuery.toLowerCase()))
  }, [items, filterField, filterQuery])

  if (loading) return <div>Carregando...</div>

  return (
    <CrudLayout
      title="Lançamentos"
      actions={(
        <>
          <button className="btn btn-primary" onClick={openCreate}>＋ Novo lançamento</button>
          <a href="/dashboard" className="back-link">← Voltar</a>
        </>
      )}
      filter={(
        <CrudFilter
          field={filterField}
          query={filterQuery}
          onChangeField={setFilterField}
          onChangeQuery={setFilterQuery}
        />
      )}
    >
      {error && <div className="error">{error}</div>}

      {filtered.length === 0 ? (
        <p>Nenhum lançamento ainda.</p>
      ) : (
        <div className="crud-grid">
          {filtered.map(item => {
            const act = activities.find(a => a.id === item.activity_id)
            const actTitle = act?.title || 'Atividade'
            const fmt = (dt) => {
              if (!dt) return '—'
              const d = new Date(dt)
              if (isNaN(+d)) return String(dt)
              return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
            }
            const title = `${actTitle} — ${fmt(item.start_at)} → ${fmt(item.end_at)} (${item.duration_min ?? window.__dur?.computeDurationMins?.(item) ?? '—'} min)`
            const desc = item.notes || ''
            return (
              <CrudCard
                key={item.id}
                item={item}
                title={title}
                description={desc}
                onEdit={openEdit}
                onDelete={handleDelete}
              />
            )
          })}
        </div>
      )}

      <CrudFormModal
        open={showModal}
        title={isEditing ? 'Editar Lançamento' : 'Novo Lançamento'}
        subtitle="Cadastre e gerencie seus lançamentos"
        nameMax={NAME_MAX}
        descMax={DESC_MAX}
        initial={draft}
        onSubmit={handleSave}
        onClose={() => { setShowModal(false); setIsEditing(false); setEditingId(null); }}
        showSectionPager={false}
        hideBaseFields
        customFields={({ form, setForm }) => (
          <>
            {/** Helpers de duração */}
            {(() => {
              function computeDurationMins(f){
                const s = f.start_at ? new Date(f.start_at) : null
                const e = f.end_at ? new Date(f.end_at) : null
                const ok = s && e && !isNaN(+s) && !isNaN(+e) && e > s
                return ok ? Math.round((e.getTime()-s.getTime())/60000) : 0
              }
              function formatDuration(mins){
                if (!mins || mins <= 0) return '—'
                const MIN = 1
                const HOUR = 60
                const DAY = 60*24
                const WEEK = DAY*7
                const MONTH = DAY*30
                const YEAR = DAY*365
                let rest = mins
                const years = Math.floor(rest / YEAR); rest -= years*YEAR
                const months = Math.floor(rest / MONTH); rest -= months*MONTH
                const weeks = Math.floor(rest / WEEK); rest -= weeks*WEEK
                const days = Math.floor(rest / DAY); rest -= days*DAY
                const hours = Math.floor(rest / HOUR); rest -= hours*HOUR
                const minutes = Math.floor(rest / MIN)
                const parts = []
                if (years) parts.push(`${years} ${years===1?'ano':'anos'}`)
                if (months) parts.push(`${months} ${months===1?'mês':'meses'}`)
                if (weeks) parts.push(`${weeks} ${weeks===1?'semana':'semanas'}`)
                if (days) parts.push(`${days} ${days===1?'dia':'dias'}`)
                if (hours) parts.push(`${hours} ${hours===1?'hora':'horas'}`)
                if (minutes) parts.push(`${minutes} ${minutes===1?'min':'min'}`)
                return parts.join(' e ').replace(' e ', ', ').replace(/, ([^,]*)$/, ' e $1')
              }
              // attach helpers to window scope of closure for reuse below
              window.__dur = { computeDurationMins, formatDuration }
              return null
            })()}
            {/* Cabeçalho: Atividade */}
            <section>
              <h3>Cabeçalho</h3>
              <div className="form-row">
                <label htmlFor="activity_id">Atividade <span className="hint">obrigatório</span></label>
                <select
                  id="activity_id"
                  required
                  value={selectedActivityId}
                  onChange={(e)=> { setSelectedActivityId(e.target.value); setForm({ ...form, activity_id: e.target.value }) }}
                >
                  <option value="">Selecione uma atividade</option>
                  {activities.map(a => (
                    <option key={a.id} value={a.id}>{a.title}</option>
                  ))}
                </select>
              </div>
              {selectedActivity && (
                <p className="note">Modo de pontuação: <strong>{selectedActivity.scoring?.mode || 'simple'}</strong> • Medidas: {(selectedActivity.measures||[]).map(m=>m.key).join(', ') || '—'}</p>
              )}
            </section>

            {/* Janela de tempo */}
            <section>
              <h3>Janela de tempo</h3>
              <div className="form-row">
                <label htmlFor="start_at">De</label>
                <input
                  id="start_at"
                  type="datetime-local"
                  required
                  value={form.start_at}
                  onChange={(e)=> {
                    const next = { ...form, start_at: e.target.value }
                    if (next.useDurationForMeasure && next.durationTargetMeasureKey) {
                      const minutes = window.__dur.computeDurationMins(next)
                      next.measures = { ...(next.measures||{}), [next.durationTargetMeasureKey]: minutes }
                    }
                    setForm(next)
                    validatePeriod(next)
                  }}
                />
              </div>
              <div className="form-row">
                <label htmlFor="end_at">Até</label>
                <input
                  id="end_at"
                  type="datetime-local"
                  required
                  min={form.start_at ? toLocalDatetimeStr(addMinutes(new Date(form.start_at), 1)) : undefined}
                  value={form.end_at}
                  onChange={(e)=> {
                    const next = { ...form, end_at: e.target.value }
                    if (next.useDurationForMeasure && next.durationTargetMeasureKey) {
                      const minutes = window.__dur.computeDurationMins(next)
                      next.measures = { ...(next.measures||{}), [next.durationTargetMeasureKey]: minutes }
                    }
                    setForm(next)
                    validatePeriod(next)
                  }}
                />
              </div>
              <div className="form-row">
                <label>Duração</label>
                <input
                  type="text"
                  readOnly
                  value={(() => window.__dur.formatDuration(window.__dur.computeDurationMins(form)))()}
                />
                <span className="hint">({(() => window.__dur.computeDurationMins(form))()} min)</span>
              </div>
              <div className="form-row">
                <label htmlFor="origin">Origem</label>
                <select id="origin" value={form.origin} onChange={(e)=> setForm({ ...form, origin: e.target.value })}>
                  <option value="">—</option>
                  <option value="manual">manual</option>
                  <option value="timer">timer</option>
                  <option value="import">import</option>
                </select>
              </div>
            </section>

            {/* Medidas e toggle de duração */}
            {selectedActivity && (
              <section>
                <h3>Medidas</h3>
                {(selectedActivity.measures || []).length === 0 ? (
                  <p className="note">A atividade não possui medidas configuradas.</p>
                ) : (
                  <>
                    {/* Toggle de duração para medida de tempo */}
                    {(() => {
                      const timeMeasure = (selectedActivity.measures || []).find(m => isTimeUnit(m.unit))
                      if (!timeMeasure) return null
                      const minutes = window.__dur.computeDurationMins(form)
                      return (
                        <div className="form-row" style={{ width: 'fit-content', marginRight: 0, paddingRight: 0 }}>
                          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, width: 'fit-content', cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              style={{ width: 16, height: 16, margin: 0, flex: '0 0 auto', display: 'inline-block' }}
                              checked={form.useDurationForMeasure && form.durationTargetMeasureKey === timeMeasure.key}
                              onChange={(e)=> {
                                const checked = e.target.checked
                                const next = { ...form, useDurationForMeasure: checked, durationTargetMeasureKey: timeMeasure.key }
                                // se ligar, preenche o campo
                                if (checked) {
                                  next.measures = { ...(form.measures||{}), [timeMeasure.key]: minutes }
                                }
                                setForm(next)
                              }}
                            />
                            <span>Usar duração do lançamento para {timeMeasure.label || timeMeasure.key} ({timeMeasure.unit})</span>
                          </label>
                        </div>
                      )
                    })()}

                    {(selectedActivity.measures || []).map(m => (
                      <div className="form-row" key={m.key}>
                        <label htmlFor={`m-${m.key}`}>{m.label || m.key} <span className="hint">{m.unit || ''}</span></label>
                        <input
                          id={`m-${m.key}`}
                          type="number"
                          step={m.step ?? (m.decimals ? (1/Math.pow(10, m.decimals)) : 1)}
                          value={form.measures?.[m.key] ?? ''}
                          min={m.minPerEntry ?? m.min ?? undefined}
                          max={m.maxPerEntry ?? m.max ?? undefined}
                          disabled={form.useDurationForMeasure && form.durationTargetMeasureKey === m.key}
                          onChange={(e)=> setForm({ ...form, measures: { ...(form.measures||{}), [m.key]: e.target.value } })}
                        />
                      </div>
                    ))}
                  </>
                )}
              </section>
            )}

            {/* Notas */}
            <section>
              <h3>Notas</h3>
              <div className="form-row">
                <label htmlFor="notes">Notas</label>
                <textarea
                  id="notes"
                  rows={4}
                  value={form.notes || ''}
                  onChange={(e)=> setForm({ ...form, notes: e.target.value })}
                  placeholder="Observações adicionais sobre este lançamento"
                />
              </div>
            </section>
          </>
        )}
      />

      {notify && (
        <div className="overcontent" role="dialog" aria-modal="true" aria-label={notify.title} onClick={() => setNotify(null)}>
          <div className="overcontent-card" onClick={(e)=> e.stopPropagation()}>
            <div className="overcontent-header">
              <h3>{notify.title}</h3>
              <button className="btn btn-ghost close-btn" aria-label="Fechar" onClick={() => setNotify(null)}>✕</button>
            </div>
            <div className="overcontent-body">
              <p>{notify.message}</p>
            </div>
          </div>
        </div>
      )}
    </CrudLayout>
  )
}

export default Lancamentos
