import crypto from "crypto";
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

        if (
            userError ||
            !userData?.user
        ) {
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
            return res.status(403).json({
                ok: false,
                error:
                    "No tienes acceso a este expediente."
            });
        }

        if (
            expediente.pago_validado !== true ||
            expediente.invitacion_habilitada !== true
        ) {
            return res.status(403).json({
                ok: false,
                error:
                    "La invitación solo está disponible después del pago."
            });
        }

        /*
        Si ya tiene una invitación activa,
        devolvemos esa misma.
        */

        const {
            data: existente
        } = await db
            .from("invitaciones")
            .select("*")
            .eq(
                "expediente_id",
                expedienteId
            )
            .eq("usada", false)
            .gt(
                "caduca_en",
                new Date().toISOString()
            )
            .order(
                "created_at",
                {
                    ascending: false
                }
            )
            .limit(1)
            .maybeSingle();

        if (existente) {

            return res.status(200).json({
                ok: true,
                enlace:
                    `https://gestor-ia.eu/?invitacion=${existente.token}`,
                caduca_en:
                    existente.caduca_en
            });
        }

        const tokenInvitacion =
            crypto
                .randomBytes(32)
                .toString("hex");

        const caduca =
            new Date(
                Date.now() +
                48 * 60 * 60 * 1000
            );

        const {
            data: invitacion,
            error: invitacionError
        } = await db
            .from("invitaciones")
            .insert({
                expediente_id:
                    expedienteId,
                token:
                    tokenInvitacion,
                usada:
                    false,
                caduca_en:
                    caduca.toISOString()
            })
            .select()
            .single();

        if (invitacionError) {

            console.error(
                invitacionError
            );

            return res.status(500).json({
                ok: false,
                error:
                    "No se pudo generar la invitación."
            });
        }

        await db
            .from("expedientes")
            .update({
                estado:
                    "INVITACION_GENERADA",
                updated_at:
                    new Date().toISOString()
            })
            .eq(
                "id",
                expedienteId
            );

        return res.status(200).json({
            ok: true,

            enlace:
                `https://gestor-ia.eu/?invitacion=${invitacion.token}`,

            caduca_en:
                invitacion.caduca_en
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            ok: false,
            error: "Error interno del servidor."
        });
    }
}