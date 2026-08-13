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
   UTILIDADES
===================================================== */

function limpiarNumero(texto) {

    return String(texto || "")
        .replace(/\./g, "")
        .replace(",", ".")
        .replace(/[^\d.]/g, "")
        .trim();
}


function normalizarTexto(texto) {

    return String(texto || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .replace(/\s+/g, " ");
}


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

    if (
        fecha.getFullYear() !== Number(anio) ||
        fecha.getMonth() + 1 !== Number(mes) ||
        fecha.getDate() !== Number(dia)
    ) {
        return null;
    }

    return `${anio}-${mes}-${dia}`;
}


function obtenerAnio(fecha) {

    if (!fecha) {
        return null;
    }

    const match =
        String(fecha)
            .match(/^(\d{4})/);

    if (!match) {
        return null;
    }

    return Number(match[1]);
}


/* =====================================================
   POTENCIA
===================================================== */

function extraerPotencia(texto) {

    const valor =
        String(texto || "")
            .toLowerCase()
            .replace(",", ".");

    const kw =
        valor.match(
            /(\d+(?:\.\d+)?)\s*kw/
        );

    if (kw) {

        return {
            tipo: "KW",
            valor: Number(kw[1])
        };
    }


    const cv =
        valor.match(
            /(\d+(?:\.\d+)?)\s*(cv|caballos)/
        );

    if (cv) {

        return {
            tipo: "CV",
            valor: Number(cv[1])
        };
    }


    /*
       Si solo escribe un número,
       lo guardamos pero NO asumimos
       automáticamente la unidad.
    */

    const numero =
        valor.match(
            /(\d+(?:\.\d+)?)/
        );

    if (numero) {

        return {
            tipo: "DESCONOCIDA",
            valor: Number(numero[1])
        };
    }


    return null;
}


/* =====================================================
   IDENTIFICAR CARROCERÍA
===================================================== */

function esDescapotable(nombre) {

    const n =
        normalizarTexto(nombre)
            .toUpperCase();

    return (
        /\bCABRIO\b/.test(n) ||
        /\bCABRIOLET\b/.test(n) ||
        /\bSPIDER\b/.test(n) ||
        /\bCONVERTIBLE\b/.test(n) ||
        /\bROADSTER\b/.test(n) ||
        /\b500 C\b/.test(n)
    );
}


/* =====================================================
   IDENTIFICAR TRANSMISIÓN
===================================================== */

function esSecuencial(nombre) {

    const n =
        normalizarTexto(nombre)
            .toUpperCase();

    return (
        n.includes("SECUENCIAL") ||
        n.includes("AUT.") ||
        n.includes("AUTOMATIC") ||
        n.includes("AUTOMÁTIC")
    );
}


/* =====================================================
   PREGUNTAS
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

            return "¿Cuál es el modelo y, si lo sabes, la versión del vehículo?";


        case "PRIMERA_MATRICULACION":

            return "¿Cuál es la fecha de primera matriculación del vehículo? Escríbela como día/mes/año.";


        case "COMBUSTIBLE":

            return "¿Qué combustible utiliza el vehículo? Por ejemplo: gasolina, diésel, híbrido, eléctrico o GLP.";


        case "CILINDRADA":

            return "¿Cuál es la cilindrada del vehículo en centímetros cúbicos (cc)?";


        case "POTENCIA":

            return "¿Cuál es la potencia del vehículo? Indícame también si está expresada en kW o CV. Por ejemplo: 132 kW.";


        case "KILOMETROS":

            return "¿Cuántos kilómetros tiene actualmente el vehículo?";


        case "COMUNIDAD":

            return "¿En qué comunidad autónoma tiene su domicilio fiscal el comprador?";


        case "PROVINCIA":

            return "¿En qué provincia tiene su domicilio fiscal el comprador?";


        case "CARROCERIA_FISCAL":

            return "Necesito distinguir la versión exacta. ¿El vehículo es la versión normal/cerrada o es descapotable/cabrio?";


        case "TRANSMISION_FISCAL":

            return "¿El cambio del vehículo es manual o secuencial/automático?";


        case "VERSION_EXACTA":

            return "He encontrado varias versiones fiscales posibles. Indícame la versión exacta del vehículo tal como aparece en su documentación.";


        case "CALCULO_FISCAL":

            return "Perfecto. El vehículo ya está identificado. Ahora voy a verificar el cálculo fiscal antes de mostrarte el importe.";


        case "PAGO_PENDIENTE":

            return "El cálculo está preparado. El siguiente paso es revisar el desglose y realizar el pago.";


        default:

            return "Vamos a continuar con tu traspaso.";
    }
}


/* =====================================================
   SECUENCIA NORMAL
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
            "IDENTIFICAR_VEHICULO"

    };

    return pasos[actual] || actual;
}


/* =====================================================
   BUSCAR CANDIDATOS FISCALES
===================================================== */

