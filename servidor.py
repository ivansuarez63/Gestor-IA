from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import json
import os
import robot  # Tu módulo del robot
from groq import Groq  # La IA inteligente

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Mensaje(BaseModel):
    empresa: str
    mensaje: str

ARCHIVO_TAREAS = "tareas_nuevo.json"

def obtener_tareas():
    try:
        if os.path.exists(ARCHIVO_TAREAS):
            with open(ARCHIVO_TAREAS, "r", encoding="utf-8") as f:
                return json.load(f)
    except:
        pass
    return []

def guardar_todas_las_tareas(tareas):
    with open(ARCHIVO_TAREAS, "w", encoding="utf-8") as f:
        json.dump(tareas, f, indent=4, ensure_ascii=False)

def guardar_tarea(tarea):
    tareas = obtener_tareas()
    tareas.append(tarea)
    guardar_todas_las_tareas(tareas)

@app.post("/chat")
def chat(datos: Mensaje):
    print("====================")
    print("NUEVA PETICION")
    print("Empresa:", datos.empresa)
    print("Mensaje:", datos.mensaje)

    texto = datos.mensaje.lower()
    tareas = obtener_tareas()

    # 1. Comprobar si la empresa ya estaba en medio de un trámite esperando papeles
    tarea_pendiente = None
    for t in tareas:
        if t.get("empresa") == datos.empresa and t.get("estado") == "esperando_identificacion":
            tarea_pendiente = t
            break

    # CASO A: Ya le habíamos pedido los datos y ahora nos los está enviando
    if tarea_pendiente:
        tarea_pendiente["estado"] = "procesando_robot"
        tarea_pendiente["datos_identificacion"] = datos.mensaje
        guardar_todas_las_tareas(tareas)

        respuesta = "¡Datos recibidos correctamente! El robot ya está gestionando tu certificado de deudas de forma automática."
        
        # Activamos tu robot
        try:
            robot.ejecutar_tramite_certificado(datos.mensaje)
        except Exception as e:
            print("Error al ejecutar robot:", e)
            
        return {"respuesta": respuesta}

    # CASO B: El cliente pide el certificado por primera vez
    if (
        "certificado" in texto
        or "deuda" in texto
        or "seguridad social" in texto
    ):
        guardar_tarea({
            "empresa": datos.empresa,
            "tramite": "certificado_deuda_ss",
            "estado": "esperando_identificacion"
        })
        return {"respuesta": "Perfecto. Para continuar necesito que la empresa se identifique con certificado electrónico o apoderamiento."}

    # CASO C: Conversación inteligente por defecto (Usa Groq si no es un trámite)
    try:
        # Extrae la clave que guardamos en las variables de entorno de Vercel
        client = Groq(api_key=os.environ.get("GROQ_API_KEY"))
        
        completion = client.chat.completions.create(
            model="llama3-8b-8192",
            messages=[
                {"role": "system", "content": "Eres un asistente de gestión empresarial inteligente y conciso."},
                {"role": "user", "content": datos.mensaje}
            ]
        )
        respuesta = completion.choices[0].message.content
    except Exception as e:
        print("Error en Groq:", e)
        respuesta = "Hola, ahora mismo tengo problemas para conectar con mi cerebro de IA, pero dime qué trámite necesitas."

    print("Respuesta:", respuesta)
    print("====================")
    return {"respuesta": respuesta}

# Servir la web
app.mount(
    "/",
    StaticFiles(directory="web", html=True),
    name="web"
)