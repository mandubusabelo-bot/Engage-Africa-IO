import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://oaeirdgffwodkbcstdfh.supabase.co';
// You need to add your actual anon key here
const supabaseKey = 'YOUR_ANON_KEY_HERE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  console.log('Checking Supabase tables...\n');

  const tables = [
    'users',
    'agents',
    'flows',
    'templates',
    'messages',
    'knowledge_base',
    'whatsapp_sessions',
    'analytics',
    'conversations',
    'products'
  ];

  for (const table of tables) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.log(`❌ ${table}: ${error.message}`);
      } else {
        console.log(`✅ ${table}: exists (${count || 0} rows)`);
      }
    } catch (err) {
      console.log(`❌ ${table}: ${err.message}`);
    }
  }
}

checkTables().catch(console.error);
