// ============================================================================
// Bottom-sheet condiviso — il presidio di un difetto che è arrivato in
// produzione: sul telefono il modale del torneo non scorreva, e "Salva"
// restava sotto il bordo dello schermo.
//
// La causa era una sola riga di Motion (render/html/use-props):
//
//     if (props.drag && props.dragListener !== false) {
//         style.userSelect = ... = "none"
//         style.touchAction = props.drag === true ? "none" : `pan-${...}`
//     }
//
// Con `drag="y"` sul foglio, Motion gli scriveva sopra `touch-action: pan-x`:
// il browser non poteva più scorrerlo col dito. Col mouse la rotellina
// funzionava lo stesso, ed è per questo che nessuno se n'era accorto.
//
// ⚠️ Perché il test guarda `user-select` e non `touch-action`, che sarebbe la
// proprietà del difetto: **jsdom scarta `touch-action`** dalla serializzazione
// degli stili inline (stessa famiglia del `border: none` documentato in
// docs). `user-select: none` invece sopravvive, ed è scritto dallo STESSO
// `if`: se ricompare sul foglio, è ricomparso anche `touch-action`. È un
// indicatore indiretto per necessità, non per scelta — il primo test qui sotto
// lo tiene onesto verificando che la libreria si comporti ancora così.
// ============================================================================
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import * as m from 'motion/react-m'
import { Sheet } from './Sheet'

// Il foglio trascinabile: primo figlio dello sfondo. È l'elemento su cui vive
// `drag`, quindi quello a cui Motion scriverebbe sopra `touch-action`.
//
// Attenzione: `touch-action` vale anche per i DISCENDENTI (il valore effettivo
// è l'intersezione lungo la catena degli antenati). Quindi il presidio va qui
// e non sull'area che scorre, che è un div qualunque e non l'ha mai avuto.
function foglio(container: HTMLElement): HTMLElement {
  const el = container.firstElementChild?.firstElementChild
  expect(el, 'il foglio non è stato trovato').toBeTruthy()
  return el as HTMLElement
}

// L'area che scorre: da questa correzione è un elemento suo, dentro al foglio.
function areaScorrevole(container: HTMLElement): HTMLElement | null {
  return container.querySelector<HTMLElement>('[style*="overflow-y: auto"]')
}

describe('Sheet — la trappola di Motion', () => {
  it('un elemento con drag e listener attivo si porta dietro user-select (e con lui touch-action)', () => {
    // Canarino sulla libreria: se un aggiornamento di Motion cambiasse questa
    // regola, l'indicatore usato dal test successivo smetterebbe di indicare
    // qualcosa e questo test lo direbbe subito.
    const { getByTestId } = render(<m.div data-testid="x" drag="y" />)
    expect(getByTestId('x').getAttribute('style')).toContain('user-select: none')
  })

  it('con dragListener={false} quello stile non viene applicato', () => {
    const { getByTestId } = render(<m.div data-testid="x" drag="y" dragListener={false} />)
    expect(getByTestId('x').getAttribute('style') ?? '').not.toContain('user-select')
  })
})

describe('Sheet — il foglio resta scorrevole col dito', () => {
  it('il foglio trascinabile non porta addosso lo stile che blocca il dito', () => {
    // LA regressione: se questo fallisce, sul telefono il modale non scorre e
    // "Salva" resta sotto il bordo dello schermo.
    const { container } = render(<Sheet onClose={vi.fn()}>contenuto</Sheet>)
    expect(foglio(container).getAttribute('style')).not.toContain('user-select')
  })

  it('l’area che scorre non trascina con sé la pagina dietro', () => {
    const { container } = render(<Sheet onClose={vi.fn()}>contenuto</Sheet>)
    const style = areaScorrevole(container)?.getAttribute('style') ?? ''
    expect(style).toContain('overflow-y: auto')
    expect(style).toContain('overscroll-behavior: contain')
  })

  it('l’altezza massima è in dvh: sul telefono vh conta anche la barra dell’indirizzo', () => {
    const { container } = render(<Sheet onClose={vi.fn()}>contenuto</Sheet>)
    expect(foglio(container).getAttribute('style')).toContain('max-height: 92dvh')
  })

  it('con scroll={false} non c’è nessuna area scorrevole', () => {
    const { container } = render(<Sheet scroll={false} onClose={vi.fn()}>contenuto</Sheet>)
    expect(areaScorrevole(container)).toBeNull()
  })
})

describe('Sheet — la maniglia', () => {
  it('sta fuori dall’area che scorre, o il contenuto le passerebbe sopra', () => {
    // È anche l'unico punto da cui si chiude col dito: dentro all'area che
    // scorre se ne andrebbe in cima e il gesto sparirebbe con lei.
    const { container } = render(<Sheet onClose={vi.fn()}>contenuto</Sheet>)
    const maniglia = container.querySelector<HTMLElement>('[style*="cursor: grab"]')
    expect(maniglia).not.toBeNull()
    expect(areaScorrevole(container)!.contains(maniglia!)).toBe(false)
  })

  it('non viene annunciata dai lettori di schermo: è un appiglio, non un comando', () => {
    // Chiudere resta possibile da "Annulla" e dal tocco sullo sfondo, che sono
    // i percorsi accessibili: la maniglia è solo la scorciatoia del dito.
    const { container } = render(<Sheet onClose={vi.fn()}>contenuto</Sheet>)
    expect(container.querySelector('[style*="cursor: grab"]')).toHaveAttribute('aria-hidden', 'true')
  })
})

describe('Sheet — chiusura', () => {
  it('il tocco sullo sfondo chiude', async () => {
    const onClose = vi.fn()
    const { container } = render(<Sheet onClose={onClose}>contenuto</Sheet>)
    const sfondo = container.firstElementChild as HTMLElement
    sfondo.click()
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('il tocco dentro al foglio non chiude', () => {
    const onClose = vi.fn()
    render(<Sheet onClose={onClose}>contenuto</Sheet>)
    screen.getByText('contenuto').click()
    expect(onClose).not.toHaveBeenCalled()
  })
})
