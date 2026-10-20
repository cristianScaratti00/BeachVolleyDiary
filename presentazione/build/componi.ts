// ============================================================================
// La landing al momento della build: `presentazione/index.html` è un modello,
// e qui gli si mettono dentro i disegni che vengono dall'app.
// Lo chiama il plugin `landing` di vite.config.ts (`transformIndexHtml`, in
// sviluppo e in build), e lo può chiamare un test che vuole l'HTML finito.
//
// Niente si copia a mano: il marchio è la geometria di `BrandMark`
// (Logo.tsx), le icone i tracciati di `Icon.paths.ts`. Così il sito non
// ridisegna l'app e non diverge da lei.
//
// Il linguaggio del modello, tutto e solo questo:
//   <!--@marchio-->               il pallone del marchio (BrandMark), nudo
//   <!--@icone-->                 lo sprite delle icone usate in pagina (`#i-nome`)
// Una direttiva sconosciuta o un'icona che l'app non ha fermano la build:
// meglio che un buco nella pagina.
// ============================================================================
import { PATHS } from '../../src/components/ui/Icon.paths'

type IconName = keyof typeof PATHS

// --------------------------------------------------------------- marchio
// `BrandMark` di Logo.tsx, nudo: il pallone bianco con la fascia arancio e il
// filo. I colori li dà il CSS (classi), la geometria è del disegno.
function marchio(id: string): string {
  return (
    `<svg class="marchio" viewBox="-32 -32 64 64" aria-hidden="true" focusable="false">` +
    `<defs><clipPath id="marchio-${id}"><circle r="30"/></clipPath></defs>` +
    `<circle class="marchio-palla" r="30"/>` +
    `<path class="marchio-fascia" d="M-34 -14 C-12 -30 16 -30 34 -12" clip-path="url(#marchio-${id})" stroke-width="10"/>` +
    `<circle class="marchio-filo" r="30" stroke-width="3"/>` +
    `</svg>`
  )
}

// ----------------------------------------------------------------- icone
// Uno sprite col tracciato di ogni icona usata (`<use href="#i-nome">`): le
// stesse di `Icon.paths.ts`, e la stessa classe `ui-icon` di Icon.css.
function sprite(html: string): string {
  const usate = new Set<IconName>()
  for (const m of html.matchAll(/href="#i-([a-z-]+)"/g)) {
    const nome = m[1] as IconName
    if (!(nome in PATHS)) throw new Error(`landing: icona sconosciuta «${nome}»`)
    usate.add(nome)
  }
  const simboli = [...usate].sort().map((n) => `<symbol id="i-${n}" viewBox="0 0 24 24"><path d="${PATHS[n]}"/></symbol>`).join('')
  return `<svg class="sprite" aria-hidden="true" focusable="false">${simboli}</svg>`
}

// ------------------------------------------------------------ il modello
export function componiLanding(html: string): string {
  let n = 0
  const nuovoId = () => `l${++n}`
  let out = html.replace(/<!--@([^>]*?)-->/g, (_, corpo: string) => {
    const nome = corpo.trim()
    switch (nome) {
      case 'marchio':
        return marchio(nuovoId())
      case 'icone':
        return '<!--@icone-->' // dopo: lo sprite conta le icone dell'HTML finito
      default:
        throw new Error(`landing: direttiva sconosciuta <!--@${nome}-->`)
    }
  })
  out = out.replace('<!--@icone-->', sprite(out))
  return out
}
