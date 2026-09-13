import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database.types'
import { encryptedStorageAdapter } from './encryptedStorage'

// Oculta a URL externa do Supabase no navegador através de proxy relativo (/api/supabase)
const getSupabaseBaseUrl = () => {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/api/supabase`
  }
  return import.meta.env.VITE_SUPABASE_URL || 'https://wkglkyxqbhlrnodgdscf.supabase.co'
}

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_SRbEhwnHgX7WCNd618RNMg_LtGHjonK'

export const supabase = createClient<Database>(getSupabaseBaseUrl(), supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: encryptedStorageAdapter
  }
})
