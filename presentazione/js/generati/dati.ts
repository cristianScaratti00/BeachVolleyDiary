// ============================================================================
// GENERATO da src/app/landing.dati.test.ts: non modificare a mano.
// Il diario di fabbrica dell'anteprima (docs/preview/dati.ts) alla data
// OGGI_LANDING, passato dalle funzioni vere dell'app. Per rigenerarlo:
//   npx vitest run src/app/landing.dati.test.ts -u
// ============================================================================
export const DATI = {
  "oggi": "2026-10-17",
  "nome": "Marta",
  "home": {
    "frase": "Stai vincendo più di prima.",
    "consiglio": "Oggi si gioca: «Rimini Open». Segna le partite man mano, ai numeri ci penso io."
  },
  "numeri": {
    "winPct": 63,
    "diff": "+36",
    "vinte": 5,
    "perse": 3,
    "giocate": 8,
    "torneiVinti": 1,
    "tornei": 7,
    "podi": 3,
    "serie": 5
  },
  "guida": {
    "numeri": "Il tuo record è di 5 vittorie di fila. Si può battere.",
    "mappa": "Il tuo posto magico? Cervia: lì hai vinto.",
    "storia": "Hai vinto «Cervia Beach Party»: lo racconti in una storia?",
    "compagno": "Con Giulia avete vinto 3 partite. Si vede che vi intendete."
  },
  "diario": {
    "mese": "ottobre"
  },
  "mappa": {
    "w": 356,
    "h": 318,
    "costa": "M0 0 H111 L118.7 63.6 L132.1 106 L141.6 137.8 L155 169.6 L179.9 201.4 L223.9 243.8 L254.6 275.6 L287.1 296.8 L313.9 318 V318 H0Z",
    "citta": 5,
    "legenda": {
      "vinta": 1,
      "podio": 2,
      "giocata": 2
    },
    "pin": [
      {
        "citta": "Ravenna",
        "esito": "giocata",
        "piazzamento": "Quarti",
        "r": 7.9,
        "x": 76.6,
        "y": 53
      },
      {
        "citta": "Milano Marittima",
        "esito": "giocata",
        "piazzamento": "Ottavi",
        "r": 7.9,
        "x": 130.2,
        "y": 127.2
      },
      {
        "citta": "Cervia",
        "esito": "vinta",
        "piazzamento": "1°",
        "r": 7.9,
        "x": 134,
        "y": 150.9
      },
      {
        "citta": "Cesenatico",
        "esito": "podio",
        "piazzamento": "3°",
        "r": 7.9,
        "x": 153.1,
        "y": 169.6
      },
      {
        "citta": "Bellaria Igea Marina",
        "esito": "podio",
        "piazzamento": "2°",
        "r": 7.9,
        "x": 179.9,
        "y": 201.4
      }
    ]
  },
  "wrapped": {
    "anno": "2026",
    "slide": [
      {
        "tipo": "wins",
        "occhiello": "Vittorie totali",
        "titolo": "5",
        "sotto": "partite vinte",
        "didascalia": "su 7 giocate",
        "umore": "festa"
      },
      {
        "tipo": "streak",
        "occhiello": "Striscia vincente",
        "titolo": "5",
        "sotto": "vittorie di fila",
        "didascalia": "il miglior filotto della stagione",
        "umore": "cool"
      },
      {
        "tipo": "partner",
        "occhiello": "Miglior compagno",
        "titolo": "Giulia",
        "sotto": "75% insieme",
        "didascalia": "3 vinte su 4 partite",
        "umore": "cuori"
      }
    ]
  },
  "chat": {
    "tornei": [
      "Rimini Open",
      "Cervia Beach Party"
    ],
    "compagni": [
      "Giulia",
      "Marco"
    ]
  }
} as const

export type Dati = typeof DATI
