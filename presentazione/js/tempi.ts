// ============================================================================
// I tempi e le curve del movimento, letti dai token (tokens.css dell'app e
// della landing): il JavaScript non scrive mai una durata o una curva sua.
// Col fermo i token cambiano da soli (`--dur-racconto: 0ms`…), e chi li
// rilegge al momento giusto li trova già giusti.
// ============================================================================

const css = () => getComputedStyle(document.documentElement)

/** Una durata dei token, in ms: `ms('--dur-svelto')`, `ms('--delay-skeleton')`. */
export function ms(prop: string): number {
  const v = css().getPropertyValue(prop).trim()
  const n = parseFloat(v)
  if (!Number.isFinite(n)) return 0
  return v.endsWith('ms') ? n : v.endsWith('s') ? n * 1000 : n
}

/** Una curva dei token, così com'è (`linear(…)`, `cubic-bezier(…)`): va bene a CSS e a WAAPI. */
export function curva(prop: string): string {
  return css().getPropertyValue(prop).trim() || 'ease'
}

/** Un valore qualunque dei token, risolto (un colore, una misura). */
export function token(prop: string): string {
  return css().getPropertyValue(prop).trim()
}