async function buscarCandidatos(
    db,
    expediente,
    versionExtra = null
) {

    const marca =
        normalizarTexto(
            expediente.marca
        )
        .toUpperCase();


    const modeloBase =
        versionExtra
            ?
            normalizarTexto(
                versionExtra
            )
            :
            normalizarTexto(
                expediente.modelo
            );


    const cilindrada =
        Number(
            expediente.cilindrada || 0
        );


    if (
        !marca ||
        !modeloBase ||
        !cilindrada
    ) {

        return [];
    }


    const {
        data,
        error
    } =
        await db
            .from(
                "valoraciones_vehiculos"
            )
            .select(`
                id,
                ejercicio,
                marca,
                modelo_tipo,
                periodo_inicio,
                periodo_fin,
                cilindrada,
                numero_cilindros,
                tipo_motor,
                potencia_kw,
                caballos_fiscales,
                potencia_cv,
                valor_oficial,
                fuente
            `)
            .eq(
                "ejercicio",
                2026
            )
            .ilike(
                "marca",
                marca
            )
            .eq(
                "cilindrada",
                Math.round(cilindrada)
            )
            .limit(1000);


    if (error) {

        console.error(
            "Error buscando valoración:",
            error
        );

        throw error;
    }


    let candidatos =
        data || [];


    /* =================================================
       FILTRAR POR TEXTO DEL MODELO
    ================================================= */

    const palabras =
        normalizarTexto(
            modeloBase
        )
        .toUpperCase()
        .split(" ")
        .filter(
            palabra =>
                palabra.length >= 2
        );


    if (
        palabras.length > 0
    ) {

        candidatos =
            candidatos.filter(
                vehiculo => {

                    const oficial =
                        normalizarTexto(
                            vehiculo.modelo_tipo
                        )
                        .toUpperCase();


                    return palabras.every(
                        palabra =>
                            oficial.includes(
                                palabra
                            )
                    );
                }
            );
    }


    /* =================================================
       FILTRAR POR AÑO
    ================================================= */

    const anio =
        obtenerAnio(
            expediente
                .fecha_primera_matriculacion
        );


    if (
        Number.isInteger(anio)
    ) {

        candidatos =
            candidatos.filter(
                vehiculo => {

                    const inicio =
                        vehiculo.periodo_inicio === null
                            ?
                            null
                            :
                            Number(
                                vehiculo.periodo_inicio
                            );


                    const fin =
                        vehiculo.periodo_fin === null
                            ?
                            null
                            :
                            Number(
                                vehiculo.periodo_fin
                            );


                    if (
                        inicio !== null &&
                        anio < inicio
                    ) {

                        return false;
                    }


                    if (
                        fin !== null &&
                        anio > fin
                    ) {

                        return false;
                    }


                    return true;
                }
            );
    }


    /* =================================================
       FILTRAR POR POTENCIA
    ================================================= */

    const potencia =
        extraerPotencia(
            expediente
                .potencia_declarada
        );


    if (
        potencia &&
        potencia.tipo !==
        "DESCONOCIDA"
    ) {

        const filtrados =
            candidatos.filter(
                vehiculo => {

                    if (
                        potencia.tipo ===
                        "KW"
                    ) {

                        const oficial =
                            Number(
                                vehiculo.potencia_kw
                            );

                        return (
                            Number.isFinite(
                                oficial
                            ) &&
                            Math.abs(
                                oficial -
                                potencia.valor
                            ) <= 0.5
                        );
                    }


                    if (
                        potencia.tipo ===
                        "CV"
                    ) {

                        const oficial =
                            Number(
                                vehiculo.potencia_cv
                            );

                        return (
                            Number.isFinite(
                                oficial
                            ) &&
                            Math.abs(
                                oficial -
                                potencia.valor
                            ) <= 1
                        );
                    }


                    return true;
                }
            );


        if (
            filtrados.length > 0
        ) {

            candidatos =
                filtrados;
        }
    }


    /* =================================================
       CARROCERÍA
    ================================================= */

    if (
        expediente
            .carroceria_fiscal ===
        "CABRIO"
    ) {

        candidatos =
            candidatos.filter(
                vehiculo =>
                    esDescapotable(
                        vehiculo.modelo_tipo
                    )
            );
    }


    if (
        expediente
            .carroceria_fiscal ===
        "NORMAL"
    ) {

        candidatos =
            candidatos.filter(
                vehiculo =>
                    !esDescapotable(
                        vehiculo.modelo_tipo
                    )
            );
    }


    /* =================================================
       TRANSMISIÓN
    ================================================= */

    if (
        expediente
            .transmision_fiscal ===
        "SECUENCIAL"
    ) {

        candidatos =
            candidatos.filter(
                vehiculo =>
                    esSecuencial(
                        vehiculo.modelo_tipo
                    )
            );
    }


    if (
        expediente
            .transmision_fiscal ===
        "MANUAL"
    ) {

        candidatos =
            candidatos.filter(
                vehiculo =>
                    !esSecuencial(
                        vehiculo.modelo_tipo
                    )
            );
    }


    return candidatos;
}


