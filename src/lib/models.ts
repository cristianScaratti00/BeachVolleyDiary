// ============================================================================
// Modello di dominio dell'app (forma runtime, quella salvata in localStorage).
// NB: diverso da database.types.ts, che è il contratto del DB Supabase
// (camelCase vs snake_case, set inline vs tabella match_sets).
// I vincoli sui campi enum sono condivisi con db.enums.ts.
// ============================================================================
import type { Category, Format, Surface, Phase, Placement } from "./db.enums";

export type { Category, Format, Surface, Phase, Placement };

export interface Partner {
  id: string;
  name: string;
  color: string;
  linkedUserId: string | null; // utente app collegato a questo socio (condivisione)
  shared: boolean; // true = socio di un altro utente, visibile in sola lettura
}

// Utente dell'app selezionabile per collegare un socio (dalla ricerca DB).
export interface AppUser {
  id: string;
  name: string;
  email: string;
}

// ---------------------------------------------------------------------------
// Luogo di gioco (spiaggia/impianto). Promuove a entità ciò che finora era il
// testo libero `Tournament.city`: due tornei alla stessa spiaggia puntano alla
// stessa riga invece di condividere (o no) la stessa stringa.
//
// Catalogo condiviso fra gli utenti (scelta di prodotto): "Bagno 26 · Riccione"
// è lo stesso posto per tutti. `shared` distingue le righe create da altri
// (modificabili solo da chi le ha create) da quelle proprie.
//
// `city` resta comunque su Tournament come snapshot testuale: i tornei creati
// altrove (o prima di questa feature) non hanno `venueId` e devono continuare a
// leggersi. Ogni selettore che ragiona sul luogo usa `venueKeyOf` in derive.ts.
// ---------------------------------------------------------------------------
export interface Venue {
  id: string;
  name: string; // "Bagno 26" — come lo chiama chi ci gioca
  city: string; // "Riccione" — può coincidere col nome (backfill dalle città)
  lat: number | null; // coordinate opzionali, sempre insieme (o entrambe o nessuna)
  lng: number | null;
  surface: Surface | null; // superficie tipica: default suggerito nel form torneo
  shared: boolean; // true = luogo creato da un altro utente (sola lettura)
}

// ---------------------------------------------------------------------------
// "Chi c'è oggi?" — check-in di giornata + stanza live.
// Dati transitori (per giorno), fuori dal DiaryData persistente: vivono nel
// proprio hook (useCheckIn), non in useDiary.
// ---------------------------------------------------------------------------

// Il proprio check-in di oggi: una riga per utente/città/giorno (null = fuori).
export interface CheckIn {
  id: string;
  city: string;
  date: string; // ISO yyyy-mm-dd (sempre oggi)
  lookingForPartner: boolean; // "cerco compagno"
  note: string;
  tournamentId: string | null; // eventuale torneo collegato (prefill / deep-link)
}

// Payload di check-in. La data è sempre "oggi" (default lato DB), quindi non
// compare qui.
export interface CheckInInput {
  city: string;
  lookingForPartner: boolean;
  note: string;
  tournamentId?: string | null;
}

// Un altro utente presente nella stessa città oggi. Esposizione minima (Q3):
// nome + avatar + nota, niente email.
export interface PresentUser {
  id: string; // id utente app (per collegarlo come socio)
  name: string;
  avatarUrl: string | null;
  lookingForPartner: boolean;
  note: string;
}

export interface SetScore {
  us: number;
  them: number;
}

export interface Tournament {
  id: string;
  name: string;
  date: string;
  city: string; // snapshot testuale del luogo (resta popolato anche con venueId)
  venueId: string | null; // luogo strutturato; null = torneo "vecchio" o da mobile
  category: Category;
  format: Format;
  surface: Surface;
  placement: Placement;
  color: string;
  emoji: string;
  partnerId: string | null; // compagno principale del torneo (con chi l'ho giocato)
  shared: boolean; // true = torneo di un altro utente condiviso con me (sola lettura)
}

export interface Match {
  id: string;
  tournamentId: string;
  partnerId: string | null; // ereditato dal torneo; null = nessuno (socio eliminato)
  opponents: string;
  phase: Phase;
  note: string;
  sets: SetScore[];
}

// Bozza di partita raccolta dall'assistente guidato (chat): il compagno è
// quello del torneo, quindi qui servono solo avversari, fase e punteggi.
export interface GuidedMatch {
  opponents: string;
  phase: Phase;
  sets: SetScore[];
}

export interface Photo {
  id: string;
  tournamentId: string;
  color: string;
  caption: string;
  url: string | null; // URL firmato dell'immagine (null = vecchio segnaposto solo-colore)
}

export interface DiaryData {
  tournaments: Tournament[];
  matches: Match[];
  partners: Partner[];
  photos: Photo[];
  venues: Venue[];
}

// ---------------------------------------------------------------------------
// Form (stato dei modali). Un solo oggetto form condiviso: campi opzionali.
// I set nel form possono avere valori stringa mentre si digita negli input.
// ---------------------------------------------------------------------------
export interface FormSet {
  us: number | string;
  them: number | string;
}

export interface TorneoForm {
  name: string;
  date: string;
  city: string;
  // Luogo: id di un venue esistente, '' = nessuno, 'new' = crealo al volo dai
  // campi `newVenue*`. Stesso idioma di `partnerId === 'new'` + newPartnerName.
  venueId: string;
  newVenueName: string;
  newVenueCity: string;
  newVenueCoords: string; // "45.0678, 12.5432" incollato o preso dal GPS
  category: Category;
  format: Format;
  surface: Surface;
  placement: Placement;
  color: string;
  emoji: string;
}

export interface PartitaForm {
  tournamentId: string;
  partnerId: string; // id di un socio oppure 'new'
  newPartnerName: string;
  opponents: string;
  phase: Phase;
  sets: FormSet[];
  note: string;
}

export interface FotoForm {
  caption: string;
  tournamentId: string;
  color: string;
}

export interface CompagnoForm {
  name: string;
  color: string;
}

// Unione permissiva usata dallo stato `form` in App (tutti i campi opzionali).
export type AnyForm = Partial<
  TorneoForm & PartitaForm & FotoForm & CompagnoForm
>;

// Setter generico tipizzato, passato ai modali.
export type SetField = <K extends keyof AnyForm>(
  key: K,
  value: AnyForm[K],
) => void;

// API per la gestione delle righe-set nel modale partita.
export interface SetsApi {
  rows: FormSet[];
  canAdd: boolean;
  addSet: () => void;
  updateSet: (index: number, key: "us" | "them", value: string) => void;
  removeSet: (index: number) => void;
}

// Coppia {id, name} per i menu a tendina.
export interface Option {
  id: string;
  name: string;
}

// Navigazione e modali a livello di App.
export type ModalKind =
  | "torneo"
  | "torneoRapido"
  | "partita"
  | "foto"
  | "socio"
  | "story"
  | "wrapped"
  | null;
export type Screen =
  | "home"
  | "tornei"
  | "torneo"
  | "compagni"
  | "compagno"
  | "diario"
  | "profilo"
  | "crea"
  | "oggi"
  | "segnala";
