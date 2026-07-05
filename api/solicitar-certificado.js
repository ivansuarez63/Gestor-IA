export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Metodo no permitido' });
  }

  try {
    const respuesta = await fetch(process.env.ROBOT_URL + '/ejecutar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ROBOT_API_KEY || ''
      },
      body: JSON.stringify(req.body)
    });

    const data = await respuesta.json();
    return res.status(200).json({ ok: true, robot: data });
  } catch (e) {
    return res.status(500).json({ ok: false, error: 'No se pudo conectar con el robot' });
  }
}
