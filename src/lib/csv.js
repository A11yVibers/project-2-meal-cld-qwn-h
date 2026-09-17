// Minimal RFC4180-style CSV parser (handles quoted fields, embedded commas,
// escaped double quotes, and CRLF line endings).
export function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false
  let i = 0
  const src = String(text).replace(/^﻿/, '')

  while (i < src.length) {
    const ch = src[i]
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"'
          i += 2
          continue
        }
        inQuotes = false
        i++
        continue
      }
      field += ch
      i++
      continue
    }
    if (ch === '"') {
      // A quote only opens a quoted section at the very start of a field;
      // otherwise it is a literal character (e.g. `say "hi"`).
      if (field === '') {
        inQuotes = true
        i++
        continue
      }
      field += ch
      i++
      continue
    }
    if (ch === ',') {
      row.push(field)
      field = ''
      i++
      continue
    }
    if (ch === '\r') {
      i++
      continue
    }
    if (ch === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
      i++
      continue
    }
    field += ch
    i++
  }
  // Flush the final field/row if the file does not end with a newline.
  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  const headers = (rows.shift() || []).map((h) => h.trim())
  return rows
    .filter((r) => r.some((c) => c.trim() !== ''))
    .map((r) => {
      const obj = {}
      headers.forEach((h, idx) => {
        obj[h] = (r[idx] ?? '').trim()
      })
      return obj
    })
}

export function parseCsvList(value) {
  return String(value || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

export function parseCsvBool(value) {
  return String(value || '').toLowerCase() === 'true'
}

export function parseCsvNumber(value, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}
