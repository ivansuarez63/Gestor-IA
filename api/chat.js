import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
    {
        auth: {
            persistSession: false,
            autoRefreshToken: false
        }
    }
);

export default async function handler(req, res) {

    if (req.method !== "POST") {
        return res.status(405).json({
            ok: false,
            error: "Método no permitido"
        });
    }

    try {

        /* ==============================
           AUTENTICACIÓN
        ============================== */

        const authorization =
            req.headers.authorization || "";

        if (!authorization.startsWith("Bearer ")) {

            return res.status(401).json({
                ok: false,
                error: "Necesitas iniciar sesión."
            });

        }

        const token =
            authorization.substring(7).trim();

        const {
            data: userData,
            error: userError
        } = await supabase.auth.getUser(token);

        if (userError || !userData?.user) {

            return res.status(401).json({
                ok: false,
                error: "Tu sesión no es válida."
            });

        }

        const usuario = userData.user;

        const mensaje =
            String(req.body?.mensaje || "").trim();

        const expedienteId =
            String(req.body?.expediente_id || "").trim();

        if (!mensaje || !expedienteId) {

            return res.status(400).json({
                ok: false,
                error: "Falta el mensaje o el expediente."
            });

        }

        if (mensaje.length > 4000) {

            return res.status(400).json({
                ok: false,
                error: "El mensaje es demasiado largo."
            });

        }


        /* ==============================
           CLIENTE SUPABASE DEL USUARIO
        ============================== */

        const clienteUsuario = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_ANON_KEY,
            {
                global: {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                },
                auth: {
                    persistSession: false,
                    autoRefreshToken: false
                }
            }
        );


        /* ==============================
           EXPEDIENTE
        ============================== */

        const {
            data: expediente,
            error: expedienteError
        } = await clienteUsuario
            .from("expedientes")
            .select("*")
            .eq("id", expedienteId)
            .single();

        if (
            expedienteError ||
            !expediente
        ) {

            return res.status(403).json({
                ok: false,
                error: "No tienes acceso a este expediente."
            });

        }


        /* ==============================
           PARTICIPANTE
        ============================== */

        const {
            data: participantes
        } = await clienteUsuario
            .from("participantes")
            .select(
                "nombre,dni_nie,telefono,email,rol,estado"
            )
            .eq("expediente_id", expedienteId);


        /* ==============================
           HISTORIAL
        ============================== */

        const {
            data: historial
        } = await clienteUsuario
            .from("mensajes")
            .select("autor,contenido,created_at")
            .eq("expediente_id", expedienteId)
            .order("created_at", {
                ascending: true
            })
            .limit(30);


        /* ==============================
           GUARDAR MENSAJE USUARIO
        ============================== */

        await clienteUsuario
            .from("mensajes")
            .insert({
                expediente_id: expedienteId,
                usuario_id: usuario.id,
                autor: "usuario",
                contenido: mensaje
            });


        /* ==============================
           CONTEXTO
        ============================== */

        const contextoParticipantes =
            JSON.stringify(
                participantes || [],
                null,
                2
            );

        const mensajesIA = [

            {
                role: "system",
                content: `
Eres Gestor-IA.

Trabajas exclusivamente dentro de un expediente de cambio de titularidad de vehículo en España.

MATRÍCULA:
${expediente.matricula}

ESTADO DEL EXPEDIENTE:
${expediente.estado}

PARTICIPANTES:
${contextoParticipantes}

TU OBJETIVO ES LLEVAR EL EXPEDIENTE PASO A PASO.

Debes ayudar a recopilar:

- Datos del comprador.
- Datos del vendedor.
- Datos del vehículo.
- Precio de compraventa.
- Fecha de compraventa.
- Documentación necesaria.
- Datos necesarios para generar el contrato.
- Comunidad autónoma competente.
- Información necesaria para determinar impuestos.
- Información necesaria para preparar el cambio de titularidad.

REGLAS MUY IMPORTANTES

1. Solo trabajas con este expediente.

2. No respondas preguntas generales que no estén relacionadas con este traspaso.

3. Nunca pidas contraseñas de Cl@ve.

4. Nunca pidas claves bancarias.

5. Nunca pidas certificados digitales privados.

6. No afirmes que has presentado el modelo 620 si el backend no confirma que se ha presentado.

7. No afirmes que un impuesto está pagado si el backend no lo confirma.

8. No afirmes que el vehículo ya está transferido si el backend no lo confirma.

9. Puedes preparar la información necesaria para un contrato de compraventa.

10. Puedes detectar qué datos faltan para poder generar ese contrato.

11. Cuando dispongamos del motor fiscal del backend, utilizarás sus resultados para mostrar el ITP.

12. Hasta que exista ese cálculo oficial del backend, NO inventes porcentajes ni importes fiscales.

13. El modelo puede variar dependiendo de la comunidad autónoma y del supuesto. No lo inventes.

14. La IA conversa y organiza. Las acciones reales las ejecuta el backend.

15. Haz una pregunta cada vez cuando necesites información del cliente.

16. Sé breve y claro.

17. Responde siempre en español.

Cuando acabas de recibir los datos iniciales del primer participante, empieza solicitando la información de la compraventa que todavía falte.
`
            }

        ];


        for (const item of historial || []) {

            mensajesIA.push({
                role:
                    item.autor === "ia"
                        ? "assistant"
                        : "user",

                content:
                    item.contenido
            });

        }


        mensajesIA.push({
            role: "user",
            content: mensaje
        });


        /* ==============================
           GROQ
        ============================== */

        const apiKey =
            process.env.GROQ_API_KEY;

        if (!apiKey) {

            return res.status(500).json({
                ok: false,
                error: "La IA no está configurada."
            });

        }


        const respuesta =
            await fetch(
                "https://api.groq.com/openai/v1/chat/completions",
                {

                    method: "POST",

                    headers: {

                        "Authorization":
                            `Bearer ${apiKey}`,

                        "Content-Type":
                            "application/json"

                    },

                    body: JSON.stringify({

                        model:
                            "llama-3.1-8b-instant",

                        temperature: 0.2,

                        max_tokens: 700,

                        messages:
                            mensajesIA

                    })

                }
            );


        const datos =
            await respuesta.json();


        if (!respuesta.ok) {

            console.error(datos);

            return res.status(500).json({
                ok: false,
                error: "No se pudo conectar con la IA."
            });

        }


        const textoIA =
            datos?.choices?.[0]?.message?.content;


        if (!textoIA) {

            return res.status(500).json({
                ok: false,
                error: "La IA no devolvió respuesta."
            });

        }


        /* ==============================
           GUARDAR RESPUESTA IA
        ============================== */

        await clienteUsuario
            .from("mensajes")
            .insert({
                expediente_id: expedienteId,
                usuario_id: usuario.id,
                autor: "ia",
                contenido: textoIA
            });


        return res.status(200).json({

            ok: true,

            respuesta: textoIA,

            expediente: {
                id: expediente.id,
                matricula: expediente.matricula,
                estado: expediente.estado
            }

        });


    } catch (error) {

        console.error(error);

        return res.status(500).json({
            ok: false,
            error: "Error interno del servidor."
        });

    }

}