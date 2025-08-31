import React, { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'

// Generic card for listing entities with action buttons
// Expect an "item" object and callbacks onEdit/onDelete
const CrudCard = ({ item, title, description, onEdit, onDelete, actions }) => {
  const displayTitle = title ?? item?.name
  const displayDesc = description ?? item?.short_description
  const [expanded, setExpanded] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  

  // Close on Escape when expanded
  useEffect(() => {
    if (!expanded) return
    const onKey = (e) => { if (e.key === 'Escape') setExpanded(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [expanded])

  // Close 3-dots menu on outside click or Escape
  useEffect(() => {
    if (!menuOpen) return
    const onDocClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    const onKey = (e) => { if (e.key === 'Escape') setMenuOpen(false) }
    document.addEventListener('mousedown', onDocClick)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      window.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])
  return (
    <div className={"crud-card"}>
      <div
        className={`crud-inner ${displayDesc ? 'with-fade' : ''}`}
        onDoubleClick={() => setExpanded(true)}
        title="Duplo clique para expandir"
      >
        <div className="card-header">
          <h3>{displayTitle}</h3>
          {(onEdit || onDelete) && (
            <div className="crud-actions" ref={menuRef}>
              <button
                className="icon-btn more-btn"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                title="Ações"
                onClick={(e) => { e.stopPropagation(); setMenuOpen(v => !v) }}
                onDoubleClick={(e) => e.stopPropagation()}
              >
                ⋯
              </button>
              <div className={`more-menu ${menuOpen ? 'open' : ''}`} role="menu" onClick={(e)=> e.stopPropagation()}>
                {onEdit && (
                  <button className="btn btn-ghost btn-sm" role="menuitem" onClick={() => { setMenuOpen(false); onEdit?.(item) }}>
                    Editar
                  </button>
                )}
                {onDelete && (
                  <button className="delete-btn btn-sm" role="menuitem" onClick={() => { setMenuOpen(false); onDelete?.(item.id) }}>
                    Excluir
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
        {displayDesc && (
          <>
            <p className="desc clamp">{displayDesc}</p>
            <div className="desc-fade" aria-hidden="true" />
          </>
        )}
      </div>
      {expanded && createPortal(
        (
          <div className="overcontent fullscreen" onClick={() => setExpanded(false)}>
            <div className="overcontent-card fullscreen" onClick={(e) => e.stopPropagation()}>
              <div className="overcontent-header">
                <h3>{displayTitle}</h3>
                <div className="header-actions">
                  <button className="icon-btn" aria-label="Fechar" title="Fechar" onClick={() => setExpanded(false)}>✕</button>
                </div>
              </div>
              <div className="overcontent-body">
                {displayDesc ? (
                  <p className="desc">{displayDesc}</p>
                ) : null}
                {/* Optional: place for more detailed content about the item in the future */}
              </div>
            </div>
          </div>
        ),
        document.body
      )}
    </div>
  )
}

export default CrudCard
