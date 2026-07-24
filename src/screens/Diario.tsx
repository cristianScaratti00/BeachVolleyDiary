import { useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { deriveDiarySearch } from '../lib/derive'
import type { DiaryEntry, DiaryMatchHit } from '../lib/derive'
import { PageHeader, Button, EmptyCard, InlineLink, MatchRow, MUTED } from '../components/ui'

interface DiarioProps {
  entries: DiaryEntry[]
  onOpenTorneo: (id: string) => void
  onInstagramStory: (id: string) => void
  onNewTorneo: () => void
}

// Glifo Instagram (line-icon, eredita currentColor).
function IgGlyph({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  )
}

// Lente del campo di ricerca (decorativa: il nome del campo lo dà la label).
function SearchGlyph({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.6-3.6" />
    </svg>
  )
}

// Etichetta per i soli screen reader: il campo si spiega da sé con la lente e
// il placeholder, ma un input senza nome accessibile non è annunciabile.
const srOnly: CSSProperties = {
  position: 'absolute', width: 1, height: 1, padding: 0, margin: -1,
  overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap', border: 0,
}

// Stessa grammatica visiva dei campi di ChiCeOggi / del picker di CompagnoDetail.
const searchField: CSSProperties = {
  width: '100%',
  border: '1px solid rgba(27,42,74,.16)',
  borderRadius: 10,
  padding: '11px 13px 11px 38px',
  font: "600 14px 'Nunito Sans'",
  background: '#fff',
  color: '#1B2A4A',
  // Normalizza la resa nativa del campo (bordi/altezza di input[type=search]).
  // NON basta a togliere la crocetta di WebKit: quella è un pseudo-elemento e
  // si spegne in index.css (`::-webkit-search-cancel-button`), altrimenti il
  // campo mostra due pulsanti di cancellazione. Il reset è il nostro `<button>`,
  // che esiste anche dove il browser non ne offre uno.
  appearance: 'none',
  WebkitAppearance: 'none',
}

// ---------------------------------------------------------------- SearchField
// Campo di ricerca del diario. È un `<button>` vero per il reset (non un div
// con onClick), così si raggiunge con Tab come tutto il resto della barra.
function SearchField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const clear = () => {
    onChange('')
    // Cancellare non deve anche buttare via il focus: si continua a digitare.
    inputRef.current?.focus()
  }
  return (
    <div role="search" style={{ position: 'relative', marginTop: 22 }}>
      <label htmlFor="diario-q" style={srOnly}>Cerca nel diario</label>
      <span aria-hidden="true" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', display: 'flex', color: 'rgba(27,42,74,.42)', pointerEvents: 'none' }}>
        <SearchGlyph />
      </span>
      <input
        id="diario-q"
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Cerca un torneo, una città, un avversario…"
        autoComplete="off"
        style={{ ...searchField, paddingRight: value ? 42 : 13 }}
      />
      {value !== '' && (
        <button
          type="button"
          className="chip"
          aria-label="Cancella la ricerca"
          onClick={clear}
          style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', width: 26, height: 26, borderRadius: '50%', border: 'none', background: '#F2F0EC', color: MUTED, cursor: 'pointer', font: "700 15px 'Nunito Sans'", lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          ×
        </button>
      )}
    </div>
  )
}

