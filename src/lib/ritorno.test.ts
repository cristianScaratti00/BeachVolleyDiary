// ============================================================================
// Il ritorno dal link della mail di conferma (ritorno.ts): che cosa dice
// l'indirizzo con cui Supabase rimanda all'app, e la sua pulizia.
// ============================================================================
import { describe, it, expect, afterEach } from 'vitest'
import { leggiRitorno, pulisciIndirizzo } from './ritorno'

/** Un JWT finto: conta solo il corpo, in base64url. */
const jwt = (corpo: object) =>
  ['eyJhbGciOiJIUzI1NiJ9', btoa(JSON.stringify(corpo)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''), 'firma'].join('.')

const BASE = 'https://bv-diary.vercel.app/'

describe('leggiRitorno', () => {
  it('la conferma riuscita: la sessione nel frammento, `type=signup`, e l’email dal token', () => {
    const t = jwt({ sub: 'u1', email: 'marta@example.com' })
    expect(leggiRitorno(`${BASE}#access_token=${t}&expires_in=3600&refresh_token=r&token_type=bearer&type=signup`)).toEqual({
      tipo: 'confermata',
      email: 'marta@example.com',
    })
  })

  it('un token che non si legge non ferma niente: l’email resta da scrivere', () => {
    expect(leggiRitorno(`${BASE}#access_token=nonunjwt&type=signup`)).toEqual({ tipo: 'confermata', email: '' })
  })

  it('il link scaduto o già usato, nel frammento o nella query', () => {
    expect(leggiRitorno(`${BASE}#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired`)).toEqual({ tipo: 'scaduto' })
    expect(leggiRitorno(`${BASE}?error=access_denied&error_code=otp_expired`)).toEqual({ tipo: 'scaduto' })
  })

  it('tutto il resto non è un ritorno dalla conferma', () => {
    expect(leggiRitorno(BASE)).toBeNull()
    expect(leggiRitorno(`${BASE}tornei?accesso=accedi#fondo`)).toBeNull()
    // Il recupero della password e il magic link non sono la conferma.
    expect(leggiRitorno(`${BASE}#access_token=${jwt({})}&type=recovery`)).toBeNull()
    expect(leggiRitorno(`${BASE}#access_token=${jwt({})}&type=magiclink`)).toBeNull()
  })
})

describe('pulisciIndirizzo', () => {
  afterEach(() => window.history.replaceState(null, '', '/'))

  it('toglie l’esito e lascia il resto', () => {
    window.history.replaceState(null, '', '/tornei?x=1&error=access_denied&error_code=otp_expired#error=access_denied&error_code=otp_expired')
    pulisciIndirizzo()
    expect(window.location.pathname + window.location.search + window.location.hash).toBe('/tornei?x=1')
  })

  it('toglie il `#` vuoto che lascia supabase-js, e lascia un frammento che non c’entra', () => {
    window.history.replaceState(null, '', '/#')
    pulisciIndirizzo()
    expect(window.location.href.endsWith('#')).toBe(false)
    window.history.replaceState(null, '', '/#fondo')
    pulisciIndirizzo()
    expect(window.location.hash).toBe('#fondo')
  })
})
