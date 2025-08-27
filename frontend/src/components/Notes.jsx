import { useEffect, useState } from 'react'
import axios from 'axios'

function Notes() {
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
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

  async function createNote(e) {
    e.preventDefault()
    try {
      await axios.post('/api/notes', {
        title: form.title,
        content: form.content,
      })
      setForm({ title: '', content: '' })
      load()
    } catch (e) {
      setError('Falha ao criar nota')
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
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 16 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Notas (demo)</h1>
        <a href="/" style={{ textDecoration: 'none' }}>← Início</a>
      </header>

      <section style={{ marginTop: 16, padding: 12, border: '1px solid #ddd', borderRadius: 8 }}>
        <h2>Criar nova</h2>
        <form onSubmit={createNote} style={{ display: 'grid', gap: 8 }}>
          <input
            type="text"
            placeholder="Título"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
          <textarea
            rows={4}
            placeholder="Conteúdo (opcional)"
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
          />
          <button type="submit">Adicionar</button>
        </form>
      </section>

      {error && <div style={{ color: 'crimson', marginTop: 12 }}>{error}</div>}

      <section style={{ marginTop: 16 }}>
        <h2>Lista</h2>
        {notes.length === 0 ? (
          <p>Nenhuma nota.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 12 }}>
            {notes.map((n) => (
              <li key={n.id} style={{ border: '1px solid #eee', borderRadius: 8, padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong>{n.title}</strong>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => updateNote(n.id, { title: prompt('Novo título', n.title) ?? n.title })}>Renomear</button>
                    <button onClick={() => deleteNote(n.id)} style={{ color: 'crimson' }}>Excluir</button>
                  </div>
                </div>
                {n.content && <p style={{ whiteSpace: 'pre-wrap', marginTop: 8 }}>{n.content}</p>}
                <small style={{ color: '#666' }}>Criado: {new Date(n.created_at).toLocaleString()}</small>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

export default Notes
