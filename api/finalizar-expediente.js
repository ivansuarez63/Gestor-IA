import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

/* =========================================
   SUPABASE
========================================= */

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


/* =========================================
   RESEND
========================================= */

const resend = new Resend(
    process.env.RESEND_API_KEY
);


/* =========================================
   API
========================================= */

export default async function handler(req, res) {

    if (req.method !== "POST") {

        return res.status(405).json({
            ok: false,
            error: "Método no permitido"
        });
    }

    try {

        /* =================================
           COMPROBAR SESIÓN
        ================================= */

        const authorization =
            req.headers.authorization || "";

        if (!authorization.startsWith("Bearer ")) {

            return res.status(401).json({
                ok: false,
                error: "No autorizado"
            });
        }

        const token =
            authorization
                .substring(7)
                .trim();


        const {
            data: userData,
            error: userError
        } = await supabase.auth.getUser(token);


        if (
            userError ||
            !userData?.user
        ) {

            return res.status(401).json({
                ok: false,
                error: "Sesión no válida"
            });
        }


        /* =================================
           DATOS RECIBIDOS
        ================================= */

        const expedienteId =
            String(
                req.body?.expediente_id || ""
            ).trim();


        const confirmacionOficial =
            req.body?.confirmacion_oficial === true;


        if (!expedienteId) {

            return res.status(400).json({
                ok: false,
                error: "Falta el expediente"
            });
        }


        /*
        IMPORTANTE:

        Gestor-IA NO puede considerar terminado
        un traspaso simplemente porque haya sido
        presentado.

        Este endpoint exige confirmación antes
        de cambiar el expediente a FINALIZADO.
        */

        if (!confirmacionOficial) {

            return res.status(400).json({
                ok: false,
                error:
                    "No existe confirmación oficial del cambio de titularidad."
            });
        }


        /* =================================
           SUPABASE DEL USUARIO
        ================================= */

        const db = createClient(

            process.env.SUPABASE_URL,
            process.env.SUPABASE_ANON_KEY,

            {

                global: {

                    headers: {

                        Authorization:
                            `Bearer ${token}`

                    }

                },

                auth: {

                    persistSession: false,
                    autoRefreshToken: false

                }

            }

        );


        /* =================================
           BUSCAR EXPEDIENTE
        ================================= */

        const {
            data: expediente,
            error: expedienteError
        } = await db
            .from("expedientes")
            .select("*")
            .eq("id", expedienteId)
            .single();


        if (
            expedienteError ||
            !expediente
        ) {

            console.error(
                "Error expediente:",
                expedienteError
            );

            return res.status(404).json({
                ok: false,
                error: "Expediente no encontrado"
            });
        }


        /* =================================
           BUSCAR PARTICIPANTES
        ================================= */

        const {
            data: participantes,
            error: participantesError
        } = await db
            .from("participantes")
            .select(
                "nombre,email,rol"
            )
            .eq(
                "expediente_id",
                expedienteId
            );


        if (participantesError) {

            console.error(
                "Error participantes:",
                participantesError
            );

            return res.status(500).json({
                ok: false,
                error:
                    "No se pudieron obtener los participantes"
            });
        }


        /* =================================
           FINALIZAR EXPEDIENTE
        ================================= */

        const fechaFinalizacion =
            new Date().toISOString();


        const {
            error: actualizarError
        } = await db
            .from("expedientes")
            .update({

                estado:
                    "FINALIZADO",

                updated_at:
                    fechaFinalizacion

            })
            .eq(
                "id",
                expedienteId
            );


        if (actualizarError) {

            console.error(
                "Error actualizando expediente:",
                actualizarError
            );

            return res.status(500).json({
                ok: false,
                error:
                    "No se pudo finalizar el expediente"
            });
        }


        /* =================================
           ENVIAR CORREOS
        ================================= */

        const resultadosCorreo = [];


        for (
            const participante
            of participantes || []
        ) {

            if (!participante.email) {

                continue;
            }


            try {

                const {
                    data: emailData,
                    error: emailError
                } = await resend.emails.send({

                    from:
                        "Gestor-IA <no-reply@gestor-ia.eu>",

                    to:
                        participante.email,

                    subject:
                        `✅ Traspaso completado con éxito · ${expediente.matricula}`,

                    html: `

<!DOCTYPE html>

<html lang="es">

<head>

<meta charset="UTF-8">

<meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
>

</head>


<body style="
margin:0;
padding:0;
background:#0b1220;
font-family:Arial,Helvetica,sans-serif;
">


<div style="
padding:35px 15px;
">


<div style="
max-width:600px;
margin:0 auto;
background:#111827;
padding:35px;
border-radius:18px;
color:#ffffff;
">


<!-- LOGO -->

<div style="
font-size:30px;
font-weight:bold;
color:#38bdf8;
margin-bottom:30px;
">

Gestor-IA

</div>


<!-- TÍTULO -->

<h1 style="
font-size:26px;
margin:0 0 25px 0;
color:#ffffff;
">

✅ Cambio de titularidad completado

</h1>


<!-- SALUDO -->

<p style="
color:#cbd5e1;
font-size:16px;
line-height:1.7;
">

Hola ${participante.nombre || ""},

</p>


<p style="
color:#cbd5e1;
font-size:16px;
line-height:1.7;
">

Desde Gestor-IA nos complace informarle de que
el cambio de titularidad de su vehículo ha sido
completado con éxito.

</p>


<!-- DATOS -->

<div style="
background:#0b1220;
padding:20px;
border-radius:12px;
margin:25px 0;
">


<p style="
margin:5px 0 15px 0;
color:#cbd5e1;
">

<strong style="
color:#ffffff;
">
Matrícula:
</strong>

${expediente.matricula}

</p>


<p style="
margin:5px 0;
color:#cbd5e1;
">

<strong style="
color:#ffffff;
">
Estado:
</strong>

<span style="
color:#38bdf8;
font-weight:bold;
">

✅ Traspaso completado

</span>

</p>


</div>


<!-- MENSAJE -->

<h2 style="
color:#38bdf8;
font-size:21px;
margin-top:30px;
">

¡Su vehículo ha sido traspasado con éxito!

</h2>


<p style="
color:#cbd5e1;
font-size:16px;
line-height:1.7;
">

Gracias por confiar en nosotros para gestionar
su traspaso.

</p>


<p style="
color:#cbd5e1;
font-size:16px;
line-height:1.7;
">

Esperamos haberle facilitado todo el proceso
y estaremos encantados de volver a ayudarle
cuando lo necesite.

</p>


<p style="
color:#ffffff;
font-size:16px;
line-height:1.7;
font-weight:bold;
margin-top:25px;
">

Gracias por confiar en Gestor-IA.

<br>

Le esperamos de vuelta.

</p>


<!-- BOTÓN -->

<div style="
margin-top:30px;
">

<a
href="https://gestor-ia.eu"
style="
display:inline-block;
background:#38bdf8;
color:#071018;
padding:14px 22px;
border-radius:10px;
text-decoration:none;
font-weight:bold;
font-size:15px;
"
>

Consultar mi expediente

</a>

</div>


<!-- PIE -->

<div style="
margin-top:35px;
padding-top:20px;
border-top:1px solid #1e293b;
">


<p style="
margin:0;
color:#64748b;
font-size:12px;
line-height:1.6;
">

Este correo ha sido enviado automáticamente
por Gestor-IA.

</p>


<p style="
margin-top:8px;
color:#64748b;
font-size:12px;
">

gestor-ia.eu

</p>


</div>


</div>


</div>


</body>

</html>

                    `

                });


                if (emailError) {

                    console.error(
                        "Error enviando correo a:",
                        participante.email,
                        emailError
                    );


                    resultadosCorreo.push({

                        email:
                            participante.email,

                        enviado:
                            false,

                        error:
                            emailError.message

                    });


                    continue;
                }


                resultadosCorreo.push({

                    email:
                        participante.email,

                    enviado:
                        true,

                    id:
                        emailData?.id || null

                });


            } catch (emailException) {

                console.error(
                    "Excepción enviando correo:",
                    participante.email,
                    emailException
                );


                resultadosCorreo.push({

                    email:
                        participante.email,

                    enviado:
                        false,

                    error:
                        emailException.message

                });

            }

        }


        /* =================================
           RESPUESTA
        ================================= */

        return res.status(200).json({

            ok: true,

            mensaje:
                "Expediente finalizado.",

            expediente: {

                id:
                    expediente.id,

                matricula:
                    expediente.matricula,

                estado:
                    "FINALIZADO",

                fecha_finalizacion:
                    fechaFinalizacion

            },

            correos:
                resultadosCorreo

        });


    } catch (error) {

        console.error(
            "Error finalizar expediente:",
            error
        );


        return res.status(500).json({

            ok: false,

            error:
                "Error interno del servidor"

        });

    }

}