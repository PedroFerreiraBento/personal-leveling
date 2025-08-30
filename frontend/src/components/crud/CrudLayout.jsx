import React from 'react'
import './crud.css'

// Generic CRUD layout wrapper for list pages: header with actions, optional filter, and main content
const CrudLayout = ({ title, actions, filter, children, className = '' }) => {
  return (
    <div className={`crud ${className}`.trim()}>
      <header className="crud-header">
        <h1>{title}</h1>
        <div className="actions">{actions}</div>
      </header>

      {filter}

      <div className="crud-content">
        {children}
      </div>
    </div>
  )
}

export default CrudLayout
