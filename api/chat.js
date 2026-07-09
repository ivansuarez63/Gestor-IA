module.exports = async (req, res) => {

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Método no permitido"
    });
  }

  try {

    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        respuesta: "Error: No se ha configurado GROQ_API_KEY en Vercel."
      });
    }

    const respuesta = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({

          model: "llama-3.1-8b-instant",

          temperature: 0.2,

          messages: [

            {
              role: "system",
              content: `
Eres Gestor-IA.

Eres un asistente especializado en:

- Seguridad Social
- Hacienda
- Empresas
- Certificados digitales
- Automatización
- Programación
- Gestión administrativa

REGLAS IMPORTANTES

1. Si el usuario pide un certificado de deuda responde EXACTAMENTE:

Perfecto necesitaré algunos datos como nombre de la empresa y NIF para solicitar el certificado de deuda de la Seguridad Social.

2. Cuando el usuario facilite el nombre de la empresa y el NIF responde ÚNICAMENTE con este JSON:

{
  "accion":"certificado_deuda",
  "empresa":"NOMBRE_EMPRESA",
  "nif":"B12345678"
}

No escribas absolutamente nada más.

3. Si solicita un Registro de Apoderamiento responde preguntando los datos necesarios.

4. Si no es un trámite administrativo responde normalmente.

Responde siempre en español.
`
            },

            {
              role: "user",
              content: req.body.mensaje || ""
            }

          ]

        })

      }
    );

    const datos = await respuesta.json();

    if (!respuesta.ok) {
      console.error(datos);

      return res.status(500).json({
        respuesta: "Error al conectar con Groq."
      });
    }

    if (
      !datos.choices ||
      !datos.choices.length ||
      !datos.choices[0].message
    ) {

      return res.status(500).json({
        respuesta: "Groq no devolvió ninguna respuesta."
      });

    }

    return res.status(200).json({

      respuesta: datos.choices[0].message.content

    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      respuesta: "Error interno del servidor."
    });

  }

};