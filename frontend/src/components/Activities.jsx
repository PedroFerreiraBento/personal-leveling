import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'
import CrudLayout from './crud/CrudLayout'
import CrudCard from './crud/CrudCard'
import CrudFilter from './crud/CrudFilter'
import CrudFormModal from './crud/CrudFormModal'
import './Activities.css'

function Activities() {
  const { user } = useAuth()
  const [activities, setActivities] = useState([])
  const [categories, setCategories] = useState([])
  const [attributesList, setAttributesList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [filterField, setFilterField] = useState('title')
  const [filterQuery, setFilterQuery] = useState('')
  
  // Form initial for CrudFormModal (mapped fields)
  const INITIAL_FORM = { 
    name: '', 
    shortDescription: '', 
    categoryId: '', 
    polarity: 'positive', 
    measures: [], 
    derivedMeasures: [],
    attributes: { model: 'weights', entries: [] },
    scoring: {
      mode: 'simple',
      simple: { measureRef: '', pointsPerUnit: '', basePoints: '' },
      linear: { terms: [], basePoints: '' },
      formula: { expression: '', safeClamp: { min: '', max: '' } },
      rounding: 'none',
      precision: 0,
      allowNegative: true,
    }
  }

  useEffect(() => {
    fetchActivities()
    fetchCategories()
    fetchAttributes()
  }, [])

  // Close on ESC handled inside CrudFormModal

  const fetchActivities = async () => {
    try {
      const response = await axios.get(`/api/activities?user_id=${user.id}`)
      setActivities(response.data.data || [])
    } catch (error) {
      setError('Erro ao carregar atividades')
      console.error('Error fetching activities:', error)
    } finally {
      setLoading(false)
    }
  }
  const fetchCategories = async () => {
    try {
      const res = await axios.get(`/api/categories?user_id=${user.id}`)
      setCategories(res.data.data || [])
    } catch (err) {
      console.error('Error fetching categories:', err)
    }
  }
  const fetchAttributes = async () => {
    try {
      const res = await axios.get(`/api/attributes?user_id=${user.id}`)
      setAttributesList(res.data.data || [])
    } catch (err) {
      console.error('Error fetching attributes:', err)
    }
  }
  

  const handleSave = async (form) => {
    try {
      await axios.post('/api/activities', {
        user_id: user.id,
        title: form.name,
        short_description: form.shortDescription || null,
        category_id: form.categoryId || null,
        polarity: form.polarity || 'positive',
        attributes: {
          model: (form.attributes?.model || 'weights'),
          entries: (form.attributes?.entries || []).map(e => ({
            key: (e.key || '').trim(),
            value: e.value !== '' && e.value != null ? Number(e.value) : null,
          })).filter(e => e.key)
        },
        measures: (form.measures || []).map(m => ({
          key: (m.key || '').trim(),
          label: (m.label || '').trim(),
          unit: m.unit || 'custom',
          decimals: Number.isFinite(+m.decimals) ? Math.min(3, Math.max(0, +m.decimals)) : 0,
          minPerEntry: m.minPerEntry !== '' && m.minPerEntry != null ? Number(m.minPerEntry) : null,
          maxPerEntry: m.maxPerEntry !== '' && m.maxPerEntry != null ? Number(m.maxPerEntry) : null,
          step: m.step !== '' && m.step != null ? Number(m.step) : null,
          defaultValue: m.defaultValue !== '' && m.defaultValue != null ? Number(m.defaultValue) : null,
        })),
        derivedMeasures: (form.derivedMeasures || []).map(d => ({
          key: (d.key || '').trim(),
          label: (d.label || '').trim(),
          formula: (d.formula || '').trim(),
        })),
        scoring: (() => {
          const s = form.scoring || {}
          const globalBase = s.basePoints !== '' && s.basePoints != null ? Number(s.basePoints) : null
          const out = {
            mode: s.mode || 'simple',
            rounding: s.rounding || 'none',
            precision: Number.isFinite(+s.precision) ? Math.min(3, Math.max(0, +s.precision)) : 0,
            allowNegative: !!s.allowNegative,
          }
          if (out.mode === 'simple') {
            out.simple = {
              measureRef: (s.simple?.measureRef || '').trim(),
              pointsPerUnit: s.simple?.pointsPerUnit !== '' && s.simple?.pointsPerUnit != null ? Number(s.simple.pointsPerUnit) : null,
              basePoints: globalBase,
            }
          } else if (out.mode === 'linear') {
            out.linear = {
              terms: (s.linear?.terms || []).map(t => ({
                measureRef: (t.measureRef || '').trim(),
                pointsPerUnit: t.pointsPerUnit !== '' && t.pointsPerUnit != null ? Number(t.pointsPerUnit) : null,
                capUnits: t.capUnits !== '' && t.capUnits != null ? Number(t.capUnits) : null,
              })),
              basePoints: globalBase,
            }
          } else if (out.mode === 'formula') {
            out.formula = {
              expression: (s.formula?.expression || '').trim(),
              safeClamp: {
                min: s.formula?.safeClamp?.min !== '' && s.formula?.safeClamp?.min != null ? Number(s.formula.safeClamp.min) : null,
                max: s.formula?.safeClamp?.max !== '' && s.formula?.safeClamp?.max != null ? Number(s.formula.safeClamp.max) : null,
              }
            }
          }
          return out
        })(),
      })
      fetchActivities()
      setShowCreate(false)
    } catch (error) {
      setError('Erro ao criar atividade')
      console.error('Error creating activity:', error)
    }
  }

  const handleDelete = async (id) => {
    try {
      await axios.delete(`/api/activities/${id}?user_id=${user.id}`)
      fetchActivities()
    } catch (error) {
      setError('Erro ao deletar atividade')
      console.error('Error deleting activity:', error)
    }
  }

  if (loading) return <div>Carregando...</div>

  const filtered = activities.filter(a => {
    const val = (a[filterField] || '').toString().toLowerCase()
    return val.includes(filterQuery.toLowerCase())
  })

  return (
    <CrudLayout
      title="Atividades"
      actions={(
        <>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>＋ Nova atividade</button>
          <a href="/dashboard" className="back-link">← Voltar</a>
        </>
      )}
      filter={(
        <CrudFilter
          field={filterField}
          query={filterQuery}
          onChangeField={setFilterField}
          onChangeQuery={setFilterQuery}
          options={[
            { value: 'title', label: 'Título' },
            { value: 'category', label: 'Categoria' },
          ]}
        />
      )}
    >
      <h2>Atividades Recentes</h2>
      {error && <div className="error">{error}</div>}

      {filtered.length === 0 ? (
        <p>Nenhuma atividade registrada ainda.</p>
      ) : (
        <div className="crud-grid">
          {filtered.map(activity => (
            <CrudCard
              key={activity.id}
              item={activity}
              title={activity.title}
              description={`${activity.category ? activity.category + ' · ' : ''}${activity.duration_minutes} minutos · ${new Date(activity.timestamp).toLocaleDateString('pt-BR')}`}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <CrudFormModal
        open={showCreate}
        title="Nova Atividade"
        subtitle="Identificação"
        initial={INITIAL_FORM}
        onSubmit={handleSave}
        onClose={() => setShowCreate(false)}
        hideBaseFields
        customFields={({ form, setForm }) => (
          <section>
            <h3>Identificação</h3>
            <div className="form-row">
              <label htmlFor="name" title="Nome da atividade exibido em listas e cartões.">Nome <span className="hint">2–64 caracteres</span></label>
              <input
                id="name"
                type="text"
                value={form.name}
                minLength={2}
                maxLength={64}
                placeholder="Ex.: Leitura"
                onChange={(e) => setForm({ ...form, name: e.target.value.slice(0, 64) })}
                required
              />
            </div>
            <hr className="sep" />
            <div className="form-row">
              <label htmlFor="shortDescription" title="Breve descrição do propósito da atividade.">Descrição curta <span className="hint">até 120 caracteres</span></label>
              <input
                id="shortDescription"
                type="text"
                value={form.shortDescription}
                maxLength={120}
                placeholder="Propósito da atividade"
                onChange={(e) => setForm({ ...form, shortDescription: e.target.value.slice(0, 120) })}
              />
            </div>
          <div className="form-row">
            <label htmlFor="categoryId" title="Agrupa atividades similares para facilitar filtros e relatórios.">Categoria</label>
              <select
                id="categoryId"
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
              >
                <option value="">Sem categoria</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
          </div>
          <div className="form-row">
              <label htmlFor="polarity" title="Indica se a atividade contribui positivamente, negativamente ou é neutra para seus objetivos.">Polaridade</label>
              <select
                id="polarity"
                value={form.polarity}
                onChange={(e) => setForm({ ...form, polarity: e.target.value })}
              >
                <option value="positive">positivo</option>
                <option value="neutral">neutro</option>
                <option value="negative">negativo</option>
              </select>
          </div>
          {/* Distribuição da pontuação em atributos */}
          <div className="form-group" style={{ marginTop: 8 }}>
            <label className="lbl" title="Define para onde os pontos da atividade vão e em qual proporção.">Distribuição da pontuação em atributos</label>
            <div className="segmented">
              {['weights','percent'].map(opt => (
                <button
                  key={opt}
                  type="button"
                  className={`option ${((form.attributes?.model||'weights')===opt)?'active':''}`}
                  onClick={()=> setForm({ ...form, attributes: { ...(form.attributes||{}), model: opt } })}
                >
                  {opt === 'weights' ? 'Pesos' : 'Percentual'}
                </button>
              ))}
            </div>
            <p className="note">
              {form.attributes?.model === 'percent' ? 'A soma deve fechar 100. A normalização é aplicada.' : 'Soma livre de pesos. A normalização é aplicada.'}
            </p>
            <div className="array-editor">
              {(form.attributes?.entries || []).map((a, idx) => (
                <div className="array-item" key={idx}>
                  <div className="inline-fields full">
                    <div className="field">
                      <label>Atributo</label>
                      <select
                        value={a.key || ''}
                        onChange={(e)=>{
                          const arr=[...(form.attributes?.entries||[])];arr[idx]={...arr[idx], key:e.target.value};setForm({...form, attributes:{...(form.attributes||{}), entries:arr}})
                        }}
                      >
                        <option value="">Selecione um atributo</option>
                        {attributesList.map(opt => (
                          <option key={opt.id} value={opt.name}>{opt.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="inline-fields full">
                    <div className="field xsmall">
                      <label>{form.attributes?.model === 'percent' ? 'Percentual' : 'Peso'}</label>
                      <input type="number" value={a.value ?? ''} onChange={(e)=>{
                        const arr=[...(form.attributes?.entries||[])];arr[idx]={...arr[idx], value:e.target.value};setForm({...form, attributes:{...(form.attributes||{}), entries:arr}})
                      }} />
                    </div>
                  </div>
                  <div className="inline-fields full">
                    <button type="button" className="btn btn-ghost btn-sm" onClick={()=>{
                      const arr=[...(form.attributes?.entries||[])];arr.splice(idx,1);setForm({...form, attributes:{...(form.attributes||{}), entries:arr}})
                    }}>Remover</button>
                  </div>
                </div>
              ))}
              <button type="button" className="btn btn-secondary" onClick={()=>{
                const arr=[...(form.attributes?.entries||[]), { key:'', value:'' }];
                setForm({...form, attributes:{...(form.attributes||{}), entries:arr}})
              }}>+ Adicionar atributo</button>
            </div>
          </div>
          <hr className="sep" />

            <h3>Medidas</h3>
            <div className="array-editor">
              {(form.measures || []).map((m, idx) => (
                <div className="array-item" key={idx}>
                  <div className="inline-fields">
                    <div className="field small">
                      <label title="Identificador único (slug) da medida. Use letras minúsculas e sem espaços.">Key</label>
                      <input type="text" value={m.key || ''} placeholder="distance" onChange={(e)=>{
                        const arr=[...form.measures];arr[idx]={...arr[idx], key:e.target.value};setForm({...form, measures:arr})
                      }} />
                    </div>
                    <div className="field">
                      <label title="Nome amigável exibido na interface.">Label</label>
                      <input type="text" value={m.label || ''} placeholder="Distância" onChange={(e)=>{
                        const arr=[...form.measures];arr[idx]={...arr[idx], label:e.target.value};setForm({...form, measures:arr})
                      }} />
                    </div>
                    <div className="field small">
                      <label title="Unidade da medida (texto livre). Sugestões disponíveis.">Unidade</label>
                      <input type="text" list="unit-suggestions" value={m.unit || ''} placeholder="ex.: km, min, pages" onChange={(e)=>{
                        const arr=[...form.measures];arr[idx]={...arr[idx], unit:e.target.value};setForm({...form, measures:arr})
                      }} />
                    </div>
                    <div className="field xsmall">
                      <label title="Quantidade de casas decimais permitidas (0–3).">Decimais</label>
                      <input type="number" min="0" max="3" value={m.decimals ?? 0} onChange={(e)=>{
                        const arr=[...form.measures];arr[idx]={...arr[idx], decimals:e.target.value};setForm({...form, measures:arr})
                      }} />
                    </div>
                  </div>
                  <div className="inline-fields">
                    <div className="field small"><label title="Valor mínimo permitido em um lançamento.">Mín/lanç.</label><input type="number" value={m.minPerEntry ?? ''} onChange={(e)=>{const arr=[...form.measures];arr[idx]={...arr[idx], minPerEntry:e.target.value};setForm({...form, measures:arr})}} /></div>
                    <div className="field small"><label title="Valor máximo permitido em um lançamento.">Máx/lanç.</label><input type="number" value={m.maxPerEntry ?? ''} onChange={(e)=>{const arr=[...form.measures];arr[idx]={...arr[idx], maxPerEntry:e.target.value};setForm({...form, measures:arr})}} /></div>
                    <div className="field xsmall"><label title="Incremento padrão ao ajustar a medida.">Step</label><input type="number" value={m.step ?? ''} onChange={(e)=>{const arr=[...form.measures];arr[idx]={...arr[idx], step:e.target.value};setForm({...form, measures:arr})}} /></div>
                    <div className="field xsmall"><label title="Valor inicial sugerido ao criar um lançamento.">Default</label><input type="number" value={m.defaultValue ?? ''} onChange={(e)=>{const arr=[...form.measures];arr[idx]={...arr[idx], defaultValue:e.target.value};setForm({...form, measures:arr})}} /></div>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={()=>{
                      const arr=[...form.measures];arr.splice(idx,1);setForm({...form, measures:arr})
                    }}>Remover</button>
                  </div>
                </div>
              ))}
              <datalist id="unit-suggestions">
                <option value="km" />
                <option value="min" />
                <option value="pages" />
                <option value="items" />
                <option value="currency" />
              </datalist>
              <button type="button" className="btn btn-secondary" onClick={()=> setForm({...form, measures:[...(form.measures||[]), { key:'', label:'', unit:'', decimals:0 }]})}>+ Adicionar medida</button>
            </div>

            <h3>Medidas derivadas</h3>
            <div className="array-editor">
              {(form.derivedMeasures || []).map((d, idx) => (
                <div className="array-item" key={idx}>
                  <div className="inline-fields">
                    <div className="field small"><label title="Identificador único (slug) da medida derivada.">Key</label><input type="text" value={d.key || ''} placeholder="pace" onChange={(e)=>{const arr=[...form.derivedMeasures];arr[idx]={...arr[idx], key:e.target.value};setForm({...form, derivedMeasures:arr})}} /></div>
                    <div className="field"><label title="Nome amigável exibido na interface.">Label</label><input type="text" value={d.label || ''} placeholder="Ritmo (min/km)" onChange={(e)=>{const arr=[...form.derivedMeasures];arr[idx]={...arr[idx], label:e.target.value};setForm({...form, derivedMeasures:arr})}} /></div>
                  </div>
                  <div className="field"><label title="Expressão que usa chaves de outras medidas (ex.: time / distance).">Fórmula</label><input type="text" value={d.formula || ''} placeholder="time / distance" onChange={(e)=>{const arr=[...form.derivedMeasures];arr[idx]={...arr[idx], formula:e.target.value};setForm({...form, derivedMeasures:arr})}} /></div>
                  <div className="inline-fields">
                    <button type="button" className="btn btn-ghost btn-sm" onClick={()=>{const arr=[...form.derivedMeasures];arr.splice(idx,1);setForm({...form, derivedMeasures:arr})}}>Remover</button>
                  </div>
                </div>
              ))}
              <button type="button" className="btn btn-secondary" onClick={()=> setForm({...form, derivedMeasures:[...(form.derivedMeasures||[]), { key:'', label:'', formula:'' }]})}>+ Adicionar derivada</button>
            </div>

            <hr className="sep" />
            {/* Datalist com chaves de medidas e derivadas para auto-completar */}
            <datalist id="measure-keys">
              {(form.measures || []).map((m, i) => (
                <option key={`m-${i}`} value={m.key || ''} />
              ))}
              {(form.derivedMeasures || []).map((d, i) => (
                <option key={`d-${i}`} value={d.key || ''} />
              ))}
            </datalist>
            <h3>Pontuação</h3>
            <div className="array-editor">
              <div className="array-item">
                <div className="form-group">
                  <label className="lbl" title="Modo de cálculo de pontos: simples, linear (somatório de termos) ou fórmula.">Modo</label>
                  <div className="segmented">
                    {['simple','linear','formula'].map(opt => (
                      <button
                        key={opt}
                        type="button"
                        className={`option ${((form.scoring?.mode||'simple')===opt)?'active':''}`}
                        onClick={()=> setForm({ ...form, scoring: { ...(form.scoring||{}), mode: opt } })}
                      >
                        {opt === 'simple' ? 'Simples' : opt === 'linear' ? 'Linear' : 'Fórmula'}
                      </button>
                    ))}
                  </div>
                </div>

                

                {(form.scoring?.mode || 'simple') === 'simple' && (
                  <>
                    <div className="form-row">
                      <label title="Chave da medida usada para pontuar.">Medida</label>
                      <input type="text" list="measure-keys" value={form.scoring?.simple?.measureRef || ''} onChange={(e)=> setForm({ ...form, scoring: { ...(form.scoring||{}), simple: { ...(form.scoring?.simple||{}), measureRef: e.target.value } } })} />
                    </div>
                    <div className="form-row">
                      <label title="Pontos por unidade da medida.">Pontos/unid.</label>
                      <input type="number" value={form.scoring?.simple?.pointsPerUnit ?? ''} onChange={(e)=> setForm({ ...form, scoring: { ...(form.scoring||{}), simple: { ...(form.scoring?.simple||{}), pointsPerUnit: e.target.value } } })} />
                    </div>
                    
                  </>
                )}

                {form.scoring?.mode === 'linear' && (
                  <div className="array-editor">
                    {(form.scoring?.linear?.terms || []).map((t, i) => (
                      <div className="array-item" key={i}>
                        <div className="inline-fields">
                          <div className="field">
                            <label title="Chave da medida (ou derivada) utilizada no termo.">Medida</label>
                            <input type="text" list="measure-keys" value={t.measureRef || ''} onChange={(e)=>{
                              const terms=[...(form.scoring?.linear?.terms||[])];terms[i]={...terms[i], measureRef:e.target.value};
                              setForm({...form, scoring:{...(form.scoring||{}), linear:{...(form.scoring?.linear||{}), terms}}})
                            }} />
                          </div>
                          <div className="field xsmall">
                            <label title="Pontos por unidade do termo.">Pontos/unid.</label>
                            <input type="number" value={t.pointsPerUnit ?? ''} onChange={(e)=>{
                              const terms=[...(form.scoring?.linear?.terms||[])];terms[i]={...terms[i], pointsPerUnit:e.target.value};
                              setForm({...form, scoring:{...(form.scoring||{}), linear:{...(form.scoring?.linear||{}), terms}}})
                            }} />
                          </div>
                          <div className="field xsmall">
                            <label title="Pontua apenas até X unidades.">Limite (unid.)</label>
                            <input type="number" value={t.capUnits ?? ''} onChange={(e)=>{
                              const terms=[...(form.scoring?.linear?.terms||[])];terms[i]={...terms[i], capUnits:e.target.value};
                              setForm({...form, scoring:{...(form.scoring||{}), linear:{...(form.scoring?.linear||{}), terms}}})
                            }} />
                          </div>
                          <button type="button" className="btn btn-ghost btn-sm" onClick={()=>{
                            const terms=[...(form.scoring?.linear?.terms||[])];terms.splice(i,1);
                            setForm({...form, scoring:{...(form.scoring||{}), linear:{...(form.scoring?.linear||{}), terms}}})
                          }}>Remover termo</button>
                        </div>
                      </div>
                    ))}
                    <div className="inline-fields">
                      <button type="button" className="btn btn-secondary" onClick={()=>{
                        const terms=[...(form.scoring?.linear?.terms||[]), { measureRef:'', pointsPerUnit:'', capUnits:'' }]
                        setForm({...form, scoring:{...(form.scoring||{}), linear:{...(form.scoring?.linear||{}), terms}}})
                      }}>+ Adicionar termo</button>
                    </div>
                  </div>
                )}

                {form.scoring?.mode === 'formula' && (
                  <>
                    <div className="form-row">
                      <label title="Expressão para calcular pontos (ex.: distance*1 + (time/10)*0.5 + 2).">Expressão</label>
                      <input type="text" value={form.scoring?.formula?.expression || ''} onChange={(e)=> setForm({ ...form, scoring: { ...(form.scoring||{}), formula: { ...(form.scoring?.formula||{}), expression: e.target.value } } })} />
                    </div>
                    <div className="form-row">
                      <label title="Limite mínimo opcional para o resultado.">Mínimo</label>
                      <input type="number" value={form.scoring?.formula?.safeClamp?.min ?? ''} onChange={(e)=> setForm({ ...form, scoring: { ...(form.scoring||{}), formula: { ...(form.scoring?.formula||{}), safeClamp: { ...(form.scoring?.formula?.safeClamp||{}), min: e.target.value } } } })} />
                    </div>
                    <div className="form-row">
                      <label title="Limite máximo opcional para o resultado.">Máximo</label>
                      <input type="number" value={form.scoring?.formula?.safeClamp?.max ?? ''} onChange={(e)=> setForm({ ...form, scoring: { ...(form.scoring||{}), formula: { ...(form.scoring?.formula||{}), safeClamp: { ...(form.scoring?.formula?.safeClamp||{}), max: e.target.value } } } })} />
                    </div>
                  </>
                )}

                {/* Global options that apply to all modes; placed after mode-specific fields */}
                <div className="form-row">
                  <label title="Bônus fixo por lançamento (opcional).">Pontos base</label>
                  <input
                    type="number"
                    value={
                      form.scoring?.basePoints ??
                      form.scoring?.simple?.basePoints ??
                      form.scoring?.linear?.basePoints ??
                      ''
                    }
                    onChange={(e)=> setForm({
                      ...form,
                      scoring: { ...(form.scoring||{}), basePoints: e.target.value }
                    })}
                  />
                </div>
                <div className="form-row">
                  <label title="Precisão de casas decimais do resultado (0–3).">Precisão</label>
                  <input type="number" min="0" max="3" value={form.scoring?.precision ?? 0} onChange={(e)=> setForm({ ...form, scoring: { ...(form.scoring||{}), precision: e.target.value } })} />
                </div>
                <div className="form-row">
                  <label title="Arredondamento aplicado ao resultado final.">Arredondamento</label>
                  <select value={form.scoring?.rounding || 'none'} onChange={(e)=> setForm({ ...form, scoring: { ...(form.scoring||{}), rounding: e.target.value } })}>
                    <option value="none">nenhum</option>
                    <option value="floor">para baixo</option>
                    <option value="ceil">para cima</option>
                    <option value="nearest">mais próximo</option>
                  </select>
                </div>
                <div className="inline-fields compact">
                  <label className="check-inline" title="Permitir resultado negativo.">
                    <input type="checkbox" checked={!!(form.scoring?.allowNegative ?? true)} onChange={(e)=> setForm({ ...form, scoring: { ...(form.scoring||{}), allowNegative: e.target.checked } })} /> Permitir negativo
                  </label>
                </div>

                <p className="note">Dica: use as chaves das medidas/derivadas em expressões, como <code>distance</code> e <code>time</code>.</p>
              </div>
            </div>
          </section>
        )}
      />
    </CrudLayout>
  )

}

export default Activities
