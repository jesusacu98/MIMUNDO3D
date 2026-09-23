-- =========================================================
-- MIMUNDO3D — Chat de ideas (/ideas)
-- Pegar y ejecutar en el SQL Editor de Supabase. Seguro de re-correr.
--
-- idea_conversations: cada conversación del chat (para ver qué piden los clientes
--   en /admin/ideas) y si al final la mandaron a cotizar por WhatsApp.
-- idea_chat_log: un renglón por mensaje enviado, sólo para el límite de uso por IP
--   (se guarda un hash de la IP, nunca la IP en claro).
--
-- idea_quotes: cada lista que un cliente manda a cotizar. Genera un enlace público de sólo
--   lectura (/cotizacion/<token>) SIN vencimiento; el registro queda como historial (pesa unos
--   KB por fila). Para invalidar un enlace basta con borrar su fila.
--
-- idea_settings: configuración del chat editable desde /admin/ideas/configuracion (proveedor de
--   IA, modelo, límites de uso, y la propia OPENAI_API_KEY). Reemplaza a las variables de
--   entorno IDEAS_* — ya no viven en .env, todo se administra desde aquí y aplica al instante,
--   sin redeploy. Fila por fila (clave/valor); si una clave no existe, el código usa un valor por
--   defecto razonable (ver lib/ideas/settings.ts). La misma llave la usa el generador de diseños
--   en /admin/disenos (lib/disenos/generate.ts) — una sola cuenta de OpenAI para las dos cosas.
--
-- Las cuatro tablas SIN políticas: sólo el service role (supabaseAdmin) lee/escribe.
-- No tocan `orders`: las cotizaciones se siguen levantando a mano desde WhatsApp.
-- =========================================================

create table if not exists public.idea_conversations (
  id uuid primary key default gen_random_uuid(),
  -- Id aleatorio que genera el navegador; agrupa los turnos de una misma conversación.
  session_id text not null unique,
  -- [{ id, role: 'user' | 'assistant', parts: [{ type: 'text' | 'ideas', ... }] }]
  messages jsonb not null default '[]'::jsonb,
  quote_sent boolean not null default false,
  -- Lista de ideas que el cliente mandó a cotizar (snapshot al momento del envío).
  quote_items jsonb,
  quote_sent_at timestamptz,
  -- 'anthropic' | 'mock' | ... (qué proveedor de IA respondió)
  provider text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idea_conversations_updated_at_idx on public.idea_conversations (updated_at desc);

drop trigger if exists set_updated_at on public.idea_conversations;
create trigger set_updated_at
  before update on public.idea_conversations
  for each row execute function public.set_updated_at();

alter table public.idea_conversations enable row level security;

create table if not exists public.idea_chat_log (
  id bigint generated always as identity primary key,
  ip_hash text not null,
  created_at timestamptz not null default now()
);

create index if not exists idea_chat_log_ip_created_idx on public.idea_chat_log (ip_hash, created_at desc);

alter table public.idea_chat_log enable row level security;

create table if not exists public.idea_quotes (
  id uuid primary key default gen_random_uuid(),
  -- Token aleatorio de 128 bits (base64url, 22 caracteres): es lo único que protege el enlace.
  token text not null unique,
  session_id text not null,
  -- Necesidad original del cliente (su primer mensaje).
  need text not null default '',
  -- [{ id, title, description, quantity, note, product?, custom? }] al momento de enviar.
  items jsonb not null,
  created_at timestamptz not null default now()
);

-- Si esta tabla se creó antes con vencimiento, se quita esa columna (los enlaces ya no vencen).
alter table public.idea_quotes drop column if exists expires_at;

create index if not exists idea_quotes_session_idx on public.idea_quotes (session_id, created_at desc);

alter table public.idea_quotes enable row level security;

create table if not exists public.idea_settings (
  key text primary key,
  -- text plano (incluida la llave de OpenAI): esta tabla sin políticas sólo la lee/escribe
  -- supabaseAdmin, el mismo nivel de confianza que ya tienen client_bank_accounts o products.cost.
  value text,
  updated_at timestamptz not null default now()
);

drop trigger if exists set_updated_at on public.idea_settings;
create trigger set_updated_at
  before update on public.idea_settings
  for each row execute function public.set_updated_at();

alter table public.idea_settings enable row level security;

