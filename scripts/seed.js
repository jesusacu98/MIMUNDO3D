const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Error: NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY deben estar en .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  console.log("Intentando insertar cliente de prueba con ID '1'...");
  
  // 1. Insertar o actualizar cliente con ID '1'
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .upsert({
      id: '1',
      name: 'MIMUNDO3D Tienda Oficial'
    })
    .select()
    .single();

  if (clientError) {
    console.error("Error al crear/actualizar cliente en Supabase:", clientError);
    console.log("\n⚠️ Nota: Si el error dice 'relation \"public.clients\" does not exist', necesitas crear las tablas en tu panel de Supabase.");
    return;
  }
  console.log("✅ Cliente creado/actualizado con éxito:", client);

  // 2. Insertar o actualizar cuenta bancaria para el cliente con ID '1'
  const { data: account, error: accountError } = await supabase
    .from('client_bank_accounts')
    .upsert({
      client_id: '1',
      bank_name: 'BBVA México',
      interbank_clabe: '012180012345678901',
      account_holder_name: 'Jesús Acuña',
      card_number: '4152313243546576'
    })
    .select()
    .single();

  if (accountError) {
    console.error("Error al crear cuenta bancaria en Supabase:", accountError);
    return;
  }
  console.log("✅ Cuenta bancaria creada/actualizada con éxito:", account);
  console.log("\n🎉 ¡Listo! Ahora puedes ingresar a: http://localhost:3000/pago/1 para ver los datos reales.");
}

run();
