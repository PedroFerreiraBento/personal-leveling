import { useEffect, useState } from 'react'
import axios from 'axios'
import CrudLayout from './crud/CrudLayout'
import CrudCard from './crud/CrudCard'
import CrudFormModal from './crud/CrudFormModal'

function Notes() {
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null) // note being edited or null for create
  const [form, setForm] = useState({ title: '', content: '' })

  useEffect(() => { load() }, [])

  async function load() {
    try {
      setLoading(true)
      const res = await axios.get('/api/notes')
      setNotes(res.data.data || [])
    } catch (e) {
      setError('Falha ao carregar notas')
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  function openCreate() {
    setEditing(null)
    setForm({ title: '', content: '' })
    setModalOpen(true)
  }

  function openEdit(note) {
    setEditing(note)
    setForm({ title: note.title || '', content: note.content || '' })
    setModalOpen(true)
  }

  async function submitForm(payload) {
    try {
      if (editing) {
        await axios.patch(`/api/notes/${editing.id}`, payload)
      } else {
        await axios.post('/api/notes', payload)
      }
      setModalOpen(false)
      setEditing(null)
      setForm({ title: '', content: '' })
      load()
    } catch (e) {
      setError(editing ? 'Falha ao atualizar nota' : 'Falha ao criar nota')
      console.error(e)
    }
  }

  async function updateNote(id, fields) {
    try {
      await axios.patch(`/api/notes/${id}`, fields)
      load()
    } catch (e) {
      setError('Falha ao atualizar nota')
      console.error(e)
    }
  }

  async function deleteNote(id) {
    try {
      await axios.delete(`/api/notes/${id}`)
      load()
    } catch (e) {
      setError('Falha ao deletar nota')
      console.error(e)
    }
  }

  if (loading) return <div>Carregando...</div>

  return (
    <CrudLayout
      title="Anotações"
      actions={(
        <button className="btn btn-primary" onClick={openCreate}>+ Nova</button>
      )}
    >
      {error && <div className="alert error" style={{ marginBottom: 12 }}>{error}</div>}

      {notes.length === 0 ? (
        <p className="muted">Nenhuma nota.</p>
      ) : (
        <div className="crud-grid">
          {notes.map((n) => (
            <CrudCard
              key={n.id}
              item={n}
              title={n.title}
              description={n.content}
              onEdit={() => openEdit(n)}
              onDelete={() => deleteNote(n.id)}
            />
          ))}
        </div>
      )}

      <CrudFormModal
        open={modalOpen}
        title={editing ? 'Editar nota' : 'Nova nota'}
        hideBaseFields
        showSectionPager={false}
        onClose={() => { setModalOpen(false); setEditing(null) }}
        onSubmit={() => submitForm({ title: form.title.trim(), content: form.content?.trim() || null })}
        customFields={({}) => (
          <>
            <section>
              <h3>Título</h3>
              <div className="form-group">
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Ex: Ideias para o projeto"
                  required
                />
              </div>
            </section>
            <section>
              <h3>Conteúdo</h3>
              <div className="form-group">
                <textarea
                  rows={6}
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  placeholder="Opcional"
                />
              </div>
            </section>
          </>
        )}
      />
    </CrudLayout>
  )
}

export default Notes
