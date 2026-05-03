export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          appointment_date: string
          appointment_time: string
          created_at: string
          doctor_id: string
          id: string
          patient_email: string | null
          patient_id: string | null
          patient_name: string | null
          patient_phone: string | null
          payment_method: string | null
          payment_status: string | null
          status: string | null
          symptoms: string | null
          updated_at: string
        }
        Insert: {
          appointment_date: string
          appointment_time: string
          created_at?: string
          doctor_id: string
          id?: string
          patient_email?: string | null
          patient_id?: string | null
          patient_name?: string | null
          patient_phone?: string | null
          payment_method?: string | null
          payment_status?: string | null
          status?: string | null
          symptoms?: string | null
          updated_at?: string
        }
        Update: {
          appointment_date?: string
          appointment_time?: string
          created_at?: string
          doctor_id?: string
          id?: string
          patient_email?: string | null
          patient_id?: string | null
          patient_name?: string | null
          patient_phone?: string | null
          payment_method?: string | null
          payment_status?: string | null
          status?: string | null
          symptoms?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          title: string
          message: string
          metadata: Json | null
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          title: string
          message: string
          metadata?: Json | null
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          title?: string
          message?: string
          metadata?: Json | null
          is_read?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      prepone_requests: {
        Row: {
          id: string
          appointment_id: string
          patient_id: string
          doctor_id: string
          requested_date: string
          requested_time: string
          original_date: string
          original_time: string
          status: string
          reason: string | null
          doctor_response: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          appointment_id: string
          patient_id: string
          doctor_id: string
          requested_date: string
          requested_time: string
          original_date: string
          original_time: string
          status?: string
          reason?: string | null
          doctor_response?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          appointment_id?: string
          patient_id?: string
          doctor_id?: string
          requested_date?: string
          requested_time?: string
          original_date?: string
          original_time?: string
          status?: string
          reason?: string | null
          doctor_response?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prepone_requests_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prepone_requests_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prepone_requests_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
        ]
      }
      clinics: {
        Row: {
          address: string
          city: string
          clinic_name: string
          created_at: string
          doctor_id: string
          id: string
          latitude: number | null
          longitude: number | null
          pincode: string | null
          state: string
          updated_at: string
        }
        Insert: {
          address: string
          city: string
          clinic_name: string
          created_at?: string
          doctor_id: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          pincode?: string | null
          state: string
          updated_at?: string
        }
        Update: {
          address?: string
          city?: string
          clinic_name?: string
          created_at?: string
          doctor_id?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          pincode?: string | null
          state?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinics_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
        ]
      }
      doctors: {
        Row: {
          bio: string | null
          consultation_fee: number
          created_at: string
          education: string | null
          experience_years: number | null
          id: string
          is_active: boolean | null
          specialization: string
          timings: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bio?: string | null
          consultation_fee: number
          created_at?: string
          education?: string | null
          experience_years?: number | null
          id?: string
          is_active?: boolean | null
          specialization: string
          timings?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bio?: string | null
          consultation_fee?: number
          created_at?: string
          education?: string | null
          experience_years?: number | null
          id?: string
          is_active?: boolean | null
          specialization?: string
          timings?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      patient_records: {
        Row: {
          attachments: Json | null
          created_at: string
          diagnosis: string | null
          doctor_id: string
          id: string
          notes: string | null
          patient_id: string
          prescription: string | null
          token_id: string
          updated_at: string
        }
        Insert: {
          attachments?: Json | null
          created_at?: string
          diagnosis?: string | null
          doctor_id: string
          id?: string
          notes?: string | null
          patient_id: string
          prescription?: string | null
          token_id: string
          updated_at?: string
        }
        Update: {
          attachments?: Json | null
          created_at?: string
          diagnosis?: string | null
          doctor_id?: string
          id?: string
          notes?: string | null
          patient_id?: string
          prescription?: string | null
          token_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_records_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_records_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_records_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: true
            referencedRelation: "tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          role: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      tokens: {
        Row: {
          appointment_id: string | null
          created_at: string
          delay_minutes: number | null
          doctor_id: string
          estimated_time: string | null
          id: string
          patient_id: string | null
          priority: boolean | null
          status: string | null
          token_date: string | null
          token_number: number
          token_type: string
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          created_at?: string
          delay_minutes?: number | null
          doctor_id: string
          estimated_time?: string | null
          id?: string
          patient_id?: string | null
          priority?: boolean | null
          status?: string | null
          token_date?: string | null
          token_number: number
          token_type: string
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          created_at?: string
          delay_minutes?: number | null
          doctor_id?: string
          estimated_time?: string | null
          id?: string
          patient_id?: string | null
          priority?: boolean | null
          status?: string | null
          token_date?: string | null
          token_number?: number
          token_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tokens_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tokens_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tokens_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "patient" | "doctor" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
  | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
    DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
    DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
  ? R
  : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
    DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] &
    DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
  ? R
  : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
  | keyof DefaultSchema["Tables"]
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Insert: infer I
  }
  ? I
  : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
    Insert: infer I
  }
  ? I
  : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
  | keyof DefaultSchema["Tables"]
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Update: infer U
  }
  ? U
  : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
    Update: infer U
  }
  ? U
  : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
  | keyof DefaultSchema["Enums"]
  | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
  : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
  | keyof DefaultSchema["CompositeTypes"]
  | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
  : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["patient", "doctor", "admin"],
    },
  },
} as const
