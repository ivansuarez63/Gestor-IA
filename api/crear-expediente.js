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

function crearClienteUsuario(token) {
    return createClient(
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
}

export default async function handler(req, res) {

    if (req.method !== "POST") {
        return res.status(405).json({
            ok: false,
            error: "Método no permitido"
        });
    }

    try {

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
                error: "Sesión no válida."
            });
        }

        const usuario = userData.user;

        const matricula =
            String(req.body?.matricula || "")
                .trim()
                .replace(/\s/g, "")
                .toUpperCase();

        if (!matricula) {
            return res.status(400).json({
                ok: false,
                error: "Introduce la matrícula."
            });
        }

        const db =
            crearClienteUsuario(token);

        /*
        Comprobar si ya existe un expediente activo
        para esa matrícula y ese usuario.
        */

        const {
            data: existente,
            error: buscarError
        } = await db
            .from("expedientes")
            .select("*")
            .eq("creador_id", usuario.id)
            .eq("matricula", matricula)
            .neq("estado", "FINALIZADO")
            .order("created_at", {
                ascending: false
            })
            .limit(1)
            .maybeSingle();

        if (buscarError) {
            console.error(
                "Error buscando expediente:",
                buscarError
            );
        }

        if (existente) {
            return res.status(200).json({
                ok: true,
                existente: true,
                expediente: existente
            });
        }

        const {
            data: expediente,
            error: insertarError
        } = await db
            .from("expedientes")
            .insert({
                creador_id: usuario.id,
                matricula,
                estado: "CREADO",
                pago_validado: false,
                invitacion_habilitada: false
            })
            .select()
            .single();

        if (insertarError) {

            console.error(
                "Error creando expediente:",
                insertarError
            );

            return res.status(500).json({
                ok: false,
                error:
                    "Supabase: " +
                    insertarError.message
            });
        }

        return res.status(200).json({
            ok: true,
            existente: false,
            expediente
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            ok: false,
            error: "Error interno del servidor."
        });
    }
}