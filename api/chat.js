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

function clienteAutenticado(token) {
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

function limpiarNumero(texto) {
    return String(texto || "")
        .replace(/\./g, "")
        .replace(",", ".")
        .replace(/[^\d.]/g, "")
        .trim();
}

function siguientePregunta(expediente) {

    switch (expediente.paso_actual) {

        case "PRECIO":
            return "¿Cuál fue el precio de compraventa del vehículo?";

        case "FECHA":
            return "¿En qué fecha se realizó la compraventa? Puedes escribirla como 13/08/2026.";

        case "MARCA":
            return "¿Cuál es la marca del vehículo?";

        case "MODELO":
            return "¿Cuál es el modelo del vehículo?";

        case "KILOMETROS":
            return "¿Cuántos kilómetros tiene actualmente el vehículo?";

        case "COMUNIDAD":
            return "¿En qué comunidad autónoma debe tramitarse la compraventa?";

        case "PAGO_PENDIENTE":
            return "Ya tengo los datos iniciales de la operación. El siguiente paso será calcular el coste y preparar el pago.";

        default:
            return "Vamos a continuar con tu traspaso.";
    }
}

function siguientePaso(actual) {

    const pasos = {
        PRECIO: "FECHA",
        FECHA: "MARCA",
        MARCA: "MODELO",
        MODELO: "KILOMETROS",
        KILOMETROS: "COMUNIDAD",
        COMUNIDAD: "PAGO_PENDIENTE"
    };

    return pasos[actual] || actual;
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

        const expedienteId =
            String(req.body?.expediente_id || "").trim();

        const mensaje =
            String(req.body?.mensaje || "").trim();

        if (!expedienteId) {
            return res.status(400).json({
                ok: false,
                error: "Falta el expediente."
            });
        }

        const db =
            clienteAutenticado(token);

        const {
            data: expediente,
            error: expedienteError
        } = await db
            .from("expedientes")
            .select("*")
            .eq("id", expedienteId)
            .single();

        if (expedienteError || !expediente) {
            return res.status(403).json({
                ok: false,
                error: "No tienes acceso a este expediente."
            });
        }

        const {
            data: participantes
        } = await db
            .from("participantes")
            .select("nombre,rol,estado,email")
            .eq("expediente_id", expedienteId);

        const primerParticipante =
            participantes?.find(
                p => p.estado === "DATOS_COMPLETOS"
            );

        /*
        IMPORTANTE:
        Nunca damos por unido a otro participante
        solo porque alguien escriba su nombre/DNI.
        */

        if (!mensaje) {

            return res.status(200).json({
                ok: true,
                respuesta:
                    siguientePregunta(expediente),
                paso_actual:
                    expediente.paso_actual
            });
        }

        await db
            .from("mensajes")
            .insert({
                expediente_id: expedienteId,
                usuario_id: usuario.id,
                autor: "usuario",
                contenido: mensaje
            });

        let update = {};
        let errorValidacion = null;

        switch (expediente.paso_actual) {

            case "PRECIO": {

                const numero =
                    limpiarNumero(mensaje);

                const precio =
                    Number(numero);

                if (
                    !Number.isFinite(precio) ||
                    precio <= 0
                ) {
                    errorValidacion =
                        "Indícame el precio de compraventa, por ejemplo: 8500 €.";
                } else {
                    update.precio_compraventa =
                        precio;
                }

                break;
            }

            case "FECHA": {

                const match =
                    mensaje.match(
                        /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/
                    );

                if (!match) {

                    errorValidacion =
                        "Indícame la fecha en formato día/mes/año, por ejemplo 13/08/2026.";

                } else {

                    const dia =
                        match[1].padStart(2, "0");

                    const mes =
                        match[2].padStart(2, "0");

                    const anio =
                        match[3];

                    update.fecha_compraventa =
                        `${anio}-${mes}-${dia}`;
                }

                break;
            }

            case "MARCA": {

                if (mensaje.length < 2) {
                    errorValidacion =
                        "Indícame la marca del vehículo.";
                } else {
                    update.marca =
                        mensaje.trim();
                }

                break;
            }

            case "MODELO": {

                if (mensaje.length < 1) {
                    errorValidacion =
                        "Indícame el modelo del vehículo.";
                } else {
                    update.modelo =
                        mensaje.trim();
                }

                break;
            }

            case "KILOMETROS": {

                const numero =
                    Number(
                        mensaje.replace(/[^\d]/g, "")
                    );

                if (
                    !Number.isInteger(numero) ||
                    numero < 0
                ) {
                    errorValidacion =
                        "Indícame los kilómetros del vehículo, por ejemplo: 125000.";
                } else {
                    update.kilometros =
                        numero;
                }

                break;
            }

            case "COMUNIDAD": {

                if (mensaje.length < 3) {
                    errorValidacion =
                        "Indícame la comunidad autónoma.";
                } else {
                    update.comunidad_autonoma =
                        mensaje.trim();
                }

                break;
            }

            case "PAGO_PENDIENTE": {

                return res.status(200).json({
                    ok: true,
                    respuesta:
                        "Ya he recogido los datos iniciales. El siguiente paso será calcular el coste del trámite y preparar el pago. La invitación a la otra persona se habilitará cuando Gestor-IA valide ese pago.",
                    paso_actual:
                        "PAGO_PENDIENTE"
                });
            }

            default: {

                return res.status(200).json({
                    ok: true,
                    respuesta:
                        "Este expediente ya ha completado la recogida inicial de datos.",
                    paso_actual:
                        expediente.paso_actual
                });
            }
        }

        if (errorValidacion) {

            await db
                .from("mensajes")
                .insert({
                    expediente_id:
                        expedienteId,
                    usuario_id:
                        usuario.id,
                    autor:
                        "ia",
                    contenido:
                        errorValidacion
                });

            return res.status(200).json({
                ok: true,
                respuesta:
                    errorValidacion,
                paso_actual:
                    expediente.paso_actual
            });
        }

        const nuevoPaso =
            siguientePaso(
                expediente.paso_actual
            );

        update.paso_actual =
            nuevoPaso;

        if (
            nuevoPaso ===
            "PAGO_PENDIENTE"
        ) {

            update.estado =
                "PAGO_PENDIENTE";
        }

        update.updated_at =
            new Date().toISOString();

        const {
            error: updateError
        } = await db
            .from("expedientes")
            .update(update)
            .eq("id", expedienteId);

        if (updateError) {

            console.error(updateError);

            return res.status(500).json({
                ok: false,
                error:
                    "No se pudo guardar el avance del expediente."
            });
        }

        const expedienteActualizado = {
            ...expediente,
            ...update
        };

        let respuestaIA =
            siguientePregunta(
                expedienteActualizado
            );

        if (
            nuevoPaso ===
            "PAGO_PENDIENTE"
        ) {

            respuestaIA =
                `Perfecto, ${primerParticipante?.nombre || "ya tengo tus datos"}. Ya tengo la información inicial de la operación. El siguiente paso será calcular el coste del trámite y preparar el pago. No voy a pedirte los datos personales de la otra persona: los introducirá ella misma cuando reciba su invitación.`;
        }

        await db
            .from("mensajes")
            .insert({
                expediente_id:
                    expedienteId,
                usuario_id:
                    usuario.id,
                autor:
                    "ia",
                contenido:
                    respuestaIA
            });

        return res.status(200).json({

            ok: true,

            respuesta:
                respuestaIA,

            paso_actual:
                nuevoPaso,

            expediente: {
                id:
                    expediente.id,
                matricula:
                    expediente.matricula,
                estado:
                    update.estado ||
                    expediente.estado
            }

        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            ok: false,
            error:
                "Error interno del servidor."
        });
    }
}