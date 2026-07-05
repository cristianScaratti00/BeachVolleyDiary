// ============================================================================
// Tipi del database — Beach Volley Diary
// Formato compatibile con `supabase gen types typescript`.
// Generato a mano dalla migration supabase/migrations/20260703120000_init.sql;
// una volta applicato lo schema puoi rigenerarlo con la CLI/MCP e otterrai lo stesso risultato.
//
// Nota: i campi con CHECK (category, format, surface, phase, placement) qui sono `string`
// — esattamente come li emette il generatore. Per union più strette usa ./db.enums.ts.
// ============================================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string | null
          full_name: string | null
          role: string
          plan: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string | null
          full_name?: string | null
          role?: string
          plan?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          full_name?: string | null
          role?: string
          plan?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'profiles_id_fkey'
            columns: ['id']
            isOneToOne: true
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      partners: {
        Row: {
          id: string
          user_id: string
          name: string
          color: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          name: string
          color?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          color?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'partners_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      tournaments: {
        Row: {
          id: string
          user_id: string
          name: string
          date: string
          city: string
          category: string
          format: string
          surface: string
          placement: string
          color: string
          emoji: string
          partner_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          name: string
          date: string
          city?: string
          category?: string
          format?: string
          surface?: string
          placement?: string
          color?: string
          emoji?: string
          partner_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          date?: string
          city?: string
          category?: string
          format?: string
          surface?: string
          placement?: string
          color?: string
          emoji?: string
          partner_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'tournaments_partner_id_fkey'
            columns: ['partner_id']
            isOneToOne: false
            referencedRelation: 'partners'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tournaments_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      matches: {
        Row: {
          id: string
          user_id: string
          tournament_id: string
          partner_id: string
          opponents: string
          phase: string
          note: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          tournament_id: string
          partner_id: string
          opponents?: string
          phase?: string
          note?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          tournament_id?: string
          partner_id?: string
          opponents?: string
          phase?: string
          note?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'matches_partner_id_fkey'
            columns: ['partner_id']
            isOneToOne: false
            referencedRelation: 'partners'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'matches_tournament_id_fkey'
            columns: ['tournament_id']
            isOneToOne: false
            referencedRelation: 'tournaments'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'matches_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      match_sets: {
        Row: {
          id: string
          match_id: string
          set_number: number
          us: number
          them: number
        }
        Insert: {
          id?: string
          match_id: string
          set_number: number
          us: number
          them: number
        }
        Update: {
          id?: string
          match_id?: string
          set_number?: number
          us?: number
          them?: number
        }
        Relationships: [
          {
            foreignKeyName: 'match_sets_match_id_fkey'
            columns: ['match_id']
            isOneToOne: false
            referencedRelation: 'matches'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'match_sets_match_id_fkey'
            columns: ['match_id']
            isOneToOne: false
            referencedRelation: 'match_scores'
            referencedColumns: ['match_id']
          },
        ]
      }
      photos: {
        Row: {
          id: string
          user_id: string
          tournament_id: string | null
          caption: string
          color: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          tournament_id?: string | null
          caption?: string
          color?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          tournament_id?: string | null
          caption?: string
          color?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'photos_tournament_id_fkey'
            columns: ['tournament_id']
            isOneToOne: false
            referencedRelation: 'tournaments'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'photos_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      match_scores: {
        Row: {
          match_id: string | null
          user_id: string | null
          tournament_id: string | null
          partner_id: string | null
          sets_us: number | null
          sets_them: number | null
          points_us: number | null
          points_them: number | null
          point_diff: number | null
          won: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: 'matches_partner_id_fkey'
            columns: ['partner_id']
            isOneToOne: false
            referencedRelation: 'partners'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'matches_tournament_id_fkey'
            columns: ['tournament_id']
            isOneToOne: false
            referencedRelation: 'tournaments'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'matches_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Functions: {
      dashboard_stats: {
        Args: { p_partner?: string | null; p_year?: string | null }
        Returns: Json
      }
      tornei_list: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      compagni_list: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      gallery: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      torneo_detail: {
        Args: { p_id: string }
        Returns: Json
      }
      compagno_detail: {
        Args: { p_id: string }
        Returns: Json
      }
      placement_rank: {
        Args: { l: string }
        Returns: number
      }
      seed_demo: {
        Args: { p_user?: string }
        Returns: undefined
      }
      set_updated_at: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// ---------------------------------------------------------------------------
// Helper generici (equivalenti a quelli emessi dalla CLI, versione compatta)
// ---------------------------------------------------------------------------
type PublicSchema = Database['public']

export type Tables<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Row']
export type TablesInsert<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Update']
export type Views<T extends keyof PublicSchema['Views']> = PublicSchema['Views'][T]['Row']

// Alias comodi per il dominio
export type Profile = Tables<'profiles'>
export type Partner = Tables<'partners'>
export type Tournament = Tables<'tournaments'>
export type Match = Tables<'matches'>
export type MatchSet = Tables<'match_sets'>
export type Photo = Tables<'photos'>
export type MatchScore = Views<'match_scores'>
