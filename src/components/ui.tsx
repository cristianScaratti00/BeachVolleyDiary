// ============================================================================
// Libreria di componenti UI condivisi tra le pagine. Servono a togliere la
// duplicazione di markup/stile (badge, header di pagina, griglie statistiche,
// righe partita, empty-state…) e ad uniformare l'aspetto del progetto.
// Tutti sono presentazionali: ricevono dati già pronti dai view-model in derive.
// ============================================================================
import type { CSSProperties, ReactNode } from 'react'

export const INK = '#1B2A4A'
export const ORANGE = '#FF6B35'
export const MUTED = 'rgba(27,42,74,.55)'
export const LINE = 'rgba(27,42,74,.1)'

// ---------------------------------------------------------------- Badge
type BadgeTone = 'premium' | 'onColor' | 'dark' | 'neutral'
type BadgeSize = 'sm' | 'md' | 'lg'

const badgeSize: Record<BadgeSize, CSSProperties> = {
  sm: { font: "800 8px 'Nunito Sans'", padding: '2px 5px', borderRadius: 4 },
  md: { font: "800 8.5px 'Nunito Sans'", padding: '2px 6px', borderRadius: 5 },
  lg: { font: "800 9px 'Nunito Sans'", padding: '3px 8px', borderRadius: 6 },
}
const badgeTone: Record<BadgeTone, CSSProperties> = {
  premium: { background: ORANGE, color: '#fff' },
  onColor: { background: 'rgba(255,255,255,.28)', color: '#fff' }, // su bottoni colorati/gradient
  dark: { background: INK, color: '#fff' },
  neutral: { background: '#F2F0EC', color: MUTED },
}

// Pill maiuscola compatta (Premium, Admin, Attuale…).
export function Badge({ children = 'Premium', tone = 'premium', size = 'md' }: { children?: ReactNode; tone?: BadgeTone; size?: BadgeSize }) {
  return <span style={{ flex: 'none', letterSpacing: '.4px', textTransform: 'uppercase', ...badgeSize[size], ...badgeTone[tone] }}>{children}</span>
}

// ---------------------------------------------------------------- Button
type BtnVariant = 'primary' | 'dark' | 'outline' | 'ghost' | 'assistant' | 'danger'

const btnBase: CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 7, borderRadius: 11,
  font: "700 13.5px 'Nunito Sans'", cursor: 'pointer', padding: '11px 16px', border: 'none',
}
const btnVariant: Record<BtnVariant, CSSProperties> = {
  primary: { background: ORANGE, color: '#fff' },
  dark: { background: INK, color: '#fff' },
  outline: { background: 'transparent', color: INK, border: '1px solid rgba(27,42,74,.18)' },
  ghost: { background: 'transparent', color: ORANGE },
  assistant: { background: 'linear-gradient(135deg,#FF6B35,#FF9558)', color: '#fff', boxShadow: '0 6px 16px -8px rgba(255,107,53,.7)' },
  danger: { background: 'transparent', color: '#FF477E', border: '1px solid rgba(255,71,126,.4)' },
}

// Chip/bottone d'azione. `style` permette piccoli aggiustamenti puntuali.
export function Button({ children, onClick, variant = 'primary', style }: { children: ReactNode; onClick?: () => void; variant?: BtnVariant; style?: CSSProperties }) {
  return <div className="chip" onClick={onClick} style={{ ...btnBase, ...btnVariant[variant], ...style }}>{children}</div>
}

// ---------------------------------------------------------------- PageHeader
// Intestazione delle schermate-lista: titolo grande + sottotitolo + azioni a destra.
export function PageHeader({ title, subtitle, actions }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12, paddingBottom: 22, borderBottom: `1px solid ${LINE}` }}>
      <div>
        {/* `margin: 0` annulla il default del browser: la resa è identica a prima. */}
        <h1 className="num" style={{ fontSize: 'clamp(26px,4vw,34px)', fontWeight: 500, letterSpacing: '-.5px', margin: 0 }}>{title}</h1>
        {subtitle != null && <div style={{ font: "600 14px 'Nunito Sans'", color: MUTED, marginTop: 4 }}>{subtitle}</div>}
      </div>
      {actions && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{actions}</div>}
    </div>
  )
}

