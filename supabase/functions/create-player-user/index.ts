import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Crea la cuenta de autenticación de un jugador recién dado de alta.
 *
 * El frontend no puede crear usuarios de Supabase Auth sin exponer la service_role key,
 * por eso este endpoint Edge Function la usa de forma segura desde el servidor.
 *
 * Body esperado:
 *  - athlete_id: number
 *  - username: string
 *  - temp_password: string
 *  - first_name: string
 *  - last_name: string
 *
 * Crea un usuario en auth.users con un email interno derivado del username, luego
 * vincula athletes.user_id y profiles.athlete_id para que el jugador pueda loguearse.
 * Es idempotente: si el usuario ya existe, lo reutiliza y asegura el vinculo.
 */

interface RequestBody {
  athlete_id: number;
  username: string;
  temp_password: string;
  first_name: string;
  last_name: string;
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const body = (await req.json()) as RequestBody;
    const { athlete_id, username, temp_password, first_name, last_name } = body;

    if (!athlete_id || !username || !temp_password) {
      return jsonResponse({ error: 'Missing required fields' }, 400);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: 'Server configuration error' }, 500);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const email = `${username}@sportlink.local`;

    // Buscar si ya existe un auth user con este email.
    const { data: existingUser, error: findError } = await supabase
      .schema('auth')
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (findError) {
      console.error('find user error:', findError);
      return jsonResponse({ error: 'Error buscando usuario existente' }, 500);
    }

    let userId: string;

    if (existingUser) {
      console.log('Reutilizando auth user existente:', existingUser.id);
      userId = existingUser.id;
    } else {
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password: temp_password,
        email_confirm: true,
        user_metadata: {
          name: `${first_name} ${last_name}`,
        },
      });

      if (authError || !authData.user) {
        console.error('createUser error:', authError);
        return jsonResponse({ error: authError?.message ?? 'Could not create auth user' }, 500);
      }

      userId = authData.user.id;
      console.log('Auth user creado:', userId);
    }

    // Vincular atleta y perfil en paralelo.
    const [athleteResult, profileResult] = await Promise.all([
      supabase.from('athletes').update({ user_id: userId }).eq('id', athlete_id),
      supabase
        .from('profiles')
        .update({ athlete_id })
        .eq('id', userId)
        .then((res) => {
          // Si el trigger handle_new_user no creó el perfil, lo creamos manualmente.
          if (res.error && res.error.message?.includes('0 rows')) {
            return supabase.from('profiles').insert({ id: userId, role: 'jugador', athlete_id });
          }
          return res;
        }),
    ]);

    if (athleteResult.error) {
      console.error('athletes update error:', athleteResult.error);
      return jsonResponse({ error: athleteResult.error.message }, 500);
    }

    if (profileResult.error) {
      console.error('profiles update error:', profileResult.error);
      return jsonResponse({ error: profileResult.error.message }, 500);
    }

    return jsonResponse({ user_id: userId, email });
  } catch (err) {
    console.error('Unhandled error:', err);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
});