// Bottom-sheet card entry del diario.
function EntryCard({ e, hits, onOpen, onStory }: { e: DiaryEntry; hits: DiaryMatchHit[]; onOpen: () => void; onStory: () => void }) {
  return (
    <div className="card lift" onClick={onOpen} style={{ padding: 0, overflow: 'hidden', cursor: 'pointer', display: 'flex' }}>
      {/* colonna data */}
      <div style={{ flex: 'none', width: 78, padding: '16px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, borderRight: `1px solid rgba(27,42,74,.08)`, background: '#FBFAF7' }}>
        <div className="num" style={{ fontSize: 22, fontWeight: 600, lineHeight: 1, color: '#1B2A4A' }}>{e.day}</div>
        <div style={{ font: "800 10px 'Nunito Sans'", letterSpacing: '.5px', textTransform: 'uppercase', color: '#FF6B35' }}>{e.month}</div>
        <div style={{ font: "700 11px 'Nunito Sans'", color: 'rgba(27,42,74,.4)' }}>{e.year}</div>
        <div style={{ fontSize: 18, marginTop: 6 }}>{e.emoji}</div>
      </div>

      {/* contenuto */}
      <div style={{ flex: 1, minWidth: 0, padding: '15px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: e.accent, flex: 'none' }} />
            {/* Il titolo è l'azione primaria della card: un `button` vero, così
                si raggiunge con Tab e si apre con Invio/Spazio senza dover
                gestire i tasti a mano. Un `role="button"` sull'intera card
                anniderebbe il pulsante "Storia Instagram" dentro a un altro
                pulsante e nasconderebbe il contenuto agli screen reader
                (difetto #5 di docs/QA-tornei-formati.md). */}
            <button
              type="button"
              className="chip"
              onClick={(ev) => { ev.stopPropagation(); onOpen() }}
              style={{ minWidth: 0, padding: 0, border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', font: "700 15px 'Nunito Sans'", color: '#1B2A4A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
            >
              {e.title}
            </button>
          </div>
          <div style={{ flex: 'none', font: "700 11px 'Nunito Sans'", padding: '4px 9px', borderRadius: 8, background: e.badgeBg, color: e.badgeColor }}>{e.badge}</div>
        </div>

        <div style={{ font: "600 12.5px 'Nunito Sans'", color: 'rgba(27,42,74,.55)', lineHeight: 1.4 }}>{e.desc}</div>

        {/* Riscontri di ricerca: le partite che contengono il termine cercato.
            Sono contesto, non azioni (`readOnly`): il click bolle fino alla card
            e apre il torneo, dove le partite si vedono comunque tutte. */}
        {hits.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 2 }}>
            {hits.map((m) => (
              <MatchRow
                key={m.id}
                size="sm"
                readOnly
                onClick={() => {}}
                esitoShort={m.esitoShort}
                esitoColor={m.esitoColor}
                primary={`vs ${m.opponents}`}
                secondary={m.phase}
                setChips={m.setChips}
                note={m.note || undefined}
              />
            ))}
          </div>
        )}

        {e.photos.length > 0 && (
          <div style={{ display: 'flex', gap: 7, marginTop: 2 }}>
            {e.photos.map((ph, i) => (
              <div key={i} title={ph.caption} style={{ width: 46, height: 46, borderRadius: 10, background: ph.color, position: 'relative', overflow: 'hidden', flex: 'none' }}>
                {ph.url ? (
                  <img src={ph.url} alt={ph.caption} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                ) : (
                  <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(45deg,rgba(255,255,255,.12) 0 7px,transparent 7px 14px)' }} />
                )}
              </div>
            ))}
            {e.morePhotos > 0 && (
              <div style={{ width: 46, height: 46, borderRadius: 10, background: '#F2F0EC', display: 'flex', alignItems: 'center', justifyContent: 'center', font: "700 12px 'Nunito Sans'", color: 'rgba(27,42,74,.5)', flex: 'none' }}>+{e.morePhotos}</div>
            )}
          </div>
        )}

        {/* CTA: storia Instagram (segnaposto, nessuna integrazione) */}
        <div style={{ display: 'flex', marginTop: 4 }}>
          <button
            onClick={(ev) => { ev.stopPropagation(); onStory() }}
            className="chip"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 13px', borderRadius: 10, border: 'none', cursor: 'pointer', color: '#fff', font: "700 12px 'Nunito Sans'", background: 'linear-gradient(45deg,#F58529,#DD2A7B 55%,#8134AF)' }}
          >
            <IgGlyph /> Storia Instagram
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Diario({ entries, onOpenTorneo, onInstagramStory, onNewTorneo }: DiarioProps) {
  // La query è puramente di presentazione: vive qui, non risale ad App. Cosa
  // sia cercabile e cosa risponda lo decide `derive`.
  const [q, setQ] = useState('')
  const { active, results, total } = deriveDiarySearch(entries, q)
  const term = q.trim()

  // Il sottotitolo descrive ciò che si vede davvero sotto (a differenza di
  // Tornei, difetto #1 di docs/QA-tornei-formati.md) ed è anche la live region:
  // annunciando il conteggio da qui non serve un secondo nodo che parlerebbe in
  // doppio mentre si digita.
  const subtitle = active
    ? (results.length === 0
      ? `Nessun risultato per «${term}»`
      : `${results.length} ${results.length === 1 ? 'risultato' : 'risultati'} per «${term}»`)
    : `${total} ${total === 1 ? 'torneo' : 'tornei'} nel diario`

  return (
    <div style={{ animation: 'pop .32s ease both' }}>
      <PageHeader
        title="Diario"
        subtitle={<span role="status">{subtitle}</span>}
        actions={<Button variant="dark" onClick={onNewTorneo}>＋ Nuovo torneo</Button>}
      />

      {entries.length === 0 ? (
        <div style={{ marginTop: 22 }}>
          <EmptyCard pad={30}>
            Il tuo diario è vuoto. <InlineLink onClick={onNewTorneo}>Crea il primo torneo →</InlineLink>
          </EmptyCard>
        </div>
      ) : (
        <>
          <SearchField value={q} onChange={setQ} />

          {results.length === 0 ? (
            // Il conteggio lo dà già il sottotitolo: qui la frase cambia taglio
            // e porta l'azione, invece di ripetere la stessa riga due volte.
            <div style={{ marginTop: 14 }}>
              <EmptyCard pad={30}>
                Nessun torneo del diario contiene «{term}». <InlineLink onClick={() => setQ('')}>Cancella la ricerca →</InlineLink>
              </EmptyCard>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 14 }}>
              {results.map((r) => (
                <EntryCard
                  key={r.entry.id}
                  e={r.entry}
                  hits={r.hits}
                  onOpen={() => onOpenTorneo(r.entry.id)}
                  onStory={() => onInstagramStory(r.entry.id)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
