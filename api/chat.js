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
                     "1. Si el usuario te dice algo como 'necesito el certificado de deuda de la seguridad social', debes responder EXACTAMENTE con esta frase: 'Perfecto necesitaré algunos datos como nombre de la empresa y certificado de deuda de la seguridad social'. No añadas nada más en ese mensaje inicial.\n" +
                     "2. Si el usuario ya te está proporcionando los datos o responde a tu pregunta con el Nombre de la empresa (o del cliente) y el NIF, y tienes claro el trámite (certificado, apoderamiento o ambos), debes responder ÚNICAMENTE con una línea en formato JSON, sin textos extras, saludos ni marcas de bloque (como 
http://googleusercontent.com/immersive_entry_chip/0