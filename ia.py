import os
import json
from http.server import BaseHTTPRequestHandler
from groq import Groq

def actualizar_identificacion(empresa, tipo_identificacion):
    archivo = f"clientes/{empresa}/estado.json"
    
    # Nos aseguramos de que exista la carpeta por si acaso
    os.makedirs(os.path.dirname(archivo), exist_ok=True)
    
    if os.path.exists(archivo):
        with open(archivo, "r", encoding="utf-8") as f:
            estado = json.load(f)
    else:
        estado = {}

    estado["identificado"] = True
    estado["tipo_identificacion"] = tipo_identificacion

    with open(archivo, "w", encoding="utf-8") as f:
        json.dump(estado, f, indent=4, ensure_ascii=False)
        
    print("Cliente validado por IA")
    return {"status": "exito", "mensaje": f"Identificación actualizada a {tipo_identificacion}"}

# Definición de herramientas para Groq
herramientas = [
    {
        "type": "function",
        "function": {
            "name": "actualizar_identificacion",
            "description": "Utiliza esta función cuando el cliente proporcione o confirme su tipo de identificación (por ejemplo: certificado electrónico, DNI, Clave permanente) para validar su estado.",
            "parameters": {
                "type": "object",
                "properties": {
                    "empresa": {"type": "string", "description": "El nombre o identificador de la empresa del cliente."},
                    "tipo_identificacion": {"type": "string", "description": "El tipo de documento o método de acceso (ej. certificado_electronico)."}
                },
                "required": ["empresa", "tipo_identificacion"]
            }
        }
    }
]

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        # 1. Leer los datos enviados por el HTML
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        data = json.loads(post_data.decode('utf-8'))
        
        texto_usuario = data.get("mensaje", data.get("texto", ""))
        
        # 2. Conectar con Groq
        client = Groq(api_key=os.environ.get("GROQ_API_KEY"))
        messages = [
            {"role": "system", "content": "Eres un gestor administrativo virtual. Si el usuario te indica su empresa y su método de identificación (como certificado electrónico), utiliza la herramienta asignada para validarlo en el sistema de inmediato."},
            {"role": "user", "content": texto_usuario}
        ]
        
        respuesta_final = "No he podido procesar la solicitud."
        
        try:
            response = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=messages,
                tools=herramientas,
                tool_choice="auto"
            )
            
            response_message = response.choices[0].message
            tool_calls = response_message.tool_calls
            
            if tool_calls:
                messages.append(response_message)
                for tool_call in tool_calls:
                    if tool_call.function.name == "actualizar_identificacion":
                        args = json.loads(tool_call.function.arguments)
                        # Ejecutamos tu función local dentro del servidor de Vercel
                        resultado_funcion = actualizar_identificacion(
                            args.get("empresa"), 
                            args.get("tipo_identificacion")
                        )
                        messages.append({
                            "tool_call_id": tool_call.id,
                            "role": "tool",
                            "name": "actualizar_identificacion",
                            "content": json.dumps(resultado_funcion)
                        })
                
                # Pedimos a la IA que redacte la respuesta final con el resultado de la función
                segunda_respuesta = client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=messages
                )
                respuesta_final = segunda_respuesta.choices[0].message.content
            else:
                respuesta_final = response_message.content
                
        except Exception as e:
            respuesta_final = f"Error en el asistente de IA: {str(e)}"

        # 3. Enviar la respuesta de vuelta a tu página web
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        # Habilitar CORS para que tu frontend no se bloquee
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        
        response_body = json.dumps({"respuesta": respuesta_final})
        self.wfile.write(response_body.encode('utf-8'))
        return

    def do_OPTIONS(self):
        # Manejo de peticiones preflight de CORS
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
)