import time
from playwright.sync_api import sync_playwright

def descargar_documento():
    with sync_playwright() as p:
        print("[+] Lanzando Google Chrome local...")
        
        # Iniciamos tu Chrome real instalado en Windows
        browser = p.chromium.launch(
            channel="chrome",  # Esto obliga a usar tu Chrome de toda la vida
            headless=False
        )
        
        context = browser.new_context()
        page = context.new_page()

        print("[+] Abriendo el portal Import@ss de la Seguridad Social...")
        try:
            # Intentamos acceder a la web principal de Import@ss directamente
            page.goto("https://importass.seguridad-social.gob.es/", timeout=60000)
            
            print("[+] ¡Web cargada con éxito!")
            
            # Hacemos clic en el botón para entrar al área personal
            print("[+] Entrando al área personal...")
            page.click("text=Entrar en tu área personal")
            
            # Hacemos clic en acceder con Certificado Digital
            page.click("text=Certificado digital")
            
            # PAUSA: Te damos 20 segundos para que hagas clic en tu certificado y aceptes
            print("[!] ESPERA: Selecciona tu Certificado Digital en la ventana emergente y acepta...")
            time.sleep(20) 

            # Esperamos a que cargue el portal tras identificarte
            page.wait_for_load_state("networkidle")
            
            print("[+] Buscando enlace para descargar la Vida Laboral...")
            # Hacemos clic en el enlace para solicitar el informe
            page.click("text=Vida laboral")
            
            # Esperamos la descarga del PDF
            with page.expect_download() as download_info:
                page.click("text=Descargar vida laboral") 
            
            download = download_info.value
            ruta_guardado = "./vida_laboral.pdf"
            download.save_as(ruta_guardado)
            
            print(f"[🎉] ¡Éxito! Tu vida laboral se ha descargado en: {ruta_guardado}")
            
        except Exception as e:
            print(f"[❌] Ocurrió un error durante la ejecución: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    descargar_documento()