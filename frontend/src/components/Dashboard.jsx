import { useAuth } from '../contexts/AuthContext'
import { Link } from 'react-router-dom'
import './Dashboard.css'

function Dashboard() {
  const { user, logout } = useAuth()

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Personal Leveling</h1>
        <div className="user-info">
          <span>User: {user?.id}</span>
          <button onClick={logout} className="logout-btn">Sair</button>
        </div>
      </header>

      <nav className="dashboard-nav">
        <Link to="/activities" className="nav-link">
          <h3>Atividades</h3>
          <p>Registre suas atividades e acompanhe o progresso</p>
        </Link>
        
        <Link to="/tasks" className="nav-link">
          <h3>Tarefas</h3>
          <p>Gerencie missões diárias e semanais</p>
        </Link>
      </nav>

      <main className="dashboard-main">
        <div className="welcome-card">
          <h2>Bem-vindo ao Personal Leveling!</h2>
          <p>Transforme sua produtividade em uma jornada gamificada.</p>
          <p>Comece registrando suas primeiras atividades ou criando tarefas diárias.</p>
        </div>
      </main>
    </div>
  )
}

export default Dashboard
