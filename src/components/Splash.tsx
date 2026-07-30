import { BrandMark } from './Logo'

// Schermata di caricamento a tutta pagina: mostrata mentre si ripristina la
// sessione o si scaricano i dati iniziali da Supabase (evita il "flash" del login).
export default function Splash({ label = 'Caricamento…' }: { label?: string }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, background: '#FAF8F5' }}>
      {/* Niente più `detail`: il livello di dettaglio ora lo decide la misura,
          e a 84px (60px di marchio) escono già tutte e sei le cuciture. */}
      <BrandMark size={84} style={{ boxShadow: '0 20px 50px -30px rgba(27,42,74,.5)' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#FF6B35' }} />
        <div style={{ font: "600 18px 'Space Grotesk'", color: '#1B2A4A', letterSpacing: '-.2px' }}>Beach Diary</div>
      </div>
      <div style={{ font: "700 12px 'Nunito Sans'", color: 'rgba(27,42,74,.45)' }}>{label}</div>
    </div>
  )
}
