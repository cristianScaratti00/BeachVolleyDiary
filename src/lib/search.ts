// ============================================================================
// Primitive di testo per la ricerca. Solo stringhe: nessuna conoscenza del
// dominio (sta alla ricerca come stats.ts sta ai set). Le regole su *cosa* è
// cercabile vivono in derive.ts, qui c'è solo *come* si confrontano due testi.
//
// Nessuna dipendenza nuova (niente fuse.js & co.): il repo tiene le deps al
// minimo e serve una manciata di funzioni, non un motore di ricerca.
// ============================================================================

// NFD → via i diacritici → minuscolo → spazi compattati → trim.
// È ciò che rende `Forlì`, `forli` e `FORLI` la stessa cosa in un'app tutta
// italiana, dove gli accenti si scrivono a memoria.
//
// NB: NON è `normalizeCity` (derive.ts). Quella rispecchia il `city_key =
// lower(btrim(city))` del DB e deve restare identica al server, accenti
// compresi: le due normalizzazioni rispondono a domande diverse.
export function normalizeText(s: string): string {
  return (s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // segni diacritici combinanti, isolati da NFD
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

// Normalizza e spezza sugli spazi. Una query di soli spazi (o di soli segni
// diacritici) non produce token: per chi chiama equivale a "nessuna ricerca".
export function tokenize(q: string): string[] {
  const n = normalizeText(q)
  return n ? n.split(' ') : []
}

// Soglia sotto la quale il fallback subsequence resta spento: con 1-2 caratteri
// risponderebbe quasi tutto e la lista sembrerebbe non filtrata affatto.
export const SEARCH_FUZZY_MIN = 3

// I caratteri di `token` compaiono in `field` nello stesso ordine, non
// necessariamente contigui: `rccione` trova `riccione`. È la tolleranza ai
// refusi, non una distanza di edit: non recupera lettere in più o invertite.
export function isSubsequence(token: string, field: string): boolean {
  if (!token) return true
  let i = 0
  for (let j = 0; j < field.length && i < token.length; j += 1) {
    if (field[j] === token[i]) i += 1
  }
  return i === token.length
}

// Un token risponde su un campo: substring sul campo intero, subsequence su una
// singola parola e solo da SEARCH_FUZZY_MIN caratteri in su. Entrambi gli
// argomenti sono già normalizzati (i campi lo sono a monte, in derive).
//
// La subsequence si ferma alla parola per la stessa ragione per cui non si
// valuta sulla concatenazione dei campi: su un campo intero i caratteri
// colerebbero da una parola all'altra e `2025` troverebbe un torneo del `2024`
// («2024 ago agosto 05»), `indoor` uno su «sabbia outdoor». Riscontri veri per
// l'algoritmo, incomprensibili per chi cerca.
export function tokenMatchesField(token: string, field: string): boolean {
  if (!token) return true
  if (!field) return false
  if (field.includes(token)) return true
  if (token.length < SEARCH_FUZZY_MIN) return false
  return field.split(' ').some((word) => isSubsequence(token, word))
}

// AND fra i token, OR fra i campi: `riccione 2025` chiede entrambi, ciascuno
// può rispondere da un campo diverso.
//
// I campi restano separati di proposito: valutare la subsequence sulla loro
// concatenazione farebbe "colare" i caratteri dal nome del torneo alla nota,
// producendo riscontri che nessuno saprebbe spiegare.
export function matchesAllTokens(tokens: string[], fields: string[]): boolean {
  return tokens.every((t) => fields.some((f) => tokenMatchesField(t, f)))
}
