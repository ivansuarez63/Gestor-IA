import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }
);

export default async function handler(req, res) {

  if (req.method !== 'POST') {

    return res.status(405).json({
      ok: false,
      error: 'Método no permitido'
    });

  }

  try {

    let { email, codigo } = req.body || {};

    email = String(email || '')
      .trim()
      .toLowerCase();

    codigo = String(codigo || '')
      .trim();

    if (!email || !codigo) {

      return res.status(400).json({
        ok: false,
        error:
          'Introduce el correo y el código.'
      });

    }

    const { data, error } =
      await supabase.auth.verifyOtp({

        email,

        token: codigo,

        type: 'email'

      });

    if (error) {

      return res.status(400).json({
        ok: false,
        error:
          'El código no es válido o ha caducado.'
      });

    }

    return res.status(200).json({

      ok: true,

      mensaje:
        'Correo verificado correctamente.',

      access_token:
        data.session?.access_token || null

    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      ok: false,
      error: 'Error interno.'
    });

  }
}