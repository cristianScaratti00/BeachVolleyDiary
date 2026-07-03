import type { DiaryData, Partner, Tournament, Match, SetScore, Photo } from './models'

// Initial demo data — mirrors the design's seed() exactly.
export function seed(): DiaryData {
  const partners: Partner[] = [
    { id: 'p1', name: 'Luca', color: '#FF6B35' },
    { id: 'p2', name: 'Andrea', color: '#00B4D8' },
  ]

  const tournaments: Tournament[] = [
    { id: 't1', name: 'Sunset Series Cervia', date: '2025-06-28', city: 'Cervia', category: 'Amatoriale', format: '2vs2', surface: 'Sabbia outdoor', placement: '1° 🏆', color: '#FF6B35', emoji: '🌅' },
    { id: 't2', name: 'Beach Open Jesolo', date: '2025-07-19', city: 'Jesolo', category: 'Open', format: '2vs2', surface: 'Sabbia outdoor', placement: 'Gironi', color: '#00B4D8', emoji: '🏐' },
    { id: 't3', name: 'Summer Cup Rimini', date: '2025-08-14', city: 'Rimini', category: 'Amatoriale', format: '2vs2', surface: 'Sabbia outdoor', placement: '2°', color: '#FFD23F', emoji: '🏖️' },
  ]

  const mk = (id: string, tid: string, pid: string, opp: string, phase: Match['phase'], note: string, sets: SetScore[]): Match => (
    { id, tournamentId: tid, partnerId: pid, opponents: opp, phase, note, sets }
  )
  const matches: Match[] = [
    mk('m1', 't1', 'p1', 'Rossi / Neri', 'Girone', '', [{ us: 21, them: 14 }, { us: 21, them: 16 }]),
    mk('m2', 't1', 'p1', 'Gialli / Blu', 'Quarti', '', [{ us: 21, them: 18 }, { us: 21, them: 19 }]),
    mk('m3', 't1', 'p1', 'Ferrari / Conti', 'Semifinale', 'Rimonta nel terzo set!', [{ us: 21, them: 19 }, { us: 19, them: 21 }, { us: 15, them: 12 }]),
    mk('m4', 't1', 'p1', 'Marini / Sala', 'Finale', 'Titolo vinto', [{ us: 21, them: 18 }, { us: 22, them: 20 }]),
    mk('m5', 't2', 'p2', 'Costa / Riva', 'Girone', '', [{ us: 15, them: 21 }, { us: 18, them: 21 }]),
    mk('m6', 't2', 'p2', 'Greco / Villa', 'Girone', '', [{ us: 21, them: 19 }, { us: 19, them: 21 }, { us: 10, them: 15 }]),
    mk('m7', 't2', 'p2', 'De Luca / Fabbri', 'Girone', '', [{ us: 21, them: 17 }, { us: 21, them: 15 }]),
    mk('m8', 't3', 'p1', 'Longo / Serra', 'Girone', '', [{ us: 21, them: 15 }, { us: 21, them: 18 }]),
    mk('m9', 't3', 'p1', 'Basile / Rizzo', 'Girone', '', [{ us: 19, them: 21 }, { us: 21, them: 17 }, { us: 15, them: 12 }]),
    mk('m10', 't3', 'p1', 'Palumbo / Testa', 'Quarti', '', [{ us: 21, them: 16 }, { us: 21, them: 19 }]),
    mk('m11', 't3', 'p1', 'Moretti / Fontana', 'Semifinale', '', [{ us: 22, them: 20 }, { us: 18, them: 21 }, { us: 15, them: 11 }]),
    mk('m12', 't3', 'p1', 'Barbieri / Gatti', 'Finale', 'Persa al terzo, che peccato', [{ us: 18, them: 21 }, { us: 21, them: 19 }, { us: 12, them: 15 }]),
  ]

  const photos: Photo[] = [
    { id: 'ph1', tournamentId: 't1', color: '#FF6B35', caption: 'Trofeo Cervia' },
    { id: 'ph2', tournamentId: 't1', color: '#1B2A4A', caption: 'Match point finale' },
    { id: 'ph3', tournamentId: 't3', color: '#FFD23F', caption: 'Campo centrale Rimini' },
    { id: 'ph4', tournamentId: 't3', color: '#FF477E', caption: 'Tramonto sul mare' },
    { id: 'ph5', tournamentId: 't2', color: '#00B4D8', caption: 'Warm-up Jesolo' },
  ]

  return { tournaments, matches, partners, photos }
}
