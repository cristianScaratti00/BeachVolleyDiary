// Wrapper minimale su axe-core: nessuna dipendenza in più, e il messaggio di
// errore contiene la regola violata e il selettore del nodo, non un blob.
import axe from 'axe-core'
import { expect } from 'vitest'

export async function expectNoA11yViolations(container: HTMLElement) {
  const results = await axe.run(container, {
    // Regole che hanno senso su un frammento montato in jsdom. Quelle di
    // struttura di pagina (landmark, region, html-has-lang, page-has-heading-one)
    // riguardano il documento intero, che qui non c'è: attiverebbero rumore
    // costante senza dire niente sul componente.
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
    rules: {
      region: { enabled: false },
      // jsdom non calcola il layout e non implementa canvas: color-contrast non
      // può che restituire "incomplete", sporcando stderr ad ogni run. Il
      // contrasto è coperto altrove, sui colori veri (contrast.test.ts).
      'color-contrast': { enabled: false },
    },
  })
  const summary = results.violations.map(
    (v) => `${v.id} (${v.impact}): ${v.help}\n  ${v.nodes.map((n) => n.target.join(' ')).join('\n  ')}`,
  )
  expect(summary, `Violazioni di accessibilità:\n${summary.join('\n')}`).toEqual([])
}
