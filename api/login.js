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

    let { email, password } = req.body || {};

    email = String(email || '').trim().toLowerCase();
    password = String(password || '');

    if (!email || !password) {
      return res.status(400).json({
        ok: false,
        error: 'Introduce correo y contraseña.'
      });
    }

    const { data, error } =
      await supabase.auth.signInWithPassword({
        email,
        password
      });

    if (error || !data.session) {

      return res.status(401).json({
        ok: false,
        error:
          'Correo o contraseña incorrectos, o la cuenta todavía no ha sido verificada.'
      });

    }

    const usuario = data.user;

    return res.status(200).json({

      ok: true,

      usuario:
        usuario.user_metadata?.nombre ||
        usuario.email,

      email: usuario.email,

      access_token:
        data.session.access_token,

      refresh_token:
        data.session.refresh_token,

      expires_at:
        data.session.expires_at

    });

  } catch (error) {

    console.error('Error login:', error);

    return res.status(500).json({
      ok: false,
      error: 'Error interno del servidor.'
    });

  }
}