const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error("Error: NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY deben estar en .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function run() {
  console.log("Consultando cliente con ID '1' usando la clave privada de admin...");
  
  const { data, error } = await supabase
    .from('clients')
    .select(`
      name,
      client_bank_accounts (
        bank_name,
        interbank_clabe,
        account_holder_name
      )
    `)
    .eq('id', '1')
    .single();

  console.log("\n--- RESULTADO DE LA CONSULTA (CON ADMIN KEY) ---");
  console.log("DATA:", JSON.stringify(data, null, 2));
  console.log("ERROR:", error);
  console.log("--------------------------------");
}

run();
