// parkingGenerator.js — asignación mensual de parqueaderos por rotación.
import { weekdayKey } from './dateUtils.js'

// Historial simulado de meses previos para que la rotación arranque "justa".
// (Editable; refleja lo discutido: Johana/Gabriel, luego Pinto/Alvarado, etc.)
const ROTATION_SEED = ['jimenez-johana', 'garcia-gabriel', 'pinto-juan-felipe', 'alvarado-luis']

// Asigna los N parqueaderos del mes por rotación entre los elegibles con carro.
// monthIndex se usa para rotar la ventana de selección mes a mes.
export function assignParkingForMonth(ctx) {
  const { employees, params, monthIndex = 0, manualParking } = ctx
  if (manualParking && manualParking.length) {
    return manualParking.slice(0, params.parkingSpots)
  }
  const pool = employees
    .filter((e) => e.parkingEligible && e.isActive && e.baseLocation === 'WEWORK')
    .map((e) => e.id)
  if (pool.length === 0) return []

  // Orden base: primero el seed conocido, luego el resto por nombre.
  const ordered = [
    ...ROTATION_SEED.filter((id) => pool.includes(id)),
    ...pool.filter((id) => !ROTATION_SEED.includes(id)),
  ]
  // Rotación mensual: desplaza el inicio según el mes.
  const start = (monthIndex * params.parkingSpots) % ordered.length
  const rotated = [...ordered.slice(start), ...ordered.slice(0, start)]
  return rotated.slice(0, params.parkingSpots)
}

// Calcula el uso diario de parqueaderos: un asignado consume cupo solo si
// está presencial ese día (no en casa, vacaciones ni otra oficina).
export function parkingUsageByDay(schedule, assigned, employees, days) {
  const byEmp = Object.fromEntries(employees.map((e) => [e.id, e]))
  const usage = {}
  for (const iso of days) {
    let used = []
    for (const id of assigned) {
      const cell = schedule.cells[`${id}__${iso}`]
      if (!cell) continue
      const emp = byEmp[id]
      // Diego solo necesita parqueadero los viernes
      if (id === 'salazar-diego' && weekdayKey(iso) !== 'FRIDAY') continue
      if (cell.status === 'OFFICE' && emp.baseLocation === 'WEWORK') used.push(id)
    }
    usage[iso] = used
  }
  return usage
}

// seatAssignment.js — asignación diaria de puestos a flotantes en WeWork.
// Los flotantes ocupan los puestos liberados por personas en TC/VAC/AUS.
export function assignFloatingSeats(schedule, employees, days, params) {
  const floaters = employees.filter((e) => e.isFloating && e.isActive && e.hybridApproved)
  const wework = employees.filter((e) => e.baseLocation === 'WEWORK' && e.isActive)
  const result = {}   // iso -> { assigned: [{empId, seat}], unseated: [empId], freeSeats }
  const alerts = []

  for (const iso of days) {
    const cell0 = schedule.cells[`${floaters[0]?.id}__${iso}`]
    if (!cell0 || cell0.status === 'NOT_APPLICABLE' || cell0.status === 'HOLIDAY') {
      result[iso] = { assigned: [], unseated: [], freeSeats: params.seatsWeWork }
      continue
    }
    // Puestos ocupados por NO flotantes presenciales
    const fixedPresent = wework.filter((e) => {
      if (e.isFloating) return false
      const c = schedule.cells[`${e.id}__${iso}`]
      return c && c.status === 'OFFICE'
    }).length
    const freeSeats = params.seatsWeWork - fixedPresent

    // Flotantes que ese día están presenciales (no en casa/vac/aus)
    const presentFloaters = floaters.filter((e) => {
      const c = schedule.cells[`${e.id}__${iso}`]
      return c && c.status === 'OFFICE'
    })

    const assigned = []
    const unseated = []
    let remaining = freeSeats
    presentFloaters.forEach((e, i) => {
      if (remaining > 0) {
        assigned.push({ empId: e.id, seat: `Libre #${i + 1}`, alt: false })
        remaining--
      } else {
        unseated.push(e.id)
      }
    })
    if (unseated.length > 0) {
      alerts.push({
        id: `floater-${iso}`, severity: 'WARNING', date: iso,
        message: `${iso}: ${unseated.length} flotante(s) sin puesto disponible.`,
        rule: 'FLOATER_NO_SEAT',
      })
    }
    result[iso] = { assigned, unseated, freeSeats }
  }
  return { result, alerts }
}

// applyManualOverrides — fuerza estados manuales sobre el schedule.
export function applyManualOverrides(schedule, manualOverrides, employees = [], params = {}) {
  const cells = { ...schedule.cells }
  const employeesById = Object.fromEntries(employees.map((employee) => [employee.id, employee]))
  const alerts = [...(schedule.alerts || [])]
  const officeCount = (date, location) => employees.filter((employee) =>
    employee.baseLocation === location && cells[`${employee.id}__${date}`]?.status === 'OFFICE'
  ).length
  for (const ov of manualOverrides) {
    const key = `${ov.employeeId}__${ov.date}`
    if (!cells[key]) continue
    if (['VACATION', 'ABSENCE', 'HOLIDAY'].includes(cells[key].status)) continue
    const employee = employeesById[ov.employeeId]
    if (ov.status === 'HOME' && employee && (!employee.isActive || !employee.hybridApproved || employee.baseLocation === 'REMOTO')) {
      continue
    }
    if (ov.status === 'OFFICE' && employee && ['WEWORK', 'OFICINA_93'].includes(employee.baseLocation)) {
      const seats = Number(employee.baseLocation === 'OFICINA_93' ? params.seats93 : params.seatsWeWork) || 0
      const currentStatus = cells[key].status
      const currentOfficeCount = officeCount(ov.date, employee.baseLocation)
      const projectedOfficeCount = currentStatus === 'OFFICE' ? currentOfficeCount : currentOfficeCount + 1
      if (seats > 0 && projectedOfficeCount > seats) {
        alerts.push({
          id: `manual-capacity-${alerts.length}`,
          severity: 'WARNING',
          date: ov.date,
          employeeId: ov.employeeId,
          message: `${employee.name}: ajuste manual a oficina no aplicado porque genera sobrecupo.`,
          rule: 'MANUAL_OFFICE_OVER_CAPACITY_SKIPPED',
        })
        continue
      }
    }
    cells[key] = {
      ...cells[key],
      status: ov.status,
      source: 'MANUAL',
      alerts: [...(cells[key].alerts || []), 'Ajuste manual aplicado'],
    }
  }
  return { ...schedule, cells, alerts }
}
