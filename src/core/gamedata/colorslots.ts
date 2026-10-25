// Color slot definitions for the similar-color requirement types (T17).
// Copies ColorXML.LoadColorXMLDefinitions (ref/shared/ColorXML.cs 51-120) for
// one XML file: "None" is always present with an empty list, later definitions
// of the same name overwrite earlier ones, and a slotdef with a missing name
// or a bad entry value is skipped as a whole (C# try/catch). Difference: the
// C# XmlDocument rejects a malformed whole file; this parser only skips the
// parts it cannot match.

/**
 * Parses one file into `into`. The C# reads ColorSlots.Default.xml and then
 * ColorSlots.User.xml into the same dictionary (ColorXML.cs 56-60, 76-78), so
 * pass the map of the default file to read the user file over it.
 */
export function parseColorSlots(xml: string, into?: ReadonlyMap<string, readonly number[]>): Map<string, number[]> {
  const result = new Map<string, number[]>()
  if (into) for (const [name, entries] of into) result.set(name, [...entries])
  else result.set('None', [])
  const stripped = xml.replace(/<!--[\s\S]*?-->/g, '')
  for (const block of stripped.matchAll(/<slotdef\b([^>]*)>([\s\S]*?)<\/slotdef\s*>/gi)) {
    const [, slotAttrs = '', slotBody = ''] = block
    const name = attribute(slotAttrs, 'name')
    if (name === null) continue
    const entries: number[] = []
    let ok = true
    for (const entry of slotBody.matchAll(/<entry\b([^>]*?)\/?>/g)) {
      const [, entryAttrs = ''] = entry
      const raw = attribute(entryAttrs, 'value')
      const value = parsePalEntry(raw)
      if (value === null) {
        ok = false
        break
      }
      entries.push(value)
    }
    if (ok) result.set(name, entries)
  }
  return result
}

// C# XmlDocument attribute lookup: name is case-sensitive, quotes may be
// single or double.
function attribute(tagAttributes: string, name: string): string | null {
  const match = new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`).exec(tagAttributes)
  if (match === null) return null
  return match[1] ?? match[2] ?? ''
}

// C# int.Parse with InvariantCulture: trims, allows a sign, throws on overflow.
function parsePalEntry(raw: string | null): number | null {
  if (raw === null) return null
  const text = raw.trim()
  if (!/^[-+]?\d+$/.test(text)) return null
  const value = Number(text)
  if (value < -2147483648 || value > 2147483647) return null
  return value
}
