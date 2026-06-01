import React, { useEffect, useMemo, useState } from 'react'
import { MONTH_LABEL, WEEKDAY_LABEL, prettyDate, weekdayKey } from '../logic/dateUtils.js'
import { DESK_LAYOUTS, DESK_PLAN_META, PHYSICAL_SEATS_BY_LOCATION } from '../logic/deskLayouts.js'

const LOCATIONS = [
  ['WEWORK', 'WeWork'],
  ['OFICINA_93', 'Oficina 93'],
]

const STATUS_LABELS = {
  HOME: 'TC',
  VACATION: 'VAC',
  ABSENCE: 'AUS',
  HOLIDAY: 'FES',
  NOT_APPLICABLE: 'NA',
}

const byName = (a, b) => a.name.localeCompare(b.name, 'es')

function resolveDeskCell(employee, iso, schedule, floatingResult) {
  const cell = schedule.cells[`${employee.id}__${iso}`]
  if (!cell) return { label: '-', tone: 'empty' }
  if (cell.status !== 'OFFICE') return { label: STATUS_LABELS[cell.status] || cell.status, tone: cell.status }

  const assignment = floatingResult?.[iso]?.assignedByEmp?.[employee.id]
  if (assignment?.seat) return { label: assignment.seat, tone: assignment.location, manual: assignment.manual }
  return { label: 'Sin puesto', tone: 'unseated' }
}

function buildSeatState(location, seat, iso, employees, schedule, floatingResult) {
  const occupiedAssignment = floatingResult?.[iso]?.byLocation?.[location]?.occupiedAssignments?.find((assignment) => assignment.seat === seat)
  if (occupiedAssignment) {
    const fixedOccupant = employees.find((employee) => employee.id === occupiedAssignment.empId)
    return {
      tone: occupiedAssignment.derived ? 'fixed-shared' : 'fixed',
      name: fixedOccupant?.name || occupiedAssignment.empId,
      label: seat,
    }
  }

  const assignedFloater = floatingResult?.[iso]?.byLocation?.[location]?.assigned.find((assignment) => assignment.seat === seat)
  if (assignedFloater) {
    const employee = employees.find((entry) => entry.id === assignedFloater.empId)
    return {
      tone: assignedFloater.manual ? 'manual' : 'floater',
      name: employee?.name || assignedFloater.empId,
      label: seat,
    }
  }

  return { tone: 'free', name: 'Libre', label: seat }
}

