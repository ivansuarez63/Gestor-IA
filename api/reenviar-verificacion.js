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

    let { email } = req.body || {};

    email = String(email || '')
      .trim()
      .toLowerCase();

    if (!email) {

      return res.status(400).json({
        ok: false,
        error: 'Introduce tu correo.'
      });

    }

    const { error } =
      await supabase.auth.resend({
        type: 'signup',
        email
      });

    if (error) {

      console.error(
        'Error reenviando:',
        error.message
      );

      return res.status(400).json({
        ok: false,
        error:
          'No se pudo reenviar el correo de verificación.'
      });

    }

    return res.status(200).json({
      ok: true,
      mensaje:
        'Correo de verificación reenviado.'
    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      ok: false,
      error: 'Error interno.'
    });

  }
}