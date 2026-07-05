const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/api/solicitar-certificado', async (req, res) => {
  try {
    const respuesta = await fetch('[127.0.0.1](http://127.0.0.1:8000/ejecutar)', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });

    const data = await respuesta.json();

    res.json({
      ok: true,
      robot: data
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: 'No se pudo conectar con el robot'
    });
  }
});

app.listen(3000, () => {
  console.log('Web funcionando en [localhost](http://localhost:3000)');
});
