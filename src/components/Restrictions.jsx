import React, { useState } from 'react'
import { WORKDAY_KEYS, WEEKDAY_LABEL } from '../logic/dateUtils.js'

const TYPES = [
  ['NONE', 'Sin restriccion'],
  ['FIXED_DAY', 'Dia fijo de TC'],
  ['EVEN_DAYS', 'Dias pares'],
  ['ODD_DAYS', 'Dias impares'],
  ['ALLOWED_DAYS', 'Dias permitidos'],
  ['NOT_ALLOWED_DAYS', 'Dias no permitidos'],
  ['SPECIAL', 'Regla especial'],
  ['PENDING', 'Pendiente por verificar'],
]

const TYPE_LABEL = Object.fromEntries(TYPES)
const byName = (a, b) => a.name.localeCompare(b.name, 'es')
const restrictionEnabled = (employee) => employee.restrictionEnabled !== false

function publicLabel(employee) {
  if (employee.restrictionType === 'SPECIAL') return 'Restriccion aprobada'
  if (employee.restrictionType === 'PENDING') return 'Pendiente por verificar'
  return TYPE_LABEL[employee.restrictionType]
}

export default function Restrictions({ employees, setEmployees }) {
  const [editing, setEditing] = useState(null)
  const sortedEmployees = [...employees].sort(byName)
  const withRestrictions = employees.filter((e) => e.restrictionType !== 'NONE').sort(byName)

  const save = (employee) => {
    setEmployees((prev) => prev.map((item) => (item.id === employee.id ? employee : item)))
    setEditing(null)
  }
  const toggleEnabled = (employee) => {
    setEmployees((prev) => prev.map((item) =>
      item.id === employee.id ? { ...item, restrictionEnabled: !restrictionEnabled(item) } : item
    ))
  }

  return (
    <div>
      <p className="muted" style={{ marginTop: 0 }}>
        Las condiciones medicas o personales no se muestran. Solo se exhiben etiquetas neutras como "Restriccion aprobada".
      </p>
      <div className="tbl-wrap">
        <table>
          <thead><tr><th>Persona</th><th>Tipo</th><th>Detalle</th><th>Estado</th><th></th><th></th></tr></thead>
          <tbody>
            {withRestrictions.map((employee) => (
              <tr key={employee.id}>
                <td>{employee.name}</td>
                <td><span className="badge navy">{publicLabel(employee)}</span></td>
                <td className="muted">
                  {employee.restrictionType === 'FIXED_DAY' && WEEKDAY_LABEL[employee.fixedDay]}
                  {employee.restrictionType === 'ALLOWED_DAYS' && (employee.allowedDays || []).map((day) => WEEKDAY_LABEL[day]).join(', ')}
                  {employee.restrictionType === 'NOT_ALLOWED_DAYS' && 'No: ' + (employee.notAllowedDays || []).map((day) => WEEKDAY_LABEL[day]).join(', ')}
                  {['EVEN_DAYS', 'ODD_DAYS'].includes(employee.restrictionType) && 'Calendario'}
                  {employee.restrictionType === 'SPECIAL' && '-'}
                </td>
                <td>{!restrictionEnabled(employee)
                  ? <span className="badge gray">Deshabilitada</span>
                  : employee.restrictionType === 'PENDING'
                    ? <span className="badge amber">Pendiente</span>
                    : <span className="badge green">Activa</span>}</td>
                <td>
                  <button className="btn btn-sm btn-ghost" onClick={() => toggleEnabled(employee)}>
                    {restrictionEnabled(employee) ? 'Deshabilitar' : 'Habilitar'}
                  </button>
                </td>
                <td><button className="btn btn-sm btn-ghost" onClick={() => setEditing(employee)}>Editar</button></td>
              </tr>
            ))}
            {withRestrictions.length === 0 && <tr><td colSpan={6} className="empty">No hay restricciones registradas.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="row" style={{ marginTop: 14 }}>
        <button className="btn" onClick={() => setEditing(sortedEmployees[0])}>Editar restriccion de otra persona...</button>
      </div>
      {editing && (
        <RestrictionModal
          emp={editing}
          employees={sortedEmployees}
          onClose={() => setEditing(null)}
          onSave={save}
        />
      )}
    </div>
  )
}

function RestrictionModal({ emp, employees, onClose, onSave }) {
  const [form, setForm] = useState(emp)
  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))
  const changeEmployee = (employeeId) => {
    const next = employees.find((employee) => employee.id === employeeId)
    if (next) setForm(next)
  }
  const toggleDay = (field, day) => {
    const current = form[field] || []
    update(field, current.includes(day) ? current.filter((item) => item !== day) : [...current, day])
  }
  const save = () => {
    const normalized = { ...form }
    if (normalized.restrictionType === 'NONE') normalized.restrictionEnabled = true
    else normalized.restrictionEnabled = restrictionEnabled(normalized)
    if (normalized.restrictionType !== 'FIXED_DAY') normalized.fixedDay = undefined
    if (normalized.restrictionType !== 'ALLOWED_DAYS') normalized.allowedDays = []
    if (normalized.restrictionType !== 'NOT_ALLOWED_DAYS') normalized.notAllowedDays = []
    onSave(normalized)
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()} style={{ maxWidth: 500 }}>
        <div className="modal-head"><h3>Restriccion individual</h3><button className="x-btn" onClick={onClose}>x</button></div>
        <div className="modal-body">
          <div className="field">
            <label>Persona</label>
            <select style={{ width: '100%' }} value={form.id} onChange={(event) => changeEmployee(event.target.value)}>
              {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Tipo de restriccion</label>
            <select style={{ width: '100%' }} value={form.restrictionType} onChange={(event) => update('restrictionType', event.target.value)}>
              {TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          {form.restrictionType !== 'NONE' && (
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={restrictionEnabled(form)}
                onChange={(event) => update('restrictionEnabled', event.target.checked)}
              />
              Restriccion habilitada para la programacion
            </label>
          )}
          {form.restrictionType === 'FIXED_DAY' && (
            <div className="field"><label>Dia fijo</label>
              <select style={{ width: '100%' }} value={form.fixedDay || 'MONDAY'} onChange={(event) => update('fixedDay', event.target.value)}>
                {WORKDAY_KEYS.map((day) => <option key={day} value={day}>{WEEKDAY_LABEL[day]}</option>)}
              </select>
            </div>
          )}
          {(form.restrictionType === 'ALLOWED_DAYS' || form.restrictionType === 'NOT_ALLOWED_DAYS') && (
            <div className="field">
              <label>{form.restrictionType === 'ALLOWED_DAYS' ? 'Dias permitidos' : 'Dias no permitidos'}</label>
              <div className="tag-list">
                {WORKDAY_KEYS.map((day) => {
                  const field = form.restrictionType === 'ALLOWED_DAYS' ? 'allowedDays' : 'notAllowedDays'
                  const active = (form[field] || []).includes(day)
                  return (
                    <button
                      key={day}
                      className={`badge ${active ? 'navy' : 'gray'}`}
                      style={{ border: 'none', cursor: 'pointer' }}
                      onClick={() => toggleDay(field, day)}
                    >
                      {WEEKDAY_LABEL[day]}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
          <div className="field"><label>Notas internas</label>
            <textarea rows={2} style={{ width: '100%' }} value={form.notes || ''} onChange={(event) => update('notes', event.target.value)} />
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={save}>Guardar</button>
        </div>
      </div>
    </div>
  )
}
