import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'
import './Categories.css'

function Categories() {
  const { user } = useAuth()
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [filterField, setFilterField] = useState('name')
  const [filterQuery, setFilterQuery] = useState('')
  const nameRef = useRef(null)

  const NAME_MAX = 48
  const DESC_MAX = 120
  const [newCategory, setNewCategory] = useState({
    name: '',
    short_description: ''
  })

  useEffect(() => {
    fetchCategories()
  }, [])

  useEffect(() => {
    if (!showCreate) return
    const onKey = (e) => { if (e.key === 'Escape') setShowCreate(false) }
    window.addEventListener('keydown', onKey)
    setTimeout(() => nameRef.current && nameRef.current.focus(), 0)
    return () => window.removeEventListener('keydown', onKey)
  }, [showCreate])

  const fetchCategories = async () => {
    try {
      const res = await axios.get(`/api/categories?user_id=${user.id}`)
      setCategories(res.data.data || [])
    } catch (err) {
      console.error(err)
      setError('Erro ao carregar categorias')
    } finally {
      setLoading(false)
    }
  }

  const openEdit = (cat) => {
    setIsEditing(true)
    setEditingId(cat.id)
    setNewCategory({
      name: cat.name || '',
      short_description: cat.short_description || ''
    })
    setShowCreate(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (isEditing && editingId) {
        await axios.put(`/api/categories/${editingId}`, {
          user_id: user.id,
          name: newCategory.name.trim(),
          short_description: (newCategory.short_description || '').trim() || null
        })
      } else {
        await axios.post('/api/categories', {
          user_id: user.id,
          name: newCategory.name.trim(),
          short_description: (newCategory.short_description || '').trim() || null
        })
      }
      setNewCategory({ name: '', short_description: '' })
      setIsEditing(false)
      setEditingId(null)
      setShowCreate(false)
      fetchCategories()
    } catch (err) {
      console.error(err)
      setError(isEditing ? 'Erro ao editar categoria' : 'Erro ao criar categoria')
    }
  }

  const handleDelete = async (id) => {
    try {
      await axios.delete(`/api/categories/${id}?user_id=${user.id}`)
      fetchCategories()
    } catch (err) {
      console.error(err)
      setError('Erro ao deletar categoria')
    }
  }

  if (loading) return <div>Carregando...</div>

  const filtered = categories.filter(c => {
    const val = (c[filterField] || '').toLowerCase()
    return val.includes(filterQuery.toLowerCase())
  })

  return (
    <div className="categories">
      <header className="categories-header">
        <h1>Categorias</h1>
        <div className="actions">
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>＋ Nova categoria</button>
        </div>
      </header>

      <div className="filter-bar" role="search">
        <label className="field">
          <span className="lbl">Campo</span>
          <select value={filterField} onChange={(e) => setFilterField(e.target.value)}>
            <option value="name">Nome</option>
            <option value="short_description">Descrição</option>
          </select>
        </label>
        <label className="field fill">
          <span className="lbl">Filtrar</span>
          <input
            type="text"
            placeholder="Digite para filtrar..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
          />
        </label>
      </div>

      <div className="categories-content">
        {error && <div className="error">{error}</div>}
        {filtered.length === 0 ? (
          <p>Nenhuma categoria ainda.</p>
        ) : (
          <div className="categories-grid">
            {filtered.map(cat => (
              <div key={cat.id} className="category-card">
                <div className="category-main">
                  <h3>{cat.name}</h3>
                  {cat.short_description && <p className="desc">{cat.short_description}</p>}
                </div>
                <div className="card-actions">
                  <button className="btn btn-secondary btn-sm" onClick={() => openEdit(cat)}>Editar</button>
                  <button className="delete-btn btn-sm" onClick={() => handleDelete(cat.id)}>Excluir</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <div className="modal-backdrop" onClick={() => setShowCreate(false)} aria-hidden="true">
          <div className="category-modal" role="dialog" aria-modal="true" aria-label={isEditing ? 'Editar categoria' : 'Criar nova categoria'} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <h2>{isEditing ? 'Editar Categoria' : 'Nova Categoria'}</h2>
                <span className="subtitle">Agrupe atividades e tarefas por tema</span>
              </div>
              <div className="header-actions">
                <button className="btn btn-ghost help-btn" aria-label="Ajuda" onClick={() => setShowHelp(true)}>❔</button>
                <button className="btn btn-ghost close-btn" aria-label="Fechar" onClick={() => { setShowCreate(false); setIsEditing(false); setEditingId(null); }}>✕</button>
              </div>
            </div>
            <form onSubmit={handleSubmit} className="category-form" autoComplete="off">
              <div className="form-group">
                <label htmlFor="name">Nome <span className="hint">até {NAME_MAX} caracteres</span></label>
                <div className="with-counter">
                  <input
                    id="name"
                    type="text"
                    ref={nameRef}
                    value={newCategory.name}
                    maxLength={NAME_MAX}
                    onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value.slice(0, NAME_MAX) })}
                    placeholder="Ex: conhecimento"
                    required
                  />
                  <span className={`counter ${newCategory.name.length === NAME_MAX ? 'limit' : ''}`}>{newCategory.name.length}/{NAME_MAX}</span>
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="short_description">Descrição curta <span className="hint">até {DESC_MAX} caracteres</span></label>
                <div className="with-counter">
                  <input
                    id="short_description"
                    type="text"
                    value={newCategory.short_description}
                    maxLength={DESC_MAX}
                    onChange={(e) => setNewCategory({ ...newCategory, short_description: e.target.value.slice(0, DESC_MAX) })}
                    placeholder="Opcional"
                  />
                  <span className={`counter ${newCategory.short_description.length === DESC_MAX ? 'limit' : ''}`}>{newCategory.short_description.length}/{DESC_MAX}</span>
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => { setShowCreate(false); setIsEditing(false); setEditingId(null); }}>Cancelar</button>
                <button type="submit" className="btn btn-primary">{isEditing ? 'Salvar' : 'Adicionar'}</button>
              </div>
            </form>

            {showHelp && (
              <div className="overcontent" role="dialog" aria-modal="true" aria-label="Ajuda categorias">
                <div className="overcontent-card">
                  <div className="overcontent-header">
                    <h3>Como usar Categorias</h3>
                    <button className="btn btn-ghost close-btn" aria-label="Fechar ajuda" onClick={() => setShowHelp(false)}>✕</button>
                  </div>
                  <div className="overcontent-body">
                    <p>Use categorias para organizar atividades e tarefas por temas. Exemplos: "conhecimento", "saúde", "finanças".</p>
                    <ul>
                      <li>Nome curto e direto (máx. {NAME_MAX}).</li>
                      <li>Descrição curta opcional (máx. {DESC_MAX}) para lembrar a finalidade.</li>
                      <li>Você pode editar ou excluir depois.</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default Categories
