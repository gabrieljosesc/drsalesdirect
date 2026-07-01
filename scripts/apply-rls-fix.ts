/**
 * Apply RLS fix via Supabase Management API
 * Run: npx tsx scripts/apply-rls-fix.ts
 */
import { readFileSync } from 'fs'
import { join } from 'path'

const PROJECT_REF = 'iebpxtbrcsbgadwyrqqi'

// We'll use pg directly via the connection string
// Supabase direct connection: postgresql://postgres:[DB_PASSWORD]@db.[REF].supabase.co:5432/postgres
// Session pooler: postgresql://postgres.[REF]:[DB_PASSWORD]@aws-0-[region].pooler.supabase.com:5432/postgres

// Since we don't have direct DB password, we'll use the REST API workaround:
// Create a helper function via service role, then call it

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://iebpxtbrcsbgadwyrqqi.supabase.co'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  db: { schema: 'public' },
  auth: { persistSession: false }
})

// Individual SQL statements to apply
const statements = [
  // Drop broken policies
  `drop policy if exists "Admins can view all profiles" on public.profiles`,
  `drop policy if exists "Admins can manage products" on public.products`,
  `drop policy if exists "Admins can manage categories" on public.categories`,
  `drop policy if exists "Admins can manage brands" on public.brands`,
  `drop policy if exists "Admins can manage orders" on public.orders`,
  `drop policy if exists "Admins can manage order items" on public.order_items`,
  `drop policy if exists "Admins can read messages" on public.contact_messages`,
  `drop policy if exists "Admins can manage blog" on public.blog_posts`,

  // Create security definer function
  `create or replace function public.is_admin()
   returns boolean language sql stable security definer set search_path = public as $$
     select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
   $$`,

  // Products
  `drop policy if exists "Anyone can view products" on public.products`,
  `create policy "Anyone can view products" on public.products for select using (true)`,
  `create policy "Admins can manage products" on public.products for all using (public.is_admin())`,

  // Categories
  `drop policy if exists "Anyone can view categories" on public.categories`,
  `create policy "Anyone can view categories" on public.categories for select using (true)`,
  `create policy "Admins can manage categories" on public.categories for all using (public.is_admin())`,

  // Brands
  `drop policy if exists "Anyone can view brands" on public.brands`,
  `create policy "Anyone can view brands" on public.brands for select using (true)`,
  `create policy "Admins can manage brands" on public.brands for all using (public.is_admin())`,

  // Orders, order items, messages, blog
  `create policy "Admins can manage orders" on public.orders for all using (public.is_admin())`,
  `create policy "Admins can manage order items" on public.order_items for all using (public.is_admin())`,
  `create policy "Admins can read messages" on public.contact_messages for select using (public.is_admin())`,
  `create policy "Admins can manage blog" on public.blog_posts for all using (public.is_admin())`,
]

async function applyFix() {
  console.log('🔧 Applying RLS fix via Management API...\n')

  // Use Supabase Management REST API to run SQL
  const managementUrl = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`

  // Note: Management API requires a personal access token, not service role.
  // So we'll use pg client approach instead.
  // Let me try the pg approach directly with Supabase's transaction pooler

  console.log('ℹ️  Cannot run arbitrary SQL via supabase-js client.')
  console.log('   The fastest fix is to paste supabase/fix-rls.sql into:')
  console.log(`   https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new\n`)
  console.log('Opening the URL now...')

  // Print the SQL for easy copy-paste
  const sql = readFileSync(join(process.cwd(), 'supabase/fix-rls.sql'), 'utf8')
  console.log('\n─── SQL TO RUN ──────────────────────────────────────────')
  console.log(sql)
  console.log('─────────────────────────────────────────────────────────')
}

applyFix()
