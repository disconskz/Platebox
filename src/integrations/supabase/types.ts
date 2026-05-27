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
      ai_messages: {
        Row: {
          created_at: string
          id: string
          parts: Json
          role: string
          thread_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          parts?: Json
          role: string
          thread_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          parts?: Json
          role?: string
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "ai_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_threads: {
        Row: {
          created_at: string
          id: string
          is_archived: boolean
          is_pinned: boolean
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_archived?: boolean
          is_pinned?: boolean
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_archived?: boolean
          is_pinned?: boolean
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      binding_cardboard_prices: {
        Row: {
          board_thickness: number
          board_type: string
          calc_mode: string
          coef_complex_layout: number
          coef_designer_board: number
          coef_manual_cut: number
          coef_nonstandard_format: number
          coef_standard_format: number
          coef_thick_board: number
          created_at: string
          cuts_per_sheet: number
          edge_margin: number
          gap_between: number
          height_allowance: number
          id: string
          is_active: boolean
          max_format_long: number
          min_cost: number
          min_format_short: number
          name: string
          price_per_cover: number
          price_per_cut: number
          price_per_m2: number
          price_per_sheet: number
          setup_cost: number
          sheet_height: number
          sheet_width: number
          sides_per_item: number
          sort_order: number
          spine_allowance: number
          spines_per_item: number
          thick_board_threshold: number
          updated_at: string
          updated_by: string | null
          width_allowance: number
        }
        Insert: {
          board_thickness?: number
          board_type?: string
          calc_mode?: string
          coef_complex_layout?: number
          coef_designer_board?: number
          coef_manual_cut?: number
          coef_nonstandard_format?: number
          coef_standard_format?: number
          coef_thick_board?: number
          created_at?: string
          cuts_per_sheet?: number
          edge_margin?: number
          gap_between?: number
          height_allowance?: number
          id?: string
          is_active?: boolean
          max_format_long?: number
          min_cost?: number
          min_format_short?: number
          name: string
          price_per_cover?: number
          price_per_cut?: number
          price_per_m2?: number
          price_per_sheet?: number
          setup_cost?: number
          sheet_height?: number
          sheet_width?: number
          sides_per_item?: number
          sort_order?: number
          spine_allowance?: number
          spines_per_item?: number
          thick_board_threshold?: number
          updated_at?: string
          updated_by?: string | null
          width_allowance?: number
        }
        Update: {
          board_thickness?: number
          board_type?: string
          calc_mode?: string
          coef_complex_layout?: number
          coef_designer_board?: number
          coef_manual_cut?: number
          coef_nonstandard_format?: number
          coef_standard_format?: number
          coef_thick_board?: number
          created_at?: string
          cuts_per_sheet?: number
          edge_margin?: number
          gap_between?: number
          height_allowance?: number
          id?: string
          is_active?: boolean
          max_format_long?: number
          min_cost?: number
          min_format_short?: number
          name?: string
          price_per_cover?: number
          price_per_cut?: number
          price_per_m2?: number
          price_per_sheet?: number
          setup_cost?: number
          sheet_height?: number
          sheet_width?: number
          sides_per_item?: number
          sort_order?: number
          spine_allowance?: number
          spines_per_item?: number
          thick_board_threshold?: number
          updated_at?: string
          updated_by?: string | null
          width_allowance?: number
        }
        Relationships: []
      }
      block_insertion_prices: {
        Row: {
          coef_complex_align: number
          coef_fabric_leatherette: number
          coef_format_a3: number
          coef_format_a4: number
          coef_format_a5: number
          coef_format_nonstandard: number
          coef_manual: number
          coef_nonstandard_format: number
          coef_small_circulation: number
          coef_standard: number
          coef_thick_block: number
          coef_thickness_extra: number
          coef_thickness_med: number
          coef_thickness_thick: number
          coef_thickness_thin: number
          coef_weight_extra: number
          coef_weight_heavy: number
          coef_weight_light: number
          coef_weight_med: number
          cover_material_type: string
          created_at: string
          endpaper_type: string
          endpapers_per_item: number
          glue_calc_mode: string
          glue_price_per_item: number
          glue_price_per_m2: number
          id: string
          insertion_method: string
          is_active: boolean
          max_block_thickness: number
          max_block_weight: number
          max_circulation: number
          max_format_long: number
          min_circulation: number
          min_cost: number
          min_format_short: number
          name: string
          price_per_item: number
          setup_cost: number
          small_circulation_threshold: number
          sort_order: number
          thick_block_threshold: number
          thickness_med_max: number
          thickness_thick_max: number
          thickness_thin_max: number
          updated_at: string
          updated_by: string | null
          weight_heavy_max: number
          weight_light_max: number
          weight_med_max: number
        }
        Insert: {
          coef_complex_align?: number
          coef_fabric_leatherette?: number
          coef_format_a3?: number
          coef_format_a4?: number
          coef_format_a5?: number
          coef_format_nonstandard?: number
          coef_manual?: number
          coef_nonstandard_format?: number
          coef_small_circulation?: number
          coef_standard?: number
          coef_thick_block?: number
          coef_thickness_extra?: number
          coef_thickness_med?: number
          coef_thickness_thick?: number
          coef_thickness_thin?: number
          coef_weight_extra?: number
          coef_weight_heavy?: number
          coef_weight_light?: number
          coef_weight_med?: number
          cover_material_type?: string
          created_at?: string
          endpaper_type?: string
          endpapers_per_item?: number
          glue_calc_mode?: string
          glue_price_per_item?: number
          glue_price_per_m2?: number
          id?: string
          insertion_method?: string
          is_active?: boolean
          max_block_thickness?: number
          max_block_weight?: number
          max_circulation?: number
          max_format_long?: number
          min_circulation?: number
          min_cost?: number
          min_format_short?: number
          name: string
          price_per_item?: number
          setup_cost?: number
          small_circulation_threshold?: number
          sort_order?: number
          thick_block_threshold?: number
          thickness_med_max?: number
          thickness_thick_max?: number
          thickness_thin_max?: number
          updated_at?: string
          updated_by?: string | null
          weight_heavy_max?: number
          weight_light_max?: number
          weight_med_max?: number
        }
        Update: {
          coef_complex_align?: number
          coef_fabric_leatherette?: number
          coef_format_a3?: number
          coef_format_a4?: number
          coef_format_a5?: number
          coef_format_nonstandard?: number
          coef_manual?: number
          coef_nonstandard_format?: number
          coef_small_circulation?: number
          coef_standard?: number
          coef_thick_block?: number
          coef_thickness_extra?: number
          coef_thickness_med?: number
          coef_thickness_thick?: number
          coef_thickness_thin?: number
          coef_weight_extra?: number
          coef_weight_heavy?: number
          coef_weight_light?: number
          coef_weight_med?: number
          cover_material_type?: string
          created_at?: string
          endpaper_type?: string
          endpapers_per_item?: number
          glue_calc_mode?: string
          glue_price_per_item?: number
          glue_price_per_m2?: number
          id?: string
          insertion_method?: string
          is_active?: boolean
          max_block_thickness?: number
          max_block_weight?: number
          max_circulation?: number
          max_format_long?: number
          min_circulation?: number
          min_cost?: number
          min_format_short?: number
          name?: string
          price_per_item?: number
          setup_cost?: number
          small_circulation_threshold?: number
          sort_order?: number
          thick_block_threshold?: number
          thickness_med_max?: number
          thickness_thick_max?: number
          thickness_thin_max?: number
          updated_at?: string
          updated_by?: string | null
          weight_heavy_max?: number
          weight_light_max?: number
          weight_med_max?: number
        }
        Relationships: []
      }
      block_pressing_prices: {
        Row: {
          calc_mode: string
          coef_designer_paper: number
          coef_format_a3: number
          coef_format_a4: number
          coef_format_a5: number
          coef_format_nonstandard: number
          coef_heavy_block: number
          coef_manual: number
          coef_small_circulation: number
          coef_thick_block: number
          coef_thickness_extra: number
          coef_thickness_med: number
          coef_thickness_thick: number
          coef_thickness_thin: number
          created_at: string
          heavy_block_threshold: number
          id: string
          is_active: boolean
          machine_type: string
          max_block_thickness: number
          max_block_weight: number
          max_circulation: number
          max_format_long: number
          min_block_thickness: number
          min_circulation: number
          min_cost: number
          min_format_short: number
          name: string
          pressing_type: string
          price_per_hour: number
          price_per_item: number
          setup_cost: number
          small_circulation_threshold: number
          sort_order: number
          thick_block_threshold: number
          thickness_med_max: number
          thickness_thick_max: number
          thickness_thin_max: number
          time_per_item_sec: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          calc_mode?: string
          coef_designer_paper?: number
          coef_format_a3?: number
          coef_format_a4?: number
          coef_format_a5?: number
          coef_format_nonstandard?: number
          coef_heavy_block?: number
          coef_manual?: number
          coef_small_circulation?: number
          coef_thick_block?: number
          coef_thickness_extra?: number
          coef_thickness_med?: number
          coef_thickness_thick?: number
          coef_thickness_thin?: number
          created_at?: string
          heavy_block_threshold?: number
          id?: string
          is_active?: boolean
          machine_type?: string
          max_block_thickness?: number
          max_block_weight?: number
          max_circulation?: number
          max_format_long?: number
          min_block_thickness?: number
          min_circulation?: number
          min_cost?: number
          min_format_short?: number
          name: string
          pressing_type?: string
          price_per_hour?: number
          price_per_item?: number
          setup_cost?: number
          small_circulation_threshold?: number
          sort_order?: number
          thick_block_threshold?: number
          thickness_med_max?: number
          thickness_thick_max?: number
          thickness_thin_max?: number
          time_per_item_sec?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          calc_mode?: string
          coef_designer_paper?: number
          coef_format_a3?: number
          coef_format_a4?: number
          coef_format_a5?: number
          coef_format_nonstandard?: number
          coef_heavy_block?: number
          coef_manual?: number
          coef_small_circulation?: number
          coef_thick_block?: number
          coef_thickness_extra?: number
          coef_thickness_med?: number
          coef_thickness_thick?: number
          coef_thickness_thin?: number
          created_at?: string
          heavy_block_threshold?: number
          id?: string
          is_active?: boolean
          machine_type?: string
          max_block_thickness?: number
          max_block_weight?: number
          max_circulation?: number
          max_format_long?: number
          min_block_thickness?: number
          min_circulation?: number
          min_cost?: number
          min_format_short?: number
          name?: string
          pressing_type?: string
          price_per_hour?: number
          price_per_item?: number
          setup_cost?: number
          small_circulation_threshold?: number
          sort_order?: number
          thick_block_threshold?: number
          thickness_med_max?: number
          thickness_thick_max?: number
          thickness_thin_max?: number
          time_per_item_sec?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      block_sewing_prices: {
        Row: {
          coef_heavy_paper: number
          coef_manual: number
          coef_many_signatures: number
          coef_nonstandard_format: number
          coef_standard_format: number
          coef_thick_block: number
          coef_thin_paper: number
          created_at: string
          endpaper_price: number
          gauze_price: number
          headband_price: number
          id: string
          is_active: boolean
          machine_type: string
          max_block_thickness: number
          max_circulation: number
          max_density: number
          max_format_long: number
          max_signatures: number
          min_block_thickness: number
          min_circulation: number
          min_cost: number
          min_density: number
          min_format_short: number
          name: string
          price_per_signature: number
          setup_cost: number
          sewing_type: string
          sort_order: number
          thick_block_threshold: number
          thread_calc_mode: string
          thread_price: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          coef_heavy_paper?: number
          coef_manual?: number
          coef_many_signatures?: number
          coef_nonstandard_format?: number
          coef_standard_format?: number
          coef_thick_block?: number
          coef_thin_paper?: number
          created_at?: string
          endpaper_price?: number
          gauze_price?: number
          headband_price?: number
          id?: string
          is_active?: boolean
          machine_type?: string
          max_block_thickness?: number
          max_circulation?: number
          max_density?: number
          max_format_long?: number
          max_signatures?: number
          min_block_thickness?: number
          min_circulation?: number
          min_cost?: number
          min_density?: number
          min_format_short?: number
          name: string
          price_per_signature?: number
          setup_cost?: number
          sewing_type?: string
          sort_order?: number
          thick_block_threshold?: number
          thread_calc_mode?: string
          thread_price?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          coef_heavy_paper?: number
          coef_manual?: number
          coef_many_signatures?: number
          coef_nonstandard_format?: number
          coef_standard_format?: number
          coef_thick_block?: number
          coef_thin_paper?: number
          created_at?: string
          endpaper_price?: number
          gauze_price?: number
          headband_price?: number
          id?: string
          is_active?: boolean
          machine_type?: string
          max_block_thickness?: number
          max_circulation?: number
          max_density?: number
          max_format_long?: number
          max_signatures?: number
          min_block_thickness?: number
          min_circulation?: number
          min_cost?: number
          min_density?: number
          min_format_short?: number
          name?: string
          price_per_signature?: number
          setup_cost?: number
          sewing_type?: string
          sort_order?: number
          thick_block_threshold?: number
          thread_calc_mode?: string
          thread_price?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      block_trimming_prices: {
        Row: {
          calc_mode: string
          coef_designer_paper: number
          coef_figured: number
          coef_format_a3: number
          coef_format_a4: number
          coef_format_a5: number
          coef_format_nonstandard: number
          coef_heavy_paper: number
          coef_manual: number
          coef_nonstandard_format: number
          coef_thick_block: number
          coef_thickness_extra: number
          coef_thickness_med: number
          coef_thickness_thick: number
          coef_thickness_thin: number
          created_at: string
          cuts_count: number
          heavy_paper_threshold: number
          id: string
          is_active: boolean
          machine_type: string
          max_block_thickness: number
          max_circulation: number
          max_format_long: number
          max_paper_density: number
          min_block_thickness: number
          min_circulation: number
          min_cost: number
          min_format_short: number
          name: string
          price_per_cut: number
          price_per_hour: number
          price_per_item: number
          setup_cost: number
          sort_order: number
          thick_block_threshold: number
          thickness_med_max: number
          thickness_thick_max: number
          thickness_thin_max: number
          time_per_item_sec: number
          trim_type: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          calc_mode?: string
          coef_designer_paper?: number
          coef_figured?: number
          coef_format_a3?: number
          coef_format_a4?: number
          coef_format_a5?: number
          coef_format_nonstandard?: number
          coef_heavy_paper?: number
          coef_manual?: number
          coef_nonstandard_format?: number
          coef_thick_block?: number
          coef_thickness_extra?: number
          coef_thickness_med?: number
          coef_thickness_thick?: number
          coef_thickness_thin?: number
          created_at?: string
          cuts_count?: number
          heavy_paper_threshold?: number
          id?: string
          is_active?: boolean
          machine_type?: string
          max_block_thickness?: number
          max_circulation?: number
          max_format_long?: number
          max_paper_density?: number
          min_block_thickness?: number
          min_circulation?: number
          min_cost?: number
          min_format_short?: number
          name: string
          price_per_cut?: number
          price_per_hour?: number
          price_per_item?: number
          setup_cost?: number
          sort_order?: number
          thick_block_threshold?: number
          thickness_med_max?: number
          thickness_thick_max?: number
          thickness_thin_max?: number
          time_per_item_sec?: number
          trim_type?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          calc_mode?: string
          coef_designer_paper?: number
          coef_figured?: number
          coef_format_a3?: number
          coef_format_a4?: number
          coef_format_a5?: number
          coef_format_nonstandard?: number
          coef_heavy_paper?: number
          coef_manual?: number
          coef_nonstandard_format?: number
          coef_thick_block?: number
          coef_thickness_extra?: number
          coef_thickness_med?: number
          coef_thickness_thick?: number
          coef_thickness_thin?: number
          created_at?: string
          cuts_count?: number
          heavy_paper_threshold?: number
          id?: string
          is_active?: boolean
          machine_type?: string
          max_block_thickness?: number
          max_circulation?: number
          max_format_long?: number
          max_paper_density?: number
          min_block_thickness?: number
          min_circulation?: number
          min_cost?: number
          min_format_short?: number
          name?: string
          price_per_cut?: number
          price_per_hour?: number
          price_per_item?: number
          setup_cost?: number
          sort_order?: number
          thick_block_threshold?: number
          thickness_med_max?: number
          thickness_thick_max?: number
          thickness_thin_max?: number
          time_per_item_sec?: number
          trim_type?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      board_cutting_prices: {
        Row: {
          coef_complex_layout: number
          coef_figured: number
          coef_manual: number
          coef_nonstandard_format: number
          coef_standard_format: number
          coef_thick_board: number
          coef_thickness_extra: number
          coef_thickness_med: number
          coef_thickness_thick: number
          coef_thickness_thin: number
          created_at: string
          cutting_type: string
          default_cuts: number
          id: string
          is_active: boolean
          machine_type: string
          max_board_thickness: number
          max_circulation: number
          max_format_long: number
          max_stack_height: number
          min_board_thickness: number
          min_circulation: number
          min_cost: number
          min_format_short: number
          name: string
          price_per_cut: number
          setup_cost: number
          sort_order: number
          thickness_med_max: number
          thickness_thick_max: number
          thickness_thin_max: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          coef_complex_layout?: number
          coef_figured?: number
          coef_manual?: number
          coef_nonstandard_format?: number
          coef_standard_format?: number
          coef_thick_board?: number
          coef_thickness_extra?: number
          coef_thickness_med?: number
          coef_thickness_thick?: number
          coef_thickness_thin?: number
          created_at?: string
          cutting_type?: string
          default_cuts?: number
          id?: string
          is_active?: boolean
          machine_type?: string
          max_board_thickness?: number
          max_circulation?: number
          max_format_long?: number
          max_stack_height?: number
          min_board_thickness?: number
          min_circulation?: number
          min_cost?: number
          min_format_short?: number
          name: string
          price_per_cut?: number
          setup_cost?: number
          sort_order?: number
          thickness_med_max?: number
          thickness_thick_max?: number
          thickness_thin_max?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          coef_complex_layout?: number
          coef_figured?: number
          coef_manual?: number
          coef_nonstandard_format?: number
          coef_standard_format?: number
          coef_thick_board?: number
          coef_thickness_extra?: number
          coef_thickness_med?: number
          coef_thickness_thick?: number
          coef_thickness_thin?: number
          created_at?: string
          cutting_type?: string
          default_cuts?: number
          id?: string
          is_active?: boolean
          machine_type?: string
          max_board_thickness?: number
          max_circulation?: number
          max_format_long?: number
          max_stack_height?: number
          min_board_thickness?: number
          min_circulation?: number
          min_cost?: number
          min_format_short?: number
          name?: string
          price_per_cut?: number
          setup_cost?: number
          sort_order?: number
          thickness_med_max?: number
          thickness_thick_max?: number
          thickness_thin_max?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
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
          source: string
          system_key: string | null
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
          source?: string
          system_key?: string | null
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
          source?: string
          system_key?: string | null
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
      casing_prices: {
        Row: {
          base_type: string
          casing_method: string
          coef_designer_material: number
          coef_fabric_leatherette: number
          coef_large_format: number
          coef_manual: number
          coef_nonstandard_format: number
          coef_printed_cover: number
          coef_small_circulation: number
          coef_standard_format: number
          coef_thick_board: number
          cover_material_type: string
          created_at: string
          fold_bottom: number
          fold_left: number
          fold_right: number
          fold_top: number
          glue_calc_mode: string
          glue_price_per_item: number
          glue_price_per_m2: number
          id: string
          is_active: boolean
          large_format_threshold: number
          material_calc_mode: string
          material_price_per_m2: number
          material_price_per_sheet: number
          max_board_thickness: number
          max_circulation: number
          max_format_long: number
          min_circulation: number
          min_cost: number
          min_format_short: number
          name: string
          setup_cost: number
          sheet_height: number
          sheet_width: number
          small_circulation_threshold: number
          sort_order: number
          spine_gap: number
          thick_board_threshold: number
          updated_at: string
          updated_by: string | null
          work_calc_mode: string
          work_price_per_item: number
          work_price_per_m2: number
        }
        Insert: {
          base_type?: string
          casing_method?: string
          coef_designer_material?: number
          coef_fabric_leatherette?: number
          coef_large_format?: number
          coef_manual?: number
          coef_nonstandard_format?: number
          coef_printed_cover?: number
          coef_small_circulation?: number
          coef_standard_format?: number
          coef_thick_board?: number
          cover_material_type?: string
          created_at?: string
          fold_bottom?: number
          fold_left?: number
          fold_right?: number
          fold_top?: number
          glue_calc_mode?: string
          glue_price_per_item?: number
          glue_price_per_m2?: number
          id?: string
          is_active?: boolean
          large_format_threshold?: number
          material_calc_mode?: string
          material_price_per_m2?: number
          material_price_per_sheet?: number
          max_board_thickness?: number
          max_circulation?: number
          max_format_long?: number
          min_circulation?: number
          min_cost?: number
          min_format_short?: number
          name: string
          setup_cost?: number
          sheet_height?: number
          sheet_width?: number
          small_circulation_threshold?: number
          sort_order?: number
          spine_gap?: number
          thick_board_threshold?: number
          updated_at?: string
          updated_by?: string | null
          work_calc_mode?: string
          work_price_per_item?: number
          work_price_per_m2?: number
        }
        Update: {
          base_type?: string
          casing_method?: string
          coef_designer_material?: number
          coef_fabric_leatherette?: number
          coef_large_format?: number
          coef_manual?: number
          coef_nonstandard_format?: number
          coef_printed_cover?: number
          coef_small_circulation?: number
          coef_standard_format?: number
          coef_thick_board?: number
          cover_material_type?: string
          created_at?: string
          fold_bottom?: number
          fold_left?: number
          fold_right?: number
          fold_top?: number
          glue_calc_mode?: string
          glue_price_per_item?: number
          glue_price_per_m2?: number
          id?: string
          is_active?: boolean
          large_format_threshold?: number
          material_calc_mode?: string
          material_price_per_m2?: number
          material_price_per_sheet?: number
          max_board_thickness?: number
          max_circulation?: number
          max_format_long?: number
          min_circulation?: number
          min_cost?: number
          min_format_short?: number
          name?: string
          setup_cost?: number
          sheet_height?: number
          sheet_width?: number
          small_circulation_threshold?: number
          sort_order?: number
          spine_gap?: number
          thick_board_threshold?: number
          updated_at?: string
          updated_by?: string | null
          work_calc_mode?: string
          work_price_per_item?: number
          work_price_per_m2?: number
        }
        Relationships: []
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
      cover_assembly_prices: {
        Row: {
          assembly_method: string
          calc_mode: string
          coef_complex_material: number
          coef_fabric_leatherette: number
          coef_large_format: number
          coef_manual: number
          coef_nonstandard_format: number
          coef_small_circulation: number
          coef_standard_format: number
          coef_thick_board: number
          cover_material_type: string
          created_at: string
          fold_bottom: number
          fold_left: number
          fold_right: number
          fold_top: number
          gap_left: number
          gap_right: number
          id: string
          is_active: boolean
          large_format_threshold: number
          max_board_thickness: number
          max_circulation: number
          max_format_long: number
          min_circulation: number
          min_cost: number
          min_format_short: number
          name: string
          price_per_item: number
          price_per_m2: number
          setup_cost: number
          small_circulation_threshold: number
          sort_order: number
          thick_board_threshold: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          assembly_method?: string
          calc_mode?: string
          coef_complex_material?: number
          coef_fabric_leatherette?: number
          coef_large_format?: number
          coef_manual?: number
          coef_nonstandard_format?: number
          coef_small_circulation?: number
          coef_standard_format?: number
          coef_thick_board?: number
          cover_material_type?: string
          created_at?: string
          fold_bottom?: number
          fold_left?: number
          fold_right?: number
          fold_top?: number
          gap_left?: number
          gap_right?: number
          id?: string
          is_active?: boolean
          large_format_threshold?: number
          max_board_thickness?: number
          max_circulation?: number
          max_format_long?: number
          min_circulation?: number
          min_cost?: number
          min_format_short?: number
          name: string
          price_per_item?: number
          price_per_m2?: number
          setup_cost?: number
          small_circulation_threshold?: number
          sort_order?: number
          thick_board_threshold?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          assembly_method?: string
          calc_mode?: string
          coef_complex_material?: number
          coef_fabric_leatherette?: number
          coef_large_format?: number
          coef_manual?: number
          coef_nonstandard_format?: number
          coef_small_circulation?: number
          coef_standard_format?: number
          coef_thick_board?: number
          cover_material_type?: string
          created_at?: string
          fold_bottom?: number
          fold_left?: number
          fold_right?: number
          fold_top?: number
          gap_left?: number
          gap_right?: number
          id?: string
          is_active?: boolean
          large_format_threshold?: number
          max_board_thickness?: number
          max_circulation?: number
          max_format_long?: number
          min_circulation?: number
          min_cost?: number
          min_format_short?: number
          name?: string
          price_per_item?: number
          price_per_m2?: number
          setup_cost?: number
          small_circulation_threshold?: number
          sort_order?: number
          thick_board_threshold?: number
          updated_at?: string
          updated_by?: string | null
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
      cut_count_rules: {
        Row: {
          created_at: string
          cuts: number
          id: string
          item_format: string
          print_format: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          cuts: number
          id?: string
          item_format: string
          print_format: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          cuts?: number
          id?: string
          item_format?: string
          print_format?: string
          sort_order?: number
        }
        Relationships: []
      }
      embossing_prices: {
        Row: {
          cliche_min_cost: number
          cliche_price_per_cm2: number
          coef_complex_position: number
          coef_congrev: number
          coef_double: number
          coef_leather: number
          coef_standard: number
          complexity_coef: number
          created_at: string
          embossing_type: string
          foil_price_per_cm2: number
          foil_type: string
          id: string
          is_active: boolean
          min_cost: number
          name: string
          price_per_impression: number
          setup_cost: number
          sort_order: number
          updated_at: string
          updated_by: string | null
          uses_foil: boolean
        }
        Insert: {
          cliche_min_cost?: number
          cliche_price_per_cm2?: number
          coef_complex_position?: number
          coef_congrev?: number
          coef_double?: number
          coef_leather?: number
          coef_standard?: number
          complexity_coef?: number
          created_at?: string
          embossing_type?: string
          foil_price_per_cm2?: number
          foil_type?: string
          id?: string
          is_active?: boolean
          min_cost?: number
          name: string
          price_per_impression?: number
          setup_cost?: number
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
          uses_foil?: boolean
        }
        Update: {
          cliche_min_cost?: number
          cliche_price_per_cm2?: number
          coef_complex_position?: number
          coef_congrev?: number
          coef_double?: number
          coef_leather?: number
          coef_standard?: number
          complexity_coef?: number
          created_at?: string
          embossing_type?: string
          foil_price_per_cm2?: number
          foil_type?: string
          id?: string
          is_active?: boolean
          min_cost?: number
          name?: string
          price_per_impression?: number
          setup_cost?: number
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
          uses_foil?: boolean
        }
        Relationships: []
      }
      endpaper_prices: {
        Row: {
          coef_designer_paper: number
          coef_heavy_paper: number
          coef_manual_glue: number
          coef_nonstandard_format: number
          coef_printed: number
          coef_standard: number
          crease_price: number
          created_at: string
          density_threshold: number
          endpaper_type: string
          endpapers_per_item: number
          fold_price: number
          glue_price_per_item: number
          heavy_paper_threshold: number
          id: string
          is_active: boolean
          min_cost: number
          name: string
          needs_print: boolean
          paper_calc_mode: string
          paper_density: number
          paper_name: string
          paper_price_per_m2: number
          paper_price_per_sheet: number
          print_price_per_sheet: number
          setup_cost: number
          sheet_height: number
          sheet_width: number
          sort_order: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          coef_designer_paper?: number
          coef_heavy_paper?: number
          coef_manual_glue?: number
          coef_nonstandard_format?: number
          coef_printed?: number
          coef_standard?: number
          crease_price?: number
          created_at?: string
          density_threshold?: number
          endpaper_type?: string
          endpapers_per_item?: number
          fold_price?: number
          glue_price_per_item?: number
          heavy_paper_threshold?: number
          id?: string
          is_active?: boolean
          min_cost?: number
          name: string
          needs_print?: boolean
          paper_calc_mode?: string
          paper_density?: number
          paper_name?: string
          paper_price_per_m2?: number
          paper_price_per_sheet?: number
          print_price_per_sheet?: number
          setup_cost?: number
          sheet_height?: number
          sheet_width?: number
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          coef_designer_paper?: number
          coef_heavy_paper?: number
          coef_manual_glue?: number
          coef_nonstandard_format?: number
          coef_printed?: number
          coef_standard?: number
          crease_price?: number
          created_at?: string
          density_threshold?: number
          endpaper_type?: string
          endpapers_per_item?: number
          fold_price?: number
          glue_price_per_item?: number
          heavy_paper_threshold?: number
          id?: string
          is_active?: boolean
          min_cost?: number
          name?: string
          needs_print?: boolean
          paper_calc_mode?: string
          paper_density?: number
          paper_name?: string
          paper_price_per_m2?: number
          paper_price_per_sheet?: number
          print_price_per_sheet?: number
          setup_cost?: number
          sheet_height?: number
          sheet_width?: number
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
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
      film_prices: {
        Row: {
          created_at: string
          film_type: string
          id: string
          min_cost: number
          name: string
          price_per_m2: number
          setup_cost: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          film_type: string
          id?: string
          min_cost?: number
          name: string
          price_per_m2?: number
          setup_cost?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          film_type?: string
          id?: string
          min_cost?: number
          name?: string
          price_per_m2?: number
          setup_cost?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      final_pressing_prices: {
        Row: {
          books_per_load: number
          calc_mode: string
          coef_fabric_leatherette: number
          coef_format_a3: number
          coef_format_a4: number
          coef_format_a5: number
          coef_format_nonstandard: number
          coef_large_format: number
          coef_manual: number
          coef_nonstandard_format: number
          coef_small_circulation: number
          coef_standard: number
          coef_thick_block: number
          coef_thickness_extra: number
          coef_thickness_med: number
          coef_thickness_thick: number
          coef_thickness_thin: number
          coef_weight_extra: number
          coef_weight_heavy: number
          coef_weight_light: number
          coef_weight_med: number
          created_at: string
          id: string
          is_active: boolean
          large_format_threshold: number
          load_time_hours: number
          machine_type: string
          max_book_thickness: number
          max_book_weight: number
          max_circulation: number
          max_format_long: number
          min_circulation: number
          min_cost: number
          min_format_short: number
          name: string
          pressing_method: string
          price_per_hour: number
          price_per_item: number
          setup_cost: number
          small_circulation_threshold: number
          sort_order: number
          thickness_med_max: number
          thickness_thick_max: number
          thickness_thin_max: number
          updated_at: string
          updated_by: string | null
          weight_heavy_max: number
          weight_light_max: number
          weight_med_max: number
        }
        Insert: {
          books_per_load?: number
          calc_mode?: string
          coef_fabric_leatherette?: number
          coef_format_a3?: number
          coef_format_a4?: number
          coef_format_a5?: number
          coef_format_nonstandard?: number
          coef_large_format?: number
          coef_manual?: number
          coef_nonstandard_format?: number
          coef_small_circulation?: number
          coef_standard?: number
          coef_thick_block?: number
          coef_thickness_extra?: number
          coef_thickness_med?: number
          coef_thickness_thick?: number
          coef_thickness_thin?: number
          coef_weight_extra?: number
          coef_weight_heavy?: number
          coef_weight_light?: number
          coef_weight_med?: number
          created_at?: string
          id?: string
          is_active?: boolean
          large_format_threshold?: number
          load_time_hours?: number
          machine_type?: string
          max_book_thickness?: number
          max_book_weight?: number
          max_circulation?: number
          max_format_long?: number
          min_circulation?: number
          min_cost?: number
          min_format_short?: number
          name: string
          pressing_method?: string
          price_per_hour?: number
          price_per_item?: number
          setup_cost?: number
          small_circulation_threshold?: number
          sort_order?: number
          thickness_med_max?: number
          thickness_thick_max?: number
          thickness_thin_max?: number
          updated_at?: string
          updated_by?: string | null
          weight_heavy_max?: number
          weight_light_max?: number
          weight_med_max?: number
        }
        Update: {
          books_per_load?: number
          calc_mode?: string
          coef_fabric_leatherette?: number
          coef_format_a3?: number
          coef_format_a4?: number
          coef_format_a5?: number
          coef_format_nonstandard?: number
          coef_large_format?: number
          coef_manual?: number
          coef_nonstandard_format?: number
          coef_small_circulation?: number
          coef_standard?: number
          coef_thick_block?: number
          coef_thickness_extra?: number
          coef_thickness_med?: number
          coef_thickness_thick?: number
          coef_thickness_thin?: number
          coef_weight_extra?: number
          coef_weight_heavy?: number
          coef_weight_light?: number
          coef_weight_med?: number
          created_at?: string
          id?: string
          is_active?: boolean
          large_format_threshold?: number
          load_time_hours?: number
          machine_type?: string
          max_book_thickness?: number
          max_book_weight?: number
          max_circulation?: number
          max_format_long?: number
          min_circulation?: number
          min_cost?: number
          min_format_short?: number
          name?: string
          pressing_method?: string
          price_per_hour?: number
          price_per_item?: number
          setup_cost?: number
          small_circulation_threshold?: number
          sort_order?: number
          thickness_med_max?: number
          thickness_thick_max?: number
          thickness_thin_max?: number
          updated_at?: string
          updated_by?: string | null
          weight_heavy_max?: number
          weight_light_max?: number
          weight_med_max?: number
        }
        Relationships: []
      }
      flash_removal_prices: {
        Row: {
          bridges_high_max: number
          bridges_low_max: number
          bridges_med_max: number
          calc_mode: string
          coef_bridges_extra: number
          coef_bridges_high: number
          coef_bridges_low: number
          coef_bridges_med: number
          coef_contour_complex_box: number
          coef_contour_label: number
          coef_contour_microflute: number
          coef_contour_simple: number
          coef_contour_small_parts: number
          coef_contour_std_box: number
          coef_manual: number
          coef_mat_cardboard: number
          coef_mat_microflute: number
          coef_mat_paper: number
          coef_mat_plastic: number
          coef_mat_thick_cardboard: number
          created_at: string
          default_seconds_per_sheet: number
          id: string
          is_active: boolean
          min_cost: number
          name: string
          price_per_hour: number
          price_per_item: number
          price_per_sheet: number
          product_type: string
          removal_method: string
          setup_cost: number
          sort_order: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          bridges_high_max?: number
          bridges_low_max?: number
          bridges_med_max?: number
          calc_mode?: string
          coef_bridges_extra?: number
          coef_bridges_high?: number
          coef_bridges_low?: number
          coef_bridges_med?: number
          coef_contour_complex_box?: number
          coef_contour_label?: number
          coef_contour_microflute?: number
          coef_contour_simple?: number
          coef_contour_small_parts?: number
          coef_contour_std_box?: number
          coef_manual?: number
          coef_mat_cardboard?: number
          coef_mat_microflute?: number
          coef_mat_paper?: number
          coef_mat_plastic?: number
          coef_mat_thick_cardboard?: number
          created_at?: string
          default_seconds_per_sheet?: number
          id?: string
          is_active?: boolean
          min_cost?: number
          name: string
          price_per_hour?: number
          price_per_item?: number
          price_per_sheet?: number
          product_type?: string
          removal_method?: string
          setup_cost?: number
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          bridges_high_max?: number
          bridges_low_max?: number
          bridges_med_max?: number
          calc_mode?: string
          coef_bridges_extra?: number
          coef_bridges_high?: number
          coef_bridges_low?: number
          coef_bridges_med?: number
          coef_contour_complex_box?: number
          coef_contour_label?: number
          coef_contour_microflute?: number
          coef_contour_simple?: number
          coef_contour_small_parts?: number
          coef_contour_std_box?: number
          coef_manual?: number
          coef_mat_cardboard?: number
          coef_mat_microflute?: number
          coef_mat_paper?: number
          coef_mat_plastic?: number
          coef_mat_thick_cardboard?: number
          created_at?: string
          default_seconds_per_sheet?: number
          id?: string
          is_active?: boolean
          min_cost?: number
          name?: string
          price_per_hour?: number
          price_per_item?: number
          price_per_sheet?: number
          product_type?: string
          removal_method?: string
          setup_cost?: number
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
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
      gauze_prices: {
        Row: {
          calc_mode: string
          coef_designer: number
          coef_heavy_block: number
          coef_manual_glue: number
          coef_nonstandard_format: number
          coef_standard_format: number
          coef_thick_block: number
          created_at: string
          density: number
          gauze_type: string
          glue_price_per_item: number
          height_allowance: number
          id: string
          is_active: boolean
          max_block_thickness: number
          max_circulation: number
          max_format_long: number
          min_block_thickness: number
          min_circulation: number
          min_cost: number
          min_format_short: number
          name: string
          price_per_item: number
          price_per_m2: number
          price_per_meter: number
          setup_cost: number
          side_overlap: number
          sort_order: number
          thick_block_threshold: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          calc_mode?: string
          coef_designer?: number
          coef_heavy_block?: number
          coef_manual_glue?: number
          coef_nonstandard_format?: number
          coef_standard_format?: number
          coef_thick_block?: number
          created_at?: string
          density?: number
          gauze_type?: string
          glue_price_per_item?: number
          height_allowance?: number
          id?: string
          is_active?: boolean
          max_block_thickness?: number
          max_circulation?: number
          max_format_long?: number
          min_block_thickness?: number
          min_circulation?: number
          min_cost?: number
          min_format_short?: number
          name: string
          price_per_item?: number
          price_per_m2?: number
          price_per_meter?: number
          setup_cost?: number
          side_overlap?: number
          sort_order?: number
          thick_block_threshold?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          calc_mode?: string
          coef_designer?: number
          coef_heavy_block?: number
          coef_manual_glue?: number
          coef_nonstandard_format?: number
          coef_standard_format?: number
          coef_thick_block?: number
          created_at?: string
          density?: number
          gauze_type?: string
          glue_price_per_item?: number
          height_allowance?: number
          id?: string
          is_active?: boolean
          max_block_thickness?: number
          max_circulation?: number
          max_format_long?: number
          min_block_thickness?: number
          min_circulation?: number
          min_cost?: number
          min_format_short?: number
          name?: string
          price_per_item?: number
          price_per_m2?: number
          price_per_meter?: number
          setup_cost?: number
          side_overlap?: number
          sort_order?: number
          thick_block_threshold?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      headband_prices: {
        Row: {
          coef_manual_install: number
          coef_nonstandard_color: number
          coef_nonstandard_format: number
          coef_small_circulation: number
          coef_standard: number
          coef_thick_block: number
          color: string
          created_at: string
          headband_type: string
          headbands_per_item: number
          id: string
          install_price_per_piece: number
          is_active: boolean
          max_format_long: number
          min_cost: number
          min_format_short: number
          name: string
          price_per_meter: number
          setup_cost: number
          small_circulation_threshold: number
          sort_order: number
          tech_allowance_mm: number
          thick_block_threshold: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          coef_manual_install?: number
          coef_nonstandard_color?: number
          coef_nonstandard_format?: number
          coef_small_circulation?: number
          coef_standard?: number
          coef_thick_block?: number
          color?: string
          created_at?: string
          headband_type?: string
          headbands_per_item?: number
          id?: string
          install_price_per_piece?: number
          is_active?: boolean
          max_format_long?: number
          min_cost?: number
          min_format_short?: number
          name: string
          price_per_meter?: number
          setup_cost?: number
          small_circulation_threshold?: number
          sort_order?: number
          tech_allowance_mm?: number
          thick_block_threshold?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          coef_manual_install?: number
          coef_nonstandard_color?: number
          coef_nonstandard_format?: number
          coef_small_circulation?: number
          coef_standard?: number
          coef_thick_block?: number
          color?: string
          created_at?: string
          headband_type?: string
          headbands_per_item?: number
          id?: string
          install_price_per_piece?: number
          is_active?: boolean
          max_format_long?: number
          min_cost?: number
          min_format_short?: number
          name?: string
          price_per_meter?: number
          setup_cost?: number
          small_circulation_threshold?: number
          sort_order?: number
          tech_allowance_mm?: number
          thick_block_threshold?: number
          updated_at?: string
          updated_by?: string | null
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
      operation_catalog: {
        Row: {
          category: string
          code: number
          created_at: string
          description: string
          id: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          category?: string
          code: number
          created_at?: string
          description?: string
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category?: string
          code?: number
          created_at?: string
          description?: string
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      operation_parameters: {
        Row: {
          code: number
          created_at: string
          default_value: string
          formula: string
          id: string
          name: string
          notes: string
          operation_code: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: number
          created_at?: string
          default_value?: string
          formula?: string
          id?: string
          name: string
          notes?: string
          operation_code: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: number
          created_at?: string
          default_value?: string
          formula?: string
          id?: string
          name?: string
          notes?: string
          operation_code?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "operation_parameters_operation_code_fkey"
            columns: ["operation_code"]
            isOneToOne: false
            referencedRelation: "operation_catalog"
            referencedColumns: ["code"]
          },
        ]
      }
      operation_work_items: {
        Row: {
          code: number
          created_at: string
          id: string
          name: string
          notes: string
          operation_code: number
          price_source: string
          quantity_source: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: number
          created_at?: string
          id?: string
          name: string
          notes?: string
          operation_code: number
          price_source?: string
          quantity_source?: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: number
          created_at?: string
          id?: string
          name?: string
          notes?: string
          operation_code?: number
          price_source?: string
          quantity_source?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      operations: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          fixed_cost: number | null
          format_label: string | null
          id: string
          min_cost: number | null
          name: string
          setup_sheets: number | null
          subgroup: string | null
          unit: string | null
          variable_cost: number | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          fixed_cost?: number | null
          format_label?: string | null
          id?: string
          min_cost?: number | null
          name: string
          setup_sheets?: number | null
          subgroup?: string | null
          unit?: string | null
          variable_cost?: number | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          fixed_cost?: number | null
          format_label?: string | null
          id?: string
          min_cost?: number | null
          name?: string
          setup_sheets?: number | null
          subgroup?: string | null
          unit?: string | null
          variable_cost?: number | null
        }
        Relationships: []
      }
      paper_thickness: {
        Row: {
          created_at: string
          density: number
          id: string
          sort_order: number
          thickness_mm: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          density: number
          id?: string
          sort_order?: number
          thickness_mm?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          density?: number
          id?: string
          sort_order?: number
          thickness_mm?: number
          updated_at?: string
        }
        Relationships: []
      }
      perforation_prices: {
        Row: {
          calc_mode: string
          coef_cardboard: number
          coef_figured: number
          coef_manual: number
          coef_many_lines: number
          coef_micro: number
          coef_nonstandard_format: number
          coef_paper_heavy: number
          coef_paper_light: number
          coef_paper_med: number
          coef_plastic: number
          created_at: string
          density_heavy_max: number
          density_light_max: number
          density_med_max: number
          equipment_type: string
          id: string
          is_active: boolean
          many_lines_threshold: number
          max_format_long: number
          max_lines_per_pass: number
          max_paper_density: number
          min_cost: number
          min_format_short: number
          name: string
          perforation_type: string
          price_per_meter: number
          price_per_pass: number
          price_per_sheet: number
          setup_cost: number
          sort_order: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          calc_mode?: string
          coef_cardboard?: number
          coef_figured?: number
          coef_manual?: number
          coef_many_lines?: number
          coef_micro?: number
          coef_nonstandard_format?: number
          coef_paper_heavy?: number
          coef_paper_light?: number
          coef_paper_med?: number
          coef_plastic?: number
          created_at?: string
          density_heavy_max?: number
          density_light_max?: number
          density_med_max?: number
          equipment_type?: string
          id?: string
          is_active?: boolean
          many_lines_threshold?: number
          max_format_long?: number
          max_lines_per_pass?: number
          max_paper_density?: number
          min_cost?: number
          min_format_short?: number
          name: string
          perforation_type?: string
          price_per_meter?: number
          price_per_pass?: number
          price_per_sheet?: number
          setup_cost?: number
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          calc_mode?: string
          coef_cardboard?: number
          coef_figured?: number
          coef_manual?: number
          coef_many_lines?: number
          coef_micro?: number
          coef_nonstandard_format?: number
          coef_paper_heavy?: number
          coef_paper_light?: number
          coef_paper_med?: number
          coef_plastic?: number
          created_at?: string
          density_heavy_max?: number
          density_light_max?: number
          density_med_max?: number
          equipment_type?: string
          id?: string
          is_active?: boolean
          many_lines_threshold?: number
          max_format_long?: number
          max_lines_per_pass?: number
          max_paper_density?: number
          min_cost?: number
          min_format_short?: number
          name?: string
          perforation_type?: string
          price_per_meter?: number
          price_per_pass?: number
          price_per_sheet?: number
          setup_cost?: number
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      pouch_lamination_prices: {
        Row: {
          created_at: string
          film_thickness: number
          film_type: string
          height: number
          id: string
          min_cost: number
          name: string
          price_per_item: number
          sort_order: number
          updated_at: string
          width: number
        }
        Insert: {
          created_at?: string
          film_thickness?: number
          film_type?: string
          height: number
          id?: string
          min_cost?: number
          name: string
          price_per_item?: number
          sort_order?: number
          updated_at?: string
          width: number
        }
        Update: {
          created_at?: string
          film_thickness?: number
          film_type?: string
          height?: number
          id?: string
          min_cost?: number
          name?: string
          price_per_item?: number
          sort_order?: number
          updated_at?: string
          width?: number
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
      rigel_prices: {
        Row: {
          calc_mode: string
          coef_complex_position: number
          coef_manual: number
          coef_nonstandard_color: number
          coef_nonstandard_length: number
          coef_small_circulation: number
          coef_standard: number
          created_at: string
          hanger_included: boolean
          hanger_price: number
          has_hanger: boolean
          id: string
          install_method: string
          install_price: number
          is_active: boolean
          length_allowance: number
          max_width: number
          min_cost: number
          min_width: number
          name: string
          price_per_item: number
          price_per_meter: number
          rigel_color: string
          rigel_material: string
          rigel_type: string
          setup_cost: number
          small_circulation_threshold: number
          sort_order: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          calc_mode?: string
          coef_complex_position?: number
          coef_manual?: number
          coef_nonstandard_color?: number
          coef_nonstandard_length?: number
          coef_small_circulation?: number
          coef_standard?: number
          created_at?: string
          hanger_included?: boolean
          hanger_price?: number
          has_hanger?: boolean
          id?: string
          install_method?: string
          install_price?: number
          is_active?: boolean
          length_allowance?: number
          max_width?: number
          min_cost?: number
          min_width?: number
          name: string
          price_per_item?: number
          price_per_meter?: number
          rigel_color?: string
          rigel_material?: string
          rigel_type?: string
          setup_cost?: number
          small_circulation_threshold?: number
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          calc_mode?: string
          coef_complex_position?: number
          coef_manual?: number
          coef_nonstandard_color?: number
          coef_nonstandard_length?: number
          coef_small_circulation?: number
          coef_standard?: number
          created_at?: string
          hanger_included?: boolean
          hanger_price?: number
          has_hanger?: boolean
          id?: string
          install_method?: string
          install_price?: number
          is_active?: boolean
          length_allowance?: number
          max_width?: number
          min_cost?: number
          min_width?: number
          name?: string
          price_per_item?: number
          price_per_meter?: number
          rigel_color?: string
          rigel_material?: string
          rigel_type?: string
          setup_cost?: number
          small_circulation_threshold?: number
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      signature_collation_prices: {
        Row: {
          coef_complex_sequence: number
          coef_inserts: number
          coef_machine: number
          coef_manual: number
          coef_many_signatures: number
          coef_nonstandard_format: number
          coef_standard_format: number
          coef_thin_paper: number
          collation_type: string
          created_at: string
          id: string
          is_active: boolean
          max_circulation: number
          max_density: number
          max_format_long: number
          max_signatures: number
          min_circulation: number
          min_cost: number
          min_density: number
          min_format_short: number
          name: string
          price_per_signature: number
          setup_cost: number
          sort_order: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          coef_complex_sequence?: number
          coef_inserts?: number
          coef_machine?: number
          coef_manual?: number
          coef_many_signatures?: number
          coef_nonstandard_format?: number
          coef_standard_format?: number
          coef_thin_paper?: number
          collation_type?: string
          created_at?: string
          id?: string
          is_active?: boolean
          max_circulation?: number
          max_density?: number
          max_format_long?: number
          max_signatures?: number
          min_circulation?: number
          min_cost?: number
          min_density?: number
          min_format_short?: number
          name: string
          price_per_signature?: number
          setup_cost?: number
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          coef_complex_sequence?: number
          coef_inserts?: number
          coef_machine?: number
          coef_manual?: number
          coef_many_signatures?: number
          coef_nonstandard_format?: number
          coef_standard_format?: number
          coef_thin_paper?: number
          collation_type?: string
          created_at?: string
          id?: string
          is_active?: boolean
          max_circulation?: number
          max_density?: number
          max_format_long?: number
          max_signatures?: number
          min_circulation?: number
          min_cost?: number
          min_density?: number
          min_format_short?: number
          name?: string
          price_per_signature?: number
          setup_cost?: number
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      signature_folding_prices: {
        Row: {
          coef_density_heavy: number
          coef_density_light: number
          coef_density_medium: number
          coef_manual: number
          coef_nonstandard_format: number
          created_at: string
          fold_type: string
          id: string
          is_active: boolean
          machine_type: string
          max_density: number
          max_folds: number
          max_format_long: number
          min_cost: number
          min_density: number
          min_format_short: number
          name: string
          price_per_fold: number
          price_per_signature: number
          setup_cost: number
          sort_order: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          coef_density_heavy?: number
          coef_density_light?: number
          coef_density_medium?: number
          coef_manual?: number
          coef_nonstandard_format?: number
          created_at?: string
          fold_type?: string
          id?: string
          is_active?: boolean
          machine_type?: string
          max_density?: number
          max_folds?: number
          max_format_long?: number
          min_cost?: number
          min_density?: number
          min_format_short?: number
          name: string
          price_per_fold?: number
          price_per_signature?: number
          setup_cost?: number
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          coef_density_heavy?: number
          coef_density_light?: number
          coef_density_medium?: number
          coef_manual?: number
          coef_nonstandard_format?: number
          created_at?: string
          fold_type?: string
          id?: string
          is_active?: boolean
          machine_type?: string
          max_density?: number
          max_folds?: number
          max_format_long?: number
          min_cost?: number
          min_density?: number
          min_format_short?: number
          name?: string
          price_per_fold?: number
          price_per_signature?: number
          setup_cost?: number
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      stapling_prices: {
        Row: {
          coef_format_a3: number
          coef_format_a4: number
          coef_format_a5: number
          coef_format_a6: number
          coef_format_nonstandard: number
          coef_heavy_paper: number
          coef_loop_staple: number
          coef_manual: number
          coef_reinforced_staple: number
          coef_small_circulation: number
          coef_standard_staple: number
          coef_thickness_t1: number
          coef_thickness_t2: number
          coef_thickness_t3: number
          coef_thickness_t4: number
          created_at: string
          default_staples_count: number
          heavy_paper_threshold: number
          id: string
          is_active: boolean
          machine_type: string
          max_block_thickness: number
          max_circulation: number
          max_format_long: number
          min_circulation: number
          min_cost: number
          min_format_short: number
          name: string
          price_per_item: number
          price_per_staple: number
          setup_cost: number
          small_circulation_threshold: number
          sort_order: number
          staple_type: string
          thickness_t1_max: number
          thickness_t2_max: number
          thickness_t3_max: number
          thickness_t4_max: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          coef_format_a3?: number
          coef_format_a4?: number
          coef_format_a5?: number
          coef_format_a6?: number
          coef_format_nonstandard?: number
          coef_heavy_paper?: number
          coef_loop_staple?: number
          coef_manual?: number
          coef_reinforced_staple?: number
          coef_small_circulation?: number
          coef_standard_staple?: number
          coef_thickness_t1?: number
          coef_thickness_t2?: number
          coef_thickness_t3?: number
          coef_thickness_t4?: number
          created_at?: string
          default_staples_count?: number
          heavy_paper_threshold?: number
          id?: string
          is_active?: boolean
          machine_type?: string
          max_block_thickness?: number
          max_circulation?: number
          max_format_long?: number
          min_circulation?: number
          min_cost?: number
          min_format_short?: number
          name: string
          price_per_item?: number
          price_per_staple?: number
          setup_cost?: number
          small_circulation_threshold?: number
          sort_order?: number
          staple_type?: string
          thickness_t1_max?: number
          thickness_t2_max?: number
          thickness_t3_max?: number
          thickness_t4_max?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          coef_format_a3?: number
          coef_format_a4?: number
          coef_format_a5?: number
          coef_format_a6?: number
          coef_format_nonstandard?: number
          coef_heavy_paper?: number
          coef_loop_staple?: number
          coef_manual?: number
          coef_reinforced_staple?: number
          coef_small_circulation?: number
          coef_standard_staple?: number
          coef_thickness_t1?: number
          coef_thickness_t2?: number
          coef_thickness_t3?: number
          coef_thickness_t4?: number
          created_at?: string
          default_staples_count?: number
          heavy_paper_threshold?: number
          id?: string
          is_active?: boolean
          machine_type?: string
          max_block_thickness?: number
          max_circulation?: number
          max_format_long?: number
          min_circulation?: number
          min_cost?: number
          min_format_short?: number
          name?: string
          price_per_item?: number
          price_per_staple?: number
          setup_cost?: number
          small_circulation_threshold?: number
          sort_order?: number
          staple_type?: string
          thickness_t1_max?: number
          thickness_t2_max?: number
          thickness_t3_max?: number
          thickness_t4_max?: number
          updated_at?: string
          updated_by?: string | null
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
      tape_prices: {
        Row: {
          application_method: string
          calc_mode: string
          coef_complex_position: number
          coef_foam: number
          coef_manual: number
          coef_many_strips: number
          coef_nonstandard_format: number
          coef_small_circulation: number
          coef_standard: number
          created_at: string
          id: string
          is_active: boolean
          many_strips_threshold: number
          min_cost: number
          name: string
          price_per_item_apply: number
          price_per_meter: number
          price_per_point: number
          setup_cost: number
          small_circulation_threshold: number
          sort_order: number
          tape_type: string
          tape_width_mm: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          application_method?: string
          calc_mode?: string
          coef_complex_position?: number
          coef_foam?: number
          coef_manual?: number
          coef_many_strips?: number
          coef_nonstandard_format?: number
          coef_small_circulation?: number
          coef_standard?: number
          created_at?: string
          id?: string
          is_active?: boolean
          many_strips_threshold?: number
          min_cost?: number
          name: string
          price_per_item_apply?: number
          price_per_meter?: number
          price_per_point?: number
          setup_cost?: number
          small_circulation_threshold?: number
          sort_order?: number
          tape_type?: string
          tape_width_mm?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          application_method?: string
          calc_mode?: string
          coef_complex_position?: number
          coef_foam?: number
          coef_manual?: number
          coef_many_strips?: number
          coef_nonstandard_format?: number
          coef_small_circulation?: number
          coef_standard?: number
          created_at?: string
          id?: string
          is_active?: boolean
          many_strips_threshold?: number
          min_cost?: number
          name?: string
          price_per_item_apply?: number
          price_per_meter?: number
          price_per_point?: number
          setup_cost?: number
          small_circulation_threshold?: number
          sort_order?: number
          tape_type?: string
          tape_width_mm?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      thermal_binding_prices: {
        Row: {
          created_at: string
          glue_type: string
          id: string
          is_active: boolean
          max_block_thickness: number
          min_block_thickness: number
          min_cost: number
          name: string
          price_per_mm: number
          setup_cost: number
          sort_order: number
          updated_at: string
          updated_by: string | null
          work_price_per_item: number
        }
        Insert: {
          created_at?: string
          glue_type?: string
          id?: string
          is_active?: boolean
          max_block_thickness?: number
          min_block_thickness?: number
          min_cost?: number
          name: string
          price_per_mm?: number
          setup_cost?: number
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
          work_price_per_item?: number
        }
        Update: {
          created_at?: string
          glue_type?: string
          id?: string
          is_active?: boolean
          max_block_thickness?: number
          min_block_thickness?: number
          min_cost?: number
          name?: string
          price_per_mm?: number
          setup_cost?: number
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
          work_price_per_item?: number
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
      variable_print_prices: {
        Row: {
          complexity: number
          created_at: string
          id: string
          is_active: boolean
          kind: string
          min_cost: number
          name: string
          price_per_apply: number
          setup_cost: number
          sort_order: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          complexity?: number
          created_at?: string
          id?: string
          is_active?: boolean
          kind: string
          min_cost?: number
          name: string
          price_per_apply?: number
          setup_cost?: number
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          complexity?: number
          created_at?: string
          id?: string
          is_active?: boolean
          kind?: string
          min_cost?: number
          name?: string
          price_per_apply?: number
          setup_cost?: number
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      window_attachment_prices: {
        Row: {
          allowed_shapes: string
          application_method: string
          calc_mode: string
          coef_complex_position: number
          coef_figured: number
          coef_manual: number
          coef_many_windows: number
          coef_nonstandard_format: number
          coef_standard: number
          coef_thick_pet: number
          created_at: string
          equipment_type: string
          id: string
          is_active: boolean
          many_windows_threshold: number
          material_thickness_mkm: number
          max_material_thickness_mkm: number
          max_window_mm: number
          min_cost: number
          min_window_mm: number
          name: string
          price_apply_per_item: number
          price_apply_per_m2: number
          price_material_per_m2: number
          setup_cost: number
          sort_order: number
          thick_pet_threshold_mkm: number
          updated_at: string
          updated_by: string | null
          window_material: string
          window_shape: string
        }
        Insert: {
          allowed_shapes?: string
          application_method?: string
          calc_mode?: string
          coef_complex_position?: number
          coef_figured?: number
          coef_manual?: number
          coef_many_windows?: number
          coef_nonstandard_format?: number
          coef_standard?: number
          coef_thick_pet?: number
          created_at?: string
          equipment_type?: string
          id?: string
          is_active?: boolean
          many_windows_threshold?: number
          material_thickness_mkm?: number
          max_material_thickness_mkm?: number
          max_window_mm?: number
          min_cost?: number
          min_window_mm?: number
          name: string
          price_apply_per_item?: number
          price_apply_per_m2?: number
          price_material_per_m2?: number
          setup_cost?: number
          sort_order?: number
          thick_pet_threshold_mkm?: number
          updated_at?: string
          updated_by?: string | null
          window_material?: string
          window_shape?: string
        }
        Update: {
          allowed_shapes?: string
          application_method?: string
          calc_mode?: string
          coef_complex_position?: number
          coef_figured?: number
          coef_manual?: number
          coef_many_windows?: number
          coef_nonstandard_format?: number
          coef_standard?: number
          coef_thick_pet?: number
          created_at?: string
          equipment_type?: string
          id?: string
          is_active?: boolean
          many_windows_threshold?: number
          material_thickness_mkm?: number
          max_material_thickness_mkm?: number
          max_window_mm?: number
          min_cost?: number
          min_window_mm?: number
          name?: string
          price_apply_per_item?: number
          price_apply_per_m2?: number
          price_material_per_m2?: number
          setup_cost?: number
          sort_order?: number
          thick_pet_threshold_mkm?: number
          updated_at?: string
          updated_by?: string | null
          window_material?: string
          window_shape?: string
        }
        Relationships: []
      }
      wire_spring_prices: {
        Row: {
          color: string
          created_at: string
          diameter_mm: number
          id: string
          is_active: boolean
          max_block_thickness: number
          min_block_thickness: number
          min_cost: number
          name: string
          pitch_mm: number
          price_per_loop: number
          setup_cost: number
          sort_order: number
          spring_type: string
          updated_at: string
          updated_by: string | null
          work_price_per_item: number
        }
        Insert: {
          color?: string
          created_at?: string
          diameter_mm?: number
          id?: string
          is_active?: boolean
          max_block_thickness?: number
          min_block_thickness?: number
          min_cost?: number
          name: string
          pitch_mm?: number
          price_per_loop?: number
          setup_cost?: number
          sort_order?: number
          spring_type?: string
          updated_at?: string
          updated_by?: string | null
          work_price_per_item?: number
        }
        Update: {
          color?: string
          created_at?: string
          diameter_mm?: number
          id?: string
          is_active?: boolean
          max_block_thickness?: number
          min_block_thickness?: number
          min_cost?: number
          name?: string
          pitch_mm?: number
          price_per_loop?: number
          setup_cost?: number
          sort_order?: number
          spring_type?: string
          updated_at?: string
          updated_by?: string | null
          work_price_per_item?: number
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
      apply_item_price_change: {
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
      replace_variant_stages: {
        Args: { _stages: Json; _variant_id: string }
        Returns: undefined
      }
      set_active_variant: { Args: { _variant_id: string }; Returns: undefined }
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
