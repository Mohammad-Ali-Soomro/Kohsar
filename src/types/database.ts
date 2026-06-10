export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          full_name: string | null
          avatar_url: string | null
          city: string | null
          bio: string | null
          explorer_count: number
          spots_submitted: number
          spots_visited: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username: string
          full_name?: string | null
          avatar_url?: string | null
          city?: string | null
          bio?: string | null
          explorer_count?: number
          spots_submitted?: number
          spots_visited?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string
          full_name?: string | null
          avatar_url?: string | null
          city?: string | null
          bio?: string | null
          explorer_count?: number
          spots_submitted?: number
          spots_visited?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      spots: {
        Row: {
          id: string
          submitted_by: string | null
          name: string
          description: string
          category: 'beach' | 'waterfall' | 'mountain' | 'valley' | 'viewpoint' | 'historical' | 'desert' | 'forest'
          city: string
          district: string | null
          access_notes: string | null
          best_season: string | null
          difficulty: 'easy' | 'moderate' | 'hard' | null
          location: string // Geometry as representation (e.g. WKT or GeoJSON or PostGIS format)
          lat: number
          lng: number
          cover_photo_url: string | null
          save_count: number
          visit_count: number
          is_approved: boolean
          is_explorer_claimed: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          submitted_by?: string | null
          name: string
          description: string
          category: 'beach' | 'waterfall' | 'mountain' | 'valley' | 'viewpoint' | 'historical' | 'desert' | 'forest'
          city: string
          district?: string | null
          access_notes?: string | null
          best_season?: string | null
          difficulty?: 'easy' | 'moderate' | 'hard' | null
          location: string // PostGIS Geo point structure or representation string
          lat: number
          lng: number
          cover_photo_url?: string | null
          save_count?: number
          visit_count?: number
          is_approved?: boolean
          is_explorer_claimed?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          submitted_by?: string | null
          name?: string
          description?: string
          category?: 'beach' | 'waterfall' | 'mountain' | 'valley' | 'viewpoint' | 'historical' | 'desert' | 'forest'
          city?: string
          district?: string | null
          access_notes?: string | null
          best_season?: string | null
          difficulty?: 'easy' | 'moderate' | 'hard' | null
          location?: string
          lat?: number
          lng?: number
          cover_photo_url?: string | null
          save_count?: number
          visit_count?: number
          is_approved?: boolean
          is_explorer_claimed?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "spots_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      spot_photos: {
        Row: {
          id: string
          spot_id: string
          uploaded_by: string | null
          photo_url: string
          display_order: number
          created_at: string
        }
        Insert: {
          id?: string
          spot_id: string
          uploaded_by?: string | null
          photo_url: string
          display_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          spot_id?: string
          uploaded_by?: string | null
          photo_url?: string
          display_order?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "spot_photos_spot_id_fkey"
            columns: ["spot_id"]
            isOneToOne: false
            referencedRelation: "spots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spot_photos_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      saves: {
        Row: {
          id: string
          user_id: string
          spot_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          spot_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          spot_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "saves_spot_id_fkey"
            columns: ["spot_id"]
            isOneToOne: false
            referencedRelation: "spots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saves_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      visits: {
        Row: {
          id: string
          user_id: string
          spot_id: string
          visited_at: string
          review: string | null
        }
        Insert: {
          id?: string
          user_id: string
          spot_id: string
          visited_at?: string
          review?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          spot_id?: string
          visited_at?: string
          review?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "visits_spot_id_fkey"
            columns: ["spot_id"]
            isOneToOne: false
            referencedRelation: "spots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      explorer_badges: {
        Row: {
          id: string
          user_id: string
          spot_id: string
          awarded_at: string
        }
        Insert: {
          id?: string
          user_id: string
          spot_id: string
          awarded_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          spot_id?: string
          awarded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "explorer_badges_spot_id_fkey"
            columns: ["spot_id"]
            isOneToOne: true
            referencedRelation: "spots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "explorer_badges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      reports: {
        Row: {
          id: string
          reporter_id: string | null
          spot_id: string
          reason: 'duplicate' | 'inappropriate' | 'wrong_location' | 'spam' | 'other'
          note: string | null
          created_at: string
        }
        Insert: {
          id?: string
          reporter_id?: string | null
          spot_id: string
          reason: 'duplicate' | 'inappropriate' | 'wrong_location' | 'spam' | 'other'
          note?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          reporter_id?: string | null
          spot_id?: string
          reason?: 'duplicate' | 'inappropriate' | 'wrong_location' | 'spam' | 'other'
          note?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_spot_id_fkey"
            columns: ["spot_id"]
            isOneToOne: false
            referencedRelation: "spots"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_nearby_spots: {
        Args: {
          user_lat: number
          user_lng: number
          radius_km?: number
          limit_count?: number
        }
        Returns: {
          id: string
          name: string
          category: 'beach' | 'waterfall' | 'mountain' | 'valley' | 'viewpoint' | 'historical' | 'desert' | 'forest'
          city: string
          lat: number
          lng: number
          cover_photo_url: string | null
          save_count: number
          visit_count: number
          distance_km: number
          submitted_by: string | null
          created_at: string
        }[]
      }
      check_duplicate_spot: {
        Args: {
          new_lat: number
          new_lng: number
          radius_meters?: number
        }
        Returns: {
          id: string
          name: string
          distance_m: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
