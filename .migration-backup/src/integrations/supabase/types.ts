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
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      company_settings: {
        Row: {
          address: string | null
          company_name: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string | null
          id: string
          logo_url: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          company_name?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          logo_url?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          company_name?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          logo_url?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      contacts: {
        Row: {
          country_code: string
          created_at: string
          email: string | null
          hours: string | null
          id: string
          office_address: string | null
          office_name: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          country_code: string
          created_at?: string
          email?: string | null
          hours?: string | null
          id?: string
          office_address?: string | null
          office_name?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          country_code?: string
          created_at?: string
          email?: string | null
          hours?: string | null
          id?: string
          office_address?: string | null
          office_name?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
        ]
      }
      countries: {
        Row: {
          code: string
          continent: string
          created_at: string
          id: string
          is_active: boolean | null
          local_contact: Json | null
          localized_content: Json | null
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          continent: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          local_contact?: Json | null
          localized_content?: Json | null
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          continent?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          local_contact?: Json | null
          localized_content?: Json | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      invoice_items: {
        Row: {
          created_at: string
          description: string
          id: string
          invoice_id: string | null
          quantity: number | null
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          invoice_id?: string | null
          quantity?: number | null
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string | null
          quantity?: number | null
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          barcode_data: string | null
          base_amount: number
          created_at: string
          currency: string
          customer_address: string | null
          customer_email: string
          customer_name: string
          customer_phone: string | null
          destination_country: string
          due_date: string
          exchange_rate: number
          final_amount: number
          height: number | null
          id: string
          invoice_date: string
          invoice_number: string
          length: number | null
          origin_country: string
          payment_status: string | null
          quote_id: string | null
          service_type: string
          status: string | null
          tax_amount: number | null
          total_amount: number
          tracking_number: string | null
          updated_at: string
          user_id: string | null
          weight: number
          width: number | null
        }
        Insert: {
          barcode_data?: string | null
          base_amount: number
          created_at?: string
          currency?: string
          customer_address?: string | null
          customer_email: string
          customer_name: string
          customer_phone?: string | null
          destination_country: string
          due_date?: string
          exchange_rate?: number
          final_amount: number
          height?: number | null
          id?: string
          invoice_date?: string
          invoice_number?: string
          length?: number | null
          origin_country: string
          payment_status?: string | null
          quote_id?: string | null
          service_type: string
          status?: string | null
          tax_amount?: number | null
          total_amount: number
          tracking_number?: string | null
          updated_at?: string
          user_id?: string | null
          weight: number
          width?: number | null
        }
        Update: {
          barcode_data?: string | null
          base_amount?: number
          created_at?: string
          currency?: string
          customer_address?: string | null
          customer_email?: string
          customer_name?: string
          customer_phone?: string | null
          destination_country?: string
          due_date?: string
          exchange_rate?: number
          final_amount?: number
          height?: number | null
          id?: string
          invoice_date?: string
          invoice_number?: string
          length?: number | null
          origin_country?: string
          payment_status?: string | null
          quote_id?: string | null
          service_type?: string
          status?: string | null
          tax_amount?: number | null
          total_amount?: number
          tracking_number?: string | null
          updated_at?: string
          user_id?: string | null
          weight?: number
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      parcels: {
        Row: {
          base_price: number
          calculated_weight: number | null
          chargeable_weight: number | null
          created_at: string | null
          created_by: string | null
          currency: string
          current_status: string
          declared_value: number | null
          from_country: string
          height: number
          id: string
          invoice_id: string | null
          length: number
          live_route: boolean | null
          parcel_type: string
          receiver_address: string
          receiver_name: string
          receiver_phone: string
          route_checkpoints: Json | null
          sender_address: string
          sender_email: string
          sender_name: string
          sender_phone: string
          service_type: string
          special_instructions: string | null
          status_timeline: Json | null
          to_country: string
          total_price: number
          tracking_id: string
          updated_at: string | null
          weight: number
          width: number
        }
        Insert: {
          base_price?: number
          calculated_weight?: number | null
          chargeable_weight?: number | null
          created_at?: string | null
          created_by?: string | null
          currency?: string
          current_status?: string
          declared_value?: number | null
          from_country: string
          height: number
          id?: string
          invoice_id?: string | null
          length: number
          live_route?: boolean | null
          parcel_type?: string
          receiver_address: string
          receiver_name: string
          receiver_phone: string
          route_checkpoints?: Json | null
          sender_address: string
          sender_email: string
          sender_name: string
          sender_phone: string
          service_type?: string
          special_instructions?: string | null
          status_timeline?: Json | null
          to_country: string
          total_price?: number
          tracking_id?: string
          updated_at?: string | null
          weight: number
          width: number
        }
        Update: {
          base_price?: number
          calculated_weight?: number | null
          chargeable_weight?: number | null
          created_at?: string | null
          created_by?: string | null
          currency?: string
          current_status?: string
          declared_value?: number | null
          from_country?: string
          height?: number
          id?: string
          invoice_id?: string | null
          length?: number
          live_route?: boolean | null
          parcel_type?: string
          receiver_address?: string
          receiver_name?: string
          receiver_phone?: string
          route_checkpoints?: Json | null
          sender_address?: string
          sender_email?: string
          sender_name?: string
          sender_phone?: string
          service_type?: string
          special_instructions?: string | null
          status_timeline?: Json | null
          to_country?: string
          total_price?: number
          tracking_id?: string
          updated_at?: string | null
          weight?: number
          width?: number
        }
        Relationships: []
      }
      pricing_config: {
        Row: {
          base_rate_per_kg: number
          created_at: string
          currency_rates: Json
          id: string
          region_multipliers: Json
          service_multipliers: Json
          updated_at: string
        }
        Insert: {
          base_rate_per_kg?: number
          created_at?: string
          currency_rates?: Json
          id?: string
          region_multipliers?: Json
          service_multipliers?: Json
          updated_at?: string
        }
        Update: {
          base_rate_per_kg?: number
          created_at?: string
          currency_rates?: Json
          id?: string
          region_multipliers?: Json
          service_multipliers?: Json
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company: string | null
          created_at: string
          full_name: string | null
          id: string
          is_admin: boolean | null
          is_blocked: boolean | null
          phone: string | null
          role: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          company?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          is_admin?: boolean | null
          is_blocked?: boolean | null
          phone?: string | null
          role?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          company?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          is_admin?: boolean | null
          is_blocked?: boolean | null
          phone?: string | null
          role?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quotes: {
        Row: {
          created_at: string
          destination_country: string
          email: string
          height: number | null
          id: string
          invoice_generated: boolean | null
          length: number | null
          origin_country: string
          phone: string | null
          price_estimate: number | null
          service_type: string
          status: string | null
          updated_at: string
          user_id: string | null
          weight: number
          width: number | null
        }
        Insert: {
          created_at?: string
          destination_country: string
          email: string
          height?: number | null
          id?: string
          invoice_generated?: boolean | null
          length?: number | null
          origin_country: string
          phone?: string | null
          price_estimate?: number | null
          service_type: string
          status?: string | null
          updated_at?: string
          user_id?: string | null
          weight: number
          width?: number | null
        }
        Update: {
          created_at?: string
          destination_country?: string
          email?: string
          height?: number | null
          id?: string
          invoice_generated?: boolean | null
          length?: number | null
          origin_country?: string
          phone?: string | null
          price_estimate?: number | null
          service_type?: string
          status?: string | null
          updated_at?: string
          user_id?: string | null
          weight?: number
          width?: number | null
        }
        Relationships: []
      }
      shipments: {
        Row: {
          created_at: string
          current_status: string | null
          destination: string
          detailed_status: Json | null
          estimated_delivery: string | null
          events: Json | null
          id: string
          invoice_id: string | null
          origin: string
          service_type: string
          tracking_number: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          current_status?: string | null
          destination: string
          detailed_status?: Json | null
          estimated_delivery?: string | null
          events?: Json | null
          id?: string
          invoice_id?: string | null
          origin: string
          service_type: string
          tracking_number?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          current_status?: string | null
          destination?: string
          detailed_status?: Json | null
          estimated_delivery?: string | null
          events?: Json | null
          id?: string
          invoice_id?: string | null
          origin?: string
          service_type?: string
          tracking_number?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shipments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      tracking_config: {
        Row: {
          created_at: string | null
          current_seed: number
          id: string
          padding_length: number
          prefix: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_seed?: number
          id?: string
          padding_length?: number
          prefix?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_seed?: number
          id?: string
          padding_length?: number
          prefix?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_volumetric_weight: {
        Args: { height_cm: number; length_cm: number; width_cm: number }
        Returns: number
      }
      generate_next_tracking_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_skynet_tracking: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_tracking_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_user_role: {
        Args: { user_uuid: string }
        Returns: string
      }
      is_user_blocked: {
        Args: { user_uuid: string }
        Returns: boolean
      }
      search_tracking: {
        Args: { tracking_id: string }
        Returns: {
          current_status: string
          destination: string
          detailed_status: Json
          estimated_delivery: string
          events: Json
          origin: string
          service_type: string
          tracking_number: string
        }[]
      }
      set_admin_by_email: {
        Args: { admin_email: string }
        Returns: boolean
      }
      update_shipment_status: {
        Args: {
          location?: string
          new_status: string
          notes?: string
          shipment_tracking: string
        }
        Returns: boolean
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
    Enums: {},
  },
} as const
