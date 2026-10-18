// ============================================================================
// Banner "versione alpha" in Home (UX §3.3, §6.1, Q5; ART_DIRECTION §8).
//
// Dice due cose e basta: che questa è una prima versione, e che se qualcosa si
// rompe c'è un posto dove dirlo. La CTA non è decorativa: senza una via
// d'uscita, avvisare che ci sono bug è solo uno scarico di responsabilità.
//
// Adesso è compatto e si chiude (×): un banner che non si chiude diventa
// rumore. Lo stato chiuso lo salva App per utente e per dispositivo, e
// «Segnala un problema» resta sempre raggiungibile dal Profilo.
// ============================================================================
import { Link } from '../app/router'
import { Icon } from './ui/Icon'
import './BannerAlpha.css'

export default function BannerAlpha({ onChiudi }: { onChiudi: () => void }) {
  return (
    <section aria-label="Avviso versione alpha" className="banner-alpha">
      <p className="banner-alpha-text">
        <strong className="banner-alpha-title">Stai usando una versione alpha.</strong>{' '}
        Qualcosa può non funzionare o comportarsi in modo strano: se ti capita, raccontacelo.{' '}
        <Link to={{ name: 'segnala' }} className="banner-alpha-link">
          Segnala un problema
        </Link>
      </p>
      <button type="button" className="banner-alpha-close" aria-label="Chiudi avviso alpha" onClick={onChiudi}>
        <Icon name="close" size={20} />
      </button>
    </section>
  )
}
