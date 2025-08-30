import React, { useEffect, useRef, useState } from 'react'

// Generic reusable modal form
// Props:
// - open: boolean
// - title: string
// - subtitle?: string
// - nameMax: number
// - descMax: number
// - initial: { name: string, short_description: string }
// - onSubmit: (form) => void  // passes full form, includes name/short_description and any custom fields
// - onClose: () => void
// - onHelp?: () => void
// - customFields?: ({ form, setForm }) => React.ReactNode
// - hideBaseFields?: boolean  // if true, consumer will render all fields via customFields
const CrudFormModal = ({
  open,
  title,
  subtitle,
  nameMax = 48,
  descMax = 120,
  initial = { name: '', short_description: '' },
  onSubmit,
  onClose,
  onHelp,
  customFields,
  hideBaseFields = false
}) => {
  const [form, setForm] = useState(initial)
  const [showHelp, setShowHelp] = useState(false)
  const nameRef = useRef(null)
  const formRef = useRef(null)
  const [sections, setSections] = useState([])
  const [currentSection, setCurrentSection] = useState(0)

  useEffect(() => {
    setForm(initial)
  }, [initial])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    setTimeout(() => nameRef.current && nameRef.current.focus(), 0)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Collect sections inside the form to enable simple Prev/Next navigation
  useEffect(() => {
    if (!open) return
    const el = formRef.current
    if (!el) return
    const found = Array.from(el.querySelectorAll('section'))
    setSections(found)
    setCurrentSection(0)
  }, [open, customFields, hideBaseFields])

  const gotoSection = (idx) => {
    if (!sections.length) return
    const clamped = Math.max(0, Math.min(idx, sections.length - 1))
    const target = sections[clamped]
    if (target && formRef.current) {
      const top = target.offsetTop - 8 // small padding
      formRef.current.scrollTo({ top, behavior: 'smooth' })
      setCurrentSection(clamped)
    }
  }

  if (!open) return null

  const submit = (e) => {
    e.preventDefault()
    // Normalize trimmed base fields but keep any custom fields
    const payload = {
      ...form,
      name: (form.name || '').trim(),
      short_description: ((form.short_description || '')).trim() || null,
    }
    onSubmit?.(payload)
  }

  return (
    <div className="modal-backdrop" onClick={onClose} aria-hidden="true">
      <div className="crud-modal" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <h2>{title}</h2>
            {subtitle && <span className="subtitle">{subtitle}</span>}
          </div>
          <div className="header-actions">
            <button className="btn btn-ghost help-btn" aria-label="Ajuda" onClick={() => { setShowHelp(true); onHelp?.() }}>❔</button>
            <button className="btn btn-ghost close-btn" aria-label="Fechar" onClick={onClose}>✕</button>
          </div>
        </div>
        <form ref={formRef} onSubmit={submit} className="crud-form" autoComplete="off">
          <div className="form-body">
            {!hideBaseFields && (
              <>
                <div className="form-group">
                  <label htmlFor="name">Nome <span className="hint">até {nameMax} caracteres</span></label>
                  <div className="with-counter">
                    <input
                      id="name"
                      type="text"
                      ref={nameRef}
                      value={form.name}
                      maxLength={nameMax}
                      onChange={(e) => setForm({ ...form, name: e.target.value.slice(0, nameMax) })}
                      placeholder="Ex: conhecimento"
                      required
                    />
                    <span className={`counter ${form.name.length === nameMax ? 'limit' : ''}`}>{form.name.length}/{nameMax}</span>
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="short_description">Descrição curta <span className="hint">até {descMax} caracteres</span></label>
                  <div className="with-counter">
                    <input
                      id="short_description"
                      type="text"
                      value={form.short_description || ''}
                      maxLength={descMax}
                      onChange={(e) => setForm({ ...form, short_description: e.target.value.slice(0, descMax) })}
                      placeholder="Opcional"
                    />
                    <span className={`counter ${(form.short_description || '').length === descMax ? 'limit' : ''}`}>{(form.short_description || '').length}/{descMax}</span>
                  </div>
                </div>
              </>
            )}
            {typeof customFields === 'function' && (
              <div className="form-group custom-fields">
                {customFields({ form, setForm })}
              </div>
            )}
            {sections.length > 1 && (
              <div className="modal-pager" aria-label="Navegação entre seções">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => gotoSection(currentSection - 1)} disabled={currentSection === 0}>◀ Anterior</button>
                <span className="pager-indicator">Seção {currentSection + 1} de {sections.length}</span>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => gotoSection(currentSection + 1)} disabled={currentSection >= sections.length - 1}>Próxima ▶</button>
              </div>
            )}
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary">Salvar</button>
          </div>
        </form>

        {showHelp && (
          <div className="overcontent" role="dialog" aria-modal="true" aria-label="Ajuda">
            <div className="overcontent-card">
              <div className="overcontent-header">
                <h3>Como usar</h3>
                <button className="btn btn-ghost close-btn" aria-label="Fechar ajuda" onClick={() => setShowHelp(false)}>✕</button>
              </div>
              <div className="overcontent-body">
                <p>Use este formulário para criar/editar registros rapidamente.</p>
                <ul>
                  <li>Nome curto e direto (máx. {nameMax}).</li>
                  <li>Descrição curta opcional (máx. {descMax}).</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default CrudFormModal
