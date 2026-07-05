from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import json
import os


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



def guardar_tarea(tarea):

    try:

        if os.path.exists(ARCHIVO_TAREAS):

            with open(
                ARCHIVO_TAREAS,
                "r",
                encoding="utf-8"
            ) as f:

                tareas = json.load(f)

        else:

            tareas = []


    except:

        tareas = []


    tareas.append(tarea)


    with open(
        ARCHIVO_TAREAS,
        "w",
        encoding="utf-8"
    ) as f:

        json.dump(
            tareas,
            f,
            indent=4,
            ensure_ascii=False
        )




@app.post("/chat")
def chat(datos: Mensaje):


    print("====================")
    print("NUEVA PETICION")
    print("Empresa:", datos.empresa)
    print("Mensaje:", datos.mensaje)



    texto = datos.mensaje.lower()



    if (
        "certificado" in texto
        or "deuda" in texto
        or "seguridad social" in texto
    ):


        guardar_tarea(
            {
                "empresa": datos.empresa,
                "tramite": "certificado_deuda_ss",
                "estado": "esperando_identificacion"
            }
        )


        respuesta = (
            "Perfecto. Para continuar necesito "
            "que la empresa se identifique con "
            "certificado electrónico o apoderamiento."
        )


    else:


        respuesta = (
            "Dime qué trámite necesitas."
        )



    print("Respuesta:", respuesta)
    print("====================")



    return {
        "respuesta": respuesta
    }





# Página web
app.mount(
    "/",
    StaticFiles(
        directory="web",
        html=True
    ),
    name="web"
)