import React, { useEffect, useRef, useState } from 'react'

// Generic card for listing entities with action buttons
// Expect an "item" object and callbacks onEdit/onDelete
const CrudCard = ({ item, title, description, onEdit, onDelete, actions }) => {
  const displayTitle = title ?? item?.name
  const displayDesc = description ?? item?.short_description
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    const onDocClick = (e) => {
      if (!menuRef.current) return
      if (!menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [])
  return (
    <div className={`crud-card ${menuOpen ? 'menu-open' : ''}`}>
      <div className={`crud-inner ${displayDesc ? 'with-fade' : ''}`} ref={menuRef}>
        <div className="accent-bar" aria-hidden="true" />
        <div className="card-header">
          <h3>{displayTitle}</h3>
          <button
            className="icon-btn more-btn"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={(e) => { e.stopPropagation(); setMenuOpen(v => !v) }}
            title="Ações"
          >
            ⋮
          </button>
          <div className={`more-menu ${menuOpen ? 'open' : ''}`} role="menu">
            {actions ? (
              actions
            ) : (
              <>
                {onEdit && (
                  <button className="btn btn-secondary btn-sm" role="menuitem" onClick={() => { setMenuOpen(false); onEdit(item) }}>Editar</button>
                )}
                {onDelete && (
                  <button className="delete-btn btn-sm" role="menuitem" onClick={() => { setMenuOpen(false); onDelete(item?.id) }}>Excluir</button>
                )}
              </>
            )}
          </div>
        </div>
        {displayDesc && (
          <>
            <p className="desc clamp">{displayDesc}</p>
            <div className="desc-fade" aria-hidden="true" />
          </>
        )}
      </div>
    </div>
  )
}

export default CrudCard
