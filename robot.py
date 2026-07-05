from fastapi import FastAPI, Header
from pydantic import BaseModel
import os
import uuid

app = FastAPI()
API_KEY = "123456"

class Solicitud(BaseModel):
    nombre: str
    nif: str
    tipo: str

@app.get("/")
def inicio():
    return {"ok": True, "mensaje": "Robot activo"}

@app.post("/ejecutar")
def ejecutar(solicitud: Solicitud, x_api_key: str = Header(default="")):
    if x_api_key != API_KEY:
        return {"ok": False, "error": "No autorizado"}

    os.makedirs("archivos", exist_ok=True)
    job_id = str(uuid.uuid4())
    archivo = f"archivos/{job_id}.pdf"

    with open(archivo, "wb") as f:
        f.write(b"%PDF-1.4\n%PDF de prueba\n")

    return {
        "ok": True,
        "mensaje": "Certificado generado",
        "archivo": archivo,
        "nombre": solicitud.nombre,
        "nif": solicitud.nif,
        "tipo": solicitud.tipo
    }
