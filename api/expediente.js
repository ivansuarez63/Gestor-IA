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

async function obtenerUsuario(req, res) {

    const authorization =
        req.headers.authorization || "";

    if (!authorization.startsWith("Bearer ")) {

        res.status(401).json({
            ok: false,
            error: "Necesitas iniciar sesión."
        });

        return null;
    }

    const token =
        authorization.substring(7).trim();

    const {
        data,
        error
    } = await supabase.auth.getUser(token);

    if (error || !data?.user) {

        res.status(401).json({
            ok: false,
            error: "Sesión no válida."
        });

        return null;
    }

    return {
        token,
        usuario: data.user,
        db: crearClienteUsuario(token)
    };
}


/* =====================================================
   CREAR EXPEDIENTE
===================================================== */

async function crearExpediente(req, res, auth) {

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

    const {
        data: existente,
        error: buscarError
    } = await auth.db
        .from("expedientes")
        .select("*")
        .eq("creador_id", auth.usuario.id)
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
    } = await auth.db
        .from("expedientes")
        .insert({
            creador_id: auth.usuario.id,
            matricula,
            estado: "CREADO",
            pago_validado: false,
            invitacion_habilitada: false
        })
        .select()
        .single();

    if (insertarError) {

        console.error(insertarError);

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
}


/* =====================================================
   LISTAR EXPEDIENTES
===================================================== */

async function listarExpedientes(req, res, auth) {

    const {
        data,
        error
    } = await auth.db
        .from("expedientes")
        .select("*")
        .order(
            "created_at",
            {
                ascending: false
            }
        );

    if (error) {

        console.error(error);

        return res.status(500).json({
            ok: false,
            error:
                "No se pudieron cargar los expedientes."
        });
    }

    return res.status(200).json({
        ok: true,
        expedientes: data || []
    });
}


/* =====================================================
   SIMULAR PAGO
===================================================== */

async function simularPago(req, res, auth) {

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

    const {
        data,
        error
    } = await auth.db
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
}


/* =====================================================
   GENERAR INVITACIÓN
===================================================== */

async function generarInvitacion(req, res, auth) {

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

    const {
        data: expediente,
        error: expedienteError
    } = await auth.db
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

    const {
        data: existente
    } = await auth.db
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
    } = await auth.db
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

    await auth.db
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
}


/* =====================================================
   HANDLER PRINCIPAL
===================================================== */

export default async function handler(req, res) {

    try {

        const auth =
            await obtenerUsuario(
                req,
                res
            );

        if (!auth) {
            return;
        }

        const action =
            String(
                req.query?.action || ""
            )
            .trim()
            .toLowerCase();

        switch (action) {

            case "crear":

                if (req.method !== "POST") {
                    return res.status(405).json({
                        ok: false,
                        error:
                            "Método no permitido"
                    });
                }

                return crearExpediente(
                    req,
                    res,
                    auth
                );


            case "listar":

                if (req.method !== "GET") {
                    return res.status(405).json({
                        ok: false,
                        error:
                            "Método no permitido"
                    });
                }

                return listarExpedientes(
                    req,
                    res,
                    auth
                );


            case "simular-pago":

                if (req.method !== "POST") {
                    return res.status(405).json({
                        ok: false,
                        error:
                            "Método no permitido"
                    });
                }

                return simularPago(
                    req,
                    res,
                    auth
                );


            case "generar-invitacion":

                if (req.method !== "POST") {
                    return res.status(405).json({
                        ok: false,
                        error:
                            "Método no permitido"
                    });
                }

                return generarInvitacion(
                    req,
                    res,
                    auth
                );


            default:

                return res.status(400).json({
                    ok: false,
                    error:
                        "Acción no válida."
                });

        }

    } catch (error) {

        console.error(
            "Error API expediente:",
            error
        );

        return res.status(500).json({
            ok: false,
            error:
                "Error interno del servidor."
        });
    }
}