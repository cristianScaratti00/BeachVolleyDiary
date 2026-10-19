// ============================================================================
// Partita live: il segnapunti da bordo campo. Si gioca come un utente — il
// pannello intero è il «+1», il «−1» sta nell'angolo — e si controlla quello
// che conta davvero: le regole del set (21, il terzo a 15, due punti di
// scarto), la forma che arriva a `onSave` (la stessa dello sheet «Nuova
// partita»), la memoria di sessione che sopravvive al refresh e la guardia
// d'uscita che non lascia perdere una partita per sbaglio. Tra amici: niente
// torneo, nomi facoltativi, set e punti a scelta, e lo storico su questo
// telefono che si ricorda i risultati.
// ============================================================================
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PartitaLive, { CHIAVE_LIVE, FORMATO_BEACH } from './PartitaLive'
import type { PartitaInCorso } from './PartitaLive'
import { CHIAVE_STORICO, quandoDetto } from './PartitaLive.storico'
import type { PartitaAmici } from './PartitaLive.storico'
import type { LiveTorneo, PartitaLiveProps } from '../app/contracts'
import { expectNoA11yViolations } from '../test/axe'

const TORNEI: LiveTorneo[] = [
  { id: 't-cervia', name: 'Sunset Series Cervia', partner: 'Luca' },
  { id: 't-rimini', name: 'Rimini Open', partner: '' },
]

function renderLive(over: Partial<PartitaLiveProps> = {}) {
  const guardia = vi.fn<(isDirty: () => boolean, onBlocked: () => void) => () => void>(() => () => undefined)
  const props = {
    tornei: TORNEI,
    torneoDefault: 't-cervia',
    // Di base oggi si gioca il torneo: si apre su «Torneo».
    torneoOggi: true,
    onSave: vi.fn<(f: unknown) => Promise<boolean>>().mockResolvedValue(true),
    onDone: vi.fn(),
    onExit: vi.fn(),
    onNuovoTorneo: vi.fn(),
    registerExitGuard: guardia,
    ...over,
  }
  const view = render(<PartitaLive {...(props as PartitaLiveProps)} />)
  return { ...view, ...props, registerExitGuard: guardia, user: userEvent.setup() }
}

/** Una partita già in memoria, come dopo un refresh. */
function inMemoria(p: Partial<PartitaInCorso> = {}) {
  const base: PartitaInCorso = {
    v: 1,
    modo: 'torneo',
    id: 'p-1',
    torneoId: 't-cervia',
    fase: 'Semifinale',
    compagno: '',
    avversari: 'Ferrari / Conti',
    formato: FORMATO_BEACH,
    chiusi: [],
    noi: 0,
    loro: 0,
    ultimo: null,
    colpo: 0,
    finita: false,
    aMano: false,
    note: '',
    ...p,
  }
  sessionStorage.setItem(CHIAVE_LIVE, JSON.stringify(base))
}
/** Una partita tra amici in memoria: senza torneo. */
const traAmici = (p: Partial<PartitaInCorso> = {}) => inMemoria({ modo: 'amici', torneoId: '', fase: 'Girone', avversari: '', ...p })
const memoria = () => JSON.parse(sessionStorage.getItem(CHIAVE_LIVE) ?? 'null') as PartitaInCorso | null
const storico = () => JSON.parse(localStorage.getItem(CHIAVE_STORICO) ?? '[]') as PartitaAmici[]
const inStorico = (...lista: PartitaAmici[]) => localStorage.setItem(CHIAVE_STORICO, JSON.stringify(lista))

const noi = () => screen.getByRole('button', { name: /^Punto per noi/ })
const loro = () => screen.getByRole('button', { name: /^Punto per Ferrari e Conti/ })
const loroAmici = () => screen.getByRole('button', { name: /^Punto per loro/ })
const segna = (b: () => HTMLElement, n: number) => {
  for (let i = 0; i < n; i++) fireEvent.click(b())
}
const stato = () => screen.getByRole('status')
const scelta = (gruppo: string) => within(screen.getByRole('group', { name: gruppo })).getByRole('button', { pressed: true })

beforeEach(() => {
  sessionStorage.clear()
  localStorage.clear()
})
afterEach(() => vi.useRealTimers())

