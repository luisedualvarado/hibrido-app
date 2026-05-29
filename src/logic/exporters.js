// exporters.js — exportación CSV/JSON e importación JSON.

function download(content, filename, mime) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function exportToCSV(rows, filename) {
  if (!rows || !rows.length) { download('', filename, 'text/csv'); return }
  const headers = Object.keys(rows[0])
  const esc = (v) => {
    const s = v == null ? '' : String(v)
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = [headers.join(',')]
  for (const r of rows) lines.push(headers.map((h) => esc(r[h])).join(','))
  download('\ufeff' + lines.join('\n'), filename, 'text/csv;charset=utf-8')
}

export function exportToJSON(data, filename) {
  download(JSON.stringify(data, null, 2), filename, 'application/json')
}

export function importFromJSON(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      try { resolve(JSON.parse(reader.result)) } catch (e) { reject(e) }
    }
    reader.onerror = reject
    reader.readAsText(file)
  })
}

// Convierte el schedule en filas planas para CSV (matriz empleado x día).
export function scheduleToRows(schedule, employees) {
  const STATUS = { HOME: 'TC', OFFICE: 'OF', VACATION: 'VAC', HOLIDAY: 'FES', ABSENCE: 'AUS', NOT_APPLICABLE: 'NA' }
  return employees.map((e) => {
    const row = { Nombre: e.name, Disciplina: e.discipline, Ubicacion: e.baseLocation }
    for (const iso of schedule.days) {
      const c = schedule.cells[`${e.id}__${iso}`]
      row[iso] = c ? (STATUS[c.status] || c.status) : ''
    }
    return row
  })
}

export function summaryToRows(summary) {
  return summary.map((s) => ({
    Fecha: s.date, Dia: s.weekday, EnCasa: s.totalHome,
    OficinaWeWork: s.totalOfficeWeWork, Oficina93: s.totalOffice93,
    PuestosLibresWeWork: s.freeSeatsWeWork, FlotantesPresentes: s.floatingPeoplePresent,
    FlotantesConPuesto: s.floatingPeopleWithSeat, FlotantesSinPuesto: s.floatingPeopleWithoutSeat,
    ParqueaderosUsados: s.parkingUsed, Alertas: s.alerts.length,
  }))
}

export function alertsToRows(alerts) {
  return alerts.map((a) => ({
    Severidad: a.severity, Fecha: a.date || '', Regla: a.rule, Mensaje: a.message,
  }))
}