/* =====================================================
   DECIDIR QUÉ DATO FALTA
===================================================== */

function decidirDatoFaltante(
    candidatos
) {

    if (
        candidatos.length <= 1
    ) {

        return null;
    }


    const carrocerias =
        new Set(
            candidatos.map(
                vehiculo =>
                    esDescapotable(
                        vehiculo.modelo_tipo
                    )
                    ?
                    "CABRIO"
                    :
                    "NORMAL"
            )
        );


    if (
        carrocerias.size > 1
    ) {

        return "CARROCERIA_FISCAL";
    }


    const transmisiones =
        new Set(
            candidatos.map(
                vehiculo =>
                    esSecuencial(
                        vehiculo.modelo_tipo
                    )
                    ?
                    "SECUENCIAL"
                    :
                    "MANUAL"
            )
        );


    if (
        transmisiones.size > 1
    ) {

        return "TRANSMISION_FISCAL";
    }


    return "VERSION_EXACTA";
}


/* =====================================================
   FINALIZAR IDENTIFICACIÓN
===================================================== */

async function guardarVehiculoIdentificado(
    db,
    expedienteId,
    vehiculo
) {

    const {
        error
    } =
        await db
            .from("expedientes")
            .update({

                valoracion_id:
                    vehiculo.id,

                modelo_fiscal_identificado:
                    vehiculo.modelo_tipo,

                valor_fiscal:
                    vehiculo.valor_oficial,

                paso_actual:
                    "CALCULO_FISCAL",

                estado:
                    "CALCULO_FISCAL",

                calculo_fiscal_verificado:
                    false,

                updated_at:
                    new Date()
                        .toISOString()

            })
            .eq(
                "id",
                expedienteId
            );


    if (error) {

        throw error;
    }
}


/* =====================================================
   PROCESAR IDENTIFICACIÓN
===================================================== */

