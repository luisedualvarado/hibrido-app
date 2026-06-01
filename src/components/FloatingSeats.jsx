import React, { useEffect, useMemo, useState } from 'react'
import { MONTH_LABEL, WEEKDAY_LABEL, prettyDate, weekdayKey } from '../logic/dateUtils.js'
import { DESK_LAYOUTS, DESK_SCHEMATICS, PHYSICAL_SEATS_BY_LOCATION } from '../logic/deskLayouts.js'

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
const EN_MONTH_LABEL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function seatStateClassName(state) {
  if (!state) return 'free'
  if (state.tone === 'manual') return 'manual'
  if (state.tone === 'floater') return 'floater'
  if (state.tone === 'fixed-shared') return 'fixed-shared'
  if (state.tone === 'fixed') return 'fixed'
  return 'free'
}

function renderShape(shape, key) {
  if (shape.type === 'path') {
    return <path key={key} d={shape.d} fill={shape.fill || 'none'} stroke={shape.stroke || 'none'} strokeWidth={shape.strokeWidth || 0} />
  }

  return (
    <rect
      key={key}
      x={shape.x}
      y={shape.y}
      width={shape.w || shape.width}
      height={shape.h || shape.height}
      fill={shape.fill || 'none'}
      stroke={shape.stroke || 'none'}
      strokeWidth={shape.strokeWidth || 0}
      rx={shape.rx || 0}
      ry={shape.ry || 0}
    />
  )
}

