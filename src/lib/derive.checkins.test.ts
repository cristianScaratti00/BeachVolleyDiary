// ============================================================================
// Regole di "Chi c'è oggi?": normalizzazione città e mapping+ordinamento della
// stanza. Funzioni pure, nessuna rete, nessun orologio: si verificano senza
// montare React. `deriveWhoIsHere` riceve le righe grezze della RPC
// `who_is_here` e restituisce il view-model già ordinato.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { normalizeCity, deriveWhoIsHere } from './derive'
import type { SvPresentUser } from './serverviews'

const ids = (list: Array<{ id: string }>) => list.map((u) => u.id)

// Riga grezza della RPC (snake_case): ogni test dichiara solo ciò che gli serve.
function row(over: Partial<SvPresentUser> = {}): SvPresentUser {
  return {
    id: over.id ?? 'u1',
    name: over.name ?? 'Utente',
    avatar_url: over.avatar_url ?? null,
    looking_for_partner: over.looking_for_partner ?? true,
    note: over.note ?? '',
  }
}

describe('normalizeCity', () => {
  it('abbassa le maiuscole e taglia gli spazi ai bordi (come city_key nel DB)', () => {
    expect(normalizeCity('  Rimini ')).toBe('rimini')
    expect(normalizeCity('RIMINI')).toBe('rimini')
  })

  it('mette "Rimini" e " rimini " nella stessa stanza', () => {
    expect(normalizeCity('Rimini')).toBe(normalizeCity(' rimini '))
  })

  it('una città di soli spazi si normalizza a stringa vuota', () => {
    // È la guardia che impedisce di interrogare la stanza senza una città vera.
    expect(normalizeCity('   ')).toBe('')
    expect(normalizeCity('')).toBe('')
  })

  it('non tocca gli spazi interni', () => {
    expect(normalizeCity('  San Benedetto  ')).toBe('san benedetto')
  })
})

describe('deriveWhoIsHere', () => {
  it('mette chi cerca compagno prima di chi no', () => {
    const out = deriveWhoIsHere([
      row({ id: 'a', name: 'Anna', looking_for_partner: false }),
      row({ id: 'b', name: 'Bea', looking_for_partner: true }),
    ])
    expect(ids(out)).toEqual(['b', 'a'])
  })

  it('a parità di "cerca compagno" ordina per nome (case-insensitive)', () => {
    const out = deriveWhoIsHere([
      row({ id: 'c', name: 'carla', looking_for_partner: true }),
      row({ id: 'a', name: 'Anna', looking_for_partner: true }),
      row({ id: 'b', name: 'bruno', looking_for_partner: true }),
    ])
    expect(ids(out)).toEqual(['a', 'b', 'c'])
  })

  it('ordina prima per "cerca compagno", poi per nome dentro ogni gruppo', () => {
    const out = deriveWhoIsHere([
      row({ id: 'x', name: 'Zoe', looking_for_partner: false }),
      row({ id: 'y', name: 'Aldo', looking_for_partner: false }),
      row({ id: 'z', name: 'Marco', looking_for_partner: true }),
    ])
    // Prima i "cerca compagno" (Marco), poi gli altri per nome (Aldo, Zoe).
    expect(ids(out)).toEqual(['z', 'y', 'x'])
  })

  it('mappa snake_case → camelCase preservando i valori', () => {
    const [u] = deriveWhoIsHere([
      row({ id: 'u9', name: 'Luca', avatar_url: 'https://x/a.png', looking_for_partner: false, note: 'Cerco per King' }),
    ])
    expect(u).toEqual({
      id: 'u9',
      name: 'Luca',
      avatarUrl: 'https://x/a.png',
      lookingForPartner: false,
      note: 'Cerco per King',
    })
  })

  it('taglia gli spazi della nota', () => {
    const [u] = deriveWhoIsHere([row({ note: '  2vs2 al campo 3  ' })])
    expect(u.note).toBe('2vs2 al campo 3')
  })

  it('rimpiazza un nome vuoto/spazi con "Utente" (difesa lato client)', () => {
    const out = deriveWhoIsHere([
      row({ id: 'a', name: '   ' }),
      row({ id: 'b', name: '' }),
    ])
    expect(out.every((u) => u.name === 'Utente')).toBe(true)
  })

  it('su stanza vuota restituisce lista vuota', () => {
    expect(deriveWhoIsHere([])).toEqual([])
  })

  it('non muta l\'array ricevuto né le sue righe', () => {
    const rows = [
      row({ id: 'a', name: 'Anna', looking_for_partner: false }),
      row({ id: 'b', name: 'Bea', looking_for_partner: true }),
    ]
    const snapshot = JSON.parse(JSON.stringify(rows))
    deriveWhoIsHere(rows)
    expect(rows).toEqual(snapshot)
  })
})
