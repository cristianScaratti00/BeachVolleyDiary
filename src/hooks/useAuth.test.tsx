// ============================================================================
// AuthProvider: chi decide la sessione mostrata. Supabase è finto (una
// sessione in memoria, gli eventi `onAuthStateChange` emessi a mano, il
// profilo che risponde quando lo dice il test); auth.ts è quello vero.
//
// I due patti che contano:
//   - dal link della mail di conferma l'app non si affaccia mai: finché la
//     sessione del link non è chiusa, né gli eventi né `refresh` (focus della
//     pagina) mettono una sessione in scena;
//   - vince l'ultimo evento: un profilo letto da `refresh` che arriva dopo
//     un'uscita non rimette dentro.
// ============================================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, render, screen } from '@testing-library/react'

type Utente = { id: string; email: string; user_metadata: Record<string, unknown>; identities: { provider: string }[] }
type Ascolto = (evento: string, sessione: { user: Utente } | null) => void

const finto = vi.hoisted(() => ({
  link: false,
  sessione: null as { user: Utente } | null,
  ascolti: new Set<Ascolto>(),
  /** Il profilo risponde solo quando il test lo lascia andare. */
  trattieni: false,
  attese: [] as (() => void)[],
  /** L'uscita del link risponde solo quando il test la lascia andare. */
  uscita: null as null | (() => void),
  usciteFallite: false,
  pulizie: 0,
  mostrati: 0,
}))

const marta: Utente = { id: 'u1', email: 'marta@example.com', user_metadata: {}, identities: [{ provider: 'email' }] }

function emetti(evento: string) {
  finto.ascolti.forEach((a) => a(evento, finto.sessione))
}

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: finto.sessione }, error: null }),
      onAuthStateChange: (a: Ascolto) => {
        finto.ascolti.add(a)
        return { data: { subscription: { unsubscribe: () => finto.ascolti.delete(a) } } }
      },
      signOut: () =>
        new Promise<{ error: Error | null }>((resolve) => {
          finto.uscita = () => {
            if (finto.usciteFallite) return resolve({ error: new Error('Failed to fetch') })
            finto.sessione = null
            resolve({ error: null })
            emetti('SIGNED_OUT')
          }
        }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => {
            const riga = { data: { full_name: 'Marta', role: 'user', plan: 'premium', avatar_url: null } }
            if (!finto.trattieni) return Promise.resolve(riga)
            return new Promise((resolve) => finto.attese.push(() => resolve(riga)))
          },
        }),
      }),
    }),
  },
}))

vi.mock('../lib/ritorno', () => ({
  get SESSIONE_DEL_LINK() {
    return finto.link
  },
  pulisciIndirizzo: () => {
    finto.pulizie++
  },
  ritornoMostrato: () => {
    finto.mostrati++
  },
}))

/** Ogni stato che l'app ha mostrato, in ordine: un affaccio di un attimo si vede qui. */
let visti: string[] = []

async function monta() {
  // auth.ts ricorda la chiusura del link per tutta la pagina: un modulo nuovo per test.
  vi.resetModules()
  const { AuthProvider, useAuth } = await import('./useAuth')
  function Vista() {
    const { session, loading } = useAuth()
    const stato = loading ? 'carica' : session ? session.name : 'fuori'
    visti.push(stato)
    return <p data-testid="stato">{stato}</p>
  }
  render(
    <AuthProvider>
      <Vista />
    </AuthProvider>,
  )
}

const stato = () => screen.getByTestId('stato').textContent
/** Lascia andare le promesse in coda (getSession, il profilo, l'uscita). */
const giri = () => act(async () => { for (let i = 0; i < 5; i++) await Promise.resolve() })

beforeEach(() => {
  Object.assign(finto, { link: false, sessione: null, trattieni: false, attese: [], uscita: null, usciteFallite: false, pulizie: 0, mostrati: 0 })
  finto.ascolti.clear()
  visti = []
})

describe('AuthProvider — il ritorno dal link della mail di conferma', () => {
  it('chiude la sessione del link prima di tutto: né un SIGNED_IN né il focus della pagina fanno affacciare l\'app', async () => {
    finto.link = true
    finto.sessione = { user: marta } // quella che supabase-js ha letto dall'indirizzo
    await monta()
    await giri()
    expect(finto.uscita).not.toBeNull()

    // Mentre l'uscita è in viaggio: l'evento del link, e un focus della pagina
    // il cui profilo arriva tardi, a sessione già chiusa.
    finto.trattieni = true
    await act(async () => {
      emetti('SIGNED_IN')
      window.dispatchEvent(new Event('focus'))
    })
    await giri()
    expect(stato()).toBe('carica')

    await act(async () => finto.uscita?.())
    await giri()
    expect(stato()).toBe('fuori')
    await act(async () => finto.attese.forEach((vai) => vai()))
    await giri()
    expect(stato()).toBe('fuori')
    expect(finto.pulizie).toBe(1)
    expect(finto.mostrati).toBe(0) // «Email confermata» resta da mostrare al Login
    expect(visti).not.toContain('Marta')
  })

  it('senza rete la sessione del link resta: si entra, e l\'avviso non tornerà a un\'uscita futura', async () => {
    const avviso = vi.spyOn(console, 'warn').mockImplementation(() => {})
    finto.link = true
    finto.usciteFallite = true
    finto.sessione = { user: marta }
    await monta()
    await giri()
    await act(async () => finto.uscita?.())
    await giri()
    expect(stato()).toBe('Marta')
    expect(finto.mostrati).toBe(1)
    expect(avviso).toHaveBeenCalledWith('[auth] la sessione del link resta aperta', expect.any(Error))
  })
})

describe('AuthProvider — vince l\'ultimo evento', () => {
  it('un profilo letto da `refresh` che arriva dopo l\'uscita non rimette dentro', async () => {
    finto.sessione = { user: marta }
    await monta()
    await giri()
    expect(stato()).toBe('Marta')

    // Il focus rilegge il profilo, che tarda; intanto si esce.
    finto.trattieni = true
    await act(async () => window.dispatchEvent(new Event('focus')))
    await giri()
    expect(finto.attese).toHaveLength(1)
    finto.sessione = null
    await act(async () => emetti('SIGNED_OUT'))
    await giri()
    expect(stato()).toBe('fuori')

    await act(async () => finto.attese.forEach((vai) => vai()))
    await giri()
    expect(stato()).toBe('fuori')
  })
})
