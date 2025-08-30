import React from 'react'

// Generic card for listing entities with action buttons
// Expect an "item" object and callbacks onEdit/onDelete
const CrudCard = ({ item, title, description, onEdit, onDelete, actions }) => {
  return (
    <div className="crud-card">
      <div className="crud-main">
        <h3>{title ?? item?.name}</h3>
        {(description ?? item?.short_description) && (
          <p className="desc">{description ?? item?.short_description}</p>
        )}
      </div>
      <div className="crud-actions">
        {actions ? (
          actions
        ) : (
          <>
            {onEdit && (
              <button className="btn btn-secondary btn-sm" onClick={() => onEdit(item)}>Editar</button>
            )}
            {onDelete && (
              <button className="delete-btn btn-sm" onClick={() => onDelete(item?.id)}>Excluir</button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default CrudCard
