// ============================================================================
// Primitive di testo della ricerca: normalizzazione, token, substring e
// subsequence. Sono funzioni pure su stringhe — nessun dominio, nessun React.
// ============================================================================
import { describe, it, expect } from 'vitest'
import {
  normalizeText,
  tokenize,
  isSubsequence,
  tokenMatchesField,
  matchesAllTokens,
  SEARCH_FUZZY_MIN,
} from './search'

describe('normalizeText', () => {
  it('toglie gli accenti: in italiano si scrivono a memoria', () => {
    expect(normalizeText('Forlì')).toBe('forli')
    expect(normalizeText('Cesenático')).toBe('cesenatico')
    expect(normalizeText('perché')).toBe('perche')
  })

  it('normalizza allo stesso modo forma precomposta e decomposta', () => {
    // 'a' con accento come singolo code point e come 'a' + accento combinante:
    // due stringhe diverse a byte, la stessa cosa per chi cerca.
    expect(normalizeText('citt\u00e0')).toBe('citta')
    expect(normalizeText('citta\u0300')).toBe('citta')
  })

  it('abbassa le maiuscole', () => {
    expect(normalizeText('RIMINI Open')).toBe('rimini open')
  })

  it('compatta gli spazi e taglia quelli ai bordi', () => {
    expect(normalizeText('  Rimini   Open \n')).toBe('rimini open')
  })

  it('su stringa vuota o assente non esplode', () => {
    expect(normalizeText('')).toBe('')
    expect(normalizeText('   ')).toBe('')
    expect(normalizeText(undefined as unknown as string)).toBe('')
  })

  it('è idempotente: normalizzare due volte non cambia niente', () => {
    const once = normalizeText(' Forlì  Beach ')
    expect(normalizeText(once)).toBe(once)
  })
})

describe('tokenize', () => {
  it('spezza sugli spazi normalizzando ogni pezzo', () => {
    expect(tokenize('  Riccione   2025 ')).toEqual(['riccione', '2025'])
  })

  it('una query vuota o di soli spazi non produce token', () => {
    expect(tokenize('')).toEqual([])
    expect(tokenize('   ')).toEqual([])
  })

  it('una query di soli segni diacritici non produce token', () => {
    // Restano solo caratteri che la normalizzazione toglie: è "nessuna ricerca".
    expect(tokenize('\u0300\u0301')).toEqual([])
  })
})

describe('isSubsequence', () => {
  it('accetta i caratteri in ordine anche se non contigui', () => {
    expect(isSubsequence('rccione', 'riccione')).toBe(true)
    expect(isSubsequence('rmn', 'rimini')).toBe(true)
  })

  it('rifiuta l\'ordine sbagliato', () => {
    expect(isSubsequence('inirim', 'rimini')).toBe(false)
  })

  it('non recupera un carattere in più: non è una distanza di edit', () => {
    expect(isSubsequence('riccionex', 'riccione')).toBe(false)
    expect(isSubsequence('riccionne', 'riccione')).toBe(false)
  })

  it('il token vuoto è sempre sottosequenza', () => {
    expect(isSubsequence('', 'riccione')).toBe(true)
  })

  it('nessun token non vuoto è sottosequenza del campo vuoto', () => {
    expect(isSubsequence('a', '')).toBe(false)
  })
})

describe('tokenMatchesField', () => {
  it('risponde per substring', () => {
    expect(tokenMatchesField('mini', 'rimini open')).toBe(true)
  })

  it('sotto la soglia fuzzy resta solo la substring', () => {
    expect(SEARCH_FUZZY_MIN).toBe(3)
    // 'ri' è sottosequenza di 'riccione' ma anche substring: risponde comunque.
    expect(tokenMatchesField('ri', 'riccione')).toBe(true)
    // 'rn' NON è substring: sotto soglia non deve rispondere, o con due lettere
    // la lista sembrerebbe non filtrata affatto.
    expect(tokenMatchesField('rn', 'riccione')).toBe(false)
    expect(tokenMatchesField('rcn', 'riccione')).toBe(true) // 3 caratteri: fuzzy attivo
  })

  it('tollera il refuso da SEARCH_FUZZY_MIN caratteri in su', () => {
    expect(tokenMatchesField('rccione', 'riccione')).toBe(true)
  })

  it('la subsequence non attraversa le parole del campo', () => {
    // Casi veri visti sui dati: `2025` sarebbe sottosequenza di "2024 ago
    // agosto 05" e `indoor` di "sabbia outdoor". Riscontri corretti per
    // l'algoritmo, inspiegabili per chi cerca.
    expect(tokenMatchesField('2025', '2024 ago agosto 05 5')).toBe(false)
    expect(tokenMatchesField('indoor', 'riccione open 2vs2 sabbia outdoor')).toBe(false)
    // Il refuso dentro a una parola sola continua a essere tollerato.
    expect(tokenMatchesField('rccione', 'riccione open 2vs2 sabbia outdoor')).toBe(true)
  })

  it('un campo vuoto non risponde mai', () => {
    expect(tokenMatchesField('rimini', '')).toBe(false)
  })
})

describe('matchesAllTokens', () => {
  const fields = ['riccione cup', 'rimini', '2025 giu giugno']

  it('AND fra i token: ognuno può rispondere da un campo diverso', () => {
    expect(matchesAllTokens(['riccione', '2025'], fields)).toBe(true)
  })

  it('basta un token senza riscontro perché tutto cada', () => {
    expect(matchesAllTokens(['riccione', '2024'], fields)).toBe(false)
  })

  it('nessun token: risponde tutto (query vuota = nessun filtro)', () => {
    expect(matchesAllTokens([], fields)).toBe(true)
  })

  it('non valuta la subsequence sulla concatenazione dei campi', () => {
    // 'cupri' sarebbe sottosequenza di "riccione cup" + "rimini" concatenati,
    // ma i caratteri non devono colare da un campo all'altro.
    expect(matchesAllTokens(['cupri'], fields)).toBe(false)
  })

  it('senza campi non risponde niente', () => {
    expect(matchesAllTokens(['rimini'], [])).toBe(false)
  })
})
