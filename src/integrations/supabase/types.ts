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
      addons: {
        Row: {
          active: boolean | null
          category: Database["public"]["Enums"]["addon_category"]
          created_at: string | null
          id: string
          is_paid: boolean | null
          name: string
          price: number | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          category: Database["public"]["Enums"]["addon_category"]
          created_at?: string | null
          id?: string
          is_paid?: boolean | null
          name: string
          price?: number | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          category?: Database["public"]["Enums"]["addon_category"]
          created_at?: string | null
          id?: string
          is_paid?: boolean | null
          name?: string
          price?: number | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "addons_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          bot_paused: boolean | null
          channel: Database["public"]["Enums"]["conv_channel"]
          created_at: string | null
          customer_id: string | null
          external_id: string | null
          id: string
          status: Database["public"]["Enums"]["conv_status"]
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          bot_paused?: boolean | null
          channel?: Database["public"]["Enums"]["conv_channel"]
          created_at?: string | null
          customer_id?: string | null
          external_id?: string | null
          id?: string
          status?: Database["public"]["Enums"]["conv_status"]
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          bot_paused?: boolean | null
          channel?: Database["public"]["Enums"]["conv_channel"]
          created_at?: string | null
          customer_id?: string | null
          external_id?: string | null
          id?: string
          status?: Database["public"]["Enums"]["conv_status"]
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string | null
          default_address: string | null
          id: string
          name: string | null
          phone: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          default_address?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          default_address?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_zones: {
        Row: {
          active: boolean | null
          created_at: string | null
          eta_minutes: number | null
          fee: number
          id: string
          neighborhood: string
          tenant_id: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          eta_minutes?: number | null
          fee?: number
          id?: string
          neighborhood: string
          tenant_id: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          eta_minutes?: number | null
          fee?: number
          id?: string
          neighborhood?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_zones_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string | null
          conversation_id: string
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["msg_role"]
          tenant_id: string
          tool_calls: Json | null
        }
        Insert: {
          content?: string | null
          conversation_id: string
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["msg_role"]
          tenant_id: string
          tool_calls?: Json | null
        }
        Update: {
          content?: string | null
          conversation_id?: string
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["msg_role"]
          tenant_id?: string
          tool_calls?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address: string | null
          change_for: number | null
          conversation_id: string | null
          created_at: string | null
          customer_id: string | null
          delivery_fee: number
          eta_minutes: number | null
          id: string
          items: Json
          neighborhood: string | null
          notes: string | null
          payment_method: string | null
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          tenant_id: string
          total: number
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          change_for?: number | null
          conversation_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          delivery_fee?: number
          eta_minutes?: number | null
          id?: string
          items?: Json
          neighborhood?: string | null
          notes?: string | null
          payment_method?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          tenant_id: string
          total?: number
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          change_for?: number | null
          conversation_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          delivery_fee?: number
          eta_minutes?: number | null
          id?: string
          items?: Json
          neighborhood?: string | null
          notes?: string | null
          payment_method?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          tenant_id?: string
          total?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          tenant_id: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          tenant_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sizes: {
        Row: {
          active: boolean | null
          category: Database["public"]["Enums"]["size_category"]
          created_at: string | null
          display_order: number | null
          free_addons: number
          free_toppings: number
          id: string
          name: string
          price: number
          tenant_id: string
          updated_at: string | null
          volume_ml: number | null
        }
        Insert: {
          active?: boolean | null
          category: Database["public"]["Enums"]["size_category"]
          created_at?: string | null
          display_order?: number | null
          free_addons?: number
          free_toppings?: number
          id?: string
          name: string
          price: number
          tenant_id: string
          updated_at?: string | null
          volume_ml?: number | null
        }
        Update: {
          active?: boolean | null
          category?: Database["public"]["Enums"]["size_category"]
          created_at?: string | null
          display_order?: number | null
          free_addons?: number
          free_toppings?: number
          id?: string
          name?: string
          price?: number
          tenant_id?: string
          updated_at?: string | null
          volume_ml?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sizes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          active: boolean | null
          address: string | null
          created_at: string | null
          id: string
          name: string
          opening_hours: string | null
          payment_methods: string[] | null
          phone: string | null
          pix_key: string | null
          slug: string
          updated_at: string | null
          welcome_message: string | null
          whatsapp_config: Json | null
        }
        Insert: {
          active?: boolean | null
          address?: string | null
          created_at?: string | null
          id?: string
          name: string
          opening_hours?: string | null
          payment_methods?: string[] | null
          phone?: string | null
          pix_key?: string | null
          slug: string
          updated_at?: string | null
          welcome_message?: string | null
          whatsapp_config?: Json | null
        }
        Update: {
          active?: boolean | null
          address?: string | null
          created_at?: string | null
          id?: string
          name?: string
          opening_hours?: string | null
          payment_methods?: string[] | null
          phone?: string | null
          pix_key?: string | null
          slug?: string
          updated_at?: string | null
          welcome_message?: string | null
          whatsapp_config?: Json | null
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
      whatsapp_instances: {
        Row: {
          created_at: string | null
          evolution_api_key: string
          evolution_url: string
          id: string
          instance_name: string
          last_qr: string | null
          phone_number: string | null
          status: string
          tenant_id: string
          updated_at: string | null
          webhook_token: string
        }
        Insert: {
          created_at?: string | null
          evolution_api_key: string
          evolution_url: string
          id?: string
          instance_name: string
          last_qr?: string | null
          phone_number?: string | null
          status?: string
          tenant_id: string
          updated_at?: string | null
          webhook_token?: string
        }
        Update: {
          created_at?: string | null
          evolution_api_key?: string
          evolution_url?: string
          id?: string
          instance_name?: string
          last_qr?: string | null
          phone_number?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string | null
          webhook_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_instances_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_tenant_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_super_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      addon_category: "fruta" | "cobertura" | "complemento" | "creme" | "pago"
      app_role: "super_admin" | "owner" | "attendant"
      conv_channel: "whatsapp" | "instagram" | "interno"
      conv_status: "ativa" | "aguardando_humano" | "encerrada"
      msg_role: "user" | "assistant" | "system" | "tool"
      order_status: "novo" | "preparando" | "entrega" | "entregue" | "cancelado"
      size_category: "copo" | "barca" | "marmita" | "roleta"
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
      addon_category: ["fruta", "cobertura", "complemento", "creme", "pago"],
      app_role: ["super_admin", "owner", "attendant"],
      conv_channel: ["whatsapp", "instagram", "interno"],
      conv_status: ["ativa", "aguardando_humano", "encerrada"],
      msg_role: ["user", "assistant", "system", "tool"],
      order_status: ["novo", "preparando", "entrega", "entregue", "cancelado"],
      size_category: ["copo", "barca", "marmita", "roleta"],
    },
  },
} as const
