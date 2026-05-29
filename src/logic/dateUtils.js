// dateUtils.js — utilidades de fecha puras (sin dependencias externas)

export const WEEKDAY_KEYS = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']
export const WORKDAY_KEYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']
export const WEEKDAY_LABEL = {
  SUNDAY: 'Domingo', MONDAY: 'Lunes', TUESDAY: 'Martes', WEDNESDAY: 'Miércoles',
  THURSDAY: 'Jueves', FRIDAY: 'Viernes', SATURDAY: 'Sábado',
}
export const MONTH_LABEL = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

// Construye fecha local segura desde año, mes(0-index) y día.
export function makeDate(year, month, day) {
  return new Date(year, month, day)
}

// "YYYY-MM-DD" en hora local
export function toISO(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function parseISO(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

// Todos los días del mes como ISO strings.
export function getDaysInMonth(year, month) {
  const days = []
  const last = new Date(year, month + 1, 0).getDate()
  for (let d = 1; d <= last; d++) days.push(toISO(new Date(year, month, d)))
  return days
}

export function weekdayKey(iso) {
  return WEEKDAY_KEYS[parseISO(iso).getDay()]
}

export function isWeekend(iso) {
  const k = parseISO(iso).getDay()
  return k === 0 || k === 6
}

export function isHoliday(iso, holidays) {
  return holidays.some((h) => h.date === iso)
}

export function holidayName(iso, holidays) {
  const h = holidays.find((x) => x.date === iso)
  return h ? h.name : null
}

export function dayOfMonth(iso) {
  return parseISO(iso).getDate()
}

export function isOddCalendarDay(iso) {
  return dayOfMonth(iso) % 2 === 1
}

// Agrupa los días hábiles del mes por semana laboral (lunes-viernes).
// Devuelve [{ weekIndex, days: [iso...] }]
export function getWorkdaysByWeek(year, month, holidays) {
  const all = getDaysInMonth(year, month)
  const weeks = []
  let current = null
  let lastWeekId = null
  for (const iso of all) {
    if (isWeekend(iso)) continue
    const d = parseISO(iso)
    // ISO week-ish: usamos el lunes de esa semana como id
    const monday = new Date(d)
    const diff = (d.getDay() + 6) % 7 // lunes=0
    monday.setDate(d.getDate() - diff)
    const weekId = toISO(monday)
    if (weekId !== lastWeekId) {
      current = { weekId, weekIndex: weeks.length, days: [], workdays: [] }
      weeks.push(current)
      lastWeekId = weekId
    }
    current.days.push(iso)
    if (!isHoliday(iso, holidays)) current.workdays.push(iso)
  }
  return weeks
}

export function rangeDates(startISO, endISO) {
  const out = []
  let cur = parseISO(startISO)
  const end = parseISO(endISO)
  while (cur <= end) {
    out.push(toISO(cur))
    cur = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + 1)
  }
  return out
}

export function prettyDate(iso) {
  const d = parseISO(iso)
  return `${WEEKDAY_LABEL[WEEKDAY_KEYS[d.getDay()]]}, ${d.getDate()} ${MONTH_LABEL[d.getMonth()]}`
}
