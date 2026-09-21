// Minimal, dependency-free CSV parser (RFC 4180 style).
// Handles quoted fields, embedded commas, escaped quotes ("") and CRLF line endings.

export function parseCsvRows(text) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false
  let fieldStarted = false

  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += c
      }
    } else if (c === '"') {
      inQuotes = true
      fieldStarted = true
    } else if (c === ',') {
      row.push(field)
      field = ''
      fieldStarted = false
    } else if (c === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
      fieldStarted = false
    } else if (c === '\r') {
      // ignore; handled with the following \n (or standalone)
      if (text[i + 1] !== '\n') {
        row.push(field)
        rows.push(row)
        row = []
        field = ''
        fieldStarted = false
      }
    } else {
      field += c
      fieldStarted = true
    }
  }
  if (fieldStarted || field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ''))
}

export function csvToObjects(text) {
  const rows = parseCsvRows(text)
  if (rows.length === 0) return []
  const header = rows[0].map((h) => h.trim())
  return rows.slice(1).map((cells) => {
    const obj = {}
    header.forEach((key, i) => {
      obj[key] = (cells[i] ?? '').trim()
    })
    return obj
  })
}

export function parseCsvList(value) {
  // Parses multi-value CSV cells like "DT06,DT05" into arrays.
  if (!value) return []
  return value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean)
}

export function parseCsvBool(value) {
  return String(value ?? '').trim().toLowerCase() === 'true'
}

export function parseCsvNumber(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}
