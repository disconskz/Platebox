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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      calculation_adjustments: {
        Row: {
          adjusted_price: number | null
          calculation_id: string | null
          created_at: string | null
          id: string
          item_name: string | null
          original_price: number | null
          reason: string | null
        }
        Insert: {
          adjusted_price?: number | null
          calculation_id?: string | null
          created_at?: string | null
          id?: string
          item_name?: string | null
          original_price?: number | null
          reason?: string | null
        }
        Update: {
          adjusted_price?: number | null
          calculation_id?: string | null
          created_at?: string | null
          id?: string
          item_name?: string | null
          original_price?: number | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calculation_adjustments_calculation_id_fkey"
            columns: ["calculation_id"]
            isOneToOne: false
            referencedRelation: "calculations"
            referencedColumns: ["id"]
          },
        ]
      }
      calculation_items: {
        Row: {
          calculation_id: string | null
          id: string
          is_editable: boolean | null
          manual_price: number | null
          name: string
          quantity: number | null
          sort_order: number | null
          stage: string
          total_price: number | null
          unit: string | null
          unit_price: number | null
        }
        Insert: {
          calculation_id?: string | null
          id?: string
          is_editable?: boolean | null
          manual_price?: number | null
          name: string
          quantity?: number | null
          sort_order?: number | null
          stage: string
          total_price?: number | null
          unit?: string | null
          unit_price?: number | null
        }
        Update: {
          calculation_id?: string | null
          id?: string
          is_editable?: boolean | null
          manual_price?: number | null
          name?: string
          quantity?: number | null
          sort_order?: number | null
          stage?: string
          total_price?: number | null
          unit?: string | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "calculation_items_calculation_id_fkey"
            columns: ["calculation_id"]
            isOneToOne: false
            referencedRelation: "calculations"
            referencedColumns: ["id"]
          },
        ]
      }
      calculations: {
        Row: {
          category: string
          circulation: number
          client_id: string | null
          color_back: number
          color_front: number
          created_at: string | null
          equipment_id: string | null
          format_height: number | null
          format_type: string
          format_width: number | null
          forms_cost: number | null
          forms_count: number | null
          forms_prep_cost: number | null
          fortress_order_id: string | null
          id: string
          ink_cost: number | null
          is_rotated: boolean | null
          is_template: boolean | null
          items_per_sheet: number | null
          margin_percent: number | null
          material_id: string | null
          name: string | null
          paper_cost: number | null
          paper_cut_cost: number | null
          postpress: Json | null
          print_cost: number | null
          print_cost_per_impression: number | null
          print_format_height: number | null
          print_format_width: number | null
          print_sheets: number | null
          product_type: string
          profit: number | null
          purchase_sheets: number | null
          sale_price: number | null
          setup_sheets: number | null
          total_cost: number | null
          turnaround_type: string | null
          updated_at: string | null
        }
        Insert: {
          category: string
          circulation: number
          client_id?: string | null
          color_back?: number
          color_front?: number
          created_at?: string | null
          equipment_id?: string | null
          format_height?: number | null
          format_type: string
          format_width?: number | null
          forms_cost?: number | null
          forms_count?: number | null
          forms_prep_cost?: number | null
          fortress_order_id?: string | null
          id?: string
          ink_cost?: number | null
          is_rotated?: boolean | null
          is_template?: boolean | null
          items_per_sheet?: number | null
          margin_percent?: number | null
          material_id?: string | null
          name?: string | null
          paper_cost?: number | null
          paper_cut_cost?: number | null
          postpress?: Json | null
          print_cost?: number | null
          print_cost_per_impression?: number | null
          print_format_height?: number | null
          print_format_width?: number | null
          print_sheets?: number | null
          product_type: string
          profit?: number | null
          purchase_sheets?: number | null
          sale_price?: number | null
          setup_sheets?: number | null
          total_cost?: number | null
          turnaround_type?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          circulation?: number
          client_id?: string | null
          color_back?: number
          color_front?: number
          created_at?: string | null
          equipment_id?: string | null
          format_height?: number | null
          format_type?: string
          format_width?: number | null
          forms_cost?: number | null
          forms_count?: number | null
          forms_prep_cost?: number | null
          fortress_order_id?: string | null
          id?: string
          ink_cost?: number | null
          is_rotated?: boolean | null
          is_template?: boolean | null
          items_per_sheet?: number | null
          margin_percent?: number | null
          material_id?: string | null
          name?: string | null
          paper_cost?: number | null
          paper_cut_cost?: number | null
          postpress?: Json | null
          print_cost?: number | null
          print_cost_per_impression?: number | null
          print_format_height?: number | null
          print_format_width?: number | null
          print_sheets?: number | null
          product_type?: string
          profit?: number | null
          purchase_sheets?: number | null
          sale_price?: number | null
          setup_sheets?: number | null
          total_cost?: number | null
          turnaround_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calculations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calculations_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          created_at: string | null
          default_margin_percent: number | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          default_margin_percent?: number | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          default_margin_percent?: number | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      equipment: {
        Row: {
          cost_per_impression: number | null
          created_at: string | null
          id: string
          max_format_height: number | null
          max_format_width: number | null
          name: string
          notes: string | null
          type: string
        }
        Insert: {
          cost_per_impression?: number | null
          created_at?: string | null
          id?: string
          max_format_height?: number | null
          max_format_width?: number | null
          name: string
          notes?: string | null
          type: string
        }
        Update: {
          cost_per_impression?: number | null
          created_at?: string | null
          id?: string
          max_format_height?: number | null
          max_format_width?: number | null
          name?: string
          notes?: string | null
          type?: string
        }
        Relationships: []
      }
      lamination_prices: {
        Row: {
          cost_per_side: number
          film_type: string
          id: string
          size_range: string
        }
        Insert: {
          cost_per_side: number
          film_type: string
          id?: string
          size_range: string
        }
        Update: {
          cost_per_side?: number
          film_type?: string
          id?: string
          size_range?: string
        }
        Relationships: []
      }
      materials: {
        Row: {
          cost_per_sheet: number
          created_at: string | null
          density: number
          format_height: number
          format_width: number
          id: string
          is_fortress_sync: boolean | null
          name: string
          type: string
        }
        Insert: {
          cost_per_sheet?: number
          created_at?: string | null
          density: number
          format_height: number
          format_width: number
          id?: string
          is_fortress_sync?: boolean | null
          name: string
          type: string
        }
        Update: {
          cost_per_sheet?: number
          created_at?: string | null
          density?: number
          format_height?: number
          format_width?: number
          id?: string
          is_fortress_sync?: boolean | null
          name?: string
          type?: string
        }
        Relationships: []
      }
      operations: {
        Row: {
          category: string
          created_at: string | null
          fixed_cost: number | null
          id: string
          name: string
          unit: string | null
          variable_cost: number | null
        }
        Insert: {
          category: string
          created_at?: string | null
          fixed_cost?: number | null
          id?: string
          name: string
          unit?: string | null
          variable_cost?: number | null
        }
        Update: {
          category?: string
          created_at?: string | null
          fixed_cost?: number | null
          id?: string
          name?: string
          unit?: string | null
          variable_cost?: number | null
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          description: string | null
          key: string
          value: string
        }
        Insert: {
          description?: string | null
          key: string
          value: string
        }
        Update: {
          description?: string | null
          key?: string
          value?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
