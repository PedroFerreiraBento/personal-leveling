import { useEffect, useState } from 'react'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'
import CrudLayout from './crud/CrudLayout'
import CrudFilter from './crud/CrudFilter'
import CrudCard from './crud/CrudCard'
import CrudFormModal from './crud/CrudFormModal'
import './Improvements.css'

function Improvements() {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [filterField, setFilterField] = useState('title')
  const [filterQuery, setFilterQuery] = useState('')

  const TITLE_MAX = 120
  const [form, setForm] = useState({ title: '', description: '' })
  const textSample = `Descreva sua sugestão de melhoria em detalhes.\n- O que deseja melhorar?\n- Qual o impacto esperado?\n- Alguma referência/idéia adicional?`

  useEffect(() => { fetchItems() }, [])

  const fetchItems = async () => {
    try {
      const res = await axios.get(`/api/improvements?user_id=${user.id}`)
      setItems(res.data.data || [])
    } catch (err) {
      console.error(err)
      setError('Erro ao carregar solicitações')
    } finally {
      setLoading(false)
    }
  }

  const openCreate = () => {
    setIsEditing(false)
    setEditingId(null)
    setForm({ title: '', description: '' })
    setShowCreate(true)
  }

  const openEdit = (item) => {
    setIsEditing(true)
    setEditingId(item.id)
    setForm({ title: item.title || '', description: item.description || '' })
    setShowCreate(true)
  }

  const handleSave = async (payload) => {
    try {
      const body = {
        user_id: user.id,
        title: payload.title,
        description: payload.description || null,
      }
      if (isEditing && editingId) {
        await axios.put(`/api/improvements/${editingId}`, body)
      } else {
        await axios.post('/api/improvements', body)
      }
      setShowCreate(false)
      setIsEditing(false)
      setEditingId(null)
      fetchItems()
    } catch (err) {
      console.error(err)
      setError(isEditing ? 'Erro ao editar solicitação' : 'Erro ao criar solicitação')
    }
  }

  const handleDelete = async (id) => {
    try {
      await axios.delete(`/api/improvements/${id}?user_id=${user.id}`)
      fetchItems()
    } catch (err) {
      console.error(err)
      setError('Erro ao deletar solicitação')
    }
  }

  if (loading) return <div>Carregando...</div>

  const filtered = items.filter(c => {
    const val = (c[filterField] || '').toLowerCase()
    return val.includes(filterQuery.toLowerCase())
  })

  return (
    <CrudLayout
      title="Solicitações de Melhorias"
      actions={(
        <>
          <button className="btn btn-primary" onClick={openCreate}>＋ Nova solicitação</button>
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
        <p>Nenhuma solicitação ainda.</p>
      ) : (
        <div className="crud-grid">
          {filtered.map(item => {
            const isOwner = item.user_id === user.id
            return (
              <CrudCard
                key={item.id}
                item={item}
                title={item.title}
                description={item.description}
                onEdit={isOwner ? openEdit : undefined}
                onDelete={isOwner ? handleDelete : undefined}
                className={`improvement ${item.status ? 'status-' + item.status : ''}`}
              />
            )
          })}
        </div>
      )}

      <CrudFormModal
        open={showCreate}
        title={isEditing ? 'Editar solicitação' : 'Nova solicitação'}
        subtitle="Descreva brevemente no título e detalhe na descrição"
        hideBaseFields
        initial={form}
        onSubmit={({ title, description }) => handleSave({ title: (title||'').trim(), description: (description||'').trim() })}
        onClose={() => { setShowCreate(false); setIsEditing(false); setEditingId(null); }}
        customFields={({ form: f, setForm: setF }) => (
          <>
            <div className="form-group">
              <label htmlFor="title">Título <span className="hint">até {TITLE_MAX} caracteres</span></label>
              <div className="with-counter">
                <input
                  id="title"
                  type="text"
                  value={f.title}
                  maxLength={TITLE_MAX}
                  onChange={(e) => setF({ ...f, title: e.target.value.slice(0, TITLE_MAX) })}
                  placeholder="Ex.: Melhorar UX do filtro no CRUD"
                  required
                />
                <span className={`counter ${f.title.length === TITLE_MAX ? 'limit' : ''}`}>{f.title.length}/{TITLE_MAX}</span>
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="description">Descrição</label>
              <textarea
                id="description"
                rows={8}
                value={f.description || ''}
                onChange={(e) => setF({ ...f, description: e.target.value })}
                placeholder={textSample}
              />
              <p className="note">Explique o problema, a proposta e o resultado esperado.</p>
            </div>
          </>
        )}
      />
    </CrudLayout>
  )
}

export default Improvements
