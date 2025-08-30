import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'
import './Activities.css'

function Activities() {
  const { user } = useAuth()
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const titleRef = useRef(null)
  
  const [newActivity, setNewActivity] = useState({
    title: '',
    category: '',
    duration_minutes: ''
  })

  useEffect(() => {
    fetchActivities()
  }, [])

  // Close on ESC when modal is open
  useEffect(() => {
    if (!showCreate) return
    const onKey = (e) => { if (e.key === 'Escape') setShowCreate(false) }
    window.addEventListener('keydown', onKey)
    // focus title input on open
    setTimeout(() => titleRef.current && titleRef.current.focus(), 0)
    return () => window.removeEventListener('keydown', onKey)
  }, [showCreate])

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

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    try {
      await axios.post('/api/activities', {
        user_id: user.id,
        title: newActivity.title,
        category: newActivity.category || null,
        duration_minutes: parseInt(newActivity.duration_minutes)
      })
      
      setNewActivity({ title: '', category: '', duration_minutes: '' })
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

  return (
    <div className="activities">
      <header className="activities-header">
        <h1>Atividades</h1>
        <div className="actions">
          <button className="primary-btn" onClick={() => setShowCreate(true)}>＋ Nova atividade</button>
          <a href="/dashboard" className="back-link">← Voltar</a>
        </div>
      </header>

      <div className="activities-content">
        <div className="activities-list">
          <h2>Atividades Recentes</h2>
          {error && <div className="error">{error}</div>}
          
          {activities.length === 0 ? (
            <p>Nenhuma atividade registrada ainda.</p>
          ) : (
            <div className="activities-grid">
              {activities.map(activity => (
                <div key={activity.id} className="activity-card">
                  <h3>{activity.title}</h3>
                  {activity.category && <p className="category">{activity.category}</p>}
                  <p className="duration">{activity.duration_minutes} minutos</p>
                  <p className="date">
                    {new Date(activity.timestamp).toLocaleDateString('pt-BR')}
                  </p>
                  <button 
                    onClick={() => handleDelete(activity.id)}
                    className="delete-btn"
                  >
                    Deletar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showCreate && (
        <div className="modal-backdrop" onClick={() => setShowCreate(false)} aria-hidden="true">
          <div className="activity-modal" role="dialog" aria-modal="true" aria-label="Criar nova atividade" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Nova Atividade</h2>
              <button className="icon-btn" aria-label="Fechar" onClick={() => setShowCreate(false)}>✕</button>
            </div>

            <form onSubmit={handleSubmit} className="activity-form">
              <div className="form-group">
                <label htmlFor="title">Título</label>
                <input
                  type="text"
                  id="title"
                  value={newActivity.title}
                  onChange={(e) => setNewActivity({ ...newActivity, title: e.target.value })}
                  placeholder="Ex: Leitura técnica"
                  required
                  ref={titleRef}
                />
              </div>

              <div className="form-group">
                <label htmlFor="category">Categoria</label>
                <input
                  type="text"
                  id="category"
                  value={newActivity.category}
                  onChange={(e) => setNewActivity({ ...newActivity, category: e.target.value })}
                  placeholder="Ex: conhecimento"
                />
              </div>

              <div className="form-group">
                <label htmlFor="duration">Duração (minutos)</label>
                <input
                  type="number"
                  id="duration"
                  value={newActivity.duration_minutes}
                  onChange={(e) => setNewActivity({ ...newActivity, duration_minutes: e.target.value })}
                  placeholder="30"
                  min="1"
                  required
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="secondary-btn" onClick={() => setShowCreate(false)}>Cancelar</button>
                <button type="submit" className="submit-btn">Adicionar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Activities
