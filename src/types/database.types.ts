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
      accounts: {
        Row: {
          balance: number
          created_at: string
          id: string
          name: string
          type: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          name: string
          type?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          name?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_user_id_users_id_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          color: string | null
          created_at: string
          icon: string | null
          id: string
          name: string
          type: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          type: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_user_id_users_id_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_cards: {
        Row: {
          account_id: string
          archived: boolean
          brand: string
          closing_day: number
          color: string | null
          created_at: string
          due_day: number
          id: string
          last_four_digits: string | null
          limit_amount: string
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_id: string
          archived?: boolean
          brand?: string
          closing_day: number
          color?: string | null
          created_at?: string
          due_day: number
          id?: string
          last_four_digits?: string | null
          limit_amount: string
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_id?: string
          archived?: boolean
          brand?: string
          closing_day?: number
          color?: string | null
          created_at?: string
          due_day?: number
          id?: string
          last_four_digits?: string | null
          limit_amount?: string
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount: string
          closing_date: string
          created_at: string
          credit_card_id: string
          due_date: string
          id: string
          paid_amount: string
          paid_at: string | null
          payment_account_id: string | null
          payment_transaction_id: string | null
          period: string
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount?: string
          closing_date: string
          created_at?: string
          credit_card_id: string
          due_date: string
          id?: string
          paid_amount?: string
          paid_at?: string | null
          payment_account_id?: string | null
          payment_transaction_id?: string | null
          period: string
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: string
          closing_date?: string
          created_at?: string
          credit_card_id?: string
          due_date?: string
          id?: string
          paid_amount?: string
          paid_at?: string | null
          payment_account_id?: string | null
          payment_transaction_id?: string | null
          period?: string
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      pix_keys: {
        Row: {
          bank_name: string
          created_at: string
          description: string | null
          id: string
          key_type: string
          key_value: string
          user_id: string
        }
        Insert: {
          bank_name: string
          created_at?: string
          description?: string | null
          id?: string
          key_type: string
          key_value: string
          user_id: string
        }
        Update: {
          bank_name?: string
          created_at?: string
          description?: string | null
          id?: string
          key_type?: string
          key_value?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pix_keys_user_id_users_id_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          account_id: string
          amount: number
          category_id: string | null
          credit_card_id?: string | null
          invoice_id?: string | null
          created_at: string
          description: string | null
          id: string
          occurred_at: string
          paid: boolean
          user_id: string
        }
        Insert: {
          account_id: string
          amount: number
          category_id?: string | null
          credit_card_id?: string | null
          invoice_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          occurred_at?: string
          paid?: boolean
          user_id: string
        }
        Update: {
          account_id?: string
          amount?: number
          category_id?: string | null
          credit_card_id?: string | null
          invoice_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          occurred_at?: string
          paid?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_accounts_id_fk"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_category_id_categories_id_fk"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_user_id_users_id_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
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
    Enums: {},
  },
} as const

export type CreditCardBrand = 'mastercard' | 'visa' | 'elo' | 'amex' | 'hipercard' | 'other'
export type InvoiceStatus = 'open' | 'closed' | 'paid' | 'overdue'

export interface CreditCardCurrentInvoice {
  id: string
  period: string
  amount: number
  status: InvoiceStatus
  closingDate: string
  dueDate: string
}

export interface CreditCard {
  id: string
  userId?: string
  accountId: string
  name: string
  brand: CreditCardBrand
  limitAmount: number
  usedLimit: number
  availableLimit: number
  closingDay: number
  dueDay: number
  color: string | null
  lastFourDigits: string | null
  archived?: boolean
  createdAt?: string
  updatedAt?: string | null
  currentInvoice?: CreditCardCurrentInvoice | null
  invoices?: Invoice[]
}

export interface InvoiceItem {
  id: string
  description: string | null
  amount: number
  occurredAt: string
  installmentCurrent: number | null
  installmentTotal: number | null
  category?: {
    name: string
    color?: string | null
  } | null
}

export interface Invoice {
  id: string
  creditCardId: string
  userId?: string
  period: string
  closingDate: string
  dueDate: string
  amount: number
  status: InvoiceStatus
  paidAmount: number
  paidAt: string | null
  paymentAccountId?: string | null
  paymentTransactionId?: string | null
  createdAt?: string
  updatedAt?: string | null
  items?: InvoiceItem[]
}

