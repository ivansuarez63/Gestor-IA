const fetch = require("node-fetch");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content: "Eres Gestor-IA, un asistente inteligente para automatizar trámites ante la Seguridad Social (Certificados de deuda y Registros de Apoderamiento).\n\n" +
                     "REGLAS DE CONVERSACIÓN:\n" +
                     "1. Si el usuario te dice algo como 'necesito el certificado de deuda de la seguridad social', debes responder EXACTAMENTE con esta frase: 'Perfecto necesitaré algunos datos como nombre de la empresa y certificado de apododeramiento para poder identificarme    '. No añadas nada más en ese mensaje inicial.\n" +
                     "2. Si el usuario ya te está proporcionando los datos o responde a tu pregunta con el Nombre de la empresa (o del cliente) y el NIF, y tienes claro el trámite (certificado, apoderamiento o ambos), responde ÚNICAMENTE con una línea en formato JSON, sin textos extras, saludos ni marcas de bloque:\n" +
                     "{\"accion\": \"EJECUTAR\", \"tipo\": \"certificado\", \"nombre\": \"Nombre de la empresa o cliente\", \"nif\": \"NIF del cliente\"}\n\n" +
                     "Valores de 'tipo' permitidos: 'certificado', 'apoderamiento' o 'ambos' (usa 'ambos' si te piden las dos cosas). Si aún falta el NIF o el nombre de la empresa, sigue pidiéndolos amablemente en texto normal."
          },
          {
            role: "user",
            content: req.body.mensaje
          }
        ]
      })
    });

    const data = await r.json();

    if (!r.ok) {
      return res.status(r.status).json({ respuesta: "Error de Groq: " + (data.error?.message || "Fallo") });
    }

    return res.status(200).json({
      respuesta: data.choices[0].message.content
    });

  } catch (e) {
    return res.status(500).json({ respuesta: "Error interno del servidor" });
  }
};