// ---------------------------------------------------------------------------
describe('PartitaLive — impostazione', () => {
  it('propone il torneo di default col suo compagno, la fase Girone, e «Inizia» apre il tabellone', async () => {
    const { user } = renderLive()
    expect(screen.getByRole('heading', { level: 1, name: 'Partita live' })).toBeInTheDocument()
    expect(scelta('Che partita è')).toHaveTextContent('Torneo')
    expect(screen.getByLabelText('Torneo')).toHaveValue('t-cervia')
    expect(screen.getByText('Compagno: Luca, come nel torneo')).toBeInTheDocument()
    const fase = screen.getByRole('group', { name: 'Fase' })
    expect(within(fase).getByRole('button', { pressed: true })).toHaveTextContent('Girone')

    await user.click(within(fase).getByRole('button', { name: /Semifinale/ }))
    await user.type(screen.getByLabelText('Avversari (coppia)'), 'Ferrari / Conti')
    await user.click(screen.getByRole('button', { name: 'Inizia' }))

    expect(screen.getByRole('heading', { level: 1, name: 'Set 1 di 3' })).toHaveFocus()
    expect(screen.getByText('Sunset Series Cervia · Semifinale')).toBeInTheDocument()
    expect(screen.getByText('Tu e Luca')).toBeInTheDocument()
    expect(loro()).toHaveAccessibleName('Punto per Ferrari e Conti, ora 0')
    expect(memoria()).toMatchObject({ modo: 'torneo', torneoId: 't-cervia', formato: FORMATO_BEACH })
  })

  it('senza compagno nel torneo la coppia è «Tu»', async () => {
    const { user } = renderLive({ torneoDefault: 't-rimini' })
    await user.click(screen.getByRole('button', { name: 'Inizia' }))
    expect(screen.getByText('Tu')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Punto per gli avversari, ora 0' })).toBeInTheDocument()
  })

  it('un default che non è fra i tornei ripiega sul primo', () => {
    renderLive({ torneoDefault: 'condiviso' })
    expect(screen.getByLabelText('Torneo')).toHaveValue('t-cervia')
  })

  it('senza un torneo oggi si apre su «Tra amici»: niente torneo né fase, ma nomi e formato', async () => {
    const { user } = renderLive({ torneoOggi: false })
    expect(scelta('Che partita è')).toHaveTextContent('Tra amici')
    expect(screen.queryByLabelText('Torneo')).not.toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Fase' })).not.toBeInTheDocument()
    expect(screen.getByLabelText('Il tuo compagno (facoltativo)')).toHaveValue('')
    expect(screen.getByLabelText('Avversari (facoltativo)')).toHaveAccessibleDescription('Se li lasci vuoti, sul tabellone siete «Noi» e «Loro».')
    // Le regole del beach di oggi come default.
    expect(scelta('Set')).toHaveTextContent('2 su 3')
    expect(scelta('Punti')).toHaveTextContent('a 21')
    expect(screen.getByText('Al meglio dei tre set: a 21, il terzo a 15. Sempre due punti di scarto.')).toBeInTheDocument()
    // E si torna al torneo quando si vuole.
    await user.click(within(screen.getByRole('group', { name: 'Che partita è' })).getByRole('button', { name: 'Torneo' }))
    expect(screen.getByLabelText('Torneo')).toHaveValue('t-cervia')
  })

  it('senza tornei si apre su «Tra amici»; «Torneo» invita a crearne uno, o a giocare tra amici', async () => {
    const { user, onNuovoTorneo } = renderLive({ tornei: [], torneoDefault: null, torneoOggi: false })
    expect(scelta('Che partita è')).toHaveTextContent('Tra amici')
    expect(screen.getByRole('button', { name: 'Inizia' })).toBeInTheDocument()

    await user.click(within(screen.getByRole('group', { name: 'Che partita è' })).getByRole('button', { name: 'Torneo' }))
    expect(screen.getByRole('heading', { name: 'Prima serve un torneo' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Inizia' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Crea un torneo' }))
    expect(onNuovoTorneo).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('button', { name: 'Gioca tra amici' }))
    expect(scelta('Che partita è')).toHaveTextContent('Tra amici')
    await waitFor(() => expect(scelta('Che partita è')).toHaveFocus())
  })

  it('gli avversari scritti restano passando da un modo all’altro', async () => {
    const { user } = renderLive()
    await user.type(screen.getByLabelText('Avversari (coppia)'), 'Ferrari / Conti')
    await user.click(within(screen.getByRole('group', { name: 'Che partita è' })).getByRole('button', { name: 'Tra amici' }))
    expect(screen.getByLabelText('Avversari (facoltativo)')).toHaveValue('Ferrari / Conti')
  })
})

