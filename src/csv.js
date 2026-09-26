// Minimal RFC4180-style CSV parser (handles quoted fields, escaped quotes, commas in quotes).
export function parseCsv(text) {
  const s = String(text).replace(/\r\n?/g, '\n')
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') { field += '"'; i++ } else { inQuotes = false }
      } else {
        field += c
      }
    } else if (c === '"') {
      inQuotes = true
    } else if (c === ',') {
      row.push(field); field = ''
    } else if (c === '\n') {
      row.push(field); rows.push(row); row = []; field = ''
    } else {
      field += c
    }
  }
  if (field !== '' || row.length > 0) { row.push(field); rows.push(row) }
  const nonEmpty = rows.filter((r) => r.some((cell) => cell !== ''))
  if (nonEmpty.length === 0) return []
  const [header, ...rest] = nonEmpty
  return rest.map((r) =>
    Object.fromEntries(header.map((h, i) => [h.trim(), (r[i] ?? '').trim()]))
  )
}
