// ============================================================================
// Le primitive di `src/components/ui/*`: il CONTRATTO (ruolo, nome, tastiera,
// aria, attributi `data-*` dichiarati), non lo stile calcolato — jsdom non fa
// layout e non applica i fogli dei componenti (UX §14, MOTION.md §16.1).
// ============================================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useState } from 'react'
import { render, screen, within, act, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expectNoA11yViolations } from '../../test/axe'
import { __resetRouterForTests } from '../../app/router'
import {
  Button,
  Card,
  CardLink,
  ConfirmDialog,
  Disclosure,
  EmptyState,
  FilterChips,
  ListGroup,
  ListRow,
  MatchRow,
  Menu,
  PlacementBadge,
  SearchField,
  SegmentedControl,
  SetRow,
  SwatchPicker,
  Switch,
  Tabellone,
  TextField,
  ToastRegion,
  toast,
} from './index'

beforeEach(() => {
  window.history.replaceState(null, '', '/')
  __resetRouterForTests()
})

describe('Button', () => {
  it('è un <button type="button"> vero, raggiungibile e attivabile da tastiera', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Crea torneo</Button>)
    const b = screen.getByRole('button', { name: 'Crea torneo' })
    expect(b).toHaveAttribute('type', 'button')
    b.focus()
    await user.keyboard('{Enter}')
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('disattivato = aria-disabled: resta annunciato e il tocco porta al campo che manca', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    const onDisabledClick = vi.fn()
    render(<Button disabled onClick={onClick} onDisabledClick={onDisabledClick}>Crea torneo</Button>)
    const b = screen.getByRole('button', { name: 'Crea torneo' })
    expect(b).toHaveAttribute('aria-disabled', 'true')
    expect(b).not.toBeDisabled()
    await user.click(b)
    expect(onClick).not.toHaveBeenCalled()
    expect(onDisabledClick).toHaveBeenCalledTimes(1)
  })

  it('occupato: etichetta nuova e aria-busy nello stesso fotogramma, i tocchi successivi non fanno niente', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<Button busy busyLabel="Creo…" onClick={onClick}>Crea torneo</Button>)
    const b = screen.getByRole('button', { name: 'Creo…' })
    expect(b).toHaveAttribute('aria-busy', 'true')
    await user.click(b)
    await user.click(b)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('dichiara variante e misura come data-*', () => {
    render(<Button variant="tinted" size="sm">Aggiungi foto</Button>)
    const b = screen.getByRole('button', { name: 'Aggiungi foto' })
    expect(b).toHaveAttribute('data-variant', 'tinted')
    expect(b).toHaveAttribute('data-size', 'sm')
  })
})

describe('Card di entità', () => {
  function Torneo() {
    return (
      <Card>
        <CardLink to={{ name: 'torneo', id: '11111111-1111-4111-8111-111111111111' }} describedBy="m1">Rimini Open</CardLink>
        <p id="m1">Pro · 1° · 12 lug</p>
        <span>Pro</span>
      </Card>
    )
  }

  it('è un article con un h3 che contiene il link col nome (difetto #5)', () => {
    render(<Torneo />)
    const link = screen.getByRole('link', { name: 'Rimini Open' })
    expect(link.closest('h3')).not.toBeNull()
    const card = link.closest('article')!
    expect(card).not.toBeNull()
    expect(within(card).getByText('Pro')).toBeInTheDocument()
    expect(card.querySelector('[role="button"]')).toBeNull()
    expect(link).toHaveAttribute('href', '/tornei/11111111-1111-4111-8111-111111111111')
    expect(link).toHaveAttribute('aria-describedby', 'm1')
  })

  it('nessuna violazione axe', async () => {
    const { container } = render(<Torneo />)
    await expectNoA11yViolations(container)
  })
})

describe('ListGroup e ListRow', () => {
  it('riga che naviga = link, riga d\'azione = button, il valore fa parte del nome', async () => {
    const onClick = vi.fn()
    const { container } = render(
      <ListGroup title="Account" id="acc">
        <ListRow to={{ name: 'segnala' }} title="Segnala un problema" />
        <ListRow onClick={onClick} title="Condivisioni ricevute" value="2" />
        <ListRow title="Email" value="a@b.it" />
      </ListGroup>,
    )
    expect(screen.getByRole('link', { name: 'Segnala un problema' })).toHaveAttribute('href', '/profilo/segnala')
    expect(screen.getByRole('button', { name: /Condivisioni ricevute\s*2/ })).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
    expect(screen.getByRole('heading', { level: 2, name: 'Account' })).toBeInTheDocument()
    await expectNoA11yViolations(container)
  })
})

