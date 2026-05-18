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
      calc_constants: {
        Row: {
          created_at: string
          description: string
          id: string
          name: string
          slug: string
          sort_order: number
          unit: string
          updated_at: string
          value: number
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          name: string
          slug: string
          sort_order?: number
          unit?: string
          updated_at?: string
          value?: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          name?: string
          slug?: string
          sort_order?: number
          unit?: string
          updated_at?: string
          value?: number
        }
        Relationships: []
      }
      calc_stage_library: {
        Row: {
          category: string
          created_at: string
          formula: Json
          id: string
          name: string
          sort_order: number
          unit: string
        }
        Insert: {
          category?: string
          created_at?: string
          formula: Json
          id?: string
          name: string
          sort_order?: number
          unit?: string
        }
        Update: {
          category?: string
          created_at?: string
          formula?: Json
          id?: string
          name?: string
          sort_order?: number
          unit?: string
        }
        Relationships: []
      }
      calc_variant_stages: {
        Row: {
          created_at: string
          formula: Json
          id: string
          material_formula: Json | null
          material_id: string | null
          name: string
          sort_order: number
          unit: string
          variant_id: string
        }
        Insert: {
          created_at?: string
          formula?: Json
          id?: string
          material_formula?: Json | null
          material_id?: string | null
          name: string
          sort_order?: number
          unit?: string
          variant_id: string
        }
        Update: {
          created_at?: string
          formula?: Json
          id?: string
          material_formula?: Json | null
          material_id?: string | null
          name?: string
          sort_order?: number
          unit?: string
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calc_variant_stages_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calc_variant_stages_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "calc_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      calc_variants: {
        Row: {
          base_product_type: string
          category: string
          created_at: string
          description: string
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          base_product_type?: string
          category?: string
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          base_product_type?: string
          category?: string
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
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
      calculation_skus: {
        Row: {
          calculation_id: string
          circulation: number
          created_at: string
          height: number
          id: string
          name: string
          sort_order: number
          width: number
        }
        Insert: {
          calculation_id: string
          circulation: number
          created_at?: string
          height: number
          id?: string
          name: string
          sort_order?: number
          width: number
        }
        Update: {
          calculation_id?: string
          circulation?: number
          created_at?: string
          height?: number
          id?: string
          name?: string
          sort_order?: number
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: "calculation_skus_calculation_id_fkey"
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
          empty_slots: number | null
          equipment_id: string | null
          format_height: number | null
          format_type: string
          format_width: number | null
          forms_cost: number | null
          forms_count: number | null
          forms_prep_cost: number | null
          fortress_order_id: string | null
          id: string
          impositions_count: number | null
          ink_cost: number | null
          is_multi_sku: boolean
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
          purchase_format_height: number | null
          purchase_format_width: number | null
          purchase_sheets: number | null
          sale_price: number | null
          setup_sheets: number | null
          sku_count: number | null
          total_cost: number | null
          turnaround_type: string | null
          updated_at: string | null
          user_id: string | null
          version: number
        }
        Insert: {
          category: string
          circulation: number
          client_id?: string | null
          color_back?: number
          color_front?: number
          created_at?: string | null
          empty_slots?: number | null
          equipment_id?: string | null
          format_height?: number | null
          format_type: string
          format_width?: number | null
          forms_cost?: number | null
          forms_count?: number | null
          forms_prep_cost?: number | null
          fortress_order_id?: string | null
          id?: string
          impositions_count?: number | null
          ink_cost?: number | null
          is_multi_sku?: boolean
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
          purchase_format_height?: number | null
          purchase_format_width?: number | null
          purchase_sheets?: number | null
          sale_price?: number | null
          setup_sheets?: number | null
          sku_count?: number | null
          total_cost?: number | null
          turnaround_type?: string | null
          updated_at?: string | null
          user_id?: string | null
          version?: number
        }
        Update: {
          category?: string
          circulation?: number
          client_id?: string | null
          color_back?: number
          color_front?: number
          created_at?: string | null
          empty_slots?: number | null
          equipment_id?: string | null
          format_height?: number | null
          format_type?: string
          format_width?: number | null
          forms_cost?: number | null
          forms_count?: number | null
          forms_prep_cost?: number | null
          fortress_order_id?: string | null
          id?: string
          impositions_count?: number | null
          ink_cost?: number | null
          is_multi_sku?: boolean
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
          purchase_format_height?: number | null
          purchase_format_width?: number | null
          purchase_sheets?: number | null
          sale_price?: number | null
          setup_sheets?: number | null
          sku_count?: number | null
          total_cost?: number | null
          turnaround_type?: string | null
          updated_at?: string | null
          user_id?: string | null
          version?: number
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
      client_logs: {
        Row: {
          created_at: string
          id: string
          message: string
          stack: string | null
          url: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          stack?: string | null
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          stack?: string | null
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
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
      custom_reference_rows: {
        Row: {
          created_at: string
          data: Json
          id: string
          reference_id: string
          sort_order: number
          subgroup: string | null
        }
        Insert: {
          created_at?: string
          data?: Json
          id?: string
          reference_id: string
          sort_order?: number
          subgroup?: string | null
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          reference_id?: string
          sort_order?: number
          subgroup?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_reference_rows_reference_id_fkey"
            columns: ["reference_id"]
            isOneToOne: false
            referencedRelation: "custom_references"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_references: {
        Row: {
          created_at: string
          fields: Json
          id: string
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          fields?: Json
          id?: string
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          fields?: Json
          id?: string
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      envelope_formats: {
        Row: {
          created_at: string
          height: number
          id: string
          name: string
          sort_order: number
          subgroup: string | null
          width: number
        }
        Insert: {
          created_at?: string
          height: number
          id?: string
          name: string
          sort_order?: number
          subgroup?: string | null
          width: number
        }
        Update: {
          created_at?: string
          height?: number
          id?: string
          name?: string
          sort_order?: number
          subgroup?: string | null
          width?: number
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
          subgroup: string | null
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
          subgroup?: string | null
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
          subgroup?: string | null
          type?: string
        }
        Relationships: []
      }
      format_presets: {
        Row: {
          category: string | null
          created_at: string | null
          height: number
          id: string
          name: string
          width: number
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          height: number
          id?: string
          name: string
          width: number
        }
        Update: {
          category?: string | null
          created_at?: string | null
          height?: number
          id?: string
          name?: string
          width?: number
        }
        Relationships: []
      }
      lamination_prices: {
        Row: {
          cost_per_side: number
          film_type: string
          id: string
          size_range: string
          subgroup: string | null
        }
        Insert: {
          cost_per_side: number
          film_type: string
          id?: string
          size_range: string
          subgroup?: string | null
        }
        Update: {
          cost_per_side?: number
          film_type?: string
          id?: string
          size_range?: string
          subgroup?: string | null
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
          purchase_format_id: string | null
          subgroup: string | null
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
          purchase_format_id?: string | null
          subgroup?: string | null
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
          purchase_format_id?: string | null
          subgroup?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "materials_purchase_format_id_fkey"
            columns: ["purchase_format_id"]
            isOneToOne: false
            referencedRelation: "purchase_formats"
            referencedColumns: ["id"]
          },
        ]
      }
      operations: {
        Row: {
          category: string
          created_at: string | null
          fixed_cost: number | null
          format_label: string | null
          id: string
          name: string
          setup_sheets: number | null
          subgroup: string | null
          unit: string | null
          variable_cost: number | null
        }
        Insert: {
          category: string
          created_at?: string | null
          fixed_cost?: number | null
          format_label?: string | null
          id?: string
          name: string
          setup_sheets?: number | null
          subgroup?: string | null
          unit?: string | null
          variable_cost?: number | null
        }
        Update: {
          category?: string
          created_at?: string | null
          fixed_cost?: number | null
          format_label?: string | null
          id?: string
          name?: string
          setup_sheets?: number | null
          subgroup?: string | null
          unit?: string | null
          variable_cost?: number | null
        }
        Relationships: []
      }
      press_machines: {
        Row: {
          cost_per_impression: number
          created_at: string
          id: string
          is_active: boolean
          machine_type: string
          max_circulation: number | null
          max_format_height: number
          max_format_width: number
          max_sheets: number | null
          min_circulation: number
          min_sheets: number
          name: string
          priority: number
          product_types: string[] | null
          setup_cost: number
          setup_sheets: number
          sort_order: number
          subgroup: string | null
        }
        Insert: {
          cost_per_impression?: number
          created_at?: string
          id?: string
          is_active?: boolean
          machine_type?: string
          max_circulation?: number | null
          max_format_height: number
          max_format_width: number
          max_sheets?: number | null
          min_circulation?: number
          min_sheets?: number
          name: string
          priority?: number
          product_types?: string[] | null
          setup_cost?: number
          setup_sheets?: number
          sort_order?: number
          subgroup?: string | null
        }
        Update: {
          cost_per_impression?: number
          created_at?: string
          id?: string
          is_active?: boolean
          machine_type?: string
          max_circulation?: number | null
          max_format_height?: number
          max_format_width?: number
          max_sheets?: number | null
          min_circulation?: number
          min_sheets?: number
          name?: string
          priority?: number
          product_types?: string[] | null
          setup_cost?: number
          setup_sheets?: number
          sort_order?: number
          subgroup?: string | null
        }
        Relationships: []
      }
      print_formats: {
        Row: {
          created_at: string
          height: number
          id: string
          purchase_format_id: string | null
          sort_order: number
          subgroup: string | null
          width: number
        }
        Insert: {
          created_at?: string
          height: number
          id?: string
          purchase_format_id?: string | null
          sort_order?: number
          subgroup?: string | null
          width: number
        }
        Update: {
          created_at?: string
          height?: number
          id?: string
          purchase_format_id?: string | null
          sort_order?: number
          subgroup?: string | null
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: "print_formats_purchase_format_id_fkey"
            columns: ["purchase_format_id"]
            isOneToOne: false
            referencedRelation: "purchase_formats"
            referencedColumns: ["id"]
          },
        ]
      }
      product_circulation_rules: {
        Row: {
          created_at: string
          id: string
          max_circulation: number | null
          min_circulation: number
          preferred_machine_id: string | null
          product_type: string
          sort_order: number
          subgroup: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          max_circulation?: number | null
          min_circulation?: number
          preferred_machine_id?: string | null
          product_type: string
          sort_order?: number
          subgroup?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          max_circulation?: number | null
          min_circulation?: number
          preferred_machine_id?: string | null
          product_type?: string
          sort_order?: number
          subgroup?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_circulation_rules_preferred_machine_id_fkey"
            columns: ["preferred_machine_id"]
            isOneToOne: false
            referencedRelation: "press_machines"
            referencedColumns: ["id"]
          },
        ]
      }
      product_glossary: {
        Row: {
          base_product_type: string | null
          category: string
          created_at: string
          description: string
          id: string
          is_calculable: boolean
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          base_product_type?: string | null
          category?: string
          created_at?: string
          description?: string
          id?: string
          is_calculable?: boolean
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          base_product_type?: string | null
          category?: string
          created_at?: string
          description?: string
          id?: string
          is_calculable?: boolean
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          company: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          company?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      purchase_formats: {
        Row: {
          created_at: string
          height: number
          id: string
          material_category: string
          sort_order: number
          subgroup: string | null
          width: number
        }
        Insert: {
          created_at?: string
          height: number
          id?: string
          material_category: string
          sort_order?: number
          subgroup?: string | null
          width: number
        }
        Update: {
          created_at?: string
          height?: number
          id?: string
          material_category?: string
          sort_order?: number
          subgroup?: string | null
          width?: number
        }
        Relationships: []
      }
      reference_sections: {
        Row: {
          created_at: string
          id: string
          name: string
          sort_order: number
          table_key: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          table_key: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          table_key?: string
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
      apply_calculation_margin: {
        Args: { _calculation_id: string; _margin: number }
        Returns: {
          margin_percent: number
          profit: number
          sale_price: number
          total_cost: number
        }[]
      }
      apply_item_price_change:
        | {
            Args: { _item_id: string; _new_price: number; _reason?: string }
            Returns: {
              profit: number
              sale_price: number
              total_cost: number
            }[]
          }
        | {
            Args: {
              _expected_version?: number
              _item_id: string
              _new_price: number
              _reason?: string
            }
            Returns: {
              profit: number
              sale_price: number
              total_cost: number
              version: number
            }[]
          }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "manager" | "user"
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
      app_role: ["admin", "manager", "user"],
    },
  },
} as const
