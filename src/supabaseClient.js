import { createClient } from '@supabase/supabase-js'

// 
const supabaseUrl = 'https://dbixdadrlgtqivqujczr.supabase.co'
const supabaseAnonKey = 'sb_publishable_w94HpGxzgFPJdJfVIQj8Sw_kHMhBLuQ'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)