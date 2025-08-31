import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'
import CrudLayout from './crud/CrudLayout'
import CrudFilter from './crud/CrudFilter'
import CrudCard from './crud/CrudCard'
import CrudFormModal from './crud/CrudFormModal'

function Categories() {
  const { user } = useAuth()
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [filterField, setFilterField] = useState('name')
  const [filterQuery, setFilterQuery] = useState('')

  const NAME_MAX = 48
  const DESC_MAX = 120
  const [newCategory, setNewCategory] = useState({
    name: '',
    short_description: ''
  })

  useEffect(() => {
    fetchCategories()
  }, [])

  // Modal lifecycle handled inside CategoryFormModal

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

  const handleSave = async ({ name, short_description }) => {
    try {
      if (isEditing && editingId) {
        await axios.put(`/api/categories/${editingId}`, {
          user_id: user.id,
          name,
          short_description,
        })
      } else {
        await axios.post('/api/categories', {
          user_id: user.id,
          name,
          short_description,
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
    <CrudLayout
      title="Categorias"
      actions={(
        <>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>＋ Nova categoria</button>
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
        <p>Nenhuma categoria ainda.</p>
      ) : (
        <div className="crud-grid">
          {filtered.map(cat => {
            const isOwner = cat.user_id === user.id
            return (
              <CrudCard
                key={cat.id}
                item={cat}
                onEdit={isOwner ? openEdit : undefined}
                onDelete={isOwner ? handleDelete : undefined}
              />
            )
          })}
        </div>
      )}

      <CrudFormModal
        open={showCreate}
        title={isEditing ? 'Editar Categoria' : 'Nova Categoria'}
        subtitle="Agrupe atividades e tarefas por tema"
        nameMax={NAME_MAX}
        descMax={DESC_MAX}
        initial={newCategory}
        onSubmit={handleSave}
        onClose={() => { setShowCreate(false); setIsEditing(false); setEditingId(null); }}
      />
    </CrudLayout>
  )
}

export default Categories
