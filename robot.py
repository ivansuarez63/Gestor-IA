
from playwright.sync_api import sync_playwright
import json
import time
import os


# ==========================
# CARGAR TAREA
# ==========================

def cargar_tarea():

    with open("tareas.json", "r", encoding="utf-8") as f:
        tareas = json.load(f)

    for tarea in tareas:
        if tarea["estado"] == "esperando_identificacion":
            return tarea

    return None


# ==========================
# COMPROBAR IDENTIFICACION
# ==========================

def esperar_identificacion():

    print("Esperando certificado o apoderamiento del cliente...")

    while True:

        with open("clientes/empresa_demo/estado.json",
                  "r",
                  encoding="utf-8") as f:

            estado = json.load(f)

        if estado["identificado"] == True:
            print("Cliente identificado")
            break

        time.sleep(3)


# ==========================
# ROBOT SEGURIDAD SOCIAL
# ==========================

def robot_seguridad_social():

    tarea = cargar_tarea()

    if not tarea:
        print("No hay tareas pendientes")
        return


    print("==============================")
    print("Empresa:", tarea["empresa"])
    print("Tramite:", tarea["tramite"])
    print("==============================")


    # AQUÍ ESPERA AL CLIENTE
    esperar_identificacion()


    enlace = (
    "https://sede.seg-social.gob.es"
    "/wps/portal/sede/Seguridad/"
    "PortalRedirectorN1A?"
    "idApp=2265&"
    "idContenido=bb597b14-1e58-46b2-b045-673d9b44248e&"
    "idPagina=com.ss.sede.EmpresasYProfesionales&N1&A"
    )


    print("Abriendo tramite directo...")


    with sync_playwright() as p:

        navegador = p.chromium.launch(
            headless=False
        )

        pagina = navegador.new_page()


        pagina.goto(enlace)


        print("Tramite abierto")
        print("Esperando completar...")


        pagina.wait_for_timeout(60000)



# ==========================

if __name__ == "__main__":

    robot_seguridad_social()