// ---------------------------------------------------------------------------
describe('PartitaLive — tra amici', () => {
  it('senza nomi si gioca «Noi» contro «Loro», a 21 al meglio dei tre', async () => {
    const { user } = renderLive({ torneoOggi: false })
    await user.click(screen.getByRole('button', { name: 'Inizia' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Set 1 di 3' })).toHaveFocus()
    expect(screen.getByText('Tra amici · set a 21')).toBeInTheDocument()
    expect(screen.getByText('Noi')).toBeInTheDocument()
    expect(screen.getByText('Loro')).toBeInTheDocument()
    expect(loroAmici()).toHaveAccessibleName('Punto per loro, ora 0')
    expect(screen.getByRole('button', { name: 'Togli un punto a loro' })).toBeInTheDocument()
    expect(memoria()).toMatchObject({ modo: 'amici', torneoId: '', compagno: '', avversari: '', formato: { set: 3, punti: 21 } })
  })

  it('il compagno scritto a mano e gli avversari vanno sul tabellone', async () => {
    const { user } = renderLive({ torneoOggi: false })
    await user.type(screen.getByLabelText('Il tuo compagno (facoltativo)'), ' Giulia ')
    await user.type(screen.getByLabelText('Avversari (facoltativo)'), 'Marco / Gio')
    await user.click(screen.getByRole('button', { name: 'Inizia' }))
    expect(screen.getByText('Tu e Giulia')).toBeInTheDocument()
    expect(screen.getByText('Marco / Gio')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Punto per Marco e Gio, ora 0' })).toBeInTheDocument()
    expect(memoria()).toMatchObject({ compagno: 'Giulia', avversari: 'Marco / Gio' })
  })

  it('«1 set a 15»: la partitella si chiude a 15 ed è finita, col punteggio nel titolo', async () => {
    const { user } = renderLive({ torneoOggi: false })
    await user.click(within(screen.getByRole('group', { name: 'Set' })).getByRole('button', { name: '1 set' }))
    await user.click(within(screen.getByRole('group', { name: 'Punti' })).getByRole('button', { name: 'a 15' }))
    expect(screen.getByText('Un set solo a 15: la partitella. Due punti di scarto.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Inizia' }))

    expect(screen.getByRole('heading', { level: 1, name: 'Set unico' })).toHaveFocus()
    expect(screen.getByText('Tra amici · set a 15')).toBeInTheDocument()
    segna(noi, 14)
    segna(loroAmici, 13)
    // Un set solo: il set point è già match point.
    expect(screen.getByText('Match point per voi!')).toBeInTheDocument()
    fireEvent.click(noi())
    expect(screen.getByText('Set vostro! Chiudetelo.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Chiudi il set' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Vinta 15–13' })).toHaveFocus()
    expect(storico()[0].set).toEqual([{ us: 15, them: 13 }])
  })

  it('«2 su 3 a 15»: anche il primo set va a 15, e si cambia campo ogni 5 punti', async () => {
    const { user } = renderLive({ torneoOggi: false })
    await user.click(within(screen.getByRole('group', { name: 'Punti' })).getByRole('button', { name: 'a 15' }))
    expect(screen.getByText('Al meglio dei tre set, tutti a 15. Sempre due punti di scarto.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Inizia' }))
    expect(screen.getByText('Tra amici · set a 15')).toBeInTheDocument()
    segna(noi, 5)
    expect(screen.getByText('Cambio campo!')).toBeInTheDocument()
    segna(noi, 10)
    expect(screen.getByText('Set vostro! Chiudetelo.')).toBeInTheDocument()
  })

  it('a fine partita il risultato va nello storico: niente «Salva la partita», e «Nuova partita» riparte coi nomi', async () => {
    traAmici({ compagno: 'Luca', avversari: 'Marco / Gio', chiusi: [{ us: 21, them: 19 }], noi: 20, loro: 15 })
    const { user, onSave } = renderLive({ torneoOggi: false })
    fireEvent.click(noi())
    fireEvent.click(screen.getByRole('button', { name: 'Chiudi il set' }))

    expect(screen.getByRole('heading', { level: 1, name: 'Vinta 2–0' })).toHaveFocus()
    expect(screen.getByText('Tra amici')).toBeInTheDocument()
    const sets = screen.getByRole('region', { name: 'Tu e Luca contro Marco / Gio' })
    expect(within(sets).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Set 1Vinto21–19', 'Set 2Vinto21–15'])
    expect(screen.getByText('Salvata su questo telefono, fra le tue partite tra amici.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Salva la partita' })).not.toBeInTheDocument()
    expect(storico()).toEqual([
      expect.objectContaining({ id: 'p-1', compagno: 'Luca', avversari: 'Marco / Gio', set: [{ us: 21, them: 19 }, { us: 21, them: 15 }] }),
    ])

    await user.click(screen.getByRole('button', { name: 'Nuova partita' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Partita live' })).toHaveFocus()
    expect(scelta('Che partita è')).toHaveTextContent('Tra amici')
    expect(screen.getByLabelText('Il tuo compagno (facoltativo)')).toHaveValue('Luca')
    expect(screen.getByLabelText('Avversari (facoltativo)')).toHaveValue('Marco / Gio')
    expect(memoria()).toBeNull()
    expect(onSave).not.toHaveBeenCalled()
    const lista = screen.getByRole('region', { name: 'Le tue partite tra amici' })
    expect(within(lista).getByText('Tu e Luca vs Marco / Gio')).toBeInTheDocument()
  })

  it('finita è già al sicuro: il ✕ esce senza chiedere e la guardia tace', async () => {
    traAmici({ chiusi: [{ us: 21, them: 10 }, { us: 21, them: 12 }], finita: true })
    const { user, onExit, registerExitGuard } = renderLive({ torneoOggi: false })
    const [isDirty] = registerExitGuard.mock.lastCall!
    expect(isDirty()).toBe(false)
    await user.click(screen.getByRole('button', { name: 'Chiudi la partita live' }))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(onExit).toHaveBeenCalledTimes(1)
    expect(memoria()).toBeNull()
  })

  it('in gioco, uscire chiede e avverte che nello storico restano solo le partite finite', async () => {
    traAmici({ noi: 3 })
    const { user } = renderLive({ torneoOggi: false })
    await user.click(screen.getByRole('button', { name: 'Chiudi la partita live' }))
    const d = screen.getByRole('alertdialog', { name: 'Uscire dalla partita?' })
    expect(d).toHaveTextContent('Il punteggio va perso: fra le tue partite tra amici restano solo quelle finite.')
  })

  it('«Riapri il set» la toglie dallo storico finché non finisce di nuovo', async () => {
    traAmici({ chiusi: [{ us: 21, them: 19 }, { us: 21, them: 17 }], finita: true })
    inStorico({ id: 'p-1', quando: '2026-10-18T18:00:00.000Z', compagno: '', avversari: '', set: [{ us: 21, them: 19 }, { us: 21, them: 17 }] })
    const { user } = renderLive({ torneoOggi: false })
    await user.click(screen.getByRole('button', { name: 'Riapri il set 2' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Set 2 di 3' })).toBeInTheDocument()
    expect(storico()).toEqual([])
    fireEvent.click(noi())
    fireEvent.click(screen.getByRole('button', { name: 'Chiudi il set' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Vinta 2–0' })).toBeInTheDocument()
    expect(storico()).toEqual([expect.objectContaining({ id: 'p-1', set: [{ us: 21, them: 19 }, { us: 22, them: 17 }] })])
  })

  it('«Salva in un torneo…»: si scelgono torneo e fase, passa da onSave e la partita lascia lo storico', async () => {
    traAmici({ avversari: 'Marco / Gio', chiusi: [{ us: 21, them: 19 }, { us: 21, them: 17 }], finita: true })
    inStorico({ id: 'p-1', quando: '2026-10-18T18:00:00.000Z', compagno: '', avversari: 'Marco / Gio', set: [{ us: 21, them: 19 }, { us: 21, them: 17 }] })
    const { user, onSave, onDone } = renderLive({ torneoOggi: false })

    await user.click(screen.getByRole('button', { name: 'Salva in un torneo…' }))
    expect(screen.getByRole('heading', { level: 2, name: 'Salva in un torneo' })).toHaveFocus()
    expect(screen.getByLabelText('Torneo')).toHaveValue('t-cervia')
    await user.selectOptions(screen.getByLabelText('Torneo'), 't-rimini')
    await user.click(within(screen.getByRole('group', { name: 'Fase' })).getByRole('button', { name: /Finale/ }))
    await user.type(screen.getByLabelText('Note'), 'Partitella del giovedì')
    await user.click(screen.getByRole('button', { name: 'Salva nel torneo' }))

    expect(onSave).toHaveBeenCalledWith({
      tournamentId: 't-rimini',
      phase: 'Finale',
      opponents: 'Marco / Gio',
      note: 'Partitella del giovedì',
      sets: [
        { us: '21', them: '19' },
        { us: '21', them: '17' },
      ],
    })
    await waitFor(() => expect(onDone).toHaveBeenCalledWith('t-rimini'))
    expect(memoria()).toBeNull()
    expect(storico()).toEqual([])
  })

  it('«Annulla» chiude il pannello e riporta il focus a «Salva in un torneo…»', async () => {
    traAmici({ chiusi: [{ us: 15, them: 21 }], formato: { set: 1, punti: 21 }, finita: true })
    const { user } = renderLive({ torneoOggi: false })
    expect(screen.getByRole('heading', { level: 1, name: 'Persa 15–21' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Salva in un torneo…' }))
    await user.click(screen.getByRole('button', { name: 'Annulla' }))
    expect(screen.getByRole('button', { name: 'Salva in un torneo…' })).toHaveFocus()
    expect(screen.queryByRole('heading', { name: 'Salva in un torneo' })).not.toBeInTheDocument()
  })

  it('senza tornei la partita finita resta nello storico, senza «Salva in un torneo…»', () => {
    traAmici({ chiusi: [{ us: 21, them: 10 }, { us: 21, them: 12 }], finita: true })
    renderLive({ tornei: [], torneoDefault: null, torneoOggi: false })
    expect(screen.getByRole('heading', { level: 1, name: 'Vinta 2–0' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Salva in un torneo…' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Nuova partita' })).toBeInTheDocument()
  })

  it('un refresh riprende la partita tra amici anche senza tornei', () => {
    traAmici({ formato: { set: 1, punti: 15 }, noi: 4, loro: 2 })
    renderLive({ tornei: [], torneoDefault: null, torneoOggi: false })
    expect(screen.getByRole('heading', { level: 1, name: 'Set unico' })).toBeInTheDocument()
    expect(noi()).toHaveAccessibleName('Punto per noi, ora 4')
  })
})

// ---------------------------------------------------------------------------
describe('PartitaLive — le tue partite tra amici', () => {
  const vinta: PartitaAmici = { id: 'a', quando: '2026-10-18T17:40:00.000Z', compagno: 'Luca', avversari: 'Marco / Gio', set: [{ us: 21, them: 19 }, { us: 18, them: 21 }, { us: 15, them: 10 }] }
  const persa: PartitaAmici = { id: 'b', quando: '2026-10-11T16:00:00.000Z', compagno: '', avversari: '', set: [{ us: 12, them: 15 }] }

  it('senza partite lo dice, e spiega che i risultati restano qui', () => {
    renderLive({ torneoOggi: false })
    const lista = screen.getByRole('region', { name: 'Le tue partite tra amici' })
    expect(lista).toHaveTextContent("Ancora nessuna. A fine partita il risultato resta qui, anche se chiudi l'app.")
    expect(within(lista).queryByRole('button', { name: 'Cancella tutte' })).not.toBeInTheDocument()
  })

  it('elenca le partite dalla più recente, con esito, data e set', () => {
    inStorico(persa, vinta)
    renderLive({ torneoOggi: false })
    const lista = screen.getByRole('region', { name: 'Le tue partite tra amici' })
    const righe = within(lista).getAllByRole('listitem')
    expect(righe).toHaveLength(2)
    expect(righe[0]).toHaveTextContent('Tu e Luca vs Marco / Gio')
    expect(righe[0]).toHaveTextContent(quandoDetto(vinta.quando))
    expect(righe[0]).toHaveTextContent('Vinta')
    expect(righe[0]).toHaveTextContent('21–1918–2115–10')
    expect(righe[1]).toHaveTextContent('Noi vs Loro')
    expect(righe[1]).toHaveTextContent('Persa')
    expect(lista).toHaveTextContent('Restano su questo telefono: le ultime 20.')
  })

  it('il cestino chiede conferma; «Annulla» non tocca niente, «Elimina» toglie solo quella riga', async () => {
    inStorico(vinta, persa)
    const { user } = renderLive({ torneoOggi: false })
    const cestino = screen.getByRole('button', { name: `Elimina la partita Tu e Luca vs Marco / Gio, ${quandoDetto(vinta.quando).toLowerCase()}` })

    await user.click(cestino)
    let d = screen.getByRole('alertdialog', { name: 'Eliminare questa partita?' })
    expect(d).toHaveTextContent('Tu e Luca vs Marco / Gio')
    await user.click(within(d).getByRole('button', { name: 'Annulla' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(storico()).toHaveLength(2)

    await user.click(cestino)
    d = screen.getByRole('alertdialog', { name: 'Eliminare questa partita?' })
    await user.click(within(d).getByRole('button', { name: 'Elimina' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(storico().map((p) => p.id)).toEqual(['b'])
    const righe = within(screen.getByRole('region', { name: 'Le tue partite tra amici' })).getAllByRole('listitem')
    expect(righe).toHaveLength(1)
    // Il cestino sparito lascia il focus a quello della riga rimasta.
    expect(within(righe[0]).getByRole('button')).toHaveFocus()
    expect(stato()).toHaveTextContent('Partita eliminata.')
  })

  it('«Cancella tutte» chiede e svuota lo storico', async () => {
    inStorico(vinta, persa)
    const { user } = renderLive({ torneoOggi: false })
    await user.click(screen.getByRole('button', { name: 'Cancella tutte' }))
    const d = screen.getByRole('alertdialog', { name: 'Cancellare tutte le partite tra amici?' })
    expect(d).toHaveTextContent('Sono 2 e stanno solo su questo telefono')
    await user.click(within(d).getByRole('button', { name: 'Cancella tutte' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(localStorage.getItem(CHIAVE_STORICO)).toBeNull()
    expect(screen.getByRole('region', { name: 'Le tue partite tra amici' })).toHaveTextContent('Ancora nessuna.')
    expect(screen.getByRole('heading', { level: 1, name: 'Partita live' })).toHaveFocus()
  })

  it('lo storico è dell’account che gioca', () => {
    localStorage.setItem(`${CHIAVE_STORICO}:u1`, JSON.stringify([vinta]))
    const { unmount } = renderLive({ torneoOggi: false, utente: 'u2' })
    expect(screen.getByRole('region', { name: 'Le tue partite tra amici' })).toHaveTextContent('Ancora nessuna.')
    unmount()
    renderLive({ torneoOggi: false, utente: 'u1' })
    expect(screen.getByRole('region', { name: 'Le tue partite tra amici' })).toHaveTextContent('Tu e Luca vs Marco / Gio')
  })
})

// ---------------------------------------------------------------------------
describe('PartitaLive — punti', () => {
  it('il pannello intero è il «+1»: il numero sale, il nome dice il punteggio, la live region lo legge', () => {
    inMemoria()
    renderLive()
    segna(noi, 14)
    segna(loro, 12)
    expect(noi()).toHaveAccessibleName('Punto per noi, ora 14')
    expect(loro()).toHaveAccessibleName('Punto per Ferrari e Conti, ora 12')
    expect(stato()).toHaveTextContent('14 a 12')
    expect(memoria()).toMatchObject({ noi: 14, loro: 12 })
  })

  it('il «−1» toglie un punto a quella coppia e a zero non va sotto', () => {
    inMemoria({ noi: 2 })
    renderLive()
    const meno = screen.getByRole('button', { name: 'Togli un punto a noi' })
    fireEvent.click(meno)
    expect(noi()).toHaveAccessibleName('Punto per noi, ora 1')
    expect(stato()).toHaveTextContent('Tolto un punto: 1 a 0')
    fireEvent.click(meno)
    fireEvent.click(meno)
    expect(noi()).toHaveAccessibleName('Punto per noi, ora 0')
    expect(meno).toHaveAttribute('aria-disabled', 'true')
  })

  it('Pallo commenta: set point per voi, set point loro, ai vantaggi', () => {
    inMemoria({ noi: 19, loro: 18 })
    renderLive()
    fireEvent.click(noi())
    expect(screen.getByText('Set point per voi!')).toBeInTheDocument()
    expect(stato()).toHaveTextContent('20 a 18. Set point per voi!')
    segna(loro, 3)
    expect(screen.getByText('Set point loro: concentrati.')).toBeInTheDocument()
    fireEvent.click(noi())
    expect(screen.getByText('Ai vantaggi: servono due punti di fila.')).toBeInTheDocument()
  })

  it('le frecce segnano: giù noi, su loro; con Maiuscolo tolgono', () => {
    inMemoria()
    renderLive()
    fireEvent.keyDown(document, { key: 'ArrowDown' })
    fireEvent.keyDown(document, { key: 'ArrowDown' })
    fireEvent.keyDown(document, { key: 'ArrowUp' })
    expect(stato()).toHaveTextContent('2 a 1')
    fireEvent.keyDown(document, { key: 'ArrowDown', shiftKey: true })
    expect(noi()).toHaveAccessibleName('Punto per noi, ora 1')
    expect(noi()).toHaveAttribute('aria-keyshortcuts', 'ArrowDown')
  })
})

// ---------------------------------------------------------------------------
describe('PartitaLive — chiusura del set', () => {
  it('a 21 con due punti di scarto il set si chiude senza chiedere e parte il secondo', () => {
    inMemoria({ noi: 20, loro: 19 })
    renderLive()
    fireEvent.click(noi())
    expect(screen.getByText('Set vostro! Chiudetelo.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Chiudi il set' }))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Set 2 di 3' })).toBeInTheDocument()
    // Il set appena chiuso nella pastiglia in alto.
    expect(screen.getByText('21–19')).toBeInTheDocument()
    expect(noi()).toHaveAccessibleName('Punto per noi, ora 0')
    expect(memoria()?.chiusi).toEqual([{ us: 21, them: 19 }])
  })

  it('a 21–20 il set NON è finito: «Chiudi il set» chiede prima, e «Continua a giocare» non chiude', async () => {
    inMemoria({ noi: 21, loro: 20 })
    const { user } = renderLive()
    await user.click(screen.getByRole('button', { name: 'Chiudi il set' }))
    const d = screen.getByRole('alertdialog', { name: 'Chiudere il set sul 21–20?' })
    expect(d).toHaveTextContent('si vince a 21 con due punti di scarto')
    await user.click(within(d).getByRole('button', { name: 'Continua a giocare' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(screen.getByRole('heading', { level: 1, name: 'Set 1 di 3' })).toBeInTheDocument()
  })

  it('confermando, un set non finito si chiude lo stesso', async () => {
    inMemoria({ noi: 14, loro: 12 })
    const { user } = renderLive()
    await user.click(screen.getByRole('button', { name: 'Chiudi il set' }))
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Chiudi il set' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Set 2 di 3' })).toBeInTheDocument()
    expect(memoria()?.chiusi).toEqual([{ us: 14, them: 12 }])
  })

  it('a 0–0 del primo set non c’è niente da chiudere', async () => {
    inMemoria()
    const { user } = renderLive()
    const b = screen.getByRole('button', { name: 'Chiudi il set' })
    expect(b).toHaveAttribute('aria-disabled', 'true')
    await user.click(b)
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(screen.getByText('Prima segna qualche punto.')).toBeInTheDocument()
  })

  it('il terzo set va a 15', () => {
    inMemoria({ chiusi: [{ us: 21, them: 19 }, { us: 18, them: 21 }], noi: 14, loro: 12 })
    renderLive()
    expect(screen.getByRole('heading', { level: 1, name: 'Set 3 di 3' })).toBeInTheDocument()
    fireEvent.click(noi())
    expect(screen.getByText('Set vostro! Chiudetelo.')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
describe('PartitaLive — fine partita e salvataggio', () => {
  it('a due set vinti la partita è finita: riepilogo e «Salva la partita» con la forma dello sheet', async () => {
    inMemoria({ chiusi: [{ us: 21, them: 19 }], noi: 20, loro: 15 })
    const { user, onSave, onDone } = renderLive()
    fireEvent.click(noi())
    fireEvent.click(screen.getByRole('button', { name: 'Chiudi il set' }))

    expect(screen.getByRole('heading', { level: 1, name: 'Vinta 2–0' })).toHaveFocus()
    const sets = screen.getByRole('region', { name: 'Contro Ferrari / Conti' })
    expect(within(sets).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Set 1Vinto21–19', 'Set 2Vinto21–15'])

    await user.type(screen.getByLabelText('Note'), 'Bella rimonta')
    await user.click(screen.getByRole('button', { name: 'Salva la partita' }))

    expect(onSave).toHaveBeenCalledWith({
      tournamentId: 't-cervia',
      phase: 'Semifinale',
      opponents: 'Ferrari / Conti',
      note: 'Bella rimonta',
      sets: [
        { us: '21', them: '19' },
        { us: '21', them: '15' },
      ],
    })
    // Salvata: la memoria si svuota; se nessuno ha navigato, ci pensa onDone.
    await waitFor(() => expect(onDone).toHaveBeenCalledWith('t-cervia'))
    expect(memoria()).toBeNull()
  })

  it('se il salvataggio non riesce, la partita resta lì e in memoria', async () => {
    inMemoria({ chiusi: [{ us: 21, them: 19 }, { us: 21, them: 17 }], finita: true })
    const { user, onDone } = renderLive({ onSave: vi.fn().mockResolvedValue(false) })
    await user.click(screen.getByRole('button', { name: 'Salva la partita' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Salva la partita' })).not.toHaveAttribute('aria-busy'))
    expect(onDone).not.toHaveBeenCalled()
    expect(memoria()?.finita).toBe(true)
  })

  it('dopo il terzo set è finita anche 1–1 e un pari: «Finita»', () => {
    inMemoria({ chiusi: [{ us: 21, them: 19 }, { us: 18, them: 21 }], noi: 14, loro: 14 })
    renderLive()
    fireEvent.click(screen.getByRole('button', { name: 'Chiudi il set' }))
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Chiudi il set' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Finita 1–1' })).toBeInTheDocument()
  })

  it('a 0–0 dopo un set «Finisci la partita» porta al riepilogo, e «Torna al set 2» riporta al tabellone', async () => {
    inMemoria({ chiusi: [{ us: 21, them: 10 }] })
    const { user } = renderLive()
    await user.click(screen.getByRole('button', { name: 'Finisci la partita' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Vinta 1–0' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Torna al set 2' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Set 2 di 3' })).toBeInTheDocument()
  })

  it('«Riapri il set» rimette in gioco l’ultimo set col suo punteggio', async () => {
    inMemoria({ chiusi: [{ us: 21, them: 19 }, { us: 21, them: 17 }], finita: true })
    const { user } = renderLive()
    await user.click(screen.getByRole('button', { name: 'Riapri il set 2' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Set 2 di 3' })).toBeInTheDocument()
    expect(noi()).toHaveAccessibleName('Punto per noi, ora 21')
    expect(loro()).toHaveAccessibleName('Punto per Ferrari e Conti, ora 17')
  })
})

// ---------------------------------------------------------------------------
describe('PartitaLive — memoria di sessione', () => {
  it('un refresh riprende la partita dov’era', () => {
    inMemoria({ chiusi: [{ us: 21, them: 19 }], noi: 14, loro: 12 })
    renderLive()
    expect(screen.getByRole('heading', { level: 1, name: 'Set 2 di 3' })).toBeInTheDocument()
    expect(noi()).toHaveAccessibleName('Punto per noi, ora 14')
    expect(screen.getByText('21–19')).toBeInTheDocument()
  })

  it('una memoria rotta o di un torneo che non c’è più si ignora', () => {
    sessionStorage.setItem(CHIAVE_LIVE, '{rotta')
    const { unmount } = renderLive()
    expect(screen.getByRole('heading', { level: 1, name: 'Partita live' })).toBeInTheDocument()
    unmount()
    inMemoria({ torneoId: 'eliminato', noi: 5 })
    renderLive()
    expect(screen.getByRole('heading', { level: 1, name: 'Partita live' })).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
describe('PartitaLive — uscita', () => {
  it('senza punti giocati il ✕ esce subito e non lascia niente in memoria', async () => {
    inMemoria()
    const { user, onExit } = renderLive()
    await user.click(screen.getByRole('button', { name: 'Chiudi la partita live' }))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(onExit).toHaveBeenCalledTimes(1)
    expect(memoria()).toBeNull()
  })

  it('con una partita iniziata il ✕ chiede; «Continua la partita» resta, «Esci e scarta» esce e svuota la memoria', async () => {
    inMemoria({ noi: 3, loro: 1 })
    const { user, onExit } = renderLive()
    await user.click(screen.getByRole('button', { name: 'Chiudi la partita live' }))
    let d = screen.getByRole('alertdialog', { name: 'Uscire dalla partita?' })
    await user.click(within(d).getByRole('button', { name: 'Continua la partita' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(onExit).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Chiudi la partita live' }))
    d = screen.getByRole('alertdialog', { name: 'Uscire dalla partita?' })
    await user.click(within(d).getByRole('button', { name: 'Esci e scarta' }))
    expect(onExit).toHaveBeenCalledTimes(1)
    expect(memoria()).toBeNull()
  })

  it('il tasto indietro passa dalla guardia: sporca solo con una partita iniziata, e bloccato apre la stessa conferma', () => {
    const { registerExitGuard } = renderLive()
    expect(registerExitGuard).toHaveBeenCalled()
    const [isDirty, onBlocked] = registerExitGuard.mock.lastCall!
    expect(isDirty()).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: 'Inizia' }))
    expect(isDirty()).toBe(false)
    fireEvent.click(noi())
    expect(isDirty()).toBe(true)
    act(() => onBlocked())
    expect(screen.getByRole('alertdialog', { name: 'Uscire dalla partita?' })).toBeInTheDocument()
  })

  it('dopo l’uscita confermata la guardia tace (l’indietro non richiede)', async () => {
    inMemoria({ noi: 3 })
    const { user, registerExitGuard } = renderLive()
    const [isDirty] = registerExitGuard.mock.lastCall!
    expect(isDirty()).toBe(true)
    await user.click(screen.getByRole('button', { name: 'Chiudi la partita live' }))
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Esci e scarta' }))
    expect(isDirty()).toBe(false)
  })
})

// ---------------------------------------------------------------------------
describe('PartitaLive — timeout', () => {
  it('30 secondi ben visibili che scendono, e «Riprendi il gioco» lo ferma', () => {
    vi.useFakeTimers()
    inMemoria({ noi: 3, loro: 2 })
    renderLive()
    fireEvent.click(screen.getByRole('button', { name: 'Timeout' }))
    const timer = screen.getByRole('timer')
    expect(timer).toHaveTextContent('30 secondi')
    expect(stato()).toHaveTextContent('Timeout: 30 secondi.')
    expect(screen.getByRole('button', { name: 'Riprendi il gioco' })).toHaveFocus()
    act(() => {
      vi.advanceTimersByTime(20_000)
    })
    expect(screen.getByRole('timer')).toHaveTextContent('10 secondi')
    expect(stato()).toHaveTextContent('10 secondi.')
    fireEvent.click(screen.getByRole('button', { name: 'Riprendi il gioco' }))
    expect(screen.queryByRole('timer')).not.toBeInTheDocument()
  })

  it('a zero finisce da solo e lo dice', () => {
    vi.useFakeTimers()
    inMemoria({ noi: 3 })
    renderLive()
    fireEvent.click(screen.getByRole('button', { name: 'Timeout' }))
    act(() => {
      vi.advanceTimersByTime(31_000)
    })
    expect(screen.queryByRole('timer')).not.toBeInTheDocument()
    expect(stato()).toHaveTextContent('Fine del timeout: si riprende.')
  })
})

// ---------------------------------------------------------------------------
describe('PartitaLive — accessibilità', () => {
  it('impostazione, tabellone e riepilogo senza violazioni axe', async () => {
    const { container, unmount } = renderLive()
    await expectNoA11yViolations(container)
    unmount()
    inMemoria({ chiusi: [{ us: 21, them: 19 }], noi: 14, loro: 12, ultimo: 'noi' })
    const t = renderLive()
    await expectNoA11yViolations(t.container)
    t.unmount()
    inMemoria({ chiusi: [{ us: 21, them: 19 }, { us: 21, them: 17 }], finita: true })
    const r = renderLive()
    await expectNoA11yViolations(r.container)
  })

  it('tra amici: impostazione con lo storico, torneo vuoto, tabellone, riepilogo e «Salva in un torneo…»', async () => {
    localStorage.setItem(
      CHIAVE_STORICO,
      JSON.stringify([
        { id: 'a', quando: '2026-10-18T17:40:00.000Z', compagno: 'Luca', avversari: '', set: [{ us: 21, them: 19 }] },
        { id: 'b', quando: '2026-10-11T16:00:00.000Z', compagno: '', avversari: '', set: [{ us: 14, them: 14 }] },
      ]),
    )
    const s = renderLive({ torneoOggi: false })
    await expectNoA11yViolations(s.container)
    s.unmount()
    const v = renderLive({ tornei: [], torneoDefault: null, torneoOggi: false })
    fireEvent.click(within(screen.getByRole('group', { name: 'Che partita è' })).getByRole('button', { name: 'Torneo' }))
    await expectNoA11yViolations(v.container)
    v.unmount()
    traAmici({ compagno: 'Luca', noi: 9, loro: 7, ultimo: 'loro' })
    const t = renderLive({ torneoOggi: false })
    await expectNoA11yViolations(t.container)
    t.unmount()
    traAmici({ chiusi: [{ us: 21, them: 19 }, { us: 21, them: 17 }], finita: true })
    const r = renderLive({ torneoOggi: false })
    await expectNoA11yViolations(r.container)
    fireEvent.click(screen.getByRole('button', { name: 'Salva in un torneo…' }))
    await expectNoA11yViolations(r.container)
  })
})
