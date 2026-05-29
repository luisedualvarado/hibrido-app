import React from 'react'

export function KpiCard({ label, value, hint, tone }) {
  return (
    <div className={`kpi ${tone || ''}`}>
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {hint && <div className="hint">{hint}</div>}
    </div>
  )
}

export function AlertList({ alerts, empty = 'Sin alertas.' }) {
  if (!alerts || alerts.length === 0) return <div className="empty">{empty}</div>
  const ic = { CRITICAL: '!', WARNING: '▲', INFO: 'i' }
  return (
    <div>
      {alerts.map((a) => (
        <div key={a.id} className={`alert-item ${a.severity}`}>
          <span className="ai-ic">{ic[a.severity]}</span>
          <span>{a.message}</span>
        </div>
      ))}
    </div>
  )
}

const NAV = [
  ['dashboard', '◧', 'Dashboard'],
  ['monthly', '▦', 'Programación mensual'],
  ['daily', '☀', 'Vista diaria'],
  ['people', '☷', 'Personal'],
  ['restrictions', '⚑', 'Restricciones'],
  ['absences', '✈', 'Vacaciones / Ausencias'],
  ['holidays', '★', 'Festivos'],
  ['office93', '93', 'Oficina 93'],
  ['parking', '⊞', 'Parqueaderos'],
  ['overrides', '✎', 'Ajustes manuales'],
  ['settings', '⚙', 'Configuración'],
  ['export', '⤓', 'Exportar / Importar'],
]

export function Sidebar({ view, setView, readOnly = false }) {
  const navItems = readOnly
    ? NAV.filter(([id]) => ['dashboard', 'monthly', 'daily'].includes(id))
    : NAV

  return (
    <aside className="sidebar">
      <div className="brand">
        <h1>Rotación Híbrida</h1>
        <div className="sub">Equipo ME&I · AECOM</div>
      </div>
      <nav className="nav">
        {navItems.map(([id, ic, label]) => (
          <button key={id} className={view === id ? 'active' : ''} onClick={() => setView(id)}>
            <span className="ic">{ic}</span>{label}
          </button>
        ))}
      </nav>
      <div className="sidebar-foot">
        {readOnly ? 'Vista publica de solo lectura.' : 'Prototipo local · datos en memoria'}
        {!readOnly && <><br />Importa/exporta JSON para persistir.</>}
      </div>
    </aside>
  )
}
