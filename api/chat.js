export default async function handler(req, res) {
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
            content: "Eres Gestor-IA, asistente profesional para empresas. Ayudas con trámites, Seguridad Social, documentos y automatización. Responde siempre en español."
          },
          {
            role: "user",
            content: req.body.mensaje
          }
        ]
      })
    });
    const data = await r.json();
    res.status(200).json({ respuesta: data.choices[0].message.content });
  } catch (e) {
    console.log(e);
    res.status(500).json({ respuesta: "Error conectando con la IA" });
  }
}