describe('SegmentedControl e FilterChips', () => {
  function Harness() {
    const [v, setV] = useState('lista')
    const [f, setF] = useState('all')
    return (
      <>
        <SegmentedControl label="Come vedere i tornei" value={v} onChange={setV} options={[{ value: 'lista', label: 'Lista' }, { value: 'timeline', label: 'Timeline' }, { value: 'mappa', label: 'Mappa' }]} />
        <FilterChips label="Filtra i tornei per formato" value={f} onChange={setF} options={[{ value: 'all', label: 'Tutti' }, { value: '2vs2', label: '2vs2' }]} />
      </>
    )
  }

  it('gruppi con aria-label e button con aria-pressed; il nome non si raddoppia', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const seg = screen.getByRole('group', { name: 'Come vedere i tornei' })
    expect(seg).toHaveAttribute('data-fill', 'equal')
    expect(within(seg).getAllByRole('button')).toHaveLength(3)
    await user.click(screen.getByRole('button', { name: 'Timeline' }))
    expect(screen.getByRole('button', { name: 'Timeline' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Lista' })).toHaveAttribute('aria-pressed', 'false')

    const chips = screen.getByRole('group', { name: 'Filtra i tornei per formato' })
    expect(chips).toHaveAttribute('data-overflow', 'scroll')
    await user.click(screen.getByRole('button', { name: '2vs2' }))
    expect(screen.getByRole('button', { name: '2vs2' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('nessuna violazione axe', async () => {
    const { container } = render(<Harness />)
    await expectNoA11yViolations(container)
  })
})

describe('SearchField', () => {
  function Harness({ onEsc = () => {} }: { onEsc?: () => void }) {
    const [q, setQ] = useState('')
    return <SearchField label="Cerca nei tornei" value={q} onChange={setQ} placeholder="Cerca un torneo, una città, un avversario…" onEscapeEmpty={onEsc} />
  }

  it('role="search", etichetta, ✕ con nome che lascia il focus nel campo', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    expect(screen.getByRole('search')).toBeInTheDocument()
    const box = screen.getByRole('searchbox', { name: 'Cerca nei tornei' })
    await user.type(box, 'rimini')
    await user.click(screen.getByRole('button', { name: 'Cancella la ricerca' }))
    expect(box).toHaveValue('')
    expect(box).toHaveFocus()
  })

  it('Esc con il campo pieno lo svuota; con il campo vuoto toglie il focus', async () => {
    const user = userEvent.setup()
    const onEsc = vi.fn()
    render(<Harness onEsc={onEsc} />)
    const box = screen.getByRole('searchbox', { name: 'Cerca nei tornei' })
    await user.type(box, 'abc{Escape}')
    expect(box).toHaveValue('')
    expect(box).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(box).not.toHaveFocus()
    expect(onEsc).toHaveBeenCalledTimes(1)
  })
})

describe('Campi', () => {
  it('TextField: <label for> vero, errore collegato con aria-invalid e role=alert', async () => {
    const { container } = render(<TextField label="Nome torneo" value="" onChange={() => {}} error="Scrivi il nome del torneo." hint="Unico obbligatorio" />)
    const input = screen.getByRole('textbox', { name: 'Nome torneo' })
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription(/Unico obbligatorio.*Scrivi il nome del torneo\./)
    expect(screen.getByRole('alert')).toHaveTextContent('Scrivi il nome del torneo.')
    await expectNoA11yViolations(container)
  })

  it('Switch: role=switch con aria-checked', async () => {
    const user = userEvent.setup()
    function H() {
      const [on, setOn] = useState(false)
      return <Switch label="Cerco compagno" checked={on} onChange={setOn} />
    }
    render(<H />)
    const sw = screen.getByRole('switch', { name: 'Cerco compagno' })
    expect(sw).toHaveAttribute('aria-checked', 'false')
    await user.click(sw)
    expect(sw).toHaveAttribute('aria-checked', 'true')
  })

  it('SwatchPicker: radiogroup con nomi, una fermata di Tab, frecce', async () => {
    const user = userEvent.setup()
    function H() {
      const [c, setC] = useState('#FF6B35')
      return <SwatchPicker label="Etichetta colore" colors={['#FF6B35', '#00B4D8', '#FFD23F']} value={c} onChange={setC} />
    }
    const { container } = render(<H />)
    const group = screen.getByRole('radiogroup', { name: 'Etichetta colore' })
    const radios = within(group).getAllByRole('radio')
    expect(radios.map((r) => r.getAttribute('aria-label'))).toEqual(['Arancio', 'Azzurro', 'Giallo'])
    expect(radios.filter((r) => r.tabIndex === 0)).toHaveLength(1)
    radios[0].focus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('radio', { name: 'Azzurro' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: 'Azzurro' })).toHaveFocus()
    await expectNoA11yViolations(container)
  })

  it('Disclosure: aria-expanded/controls e l\'eccezione di movimento dichiarata (E1)', async () => {
    const user = userEvent.setup()
    function H() {
      const [o, setO] = useState(false)
      return <Disclosure title="Altri dettagli" summary="Amatoriale · 2vs2" open={o} onToggle={() => setO(!o)}>contenuto</Disclosure>
    }
    render(<H />)
    const b = screen.getByRole('button', { name: /Altri dettagli/ })
    expect(b).toHaveAttribute('aria-expanded', 'false')
    const region = document.getElementById(b.getAttribute('aria-controls')!)!
    expect(region).toHaveAttribute('data-motion-exception', 'altri-dettagli')
    await user.click(b)
    expect(b).toHaveAttribute('aria-expanded', 'true')
  })

  it('SetRow: Noi e Loro con etichetta, «Togli set N» è un button', () => {
    render(<SetRow index={1} us="21" them="" onChange={() => {}} onRemove={() => {}} />)
    const set = screen.getByRole('group', { name: 'Set 2' })
    expect(within(set).getByRole('textbox', { name: 'Noi' })).toHaveAttribute('inputmode', 'numeric')
    expect(within(set).getByRole('textbox', { name: 'Loro' })).toBeInTheDocument()
    expect(within(set).getByRole('button', { name: 'Togli set 2' })).toBeInTheDocument()
  })
})

describe('MatchRow', () => {
  const base = { esitoShort: 'V', esitoColor: '#FF6B35', title: 'Ottavi · vs Bianchi', detail: 'con Giulia', sets: [{ txt: '21-17', bg: '#FFF1EA', color: '#C4501E' }] }

  it('interattiva: un button senza aria-label, il nome viene dal contenuto ed esplicita l\'esito', () => {
    render(<ul><MatchRow {...base} onClick={() => {}} /></ul>)
    const b = screen.getByRole('button')
    expect(b).not.toHaveAttribute('aria-label')
    expect(b).toHaveAccessibleName(/Ottavi · vs Bianchi.*Vinta.*21-17/)
  })

  it('sola lettura: nessun controllo', () => {
    render(<ul><MatchRow {...base} onClick={() => {}} readOnly /></ul>)
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.getByText('Vinta')).toBeInTheDocument()
  })
})

describe('PlacementBadge', () => {
  it('«1° 🏆» diventa «1°» con il trofeo e «Primo posto» per gli screen reader (C15)', () => {
    const { container } = render(<PlacementBadge label="1° 🏆" libBg="#FFF1EA" />)
    expect(container.textContent).not.toContain('🏆')
    expect(screen.getByText('Primo posto')).toBeInTheDocument()
  })
})

describe('Tabellone', () => {
  it('il valore finale è nel testo per gli screen reader a t0; le strisce sono aria-hidden', () => {
    const { container } = render(<Tabellone value="67%" />)
    expect(screen.getByText('67%')).toHaveClass('sr-only')
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull()
  })

  it('un cambio di valore aggiorna subito il testo nascosto', () => {
    const { rerender } = render(<Tabellone value={3} />)
    rerender(<Tabellone value={4} />)
    expect(screen.getByText('4')).toHaveClass('sr-only')
  })
})

describe('EmptyState', () => {
  it('primo avvio: lo «0» è decorativo, titolo e un solo CTA', async () => {
    const { container } = render(
      <EmptyState variant="primo" zero="Tornei" title="Nessun torneo ancora." action={<Button>Crea il primo torneo</Button>} />,
    )
    expect(screen.getByRole('heading', { level: 2, name: 'Nessun torneo ancora.' })).toBeInTheDocument()
    expect(container.querySelector('[aria-hidden="true"]')).toHaveTextContent('0Tornei')
    await expectNoA11yViolations(container)
  })
})

describe('ConfirmDialog', () => {
  it('alertdialog con domanda e conseguenza; focus su Annulla a t0; Esc annulla', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    render(
      <ConfirmDialog title="Eliminare «Rimini Open»?" text="Non si può annullare." confirmLabel="Elimina torneo" onConfirm={() => {}} onCancel={onCancel} />,
    )
    const d = screen.getByRole('alertdialog', { name: 'Eliminare «Rimini Open»?' })
    expect(d).toHaveAccessibleDescription('Non si può annullare.')
    expect(screen.getByRole('button', { name: 'Annulla' })).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('la conferma tiene occupato il pulsante finché l\'azione non finisce', async () => {
    const user = userEvent.setup()
    let fine: () => void = () => {}
    const onConfirm = vi.fn(() => new Promise<void>((r) => { fine = r }))
    render(<ConfirmDialog title="Eliminare?" confirmLabel="Elimina torneo" busyLabel="Eliminazione…" onConfirm={onConfirm} onCancel={() => {}} />)
    await user.click(screen.getByRole('button', { name: 'Elimina torneo' }))
    expect(screen.getByRole('button', { name: 'Eliminazione…' })).toHaveAttribute('aria-busy', 'true')
    await user.click(screen.getByRole('button', { name: 'Eliminazione…' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
    await act(async () => fine())
    expect(screen.getByRole('button', { name: 'Elimina torneo' })).not.toHaveAttribute('aria-busy')
  })
})

describe('Menu', () => {
  it('role=menu con le voci menuitem; focus alla prima voce; frecce; Esc chiude', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const onSelect = vi.fn()
    render(
      <Menu
        title="Crea"
        onClose={onClose}
        items={[
          { key: 'torneo', label: 'Nuovo torneo', sub: 'Nome, data e luogo: il resto dopo', icon: 'trophy', onSelect },
          { key: 'partita', label: 'Aggiungi partita', icon: 'plus', onSelect: () => {} },
        ]}
      />,
    )
    const menu = screen.getByRole('menu', { name: 'Crea' })
    const items = within(menu).getAllByRole('menuitem')
    expect(items.map((i) => i.textContent)).toEqual(['Nuovo torneoNome, data e luogo: il resto dopo', 'Aggiungi partita', 'Annulla'])
    expect(items[0]).toHaveFocus()
    await user.keyboard('{ArrowDown}')
    expect(items[1]).toHaveFocus()
    await user.keyboard('{ArrowUp}{Enter}')
    expect(onSelect).toHaveBeenCalledTimes(1)
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
  })
})

describe('Toast', () => {
  beforeEach(() => act(() => toast.__reset()))

  it('la regione è sempre montata e vuota; gli errori vanno nel contenitore alert', () => {
    render(<ToastRegion />)
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
    expect(screen.getByRole('alert')).toBeEmptyDOMElement()
    act(() => {
      toast.error('Non è stato possibile salvare. Riprova tra poco.')
    })
    expect(screen.getByRole('alert')).toHaveTextContent('Non è stato possibile salvare. Riprova tra poco.')
    expect(screen.getByRole('button', { name: 'Chiudi avviso' })).toBeInTheDocument()
  })

  it('due avvisi identici diventano uno con il contatore', () => {
    render(<ToastRegion />)
    act(() => {
      toast.success('Partita aggiunta')
      toast.success('Partita aggiunta')
    })
    expect(screen.getAllByText(/Partita aggiunta/)).toHaveLength(1)
    expect(screen.getByRole('status')).toHaveTextContent('×2')
  })

  it('un avviso di stato ripetuto non conta: niente «×2» sulla rete lenta', () => {
    render(<ToastRegion />)
    act(() => {
      toast.show('info', "Connessione lenta: potrebbe volerci un po'.", { key: 'lenta', conta: false })
      toast.show('info', "Connessione lenta: potrebbe volerci un po'.", { key: 'lenta', conta: false })
    })
    expect(screen.getAllByText(/Connessione lenta/)).toHaveLength(1)
    expect(screen.getByRole('status')).not.toHaveTextContent('×')
  })

  it('al massimo due avvisi', async () => {
    render(<ToastRegion />)
    act(() => {
      toast.info('uno')
      toast.info('due')
      toast.info('tre')
    })
    // Il più vecchio esce (in dissolvenza: si aspetta la fine dell'uscita).
    await waitFor(() => expect(screen.queryByText('uno')).toBeNull())
    expect(screen.getByText('due')).toBeInTheDocument()
    expect(screen.getByText('tre')).toBeInTheDocument()
  })
})
