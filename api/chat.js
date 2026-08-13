import { createClient } from "@supabase/supabase-js";


/* =====================================================
   SUPABASE
===================================================== */

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


/* =====================================================
   CLIENTE AUTENTICADO
===================================================== */

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


/* =====================================================
   LIMPIAR NÚMEROS
===================================================== */

function limpiarNumero(texto) {

    return String(texto || "")
        .replace(/\./g, "")
        .replace(",", ".")
        .replace(/[^\d.]/g, "")
        .trim();
}


/* =====================================================
   NORMALIZAR TEXTO
===================================================== */

function normalizarTexto(texto) {

    return String(texto || "")
        .trim()
        .replace(/\s+/g, " ");
}


/* =====================================================
   SIGUIENTE PREGUNTA
===================================================== */

function siguientePregunta(expediente) {

    switch (expediente.paso_actual) {

        case "PRECIO":

            return "¿Cuál fue el precio de compraventa del vehículo?";


        case "FECHA":

            return "¿En qué fecha se realizó la compraventa? Puedes escribirla como 13/08/2026.";


        case "MARCA":

            return "¿Cuál es la marca del vehículo?";


        case "MODELO":

            return "¿Cuál es el modelo y, si lo sabes, la versión exacta del vehículo?";


        case "PRIMERA_MATRICULACION":

            return "¿Cuál es la fecha de primera matriculación del vehículo? Escríbela como día/mes/año.";


        case "COMBUSTIBLE":

            return "¿Qué combustible utiliza el vehículo? Por ejemplo: gasolina, diésel, híbrido, eléctrico o GLP.";


        case "CILINDRADA":

            return "¿Cuál es la cilindrada del vehículo en centímetros cúbicos (cc)?";


        case "POTENCIA":

            return "¿Cuál es la potencia del vehículo? Si la tienes en kW, CV o caballos fiscales, indícame también la unidad.";


        case "KILOMETROS":

            return "¿Cuántos kilómetros tiene actualmente el vehículo?";


        case "COMUNIDAD":

            return "¿En qué comunidad autónoma tiene su domicilio fiscal el comprador?";


        case "PROVINCIA":

            return "¿En qué provincia tiene su domicilio fiscal el comprador?";


        case "CALCULO_FISCAL":

            return "Perfecto. Ya tengo los datos principales. Voy a comprobar el cálculo del traspaso antes de mostrarte el importe.";


        case "PAGO_PENDIENTE":

            return "El cálculo está preparado. El siguiente paso es revisar el desglose y realizar el pago.";


        default:

            return "Vamos a continuar con tu traspaso.";
    }
}


/* =====================================================
   SIGUIENTE PASO
===================================================== */

function siguientePaso(actual) {

    const pasos = {

        PRECIO:
            "FECHA",

        FECHA:
            "MARCA",

        MARCA:
            "MODELO",

        MODELO:
            "PRIMERA_MATRICULACION",

        PRIMERA_MATRICULACION:
            "COMBUSTIBLE",

        COMBUSTIBLE:
            "CILINDRADA",

        CILINDRADA:
            "POTENCIA",

        POTENCIA:
            "KILOMETROS",

        KILOMETROS:
            "COMUNIDAD",

        COMUNIDAD:
            "PROVINCIA",

        PROVINCIA:
            "CALCULO_FISCAL"

    };

    return pasos[actual] || actual;
}


/* =====================================================
   VALIDAR FECHA
===================================================== */

function convertirFecha(texto) {

    const match =
        String(texto || "")
            .match(
                /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/
            );

    if (!match) {
        return null;
    }

    const dia =
        match[1].padStart(2, "0");

    const mes =
        match[2].padStart(2, "0");

    const anio =
        match[3];

    const fecha =
        new Date(
            `${anio}-${mes}-${dia}T00:00:00`
        );

    if (
        Number.isNaN(
            fecha.getTime()
        )
    ) {
        return null;
    }

    /*
       Comprobación adicional para evitar
       fechas imposibles tipo 31/02/2026.
    */

    if (
        fecha.getFullYear() !== Number(anio) ||
        fecha.getMonth() + 1 !== Number(mes) ||
        fecha.getDate() !== Number(dia)
    ) {
        return null;
    }

    return `${anio}-${mes}-${dia}`;
}


