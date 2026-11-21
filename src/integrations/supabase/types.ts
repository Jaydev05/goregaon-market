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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      banners: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          is_active: boolean
          link: string | null
          sort_order: number
          subtitle: string | null
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          link?: string | null
          sort_order?: number
          subtitle?: string | null
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          link?: string | null
          sort_order?: number
          subtitle?: string | null
          title?: string
        }
        Relationships: []
      }
      coin_transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          order_id: string | null
          reason: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          order_id?: string | null
          reason: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          order_id?: string | null
          reason?: string
          user_id?: string
        }
        Relationships: []
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          description: string | null
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean
          max_discount: number | null
          min_order: number
          target_segment: string | null
          target_type: string
          target_user_id: string | null
          usage_limit_per_user: number
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_discount?: number | null
          min_order?: number
          target_segment?: string | null
          target_type?: string
          target_user_id?: string | null
          usage_limit_per_user?: number
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_discount?: number | null
          min_order?: number
          target_segment?: string | null
          target_type?: string
          target_user_id?: string | null
          usage_limit_per_user?: number
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          id: string
          notes: string | null
          spent_on: string
          title: string
        }
        Insert: {
          amount: number
          category?: string
          created_at?: string
          id?: string
          notes?: string | null
          spent_on?: string
          title: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          id?: string
          notes?: string | null
          spent_on?: string
          title?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          address: string
          admin_note: string | null
          coin_discount: number
          coins_earned: number
          coins_used: number
          coupon_code: string | null
          coupon_discount: number
          created_at: string
          customer_name: string
          delivered_at: string | null
          delivery_fee: number
          distance_km: number
          expected_delivery_at: string | null
          id: string
          items: Json
          lat: number
          lng: number
          order_no: number
          payment_method: string
          phone: string
          status: string
          subtotal: number
          total: number
          user_id: string
        }
        Insert: {
          address: string
          admin_note?: string | null
          coin_discount?: number
          coins_earned?: number
          coins_used?: number
          coupon_code?: string | null
          coupon_discount?: number
          created_at?: string
          customer_name: string
          delivered_at?: string | null
          delivery_fee?: number
          distance_km: number
          expected_delivery_at?: string | null
          id?: string
          items: Json
          lat: number
          lng: number
          order_no?: number
          payment_method?: string
          phone: string
          status?: string
          subtotal: number
          total: number
          user_id: string
        }
        Update: {
          address?: string
          admin_note?: string | null
          coin_discount?: number
          coins_earned?: number
          coins_used?: number
          coupon_code?: string | null
          coupon_discount?: number
          created_at?: string
          customer_name?: string
          delivered_at?: string | null
          delivery_fee?: number
          distance_km?: number
          expected_delivery_at?: string | null
          id?: string
          items?: Json
          lat?: number
          lng?: number
          order_no?: number
          payment_method?: string
          phone?: string
          status?: string
          subtotal?: number
          total?: number
          user_id?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          category: string
          created_at: string
          description: string
          id: string
          images: string[]
          is_active: boolean
          is_featured: boolean
          mrp: number
          name: string
          selling_price: number
          stock: number
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string
          id?: string
          images?: string[]
          is_active?: boolean
          is_featured?: boolean
          mrp: number
          name: string
          selling_price: number
          stock?: number
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          id?: string
          images?: string[]
          is_active?: boolean
          is_featured?: boolean
          mrp?: number
          name?: string
          selling_price?: number
          stock?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          coins: number
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          lat: number | null
          lng: number | null
          phone: string | null
          segment: string
        }
        Insert: {
          address?: string | null
          coins?: number
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          lat?: number | null
          lng?: number | null
          phone?: string | null
          segment?: string
        }
        Update: {
          address?: string | null
          coins?: number
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          phone?: string | null
          segment?: string
        }
        Relationships: []
      }
      store_settings: {
        Row: {
          coin_spend_step: number
          coin_value: number
          coins_per_step: number
          delivery_eta_minutes: number
          delivery_fee: number
          delivery_radius_km: number
          free_delivery_above: number
          id: number
          max_coin_redeem_percent: number
          min_order_amount: number
          store_address: string
          store_lat: number
          store_lng: number
          store_name: string
          store_phone: string | null
          updated_at: string
        }
        Insert: {
          coin_spend_step?: number
          coin_value?: number
          coins_per_step?: number
          delivery_eta_minutes?: number
          delivery_fee?: number
          delivery_radius_km?: number
          free_delivery_above?: number
          id?: number
          max_coin_redeem_percent?: number
          min_order_amount?: number
          store_address?: string
          store_lat?: number
          store_lng?: number
          store_name?: string
          store_phone?: string | null
          updated_at?: string
        }
        Update: {
          coin_spend_step?: number
          coin_value?: number
          coins_per_step?: number
          delivery_eta_minutes?: number
          delivery_fee?: number
          delivery_radius_km?: number
          free_delivery_above?: number
          id?: number
          max_coin_redeem_percent?: number
          min_order_amount?: number
          store_address?: string
          store_lat?: number
          store_lng?: number
          store_name?: string
          store_phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      cancel_my_order: { Args: { _order_id: string }; Returns: undefined }
      coupon_discount_for: {
        Args: { _code: string; _subtotal: number; _user: string }
        Returns: number
      }
      distance_km: {
        Args: { lat1: number; lat2: number; lng1: number; lng2: number }
        Returns: number
      }
      get_public_store_settings: {
        Args: never
        Returns: {
          coin_spend_step: number
          coin_value: number
          coins_per_step: number
          delivery_eta_minutes: number
          delivery_fee: number
          delivery_radius_km: number
          free_delivery_above: number
          id: number
          max_coin_redeem_percent: number
          min_order_amount: number
          store_address: string
          store_lat: number
          store_lng: number
          store_name: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      place_order: {
        Args: {
          _address: string
          _coins_to_use: number
          _coupon_code: string
          _items: Json
          _lat: number
          _lng: number
          _name: string
          _phone: string
        }
        Returns: string
      }
      preview_coupon: {
        Args: { _code: string; _subtotal: number }
        Returns: number
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "user"],
    },
  },
} as const
