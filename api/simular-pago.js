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

        const expedienteId =
            String(
                req.body?.expediente_id || ""
            ).trim();

        if (!expedienteId) {
            return res.status(400).json({
                ok: false,
                error: "Falta el expediente."
            });
        }

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

        const {
            data,
            error
        } = await db
            .from("expedientes")
            .update({
                pago_validado: true,
                invitacion_habilitada: true,
                estado: "PAGO_VALIDADO",
                updated_at:
                    new Date().toISOString()
            })
            .eq("id", expedienteId)
            .select()
            .single();

        if (error) {

            console.error(error);

            return res.status(500).json({
                ok: false,
                error:
                    "No se pudo simular el pago."
            });
        }

        return res.status(200).json({
            ok: true,
            expediente: data
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            ok: false,
            error: "Error interno del servidor."
        });
    }
}