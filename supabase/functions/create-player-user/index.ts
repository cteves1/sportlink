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

    const userId = authData.user.id;

    // Vincula el atleta con el nuevo usuario de auth.
    const { error: athleteError } = await supabase
      .from('athletes')
      .update({ user_id: userId })
      .eq('id', athlete_id);

    if (athleteError) {
      console.error('athletes update error:', athleteError);
      return jsonResponse({ error: athleteError.message }, 500);
    }

    // El trigger handle_new_user ya creó el perfil con role 'jugador'.
    // Solo falta vincularlo al atleta.
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ athlete_id })
      .eq('id', userId);

    if (profileError) {
      console.error('profiles update error:', profileError);
      return jsonResponse({ error: profileError.message }, 500);
    }

    return jsonResponse({ user_id: userId, email });
  } catch (err) {
    console.error('Unhandled error:', err);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
});
