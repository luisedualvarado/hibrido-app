const VALID_LOCATIONS = new Set(['WEWORK', 'OFICINA_93', 'REMOTO'])
const VALID_RESTRICTIONS = new Set([
  'NONE', 'FIXED_DAY', 'EVEN_DAYS', 'ODD_DAYS', 'ALLOWED_DAYS',
  'NOT_ALLOWED_DAYS', 'SPECIAL', 'PENDING',
])

export function validateSnapshot(snapshot) {
  const errors = []
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
    return { valid: false, errors: ['El archivo no contiene un objeto de configuracion.'] }
  }
  if (!Array.isArray(snapshot.employees) || snapshot.employees.length === 0) {
    errors.push('Debe incluir al menos una persona.')
  } else {
    const ids = new Set()
    snapshot.employees.forEach((employee, index) => {
      const label = `Persona ${index + 1}`
      if (!employee?.id || !employee?.name) errors.push(`${label}: id y nombre son obligatorios.`)
      if (ids.has(employee?.id)) errors.push(`${label}: id duplicado (${employee.id}).`)
      ids.add(employee?.id)
      if (!VALID_LOCATIONS.has(employee?.baseLocation)) errors.push(`${label}: ubicacion invalida.`)
      if (!VALID_RESTRICTIONS.has(employee?.restrictionType || 'NONE')) errors.push(`${label}: restriccion invalida.`)
    })
  }
  if (snapshot.holidays && !Array.isArray(snapshot.holidays)) errors.push('Festivos debe ser una lista.')
  if (snapshot.absences && !Array.isArray(snapshot.absences)) errors.push('Ausencias debe ser una lista.')
  if (snapshot.manualOverrides && !Array.isArray(snapshot.manualOverrides)) errors.push('Ajustes manuales debe ser una lista.')
  if (snapshot.params && typeof snapshot.params !== 'object') errors.push('Parametros debe ser un objeto.')
  return { valid: errors.length === 0, errors }
}

export function createAuditEntry(action, periodKey, detail = '') {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    action,
    periodKey,
    detail,
    createdAt: new Date().toISOString(),
  }
}