async function procesarIdentificacion(
    db,
    expediente,
    versionExtra = null
) {

    const candidatos =
        await buscarCandidatos(
            db,
            expediente,
            versionExtra
        );


    /* =================================================
       NO ENCONTRADO
    ================================================= */

    if (
        candidatos.length === 0
    ) {

        return {

            encontrado:
                false,

            paso:
                "VERSION_EXACTA",

            respuesta:
                "No he podido identificar con certeza la versión fiscal del vehículo. Indícame la versión exacta tal como aparece en la documentación del vehículo."

        };
    }


    /* =================================================
       UNA SOLA VERSIÓN
    ================================================= */

    if (
        candidatos.length === 1
    ) {

        const vehiculo =
            candidatos[0];


        await guardarVehiculoIdentificado(
            db,
            expediente.id,
            vehiculo
        );


        return {

            encontrado:
                true,

            exacto:
                true,

            paso:
                "CALCULO_FISCAL",

            vehiculo,

            respuesta:
                `Perfecto. He identificado la versión como ${vehiculo.marca} ${vehiculo.modelo_tipo}. Ya puedo continuar con la verificación fiscal del expediente.`

        };
    }


    /* =================================================
       VARIAS VERSIONES
    ================================================= */

    const paso =
        decidirDatoFaltante(
            candidatos
        );


    let respuesta;


    if (
        paso ===
        "CARROCERIA_FISCAL"
    ) {

        respuesta =
            "He encontrado varias versiones compatibles. Para distinguirlas necesito saber si tu vehículo es la versión normal/cerrada o descapotable/cabrio.";

    } else if (
        paso ===
        "TRANSMISION_FISCAL"
    ) {

        respuesta =
            "Ya casi lo tengo. ¿El cambio del vehículo es manual o secuencial/automático?";

    } else {

        const nombres =
            [
                ...new Set(
                    candidatos
                        .map(
                            vehiculo =>
                                vehiculo
                                    .modelo_tipo
                        )
                )
            ]
            .slice(0, 8);


        respuesta =
            "He encontrado varias versiones fiscales posibles. Indícame cuál corresponde a tu vehículo:\n\n" +
            nombres
                .map(
                    (nombre, index) =>
                        `${index + 1}. ${nombre}`
                )
                .join("\n");
    }


    return {

        encontrado:
            true,

        exacto:
            false,

        paso,

        candidatos,

        respuesta

    };
}


/* =====================================================
   HANDLER
===================================================== */

