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

    let { nombre, email, password } = req.body || {};

    nombre = String(nombre || '').trim();
    email = String(email || '').trim().toLowerCase();
    password = String(password || '');

    if (!nombre || !email || !password) {
      return res.status(400).json({
        ok: false,
        error: 'Completa todos los campos.'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        ok: false,
        error: 'La contraseña debe tener al menos 8 caracteres.'
      });
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,

      options: {
        data: {
          nombre
        }
      }
    });

    if (error) {

      console.error('Error Supabase registro:', error.message);

      return res.status(400).json({
        ok: false,
        error: 'No se pudo crear la cuenta. Comprueba los datos o utiliza otro correo.'
      });

    }

    /*
      Con confirmación de correo activada,
      normalmente data.session será null
      hasta que el usuario verifique su email.
    */

    return res.status(200).json({
      ok: true,
      necesitaVerificacion: !data.session,
      mensaje:
        'Cuenta creada. Revisa tu correo para verificarla.'
    });

  } catch (error) {

    console.error('Error registro:', error);

    return res.status(500).json({
      ok: false,
      error: 'Error interno del servidor.'
    });

  }
}