// ---------------------------------------------------------------- FilterChips
// Filtro a scelta singola ("Tutti · 2vs2 · 3vs3…"). Sono `button` veri, quindi
// raggiungibili da tastiera e annunciati come premuti/non premuti; l'attivo usa
// il navy pieno, lo stesso linguaggio dello stato selezionato della bottom nav.
// Il bordo c'è in entrambi gli stati: cambiare filtro non muove nulla.
export interface FilterOption { value: string; label: ReactNode }

export function FilterChips({ options, value, onChange, label, mt = 20 }: {
  options: FilterOption[]
  value: string
  onChange: (value: string) => void
  label: string // etichetta del gruppo per gli screen reader
  mt?: number
}) {
  return (
    <div role="group" aria-label={label} style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: mt }}>
      {options.map((o) => {
        const on = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            className="chip"
            aria-pressed={on}
            onClick={() => onChange(o.value)}
            style={{
              padding: '10px 15px', borderRadius: 11, cursor: 'pointer',
              font: "700 13px 'Nunito Sans'",
              background: on ? INK : '#fff',
              color: on ? '#fff' : INK,
              border: `1px solid ${on ? INK : 'rgba(27,42,74,.16)'}`,
              // `.chip` anima l'opacità in hover: va ripetuta, l'inline vince sulla classe.
              transition: 'background .18s ease, color .18s ease, border-color .18s ease, opacity .15s ease',
            }}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------- BackLink
export function BackLink({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <div className="chip" onClick={onClick} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, font: "700 13px 'Nunito Sans'", color: MUTED, cursor: 'pointer', marginBottom: 18 }}>
      {children}
    </div>
  )
}

// ---------------------------------------------------------------- SectionTitle
// Titolo di sezione ("Partite", "Ultimi tornei"…) con azione opzionale a destra.
export function SectionTitle({ children, action, size = 18 }: { children: ReactNode; action?: ReactNode; size?: number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, margin: '26px 0 12px' }}>
      <h2 className="num" style={{ fontSize: size, fontWeight: 500, margin: 0 }}>{children}</h2>
      {action}
    </div>
  )
}

// ---------------------------------------------------------------- Empty states
// Nota vuota discreta, dentro alle card dei grafici.
export function EmptyNote({ children }: { children: ReactNode }) {
  return <div style={{ padding: '18px 4px', textAlign: 'center', font: "700 13px 'Nunito Sans'", color: 'rgba(27,42,74,.42)' }}>{children}</div>
}

// Card di empty-state a tutta larghezza (con eventuale link inline).
export function EmptyCard({ children, pad = 28 }: { children: ReactNode; pad?: number }) {
  return <div className="card" style={{ padding: pad, textAlign: 'center', color: 'rgba(27,42,74,.5)', font: "700 14px 'Nunito Sans'" }}>{children}</div>
}

