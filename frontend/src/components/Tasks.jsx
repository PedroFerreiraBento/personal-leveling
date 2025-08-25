import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'
import './Tasks.css'

function Tasks() {
  const { user } = useAuth()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  const [newTask, setNewTask] = useState({
    title: '',
    type: 'daily',
    reward_xp: 10
  })

  useEffect(() => {
    fetchTasks()
  }, [])

  const fetchTasks = async () => {
    try {
      const response = await axios.get(`/api/tasks?user_id=${user.id}`)
      setTasks(response.data.data || [])
    } catch (error) {
      setError('Erro ao carregar tarefas')
      console.error('Error fetching tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    try {
      await axios.post('/api/tasks', {
        user_id: user.id,
        title: newTask.title,
        type: newTask.type,
        reward_xp: parseInt(newTask.reward_xp)
      })
      
      setNewTask({ title: '', type: 'daily', reward_xp: 10 })
      fetchTasks()
    } catch (error) {
      setError('Erro ao criar tarefa')
      console.error('Error creating task:', error)
    }
  }

  const handleStatusChange = async (id, newStatus) => {
    try {
      await axios.patch(`/api/tasks/${id}`, {
        user_id: user.id,
        status: newStatus
      })
      fetchTasks()
    } catch (error) {
      setError('Erro ao atualizar tarefa')
      console.error('Error updating task:', error)
    }
  }

  const handleDelete = async (id) => {
    try {
      await axios.delete(`/api/tasks/${id}?user_id=${user.id}`)
      fetchTasks()
    } catch (error) {
      setError('Erro ao deletar tarefa')
      console.error('Error deleting task:', error)
    }
  }

  if (loading) return <div>Carregando...</div>

  return (
    <div className="tasks">
      <header className="tasks-header">
        <h1>Tarefas</h1>
        <a href="/dashboard" className="back-link">← Voltar</a>
      </header>

      <div className="tasks-content">
        <div className="add-task">
          <h2>Nova Tarefa</h2>
          <form onSubmit={handleSubmit} className="task-form">
            <div className="form-group">
              <label htmlFor="title">Título</label>
              <input
                type="text"
                id="title"
                value={newTask.title}
                onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                placeholder="Ex: Planejar o dia"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="type">Tipo</label>
              <select
                id="type"
                value={newTask.type}
                onChange={(e) => setNewTask({...newTask, type: e.target.value})}
              >
                <option value="daily">Diária</option>
                <option value="weekly">Semanal</option>
                <option value="repeatable">Repetitiva</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="reward">XP de Recompensa</label>
              <input
                type="number"
                id="reward"
                value={newTask.reward_xp}
                onChange={(e) => setNewTask({...newTask, reward_xp: e.target.value})}
                placeholder="10"
                min="0"
                required
              />
            </div>

            <button type="submit" className="submit-btn">Adicionar</button>
          </form>
        </div>

        <div className="tasks-list">
          <h2>Suas Tarefas</h2>
          {error && <div className="error">{error}</div>}
          
          {tasks.length === 0 ? (
            <p>Nenhuma tarefa criada ainda.</p>
          ) : (
            <div className="tasks-grid">
              {tasks.map(task => (
                <div key={task.id} className={`task-card ${task.status}`}>
                  <h3>{task.title}</h3>
                  <p className="type">{task.type}</p>
                  <p className="reward">{task.reward_xp} XP</p>
                  <p className="status">Status: {task.status}</p>
                  
                  <div className="task-actions">
                    {task.status === 'open' && (
                      <>
                        <button 
                          onClick={() => handleStatusChange(task.id, 'done')}
                          className="complete-btn"
                        >
                          Concluir
                        </button>
                        <button 
                          onClick={() => handleStatusChange(task.id, 'skipped')}
                          className="skip-btn"
                        >
                          Pular
                        </button>
                      </>
                    )}
                    <button 
                      onClick={() => handleDelete(task.id)}
                      className="delete-btn"
                    >
                      Deletar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Tasks
