import { createClient } from "@supabase/supabase-js";

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

  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "Método no permitido"
    });
  }

  try {

    const authorization = req.headers.authorization || "";

    if (!authorization.startsWith("Bearer ")) {
      return res.status(401).json({
        ok: false,
        error: "Necesitas iniciar sesión."
      });
    }

    const token = authorization.substring(7).trim();

    const {
      data: userData,
      error: userError
    } = await supabase.auth.getUser(token);

    if (userError || !userData?.user) {
      return res.status(401).json({
        ok: false,
        error: "Sesión no válida."
      });
    }

    const usuario = userData.user;

    let matricula = String(req.body?.matricula || "")
      .trim()
      .toUpperCase();

    if (!matricula) {
      return res.status(400).json({
        ok: false,
        error: "Introduce la matrícula."
      });
    }

    const supabaseUsuario = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      }
    );

    const {
      data,
      error
    } = await supabaseUsuario
      .from("expedientes")
      .insert({
        creador_id: usuario.id,
        matricula: matricula,
        estado: "CREADO"
      })
      .select()
      .single();

    if (error) {
      console.error(error);

      return res.status(500).json({
        ok: false,
        error: "No se pudo crear el expediente."
      });
    }

    return res.status(200).json({
      ok: true,
      expediente: data
    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      ok: false,
      error: "Error interno del servidor."
    });

  }

}