import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null

export async function loadCloudSnapshot() {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('app_state')
    .select('data')
    .eq('id', 'primary')
    .maybeSingle()
  if (error) throw error
  return data?.data || null
}

export async function saveCloudSnapshot(data) {
  if (!supabase) return
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError
  const user = userData.user
  if (!user) throw new Error('No hay una sesion admin activa.')

  const { error } = await supabase.from('app_state').upsert({
    id: 'primary',
    owner_id: user.id,
    data,
    updated_at: new Date().toISOString(),
  })
  if (error) throw error
}
