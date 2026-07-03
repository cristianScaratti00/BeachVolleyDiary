// Schermata di caricamento a tutta pagina: mostrata mentre si ripristina la
// sessione o si scaricano i dati iniziali da Supabase (evita il "flash" del login).
export default function Splash({ label = 'Caricamento…' }: { label?: string }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FAF8F5' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FF6B35' }} />
        <div style={{ font: "600 15px 'Space Grotesk'", color: '#1B2A4A', letterSpacing: '-.2px' }}>Beach Diary</div>
        <div style={{ font: "700 13px 'Nunito Sans'", color: 'rgba(27,42,74,.45)', marginLeft: 4 }}>{label}</div>
      </div>
    </div>
  )
}
