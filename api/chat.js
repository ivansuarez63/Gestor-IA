module.exports = async (req, res) => import { createClient } from "@supabase/supabase-js";

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

  /* ==========================================
     SOLO POST
  ========================================== */

  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "Método no permitido"
    });
  }


  try {

    /* ==========================================
       1. COMPROBAR TOKEN
    ========================================== */

    const authorization =
      req.headers.authorization || "";

    if (!authorization.startsWith("Bearer ")) {

      return res.status(401).json({
        ok: false,
        error: "Necesitas iniciar sesión."
      });

    }

    const token =
      authorization.substring(7).trim();

    if (!token) {

      return res.status(401).json({
        ok: false,
        error: "Sesión no válida."
      });

    }


    /* ==========================================
       2. VALIDAR USUARIO CON SUPABASE
    ========================================== */

    const {
      data: userData,
      error: userError
    } = await supabase.auth.getUser(token);


    if (
      userError ||
      !userData ||
      !userData.user
    ) {

      console.error(
        "Token inválido:",
        userError?.message
      );

      return res.status(401).json({
        ok: false,
        error:
          "Tu sesión ha caducado o no es válida."
      });

    }


    const usuario =
      userData.user;


    /* ==========================================
       3. COMPROBAR EMAIL VERIFICADO
    ========================================== */

    if (!usuario.email_confirmed_at) {

      return res.status(403).json({
        ok: false,
        error:
          "Debes verificar tu correo antes de utilizar Gestor-IA."
      });

    }


    /* ==========================================
       4. VALIDAR MENSAJE
    ========================================== */

    const mensaje =
      String(req.body?.mensaje || "")
        .trim();


    if (!mensaje) {

      return res.status(400).json({
        ok: false,
        error:
          "Escribe un mensaje."
      });

    }


    /*
      Evitamos mensajes enormes que puedan
      consumir API innecesariamente.
    */

    if (mensaje.length > 4000) {

      return res.status(400).json({
        ok: false,
        error:
          "El mensaje es demasiado largo."
      });

    }


    /* ==========================================
       5. COMPROBAR GROQ
    ========================================== */

    const apiKey =
      process.env.GROQ_API_KEY;


    if (!apiKey) {

      console.error(
        "Falta GROQ_API_KEY"
      );

      return res.status(500).json({
        ok: false,
        error:
          "La IA no está configurada correctamente."
      });

    }


    /* ==========================================
       6. LLAMAR A LA IA
    ========================================== */

    const respuesta =
      await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {

          method: "POST",

          headers: {

            "Authorization":
              `Bearer ${apiKey}`,

            "Content-Type":
              "application/json"

          },

          body: JSON.stringify({

            model:
              "llama-3.1-8b-instant",

            temperature: 0.2,

            max_tokens: 800,

            messages: [

              {

                role: "system",

                content: `
Eres Gestor-IA, un asistente especializado exclusivamente en trámites relacionados con vehículos en España.

OBJETIVO

Ayudar al usuario durante procesos relacionados con:

- Cambio de titularidad de vehículos.
- Compraventa de vehículos usados.
- Documentación necesaria.
- Contratos de compraventa.
- DGT.
- Impuestos relacionados con transmisiones de vehículos.
- Modelo 620 cuando corresponda.
- Representación y autorizaciones.
- Estado de expedientes de Gestor-IA.
- Explicación del proceso de un traspaso.

REGLAS DE SEGURIDAD

1. No ejecutes trámites reales.

2. No afirmes que has presentado un documento ante la DGT, Hacienda o cualquier Administración.

3. No realices pagos.

4. No inventes que una autorización existe.

5. No solicites contraseñas de Cl@ve.

6. No solicites certificados digitales privados.

7. No solicites claves bancarias.

8. No solicites contraseñas personales.

9. Nunca generes órdenes para ejecutar robots automáticamente.

10. Nunca devuelvas comandos destinados a ejecutar código, scripts o automatizaciones internas.

11. Si una acción requiere autorización oficial del usuario, explica que deberá completarse mediante el procedimiento oficial correspondiente.

12. Si no tienes datos suficientes para calcular un impuesto, pide los datos necesarios en lugar de inventar una cantidad.

13. Si una regla fiscal depende de la comunidad autónoma, pregunta o utiliza la ubicación que haya proporcionado el usuario.

14. No inventes tipos impositivos, tasas oficiales ni requisitos legales.

15. Si el usuario pregunta algo que no tenga relación con vehículos o el funcionamiento de Gestor-IA, indícale amablemente que este asistente está especializado en trámites de vehículos.

ESTILO

- Responde siempre en español.
- Sé claro.
- Utiliza lenguaje sencillo.
- Haz preguntas concretas.
- Evita respuestas excesivamente largas.
- Guía al usuario paso a paso cuando sea necesario.

IMPORTANTE

Tú eres únicamente la capa conversacional.

Las acciones reales de Gestor-IA deberán ser autorizadas y ejecutadas por el backend mediante funciones controladas.

Nunca debes decidir por tu cuenta ejecutar una acción real.
`
              },

              {

                role: "user",

                content: mensaje

              }

            ]

          })

        }
      );


    /* ==========================================
       7. LEER RESPUESTA
    ========================================== */

    const datos =
      await respuesta.json();


    if (!respuesta.ok) {

      console.error(
        "Error Groq:",
        datos
      );

      return res.status(500).json({
        ok: false,
        error:
          "No se pudo conectar con la IA."
      });

    }


    if (
      !datos.choices ||
      !datos.choices.length ||
      !datos.choices[0]?.message?.content
    ) {

      return res.status(500).json({
        ok: false,
        error:
          "La IA no devolvió ninguna respuesta."
      });

    }


    /* ==========================================
       8. DEVOLVER RESPUESTA
    ========================================== */

    return res.status(200).json({

      ok: true,

      respuesta:
        datos.choices[0]
          .message
          .content,

      usuario: {
        id: usuario.id,
        email: usuario.email
      }

    });


  } catch (error) {

    console.error(
      "Error chat:",
      error
    );


    return res.status(500).json({

      ok: false,

      error:
        "Error interno del servidor."

    });

  }

}