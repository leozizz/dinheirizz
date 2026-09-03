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
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
        }
      }
      accounts: {
        Row: {
          id: string
          user_id: string
          name: string
          type: string
          balance: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          type?: string
          balance?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          type?: string
          balance?: string
          created_at?: string
        }
      }
      categories: {
        Row: {
          id: string
          user_id: string
          name: string
          type: string
          icon: string | null
          color: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          type: string
          icon?: string | null
          color?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          type?: string
          icon?: string | null
          color?: string | null
          created_at?: string
        }
      }
      transactions: {
        Row: {
          id: string
          user_id: string
          account_id: string
          category_id: string | null
          amount: string
          description: string | null
          occurred_at: string
          paid: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          account_id: string
          category_id?: string | null
          amount: string
          description?: string | null
          occurred_at?: string
          paid?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          account_id?: string
          category_id?: string | null
          amount?: string
          description?: string | null
          occurred_at?: string
          paid?: boolean
          created_at?: string
        }
      }
      pix_keys: {
        Row: {
          id: string
          user_id: string
          key_type: string
          key_value: string
          bank_name: string
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          key_type: string
          key_value: string
          bank_name: string
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          key_type?: string
          key_value?: string
          bank_name?: string
          description?: string | null
          created_at?: string
        }
      }
    }
  }
}