/* =====================================================
   HANDLER
===================================================== */

export default async function handler(req, res) {

    if (req.method !== "POST") {

        return res.status(405).json({
            ok: false,
            error: "Método no permitido"
        });
    }


    try {


        /* =================================================
           AUTENTICACIÓN
        ================================================= */

        const authorization =
            req.headers.authorization || "";


        if (
            !authorization.startsWith(
                "Bearer "
            )
        ) {

            return res.status(401).json({
                ok: false,
                error: "Necesitas iniciar sesión."
            });
        }


        const token =
            authorization
                .substring(7)
                .trim();


        const {
            data: userData,
            error: userError
        } =
            await supabase.auth.getUser(
                token
            );


        if (
            userError ||
            !userData?.user
        ) {

            return res.status(401).json({
                ok: false,
                error: "Sesión no válida."
            });
        }


        const usuario =
            userData.user;


        /* =================================================
           DATOS RECIBIDOS
        ================================================= */

        const expedienteId =
            String(
                req.body?.expediente_id || ""
            ).trim();


        const mensaje =
            String(
                req.body?.mensaje || ""
            ).trim();


        if (!expedienteId) {

            return res.status(400).json({
                ok: false,
                error: "Falta el expediente."
            });
        }


        /* =================================================
           CLIENTE SUPABASE DEL USUARIO
        ================================================= */

        const db =
            clienteAutenticado(
                token
            );


        /* =================================================
           EXPEDIENTE
        ================================================= */

        const {
            data: expediente,
            error: expedienteError
        } =
            await db
                .from("expedientes")
                .select("*")
                .eq(
                    "id",
                    expedienteId
                )
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


        /* =================================================
           PARTICIPANTES
        ================================================= */

        const {
            data: participantes,
            error: participantesError
        } =
            await db
                .from("participantes")
                .select(
                    "nombre,rol,estado,email"
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
        }


        const primerParticipante =
            participantes?.find(
                p =>
                    p.estado ===
                    "DATOS_COMPLETOS"
            );


        /*
        IMPORTANTE:

        La IA NO considera que la otra persona
        forma parte del expediente simplemente
        porque el usuario escriba su nombre,
        DNI o cualquier otro dato.

        El segundo participante deberá entrar
        posteriormente mediante su invitación.
        */


        /* =================================================
           PRIMER MENSAJE AUTOMÁTICO
        ================================================= */

        if (!mensaje) {

            /*
            Si ya hemos llegado al cálculo fiscal,
            el chat devuelve al frontend la señal
            para lanzar el cálculo desde expediente.js.
            */

            if (
                expediente.paso_actual ===
                "CALCULO_FISCAL"
            ) {

                return res.status(200).json({

                    ok: true,

                    respuesta:
                        "Perfecto. Ya tengo los datos principales del vehículo y de la operación. Ahora voy a verificar el cálculo antes de enseñarte el importe.",

                    paso_actual:
                        "CALCULO_FISCAL",

                    solicitar_calculo:
                        true

                });
            }


            if (
                expediente.paso_actual ===
                "PAGO_PENDIENTE"
            ) {

                return res.status(200).json({

                    ok: true,

                    respuesta:
                        "El cálculo del expediente está preparado. Revisa el desglose antes de continuar con el pago.",

                    paso_actual:
                        "PAGO_PENDIENTE"

                });
            }


            return res.status(200).json({

                ok: true,

                respuesta:
                    siguientePregunta(
                        expediente
                    ),

                paso_actual:
                    expediente.paso_actual

            });
        }


        /* =================================================
           GUARDAR MENSAJE DEL USUARIO
        ================================================= */

        const {
            error: mensajeError
        } =
            await db
                .from("mensajes")
                .insert({

                    expediente_id:
                        expedienteId,

                    usuario_id:
                        usuario.id,

                    autor:
                        "usuario",

                    contenido:
                        mensaje

                });


        if (mensajeError) {

            console.error(
                "Error guardando mensaje:",
                mensajeError
            );
        }


        /* =================================================
           VALIDAR RESPUESTA SEGÚN PASO
        ================================================= */

        let update = {};

        let errorValidacion =
            null;


        switch (
            expediente.paso_actual
        ) {


            /* =============================================
               PRECIO
            ============================================= */

            case "PRECIO": {

                const numero =
                    limpiarNumero(
                        mensaje
                    );


                const precio =
                    Number(
                        numero
                    );


                if (
                    !Number.isFinite(precio) ||
                    precio <= 0
                ) {

                    errorValidacion =
                        "Indícame el precio de compraventa. Por ejemplo: 8500 €.";

                } else {

                    update.precio_compraventa =
                        precio;
                }

                break;
            }


            /* =============================================
               FECHA COMPRAVENTA
            ============================================= */

            case "FECHA": {

                const fecha =
                    convertirFecha(
                        mensaje
                    );


                if (!fecha) {

                    errorValidacion =
                        "Indícame una fecha válida en formato día/mes/año. Por ejemplo: 13/08/2026.";

                } else {

                    update.fecha_compraventa =
                        fecha;
                }

                break;
            }


            /* =============================================
               MARCA
            ============================================= */

            case "MARCA": {

                const valor =
                    normalizarTexto(
                        mensaje
                    );


                if (
                    valor.length < 2
                ) {

                    errorValidacion =
                        "Indícame la marca del vehículo.";

                } else {

                    update.marca =
                        valor;
                }

                break;
            }


            /* =============================================
               MODELO / VERSIÓN
            ============================================= */

            case "MODELO": {

                const valor =
                    normalizarTexto(
                        mensaje
                    );


                if (
                    valor.length < 1
                ) {

                    errorValidacion =
                        "Indícame el modelo del vehículo.";

                } else {

                    update.modelo =
                        valor;
                }

                break;
            }


            /* =============================================
               PRIMERA MATRICULACIÓN
            ============================================= */

            case "PRIMERA_MATRICULACION": {

                const fecha =
                    convertirFecha(
                        mensaje
                    );


                if (!fecha) {

                    errorValidacion =
                        "Indícame la fecha de primera matriculación en formato día/mes/año.";

                } else {

                    update.fecha_primera_matriculacion =
                        fecha;
                }

                break;
            }


            /* =============================================
               COMBUSTIBLE
            ============================================= */

            case "COMBUSTIBLE": {

                const combustible =
                    normalizarTexto(
                        mensaje
                    );


                if (
                    combustible.length < 2
                ) {

                    errorValidacion =
                        "Indícame el tipo de combustible del vehículo.";

                } else {

                    update.combustible =
                        combustible;
                }

                break;
            }


            /* =============================================
               CILINDRADA
            ============================================= */

            case "CILINDRADA": {

                const numero =
                    Number(
                        mensaje
                            .replace(/[^\d]/g, "")
                    );


                if (
                    !Number.isInteger(numero) ||
                    numero <= 0 ||
                    numero > 10000
                ) {

                    errorValidacion =
                        "Indícame la cilindrada en cc. Por ejemplo: 1598.";

                } else {

                    update.cilindrada =
                        numero;
                }

                break;
            }


            /* =============================================
               POTENCIA
            ============================================= */

            case "POTENCIA": {

                const valor =
                    normalizarTexto(
                        mensaje
                    );


                if (
                    valor.length < 1
                ) {

                    errorValidacion =
                        "Indícame la potencia del vehículo y, si es posible, la unidad: kW, CV o caballos fiscales.";

                } else {

                    update.potencia_declarada =
                        valor;
                }

                break;
            }


            /* =============================================
               KILÓMETROS
            ============================================= */

            case "KILOMETROS": {

                const numero =
                    Number(
                        mensaje
                            .replace(/[^\d]/g, "")
                    );


                if (
                    !Number.isInteger(numero) ||
                    numero < 0 ||
                    numero > 5000000
                ) {

                    errorValidacion =
                        "Indícame los kilómetros del vehículo. Por ejemplo: 125000.";

                } else {

                    update.kilometros =
                        numero;
                }

                break;
            }


            /* =============================================
               COMUNIDAD
            ============================================= */

            case "COMUNIDAD": {

                const comunidad =
                    normalizarTexto(
                        mensaje
                    );


                if (
                    comunidad.length < 3
                ) {

                    errorValidacion =
                        "Indícame la comunidad autónoma del domicilio fiscal del comprador.";

                } else {

                    update.comunidad_autonoma =
                        comunidad;
                }

                break;
            }


            /* =============================================
               PROVINCIA
            ============================================= */

            case "PROVINCIA": {

                const provincia =
                    normalizarTexto(
                        mensaje
                    );


                if (
                    provincia.length < 2
                ) {

                    errorValidacion =
                        "Indícame la provincia del domicilio fiscal del comprador.";

                } else {

                    update.provincia =
                        provincia;
                }

                break;
            }


            /* =============================================
               CÁLCULO FISCAL
            ============================================= */

            case "CALCULO_FISCAL": {

                return res.status(200).json({

                    ok: true,

                    respuesta:
                        "Ya tengo los datos principales. Ahora debo verificar el cálculo antes de mostrarte cualquier importe.",

                    paso_actual:
                        "CALCULO_FISCAL",

                    solicitar_calculo:
                        true

                });
            }


            /* =============================================
               PAGO PENDIENTE
            ============================================= */

            case "PAGO_PENDIENTE": {

                return res.status(200).json({

                    ok: true,

                    respuesta:
                        "El cálculo del expediente ya está preparado. Revisa el desglose antes de continuar con el pago.",

                    paso_actual:
                        "PAGO_PENDIENTE"

                });
            }


            /* =============================================
               OTROS
            ============================================= */

            default: {

                return res.status(200).json({

                    ok: true,

                    respuesta:
                        "Este expediente ya ha completado esta fase de recogida de datos.",

                    paso_actual:
                        expediente.paso_actual

                });
            }
        }


        /* =================================================
           ERROR DE VALIDACIÓN
        ================================================= */

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


        /* =================================================
           AVANZAR PASO
        ================================================= */

        const nuevoPaso =
            siguientePaso(
                expediente.paso_actual
            );


        update.paso_actual =
            nuevoPaso;


        /*
        IMPORTANTE:

        YA NO cambiamos aquí directamente a
        PAGO_PENDIENTE.

        Primero pasamos a CALCULO_FISCAL.

        expediente.js tendrá que verificar el cálculo.
        Solo cuando sea correcto podrá cambiar a:
        PAGO_PENDIENTE.
        */


        if (
            nuevoPaso ===
            "CALCULO_FISCAL"
        ) {

            update.estado =
                "CALCULO_FISCAL";
        }


        update.updated_at =
            new Date().toISOString();


        /* =================================================
           GUARDAR EXPEDIENTE
        ================================================= */

        const {
            error: updateError
        } =
            await db
                .from("expedientes")
                .update(
                    update
                )
                .eq(
                    "id",
                    expedienteId
                );


        if (updateError) {

            console.error(
                "Error actualizando expediente:",
                updateError
            );


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


        /* =================================================
           RESPUESTA SIGUIENTE
        ================================================= */

        let respuestaIA =
            siguientePregunta(
                expedienteActualizado
            );


        let solicitarCalculo =
            false;


        if (
            nuevoPaso ===
            "CALCULO_FISCAL"
        ) {

            respuestaIA =
                `Perfecto, ${primerParticipante?.nombre || "ya tengo tus datos"}. Ya tengo la información principal de la operación y del vehículo. Ahora voy a verificar el cálculo del traspaso antes de mostrarte el importe.`;

            solicitarCalculo =
                true;
        }


        /* =================================================
           GUARDAR RESPUESTA IA
        ================================================= */

        const {
            error: respuestaError
        } =
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


        if (respuestaError) {

            console.error(
                "Error guardando respuesta IA:",
                respuestaError
            );
        }


        /* =================================================
           RESPUESTA FINAL
        ================================================= */

        return res.status(200).json({

            ok: true,

            respuesta:
                respuestaIA,

            paso_actual:
                nuevoPaso,

            solicitar_calculo:
                solicitarCalculo,

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


        console.error(
            "Error chat:",
            error
        );


        return res.status(500).json({

            ok: false,

            error:
                "Error interno del servidor."

        });
    }
}