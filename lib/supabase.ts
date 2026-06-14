import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xkrdlzsmdzmogqjzwvrn.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhrcmRsenNtZHptb2dxanp3dnJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4NDExNDIsImV4cCI6MjA2NTQxNzE0Mn0.rJi-HBkTtAjaJucg3khhdbwL0OytSWpB2DALuCTBIXw'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