// Link arancione inline (es. "Aggiungine una →").
export function InlineLink({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return <span className="chip" onClick={onClick} style={{ color: ORANGE, cursor: 'pointer' }}>{children}</span>
}

// ---------------------------------------------------------------- Stat grid
// Griglia di riquadri statistici bordata (dashboard e dettagli).
export function StatGrid({ children, min = 130, radius = 12, mt = 20 }: { children: ReactNode; min?: number; radius?: number; mt?: number }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit,minmax(${min}px,1fr))`, gap: 1, background: LINE, border: `1px solid ${LINE}`, borderRadius: radius, overflow: 'hidden', marginTop: mt }}>
      {children}
    </div>
  )
}

export function StatTile({ value, label, color, valueSize = 30, pad = 18 }: { value: ReactNode; label: ReactNode; color?: string; valueSize?: number; pad?: number | string }) {
  const big = valueSize >= 40
  return (
    <div style={{ background: '#fff', padding: pad }}>
      <div className="num" style={{ fontSize: valueSize, color, ...(big ? { lineHeight: 1 } : {}) }}>{value}</div>
      <div className="lbl" style={{ marginTop: big ? 6 : 4 }}>{label}</div>
    </div>
  )
}

// ---------------------------------------------------------------- Stat footer
// Riga di 3-4 statistiche in fondo alle card entità (torneo/compagno).
interface StatItem { value: ReactNode; label: string; color?: string }
export function StatFooter({ items, gap = 20, valueSize = 20, mt = 16 }: { items: StatItem[]; gap?: number; valueSize?: number; mt?: number }) {
  return (
    <div style={{ display: 'flex', gap, marginTop: mt, paddingTop: 16, borderTop: '1px solid rgba(27,42,74,.08)' }}>
      {items.map((it, i) => (
        <div key={i}>
          <div className="num" style={{ fontSize: valueSize, color: it.color }}>{it.value}</div>
          <div className="lbl">{it.label}</div>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------- MeterRow
// Riga con barra di avanzamento: etichetta + percentuale, barra, sottotitolo.
// Usata dalla dashboard per "win rate per fase" e "win rate per compagno".
export function MeterRow({ label, pct, barW, sub }: { label: string; pct: number; barW: string; sub: string }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ font: "700 13px 'Nunito Sans'" }}>{label}</span>
        <span className="num" style={{ fontSize: 14 }}>{pct}%</span>
      </div>
      <div style={{ height: 6, background: '#F2F0EC', borderRadius: 6, marginTop: 6, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: barW, background: ORANGE, borderRadius: 6, transition: 'width .6s ease' }} />
      </div>
      <div style={{ font: "600 11px 'Nunito Sans'", color: 'rgba(27,42,74,.42)', marginTop: 4 }}>{sub}</div>
    </div>
  )
}

// ---------------------------------------------------------------- Avatar
// Cerchio con iniziale (compagni).
export function Avatar({ initial, size = 48, font = 20, uri }: { initial: string; size?: number; font?: number; uri?: string | null }) {
  if (uri) {
    return <img src={uri} alt="" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', background: INK, flex: 'none', display: 'block' }} />
  }
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: INK, display: 'flex', alignItems: 'center', justifyContent: 'center', font: `600 ${font}px 'Space Grotesk'`, color: '#fff', flex: 'none' }}>
      {initial}
    </div>
  )
}

// ---------------------------------------------------------------- MatchRow
// Riga partita condivisa da TorneoDetail e CompagnoDetail: pallino esito, due
// righe di testo, chip dei set, ed eventuale nota (solo TorneoDetail).
interface SetChip { txt: string; bg: string; color: string }
interface MatchRowProps {
  onClick: () => void
  esitoShort: string
  esitoColor: string
  primary: string
  secondary: string
  setChips: SetChip[]
  note?: string
  size?: 'md' | 'sm'
  readOnly?: boolean // torneo condiviso: riga non cliccabile (non modificabile)
}

export function MatchRow({ onClick, esitoShort, esitoColor, primary, secondary, setChips, note, size = 'md', readOnly = false }: MatchRowProps) {
  const md = size === 'md'
  const pad = md ? '15px 18px' : '14px 16px'
  const dot = md ? 26 : 24
  const dotFont = md ? 11 : 10
  const priFont = md ? "700 14px 'Nunito Sans'" : "700 13.5px 'Nunito Sans'"
  const secFont = md ? "600 12px 'Nunito Sans'" : "600 11.5px 'Nunito Sans'"
  const chipFont = md ? 13 : 12
  const chipPad = md ? '5px 10px' : '5px 9px'
  const chipRadius = md ? 8 : 7
  return (
    <div className={readOnly ? 'card' : 'card lift'} onClick={readOnly ? undefined : onClick} style={{ padding: pad, cursor: readOnly ? 'default' : 'pointer' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: md ? 13 : 12 }}>
          <div style={{ width: dot, height: dot, borderRadius: '50%', border: `2px solid ${esitoColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', font: `700 ${dotFont}px 'Space Grotesk'`, color: esitoColor, flex: 'none' }}>{esitoShort}</div>
          <div>
            <div style={{ font: priFont }}>{primary}</div>
            <div style={{ font: secFont, color: MUTED }}>{secondary}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 7 }}>
          {setChips.map((c, i) => <span key={i} className="num" style={{ fontSize: chipFont, padding: chipPad, borderRadius: chipRadius, background: c.bg, color: c.color }}>{c.txt}</span>)}
        </div>
      </div>
      {note && <div style={{ font: "600 12.5px 'Nunito Sans'", color: 'rgba(27,42,74,.5)', marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(27,42,74,.07)' }}>{note}</div>}
    </div>
  )
}
