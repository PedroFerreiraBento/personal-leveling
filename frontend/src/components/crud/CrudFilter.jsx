import React from 'react'

// Generic filter with field selector and text input
const CrudFilter = ({ field, query, onChangeField, onChangeQuery, options = [
  { value: 'name', label: 'Nome' },
  { value: 'short_description', label: 'Descrição' },
] }) => {
  return (
    <div className="filter-bar" role="search">
      <label className="field">
        <span className="lbl">Campo</span>
        <select value={field} onChange={(e) => onChangeField(e.target.value)}>
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </label>
      <label className="field fill">
        <span className="lbl">Filtrar</span>
        <input
          type="text"
          placeholder="Digite para filtrar..."
          value={query}
          onChange={(e) => onChangeQuery(e.target.value)}
        />
      </label>
    </div>
  )
}

export default CrudFilter