function SchematicSvg({ schematic, seatStates, svgId }) {
  return (
    <svg className="desk-schematic-svg" viewBox={`0 0 ${schematic.width} ${schematic.height}`} aria-hidden="true">
      <defs>
        <marker id={`${svgId}-arrow`} markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 Z" fill="#0ea58d" />
        </marker>
      </defs>

      {(schematic.fills || []).map((fill, index) => (
        <rect key={`fill-${index}`} x={fill.x} y={fill.y} width={fill.width} height={fill.height} fill={fill.color} rx="2" />
      ))}
      {(schematic.walls || []).map((wall, index) => {
        const mode = wall.mode || 'outline'
        const fill = mode === 'solid' ? '#595959' : mode === 'solid-light' ? '#ececec' : '#fff'
        const stroke = mode === 'outline' ? '#3c3c3c' : mode === 'outline-light' ? '#a4a4a4' : mode === 'solid' ? '#595959' : '#a8a8a8'
        const strokeWidth = mode === 'outline' ? 3 : mode === 'outline-light' ? 1.6 : 1
        return <rect key={`wall-${index}`} x={wall.x} y={wall.y} width={wall.width} height={wall.height} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
      })}
      {(schematic.shapes || []).map((shape, index) => renderShape(shape, `shape-${index}`))}
      {(schematic.arrows || []).map((arrow, index) => (
        <line
          key={`arrow-${index}`}
          x1={arrow.x1}
          y1={arrow.y1}
          x2={arrow.x2}
          y2={arrow.y2}
          stroke="#0ea58d"
          strokeWidth="3"
          markerEnd={`url(#${svgId}-arrow)`}
        />
      ))}
      {(schematic.dots || []).map((dot, index) => (
        <circle key={`dot-${index}`} cx={dot.x || dot.cx} cy={dot.y || dot.cy} r={dot.r} fill={dot.color || dot.fill} />
      ))}

      {schematic.seats.map((seat) => {
        const label = seat.label || seat.seat
        const state = seatStates[seat.seat]
        const tone = seatStateClassName(state)
        const width = String(label).length > 2 ? 52 : 42
        const height = 24
        return (
          <g key={seat.seat} transform={`translate(${seat.x}, ${seat.y})`} className={`desk-svg-seat ${tone}`}>
            <rect x={10} y={10} width={width - 6} height="12" rx="6" fill="#101010" opacity=".92" />
            <circle cx="8" cy="16" r="5" fill="#151515" opacity=".92" />
            <circle cx={width - 2} cy="16" r="5" fill="#151515" opacity=".92" />
            <rect x="0" y="0" width={width} height={height} rx="2" className="desk-svg-tag" />
            <text x={width / 2} y="17" textAnchor="middle" className="desk-svg-label">{label}</text>
          </g>
        )
      })}
    </svg>
  )
}

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

  const baseOwnerBySeat = useMemo(() => employees.reduce((acc, employee) => {
    if (!employee.baseSeat || acc[employee.baseSeat]) return acc
    acc[employee.baseSeat] = employee.name
    return acc
  }, {}), [employees])

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
          const schematics = DESK_SCHEMATICS[location] || []
          const seatStates = Object.fromEntries(PHYSICAL_SEATS_BY_LOCATION[location].map((seat) => [
            seat,
            buildSeatState(location, seat, selectedDate, employees, schedule, floatingResult),
          ]))
          const featuredSchematic = schematics[0]
          const secondarySchematics = schematics.slice(1)

          return (
            <div key={location} className="card">
              <div className="card-head"><h3>{label} · Puestos para flotantes</h3></div>
              <div className="card-body desk-board-body">
                <div className="desk-location-shell">
                  <div className="desk-plan-wrap desk-plan-wrap-precise">
                    {featuredSchematic && (
                      <div className="desk-schematic-card desk-schematic-card-featured">
                        <div className="desk-schematic-header">
                          <div>
                            <div className="desk-schematic-title">{`${featuredSchematic.title} - ${EN_MONTH_LABEL[month]} ${year}`}</div>
                            <div className="desk-schematic-subtitle">• {featuredSchematic.subtitle}</div>
                          </div>
                        </div>
                        <div className={`desk-schematic-body ${featuredSchematic.tableSeats || featuredSchematic.showFloaters ? 'with-sidebar' : ''}`}>
                          <div className="desk-schematic-canvas">
                            <SchematicSvg schematic={featuredSchematic} seatStates={seatStates} svgId={`${location}-${featuredSchematic.key}`} />
                          </div>
                          {(featuredSchematic.tableSeats || featuredSchematic.showFloaters) && (
                            <div className="desk-schematic-sidebar">
                              {featuredSchematic.tableSeats && (
                                <table className="desk-reference-table">
                                  <thead>
                                    <tr>
                                      <th>Desk</th>
                                      <th>Name</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {featuredSchematic.tableSeats.map((seat) => (
                                      <tr key={`${featuredSchematic.key}-${seat}`}>
                                        <td>{seat}</td>
                                        <td>{baseOwnerBySeat[seat] || '-'}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                              {featuredSchematic.showFloaters && (
                                <div className="desk-floaters-box">
                                  <strong>Flotantes:</strong>
                                  {presentFloaters.length > 0 ? presentFloaters.map((employee) => (
                                    <span key={`${featuredSchematic.key}-${employee.id}`}>{employee.name}</span>
                                  )) : <span>Ninguno</span>}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {secondarySchematics.length > 0 && (
                      <div className="desk-schematic-grid">
                        {secondarySchematics.map((schematic) => (
                          <div key={`${location}-${schematic.key}`} className="desk-schematic-card">
                            <div className="desk-schematic-header compact">
                              <div>
                                <div className="desk-schematic-title">{schematic.title}</div>
                                <div className="desk-schematic-subtitle">• {schematic.subtitle}</div>
                              </div>
                            </div>
                            <div className="desk-schematic-canvas compact">
                              <SchematicSvg schematic={schematic} seatStates={seatStates} svgId={`${location}-${schematic.key}`} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
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
          <span><span className="lg-chip desk-legend-tag free" /> Magenta tenue · puesto libre</span>
          <span><span className="lg-chip desk-legend-tag fixed" /> Magenta · puesto base ocupado</span>
          <span><span className="lg-chip desk-legend-tag floater" /> Magenta con borde verde · asignado a flotante</span>
          {!readOnly && <span><span className="lg-chip" style={{ boxShadow: 'inset 0 0 0 2px var(--amber)' }} /> Borde ambar · asignacion manual</span>}
        </div>
      </div>
    </div>
  )
}