import { useEffect, useState, useRef } from 'react'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'
import CrudLayout from './crud/CrudLayout'
import CrudFilter from './crud/CrudFilter'
import CrudCard from './crud/CrudCard'
import CrudFormModal from './crud/CrudFormModal'

function Attributes() {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [filterField, setFilterField] = useState('name')
  const [filterQuery, setFilterQuery] = useState('')

  const NAME_MAX = 48
  const [form, setForm] = useState({ name: '', description: '' })
  const textSample = `Exemplo de descrição (use seu próprio texto):\n- Definição: descreva o que este atributo representa.\n- Exemplos (+): liste comportamentos desejáveis relacionados ao atributo.\n- Exemplos (–): liste comportamentos que prejudicam o atributo.\n- Notas: inclua observações adicionais, referências ou dicas.`

  useEffect(() => { fetchItems() }, [])

  const fetchItems = async () => {
    try {
      const res = await axios.get(`/api/attributes?user_id=${user.id}`)
      setItems(res.data.data || [])
    } catch (err) {
      console.error(err)
      setError('Erro ao carregar atributos')
    } finally {
      setLoading(false)
    }
  }

  const openCreate = () => {
    setIsEditing(false)
    setEditingId(null)
    setForm({ name: '', description: '' })
    setShowCreate(true)
  }

  const openEdit = (item) => {
    setIsEditing(true)
    setEditingId(item.id)
    setForm({ name: item.name || '', description: item.description || '' })
    setShowCreate(true)
  }

  const handleSave = async (payload) => {
    try {
      const body = {
        user_id: user.id,
        name: payload.name,
        description: payload.description || null,
      }
      if (isEditing && editingId) {
        await axios.put(`/api/attributes/${editingId}`, body)
      } else {
        await axios.post('/api/attributes', body)
      }
      setShowCreate(false)
      setIsEditing(false)
      setEditingId(null)
      fetchItems()
    } catch (err) {
      console.error(err)
      setError(isEditing ? 'Erro ao editar atributo' : 'Erro ao criar atributo')
    }
  }

  const handleDelete = async (id) => {
    try {
      await axios.delete(`/api/attributes/${id}?user_id=${user.id}`)
      fetchItems()
    } catch (err) {
      console.error(err)
      setError('Erro ao deletar atributo')
    }
  }

  if (loading) return <div>Carregando...</div>

  const filtered = items.filter(c => {
    const val = (c[filterField] || '').toLowerCase()
    return val.includes(filterQuery.toLowerCase())
  })

  return (
    <CrudLayout
      title="Atributos"
      actions={(
        <>
          <button className="btn btn-primary" onClick={openCreate}>＋ Novo atributo</button>
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
        <p>Nenhum atributo ainda.</p>
      ) : (
        <div className="crud-grid">
          {filtered.map(item => (
            <CrudCard
              key={item.id}
              item={item}
              title={item.name}
              description={item.description}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <CrudFormModal
        open={showCreate}
        title={isEditing ? 'Editar Atributo' : 'Novo Atributo'}
        subtitle="Ex.: Conhecimento, Vitalidade, Disciplina"
        hideBaseFields
        initial={form}
        onSubmit={({ name, description }) => handleSave({ name: (name||'').trim(), description: (description||'').trim() })}
        onClose={() => { setShowCreate(false); setIsEditing(false); setEditingId(null); }}
        customFields={({ form: f, setForm: setF }) => (
          <>
            <div className="form-group">
              <label htmlFor="name">Nome <span className="hint">até {NAME_MAX} caracteres</span></label>
              <div className="with-counter">
                <input
                  id="name"
                  type="text"
                  value={f.name}
                  maxLength={NAME_MAX}
                  onChange={(e) => setF({ ...f, name: e.target.value.slice(0, NAME_MAX) })}
                  placeholder="Ex.: Conhecimento"
                  required
                />
                <span className={`counter ${f.name.length === NAME_MAX ? 'limit' : ''}`}>{f.name.length}/{NAME_MAX}</span>
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="description">Descrição detalhada</label>
              <textarea
                id="description"
                rows={8}
                value={f.description || ''}
                onChange={(e) => setF({ ...f, description: e.target.value })}
                placeholder={textSample}
              />
              <p className="note">Use múltiplas linhas e marcadores, se desejar, como no exemplo.</p>
            </div>
          </>
        )}
      />
    </CrudLayout>
  )
}

export default Attributes
