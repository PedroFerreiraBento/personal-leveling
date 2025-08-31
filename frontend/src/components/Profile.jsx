import React from 'react'
import { useAuth } from '../contexts/AuthContext'

export default function Profile() {
  const { user } = useAuth()

  return (
    <div style={{ padding: '16px' }}>
      <h2>Perfil</h2>
      <div style={{ marginTop: 12 }}>
        <div><strong>User ID:</strong> {user?.id || '—'}</div>
        {/* Campos futuros: email, nome, preferências, avatar, alterar senha, etc. */}
      </div>
    </div>
  )
}