export default async function handler(
    req,
    res
) {

    if (
        req.method !==
        "POST"
    ) {

        return res
            .status(405)
            .json({

                ok: false,

                error:
                    "Método no permitido"

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

            return res
                .status(401)
                .json({

                    ok: false,

                    error:
                        "Necesitas iniciar sesión."

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

            return res
                .status(401)
                .json({

                    ok: false,

                    error:
                        "Sesión no válida."

                });
        }


        const usuario =
            userData.user;


        /* =================================================
           DATOS
        ================================================= */

        const expedienteId =
            String(
                req.body
                    ?.expediente_id ||
                ""
            )
            .trim();


        const mensaje =
            String(
                req.body?.mensaje ||
                ""
            )
            .trim();


        if (!expedienteId) {

            return res
                .status(400)
                .json({

                    ok: false,

                    error:
                        "Falta el expediente."

                });
        }


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

            return res
                .status(403)
                .json({

                    ok: false,

                    error:
                        "No tienes acceso a este expediente."

                });
        }


        /* =================================================
           PARTICIPANTES
        ================================================= */

        const {
            data: participantes
        } =
            await db
                .from(
                    "participantes"
                )
                .select(
                    "nombre,rol,estado,email"
                )
                .eq(
                    "expediente_id",
                    expedienteId
                );


        const primerParticipante =
            participantes?.find(
                participante =>
                    participante.estado ===
                    "DATOS_COMPLETOS"
            );


        /*
           La IA nunca añade al segundo
           participante solo porque alguien
           escriba sus datos en el chat.
        */


        /* =================================================
           PETICIÓN SIN MENSAJE
        ================================================= */

        if (!mensaje) {


            /*
               Si llegamos a identificación,
               intentamos resolverla automáticamente.
            */

            if (
                expediente
                    .paso_actual ===
                "IDENTIFICAR_VEHICULO"
            ) {

                const resultado =
                    await procesarIdentificacion(
                        db,
                        expediente
                    );


                if (
                    resultado.paso !==
                    "CALCULO_FISCAL"
                ) {

                    await db
                        .from("expedientes")
                        .update({

                            paso_actual:
                                resultado.paso,

                            updated_at:
                                new Date()
                                    .toISOString()

                        })
                        .eq(
                            "id",
                            expedienteId
                        );
                }


                return res
                    .status(200)
                    .json({

                        ok: true,

                        respuesta:
                            resultado.respuesta,

                        paso_actual:
                            resultado.paso,

                        solicitar_calculo:
                            resultado.paso ===
                            "CALCULO_FISCAL",

                        vehiculo:
                            resultado.vehiculo ||
                            null

                    });
            }


            if (
                expediente
                    .paso_actual ===
                "CALCULO_FISCAL"
            ) {

                return res
                    .status(200)
                    .json({

                        ok: true,

                        respuesta:
                            "El vehículo está identificado. Ahora voy a verificar impuestos, tasas y coste total antes de habilitar el pago.",

                        paso_actual:
                            "CALCULO_FISCAL",

                        solicitar_calculo:
                            true

                    });
            }


            return res
                .status(200)
                .json({

                    ok: true,

                    respuesta:
                        siguientePregunta(
                            expediente
                        ),

                    paso_actual:
                        expediente
                            .paso_actual

                });
        }


        /* =================================================
           GUARDAR MENSAJE USUARIO
        ================================================= */

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


        /* =================================================
           VALIDACIÓN
        ================================================= */

        let update = {};

        let errorValidacion =
            null;


        let respuestaDirecta =
            null;


        let pasoDirecto =
            null;


        let vehiculoIdentificado =
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
                    !Number.isFinite(
                        precio
                    ) ||
                    precio <= 0
                ) {

                    errorValidacion =
                        "Indícame el precio de compraventa. Por ejemplo: 8500 €.";

                } else {

                    update
                        .precio_compraventa =
                        precio;
                }

                break;
            }


            /* =============================================
               FECHA
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

                    update
                        .fecha_compraventa =
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
               MODELO
            ============================================= */

            case "MODELO": {

                const valor =
                    normalizarTexto(
                        mensaje
                    );


                if (!valor) {

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

                    update
                        .fecha_primera_matriculacion =
                        fecha;
                }

                break;
            }


            /* =============================================
               COMBUSTIBLE
            ============================================= */

            case "COMBUSTIBLE": {

                const valor =
                    normalizarTexto(
                        mensaje
                    );


                if (
                    valor.length < 2
                ) {

                    errorValidacion =
                        "Indícame el combustible del vehículo.";

                } else {

                    update.combustible =
                        valor;
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
                            .replace(
                                /[^\d]/g,
                                ""
                            )
                    );


                if (
                    !Number.isInteger(
                        numero
                    ) ||
                    numero <= 0 ||
                    numero > 10000
                ) {

                    errorValidacion =
                        "Indícame la cilindrada en cc. Por ejemplo: 1368.";

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

                const potencia =
                    extraerPotencia(
                        mensaje
                    );


                if (!potencia) {

                    errorValidacion =
                        "Indícame la potencia y su unidad. Por ejemplo: 132 kW o 180 CV.";

                } else if (
                    potencia.tipo ===
                    "DESCONOCIDA"
                ) {

                    errorValidacion =
                        "Necesito saber la unidad de la potencia. Por ejemplo: 132 kW o 180 CV.";

                } else {

                    update
                        .potencia_declarada =
                        mensaje.trim();
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
                            .replace(
                                /[^\d]/g,
                                ""
                            )
                    );


                if (
                    !Number.isInteger(
                        numero
                    ) ||
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

                const valor =
                    normalizarTexto(
                        mensaje
                    );


                if (
                    valor.length < 3
                ) {

                    errorValidacion =
                        "Indícame la comunidad autónoma del domicilio fiscal del comprador.";

                } else {

                    update
                        .comunidad_autonoma =
                        valor;
                }

                break;
            }


            /* =============================================
               PROVINCIA
            ============================================= */

            case "PROVINCIA": {

                const valor =
                    normalizarTexto(
                        mensaje
                    );


                if (
                    valor.length < 2
                ) {

                    errorValidacion =
                        "Indícame la provincia del domicilio fiscal del comprador.";

                } else {

                    update.provincia =
                        valor;
                }

                break;
            }


            /* =============================================
               CARROCERÍA
            ============================================= */

            case "CARROCERIA_FISCAL": {

                const valor =
                    normalizarTexto(
                        mensaje
                    )
                    .toUpperCase();


                if (
                    valor.includes(
                        "CABRIO"
                    ) ||
                    valor.includes(
                        "DESCAPOT"
                    ) ||
                    valor.includes(
                        "CONVERTIBLE"
                    ) ||
                    valor.includes(
                        "SPIDER"
                    )
                ) {

                    update
                        .carroceria_fiscal =
                        "CABRIO";

                } else if (
                    valor.includes(
                        "NORMAL"
                    ) ||
                    valor.includes(
                        "CERRAD"
                    ) ||
                    valor.includes(
                        "NO DESCAPOT"
                    )
                ) {

                    update
                        .carroceria_fiscal =
                        "NORMAL";

                } else {

                    errorValidacion =
                        "Indícame si es versión normal/cerrada o descapotable/cabrio.";
                }

                break;
            }


            /* =============================================
               TRANSMISIÓN
            ============================================= */

            case "TRANSMISION_FISCAL": {

                const valor =
                    normalizarTexto(
                        mensaje
                    )
                    .toUpperCase();


                if (
                    valor.includes(
                        "SECUENCIAL"
                    ) ||
                    valor.includes(
                        "AUTOMATIC"
                    ) ||
                    valor.includes(
                        "AUTOMÁTIC"
                    )
                ) {

                    update
                        .transmision_fiscal =
                        "SECUENCIAL";

                } else if (
                    valor.includes(
                        "MANUAL"
                    )
                ) {

                    update
                        .transmision_fiscal =
                        "MANUAL";

                } else {

                    errorValidacion =
                        "Indícame si el cambio es manual o secuencial/automático.";
                }

                break;
            }


            /* =============================================
               VERSIÓN EXACTA
            ============================================= */

            case "VERSION_EXACTA": {

                const resultado =
                    await procesarIdentificacion(
                        db,
                        expediente,
                        mensaje
                    );


                respuestaDirecta =
                    resultado.respuesta;


                pasoDirecto =
                    resultado.paso;


                vehiculoIdentificado =
                    resultado.vehiculo ||
                    null;


                if (
                    pasoDirecto !==
                    "CALCULO_FISCAL"
                ) {

                    await db
                        .from(
                            "expedientes"
                        )
                        .update({

                            paso_actual:
                                pasoDirecto,

                            updated_at:
                                new Date()
                                    .toISOString()

                        })
                        .eq(
                            "id",
                            expedienteId
                        );
                }


                break;
            }


            /* =============================================
               IDENTIFICAR VEHÍCULO
            ============================================= */

            case "IDENTIFICAR_VEHICULO": {

                const resultado =
                    await procesarIdentificacion(
                        db,
                        expediente
                    );


                respuestaDirecta =
                    resultado.respuesta;


                pasoDirecto =
                    resultado.paso;


                vehiculoIdentificado =
                    resultado.vehiculo ||
                    null;


                break;
            }


            /* =============================================
               CÁLCULO
            ============================================= */

            case "CALCULO_FISCAL": {

                return res
                    .status(200)
                    .json({

                        ok: true,

                        respuesta:
                            "El vehículo ya está identificado. Ahora voy a verificar el cálculo fiscal.",

                        paso_actual:
                            "CALCULO_FISCAL",

                        solicitar_calculo:
                            true

                    });
            }


            /* =============================================
               PAGO
            ============================================= */

            case "PAGO_PENDIENTE": {

                return res
                    .status(200)
                    .json({

                        ok: true,

                        respuesta:
                            "El cálculo está preparado. Revisa el desglose antes del pago.",

                        paso_actual:
                            "PAGO_PENDIENTE"

                    });
            }


            default: {

                return res
                    .status(200)
                    .json({

                        ok: true,

                        respuesta:
                            "Este expediente ya ha completado esta fase.",

                        paso_actual:
                            expediente
                                .paso_actual

                    });
            }
        }


        /* =================================================
           ERROR VALIDACIÓN
        ================================================= */

        if (
            errorValidacion
        ) {

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


            return res
                .status(200)
                .json({

                    ok: true,

                    respuesta:
                        errorValidacion,

                    paso_actual:
                        expediente
                            .paso_actual

                });
        }


        /* =================================================
           RESPUESTA DIRECTA DE IDENTIFICACIÓN
        ================================================= */

        if (
            respuestaDirecta
        ) {

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
                        respuestaDirecta

                });


            return res
                .status(200)
                .json({

                    ok: true,

                    respuesta:
                        respuestaDirecta,

                    paso_actual:
                        pasoDirecto,

                    solicitar_calculo:
                        pasoDirecto ===
                        "CALCULO_FISCAL",

                    vehiculo:
                        vehiculoIdentificado

                });
        }


        /* =================================================
           AVANZAR
        ================================================= */

        const nuevoPaso =
            siguientePaso(
                expediente
                    .paso_actual
            );


        update.paso_actual =
            nuevoPaso;


        if (
            nuevoPaso ===
            "IDENTIFICAR_VEHICULO"
        ) {

            update.estado =
                "IDENTIFICANDO_VEHICULO";
        }


        update.updated_at =
            new Date()
                .toISOString();


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


        if (
            updateError
        ) {

            console.error(
                updateError
            );


            return res
                .status(500)
                .json({

                    ok: false,

                    error:
                        "No se pudo guardar el avance del expediente."

                });
        }


        const actualizado = {

            ...expediente,
            ...update

        };


        /* =================================================
           SI ACABAMOS DE LLEGAR A IDENTIFICACIÓN,
           INTENTAMOS IDENTIFICAR EN ESTE MISMO MENSAJE
        ================================================= */

        if (
            nuevoPaso ===
            "IDENTIFICAR_VEHICULO"
        ) {

            const resultado =
                await procesarIdentificacion(
                    db,
                    actualizado
                );


            if (
                resultado.paso !==
                "CALCULO_FISCAL"
            ) {

                await db
                    .from("expedientes")
                    .update({

                        paso_actual:
                            resultado.paso,

                        updated_at:
                            new Date()
                                .toISOString()

                    })
                    .eq(
                        "id",
                        expedienteId
                    );
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
                        resultado.respuesta

                });


            return res
                .status(200)
                .json({

                    ok: true,

                    respuesta:
                        resultado.respuesta,

                    paso_actual:
                        resultado.paso,

                    solicitar_calculo:
                        resultado.paso ===
                        "CALCULO_FISCAL",

                    vehiculo:
                        resultado.vehiculo ||
                        null

                });
        }


        /* =================================================
           PREGUNTA SIGUIENTE
        ================================================= */

        const respuestaIA =
            siguientePregunta(
                actualizado
            );


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


        return res
            .status(200)
            .json({

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

        console.error(
            "Error chat:",
            error
        );


        return res
            .status(500)
            .json({

                ok: false,

                error:
                    "Error interno del servidor."

            });
    }
}