export default function FloatingSeats({
  schedule,
  employees,
  floatingResult,
  month,
  year,
  readOnly = false,
  manualDeskAssignments = [],
  setManualDeskAssignments,
}) {
  const [selectedWeekId, setSelectedWeekId] = useState(schedule.weeks?.[0]?.weekId || '')
  const [selectedDate, setSelectedDate] = useState(schedule.weeks?.[0]?.workdays?.[0] || '')
  const [draftAssignment, setDraftAssignment] = useState({
    WEWORK: { employeeId: '', seat: '' },
    OFICINA_93: { employeeId: '', seat: '' },
  })

  const selectedWeek = useMemo(
    () => schedule.weeks.find((week) => week.weekId === selectedWeekId) || schedule.weeks[0],
    [schedule.weeks, selectedWeekId]
  )

  useEffect(() => {
    const nextDate = selectedWeek?.workdays?.[0] || ''
    if (!selectedWeek?.workdays?.includes(selectedDate)) setSelectedDate(nextDate)
  }, [selectedDate, selectedWeek])

  const floatersByLocation = useMemo(() => {
    const floaters = employees.filter((employee) => employee.isFloating && employee.isActive).sort(byName)
    return Object.fromEntries(LOCATIONS.map(([location]) => [
      location,
      floaters.filter((employee) => employee.baseLocation === location),
    ]))
  }, [employees])

  const manualAssignmentsByLocation = useMemo(() => Object.fromEntries(LOCATIONS.map(([location]) => [
    location,
    manualDeskAssignments.filter((assignment) => assignment.date === selectedDate && assignment.location === location),
  ])), [manualDeskAssignments, selectedDate])

  const dayByLocation = useMemo(() => Object.fromEntries(LOCATIONS.map(([location]) => [
    location,
    floatingResult?.[selectedDate]?.byLocation?.[location] || { availableSeats: [], openSeats: [], assigned: [], unseated: [] },
  ])), [floatingResult, selectedDate])

  const presentFloatersByLocation = useMemo(() => Object.fromEntries(LOCATIONS.map(([location]) => [
    location,
    (floatersByLocation[location] || []).filter((employee) => schedule.cells[`${employee.id}__${selectedDate}`]?.status === 'OFFICE'),
  ])), [floatersByLocation, schedule, selectedDate])

  if (!selectedWeek) return <div className="empty">No hay semanas disponibles para mostrar puestos.</div>

  const saveManualAssignment = (location) => {
    const draft = draftAssignment[location]
    if (!draft.employeeId || !draft.seat) return
    setManualDeskAssignments((prev) => {
      const filtered = prev.filter((assignment) => !(
        assignment.date === selectedDate &&
        assignment.location === location &&
        (assignment.employeeId === draft.employeeId || assignment.seat === draft.seat)
      ))
      return [
        ...filtered,
        {
          id: `${location}-${selectedDate}-${draft.employeeId}`,
          date: selectedDate,
          employeeId: draft.employeeId,
          seat: draft.seat,
          location,
          createdAt: new Date().toISOString(),
        },
      ]
    })
  }

  const clearManualAssignment = (location, employeeId) => {
    setManualDeskAssignments((prev) => prev.filter((assignment) => !(assignment.date === selectedDate && assignment.location === location && assignment.employeeId === employeeId)))
  }

  return (
    <div>
      <div className="filters">
        <div className="fg">
          <label>Semana</label>
          <select value={selectedWeek.weekId} onChange={(event) => setSelectedWeekId(event.target.value)}>
            {schedule.weeks.map((week, index) => (
              <option key={week.weekId} value={week.weekId}>
                {`Semana ${index + 1} · ${prettyDate(week.workdays[0])} a ${prettyDate(week.workdays[week.workdays.length - 1])}`}
              </option>
            ))}
          </select>
        </div>
        <div className="fg">
          <label>Dia del plano</label>
          <select value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)}>
            {selectedWeek.workdays.map((iso) => (
              <option key={iso} value={iso}>{prettyDate(iso)}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="kpi-grid" style={{ marginBottom: 18 }}>
        <div className="kpi">
          <div className="label">Mes</div>
          <div className="value">{MONTH_LABEL[month]}</div>
          <div className="hint">{year}</div>
        </div>
        <div className="kpi green">
          <div className="label">Semana</div>
          <div className="value">{selectedWeek.workdays.length}</div>
          <div className="hint">dias habiles</div>
        </div>
        <div className="kpi navy">
          <div className="label">Dia</div>
          <div className="value">{WEEKDAY_LABEL[weekdayKey(selectedDate)].slice(0, 3)}</div>
          <div className="hint">{prettyDate(selectedDate)}</div>
        </div>
      </div>

      <div className="desk-board-grid">
        {LOCATIONS.map(([location, label]) => {
          const floaters = floatersByLocation[location] || []
          const presentFloaters = presentFloatersByLocation[location] || []
          const dayData = dayByLocation[location]
          const manualAssignments = manualAssignmentsByLocation[location]
          const availableSeats = dayData.availableSeats?.length ? dayData.availableSeats : PHYSICAL_SEATS_BY_LOCATION[location]
          const planMeta = DESK_PLAN_META[location]

          return (
            <div key={location} className="card">
              <div className="card-head"><h3>{label} · Puestos para flotantes</h3></div>
              <div className="card-body desk-board-body">
                <div className="desk-location-shell">
                  <div className="desk-plan-wrap">
                    <div className="desk-plan-stage">
                      <div className="desk-plan-head">
                        <div>
                          <div className="desk-plan-title">{planMeta.title}</div>
                          <div className="desk-plan-copy">{planMeta.subtitle}</div>
                        </div>
                        <div className="desk-plan-markers">
                          {planMeta.markers.map((marker) => <span key={`${location}-${marker}`} className="desk-plan-marker">{marker}</span>)}
                        </div>
                      </div>

                      <div className="desk-plan-corridor">{planMeta.corridorLabel}</div>

                      <div className="desk-plan-grid">
                    {DESK_LAYOUTS[location].map((section) => (
                      <div key={`${location}-${section.title}`} className="desk-section">
                        <div className="desk-section-title">{section.title}</div>
                        {section.note && <div className="desk-section-note">{section.note}</div>}
                        <div className="desk-seat-grid" style={{ gridTemplateColumns: `repeat(${Math.max(...section.rows.map((row) => row.length))}, minmax(72px, 1fr))` }}>
                          {section.rows.flatMap((row, rowIndex) => row.map((seat, seatIndex) => {
                            if (!seat) return <div key={`${location}-${section.title}-${rowIndex}-${seatIndex}`} className="desk-seat-gap" />
                            const seatState = buildSeatState(location, seat, selectedDate, employees, schedule, floatingResult)
                            return (
                              <div key={`${location}-${seat}`} className={`desk-seat ${seatState.tone}`}>
                                <strong>{seatState.label}</strong>
                                <span>{seatState.name}</span>
                              </div>
                            )
                          }))}
                        </div>
                      </div>
                    ))}
                      </div>
                    </div>
                  </div>

                  <div className="desk-side-panel">
                    <div className="desk-day-summary">
                      <strong>Puestos disponibles</strong>
                      <span>{availableSeats.length ? availableSeats.join(', ') : 'Sin libres'}</span>
                    </div>
                    <div className="desk-day-summary">
                      <strong>Flotantes presentes</strong>
                      <span>{presentFloaters.length ? presentFloaters.map((employee) => employee.name).join(', ') : 'Ninguno'}</span>
                    </div>
                    {!readOnly && (
                      <div className="desk-manual-card">
                        <div className="desk-manual-title">Asignacion manual</div>
                        <label>Persona</label>
                        <select
                          value={draftAssignment[location].employeeId}
                          onChange={(event) => setDraftAssignment((prev) => ({
                            ...prev,
                            [location]: { ...prev[location], employeeId: event.target.value },
                          }))}
                        >
                          <option value="">Selecciona</option>
                          {presentFloaters.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
                        </select>
                        <label>Puesto</label>
                        <select
                          value={draftAssignment[location].seat}
                          onChange={(event) => setDraftAssignment((prev) => ({
                            ...prev,
                            [location]: { ...prev[location], seat: event.target.value },
                          }))}
                        >
                          <option value="">Selecciona</option>
                          {availableSeats.map((seat) => <option key={`${location}-${seat}`} value={seat}>{seat}</option>)}
                        </select>
                        <button className="btn btn-primary btn-block" type="button" onClick={() => saveManualAssignment(location)}>Guardar puesto</button>
                        {manualAssignments.length > 0 && (
                          <div className="desk-manual-list">
                            {manualAssignments.map((assignment) => {
                              const employee = employees.find((entry) => entry.id === assignment.employeeId)
                              return (
                                <div key={assignment.id} className="desk-manual-row">
                                  <span>{employee?.name || assignment.employeeId} · {assignment.seat}</span>
                                  <button className="btn btn-sm btn-ghost" type="button" onClick={() => clearManualAssignment(location, assignment.employeeId)}>Quitar</button>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="tbl-wrap desk-board-table-wrap">
                  <table className="desk-board-table">
                    <thead>
                      <tr>
                        <th>Persona</th>
                        {selectedWeek.workdays.map((iso) => (
                          <th key={`${location}-head-${iso}`}>{WEEKDAY_LABEL[weekdayKey(iso)]}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {floaters.length === 0 && (
                        <tr>
                          <td colSpan={selectedWeek.workdays.length + 1} className="empty">No hay flotantes asignados a {label}.</td>
                        </tr>
                      )}
                      {floaters.map((employee) => (
                        <tr key={`${location}-${employee.id}`}>
                          <td>
                            {employee.name}
                            {employee.baseSeat && <span className="badge gray" style={{ marginLeft: 6, fontSize: 9 }}>Base {employee.baseSeat}</span>}
                          </td>
                          {selectedWeek.workdays.map((iso) => {
                            const cell = resolveDeskCell(employee, iso, schedule, floatingResult)
                            return (
                              <td key={`${employee.id}-${iso}`}>
                                <span className={`desk-chip ${cell.tone} ${cell.manual ? 'manual' : ''}`}>{cell.label}</span>
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )
        })}

        <div className="legend">
          <span><span className="lg-chip" style={{ background: 'var(--gray-100)' }} /> Gris claro · puesto libre</span>
          <span><span className="lg-chip" style={{ background: 'var(--blue-100)' }} /> Azul · ocupado por personal base</span>
          <span><span className="lg-chip" style={{ background: 'var(--green-bg)' }} /> Verde · asignado a flotante</span>
          {!readOnly && <span><span className="lg-chip" style={{ boxShadow: 'inset 0 0 0 2px var(--amber)' }} /> Borde ambar · asignacion manual</span>}
        </div>
      </div>
    </div>
  )
}