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

        /* ==========================
           TOKEN
        ========================== */

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


        /* ==========================
           COMPROBAR USUARIO
        ========================== */

        const {
            data: userData,
            error: userError
        } = await supabase.auth.getUser(token);


        if (userError) {

            console.error(
                "ERROR GET USER:",
                userError
            );

            return res.status(401).json({
                ok: false,
                error:
                    "Error comprobando la sesión: " +
                    userError.message
            });

        }


        if (!userData?.user) {

            return res.status(401).json({
                ok: false,
                error: "Usuario no encontrado."
            });

        }


        const usuario =
            userData.user;


        /* ==========================
           MATRÍCULA
        ========================== */

        let matricula =
            String(
                req.body?.matricula || ""
            )
            .trim()
            .toUpperCase();


        if (!matricula) {

            return res.status(400).json({
                ok: false,
                error:
                    "Introduce la matrícula."
            });

        }


        /* ==========================
           CLIENTE SUPABASE
           AUTENTICADO
        ========================== */

        const supabaseUsuario =
            createClient(
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


        /* ==========================
           CREAR EXPEDIENTE
        ========================== */

        const {
            data: expediente,
            error: insertarError
        } = await supabaseUsuario
            .from("expedientes")
            .insert({
                creador_id:
                    usuario.id,

                matricula:
                    matricula,

                estado:
                    "CREADO",

                pago_validado:
                    false,

                invitacion_habilitada:
                    false
            })
            .select()
            .single();


        if (insertarError) {

            console.error(
                "ERROR INSERTANDO EXPEDIENTE:",
                insertarError
            );

            return res.status(500).json({

                ok: false,

                error:
                    "Supabase: " +
                    insertarError.message,

                codigo:
                    insertarError.code,

                detalles:
                    insertarError.details

            });

        }


        /* ==========================
           RESPUESTA
        ========================== */

        return res.status(200).json({

            ok: true,

            expediente:
                expediente

        });


    } catch (error) {

        console.error(
            "ERROR GENERAL:",
            error
        );

        return res.status(500).json({

            ok: false,

            error:
                "Error interno: " +
                error.message

        });

    }

}