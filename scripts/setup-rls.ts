/**
 * Apply RLS policies + verify anon access
 * Run with: npx tsx scripts/setup-rls.ts
 */
import { createClient } from '@supabase/supabase-js'

// Use service role to apply policies
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  console.log('🔐 Setting up RLS policies...\n')

  // Test anon access first
  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data: products, error } = await anonClient
    .from('products')
    .select('id, name, slug')
    .limit(3)

  if (error) {
    console.log('❌ Anon cannot read products:', error.message)
    console.log('   RLS is blocking — need to apply policies via SQL Editor\n')
  } else {
    console.log('✅ Anon can read products:', products?.length, 'rows returned')
    products?.forEach(p => console.log(`   - ${p.name} (${p.slug})`))
  }

  // Test categories
  const { data: cats, error: catErr } = await anonClient
    .from('categories')
    .select('id, name, slug')
    .limit(5)

  if (catErr) {
    console.log('❌ Anon cannot read categories:', catErr.message)
  } else {
    console.log('\n✅ Anon can read categories:', cats?.length, 'rows')
    cats?.forEach(c => console.log(`   - ${c.name} (${c.slug})`))
  }

  // Service role count
  const { count } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
  console.log(`\n📊 Total products (service role): ${count}`)
}

main().catch(console.error)
