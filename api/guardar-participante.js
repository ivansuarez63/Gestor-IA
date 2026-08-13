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

        const {
            expediente_id,
            nombre,
            dni_nie,
            telefono,
            email,
            rol
        } = req.body || {};

        if (
            !expediente_id ||
            !nombre ||
            !dni_nie ||
            !telefono ||
            !email ||
            !rol
        ) {
            return res.status(400).json({
                ok: false,
                error: "Completa todos los datos."
            });
        }

        if (!["COMPRADOR", "VENDEDOR"].includes(rol)) {
            return res.status(400).json({
                ok: false,
                error: "Selecciona comprador o vendedor."
            });
        }

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

        const {
            data: expediente,
            error: expedienteError
        } = await clienteUsuario
            .from("expedientes")
            .select("id, creador_id, matricula")
            .eq("id", expediente_id)
            .single();

        if (
            expedienteError ||
            !expediente ||
            expediente.creador_id !== usuario.id
        ) {
            return res.status(403).json({
                ok: false,
                error: "No tienes acceso a este expediente."
            });
        }

        const {
            data: participante,
            error: participanteError
        } = await clienteUsuario
            .from("participantes")
            .insert({
                expediente_id,
                usuario_id: usuario.id,
                nombre: String(nombre).trim(),
                dni_nie: String(dni_nie).trim().toUpperCase(),
                telefono: String(telefono).trim(),
                email: String(email).trim().toLowerCase(),
                rol,
                estado: "DATOS_COMPLETOS"
            })
            .select()
            .single();

        if (participanteError) {

            console.error(participanteError);

            return res.status(500).json({
                ok: false,
                error: "No se pudieron guardar tus datos."
            });
        }

        await clienteUsuario
            .from("expedientes")
            .update({
                estado: "DATOS_INICIALES",
                updated_at: new Date().toISOString()
            })
            .eq("id", expediente_id);

        return res.status(200).json({
            ok: true,
            participante,
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