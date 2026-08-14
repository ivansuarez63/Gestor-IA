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
   CARROCERÍA
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
   TRANSMISIÓN
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

            return "Necesito distinguir la versión exacta. ¿El vehículo es normal/cerrado o descapotable/cabrio?";


        case "TRANSMISION_FISCAL":

            return "¿El cambio del vehículo es manual o secuencial/automático?";


        case "VERSION_EXACTA":

            return "He encontrado varias versiones posibles. Indícame la versión exacta del vehículo tal como aparece en su documentación.";


        case "TIPO_VENDEDOR":

            return "Una última comprobación fiscal: ¿compras el vehículo a un particular o a una empresa/profesional que te entrega factura?";


        case "FACTURA_PENDIENTE":

            return "Necesito verificar la factura de la empresa/profesional antes de calcular el tratamiento fiscal de la operación.";


        case "CALCULO_FISCAL":

            return "Perfecto. Ya tengo los datos necesarios. Voy a calcular el coste del traspaso.";


        case "PAGO_PENDIENTE":

            return "El cálculo está terminado. Revisa el importe antes de continuar con el pago.";


        default:

            return "Vamos a continuar con tu traspaso.";
    }
}


/* =====================================================
   FLUJO NORMAL
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
   BUSCAR CANDIDATOS
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
        throw error;
    }


    let candidatos =
        data || [];


    /* =================================================
       MODELO
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


    /* =================================================
       AÑO
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
       POTENCIA
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
                                vehiculo
                                    .potencia_kw
                            );


                        return (
                            Number.isFinite(oficial) &&
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
                                vehiculo
                                    .potencia_cv
                            );


                        return (
                            Number.isFinite(oficial) &&
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
   DATO QUE FALTA
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
   GUARDAR VEHÍCULO IDENTIFICADO
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

                valor_oficial_boe:
                    vehiculo.valor_oficial,

                valor_fiscal:
                    vehiculo.valor_oficial,

                /*
                   Ahora NO vamos directamente
                   al cálculo.

                   Primero preguntamos quién vende.
                */

                paso_actual:
                    "TIPO_VENDEDOR",

                estado:
                    "DATOS_FISCALES",

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
   IDENTIFICACIÓN
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


    if (
        candidatos.length === 0
    ) {

        return {

            paso:
                "VERSION_EXACTA",

            respuesta:
                "No he podido identificar con certeza la versión fiscal. Indícame la versión exacta tal como aparece en la documentación."

        };
    }


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

            paso:
                "TIPO_VENDEDOR",

            vehiculo,

            respuesta:
                `Perfecto. He identificado el vehículo como ${vehiculo.marca} ${vehiculo.modelo_tipo}. Una última comprobación: ¿lo compras a un particular o a una empresa/profesional que te entrega factura?`

        };
    }


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
            "He encontrado varias versiones compatibles. ¿Tu vehículo es normal/cerrado o descapotable/cabrio?";

    } else if (
        paso ===
        "TRANSMISION_FISCAL"
    ) {

        respuesta =
            "Ya casi lo tengo. ¿El cambio es manual o secuencial/automático?";

    } else {

        const nombres =
            [
                ...new Set(
                    candidatos.map(
                        vehiculo =>
                            vehiculo
                                .modelo_tipo
                    )
                )
            ]
            .slice(0, 8);


        respuesta =
            "He encontrado varias versiones posibles. Indícame cuál corresponde:\n\n" +
            nombres
                .map(
                    (nombre, index) =>
                        `${index + 1}. ${nombre}`
                )
                .join("\n");
    }


    return {

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
        req.method !== "POST"
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


        const expedienteId =
            String(
                req.body?.expediente_id ||
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
           SIN MENSAJE
        ================================================= */

        if (!mensaje) {


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
                    "TIPO_VENDEDOR"
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
                            false,

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
                            "Perfecto. Voy a calcular impuestos, tasa DGT y servicio Gestor-IA.",

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
           GUARDAR MENSAJE
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


        let update = {};

        let errorValidacion = null;

        let respuestaDirecta = null;

        let pasoDirecto = null;

        let vehiculoIdentificado = null;


        switch (
            expediente.paso_actual
        ) {


            case "PRECIO": {

                const precio =
                    Number(
                        limpiarNumero(
                            mensaje
                        )
                    );


                if (
                    !Number.isFinite(precio) ||
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


            case "FECHA": {

                const fecha =
                    convertirFecha(
                        mensaje
                    );


                if (!fecha) {

                    errorValidacion =
                        "Indícame una fecha válida. Por ejemplo: 13/08/2026.";

                } else {

                    update
                        .fecha_compraventa =
                        fecha;
                }

                break;
            }


            case "MARCA": {

                const valor =
                    normalizarTexto(
                        mensaje
                    );


                if (
                    valor.length < 2
                ) {

                    errorValidacion =
                        "Indícame la marca.";

                } else {

                    update.marca =
                        valor;
                }

                break;
            }


            case "MODELO": {

                const valor =
                    normalizarTexto(
                        mensaje
                    );


                if (!valor) {

                    errorValidacion =
                        "Indícame el modelo.";

                } else {

                    update.modelo =
                        valor;
                }

                break;
            }


            case "PRIMERA_MATRICULACION": {

                const fecha =
                    convertirFecha(
                        mensaje
                    );


                if (!fecha) {

                    errorValidacion =
                        "Indícame la fecha de primera matriculación.";

                } else {

                    update
                        .fecha_primera_matriculacion =
                        fecha;
                }

                break;
            }


            case "COMBUSTIBLE": {

                const valor =
                    normalizarTexto(
                        mensaje
                    );


                if (
                    valor.length < 2
                ) {

                    errorValidacion =
                        "Indícame el combustible.";

                } else {

                    update.combustible =
                        valor;
                }

                break;
            }


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
                    !Number.isInteger(numero) ||
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


            case "POTENCIA": {

                const potencia =
                    extraerPotencia(
                        mensaje
                    );


                if (!potencia) {

                    errorValidacion =
                        "Indícame la potencia. Por ejemplo: 132 kW.";

                } else if (
                    potencia.tipo ===
                    "DESCONOCIDA"
                ) {

                    errorValidacion =
                        "Indícame también la unidad: kW o CV.";

                } else {

                    update
                        .potencia_declarada =
                        mensaje.trim();
                }

                break;
            }


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
                    !Number.isInteger(numero) ||
                    numero < 0
                ) {

                    errorValidacion =
                        "Indícame los kilómetros.";

                } else {

                    update.kilometros =
                        numero;
                }

                break;
            }


            case "COMUNIDAD": {

                const valor =
                    normalizarTexto(
                        mensaje
                    );


                if (
                    valor.length < 3
                ) {

                    errorValidacion =
                        "Indícame la comunidad autónoma del comprador.";

                } else {

                    update
                        .comunidad_autonoma =
                        valor;
                }

                break;
            }


            case "PROVINCIA": {

                const valor =
                    normalizarTexto(
                        mensaje
                    );


                if (
                    valor.length < 2
                ) {

                    errorValidacion =
                        "Indícame la provincia.";

                } else {

                    update.provincia =
                        valor;
                }

                break;
            }


            case "CARROCERIA_FISCAL": {

                const valor =
                    normalizarTexto(
                        mensaje
                    )
                    .toUpperCase();


                if (
                    valor.includes("CABRIO") ||
                    valor.includes("DESCAPOT") ||
                    valor.includes("SPIDER") ||
                    valor.includes("CONVERTIBLE")
                ) {

                    update
                        .carroceria_fiscal =
                        "CABRIO";

                } else if (
                    valor.includes("NORMAL") ||
                    valor.includes("CERRAD")
                ) {

                    update
                        .carroceria_fiscal =
                        "NORMAL";

                } else {

                    errorValidacion =
                        "Indícame si es normal/cerrado o descapotable/cabrio.";
                }

                break;
            }


            case "TRANSMISION_FISCAL": {

                const valor =
                    normalizarTexto(
                        mensaje
                    )
                    .toUpperCase();


                if (
                    valor.includes("AUTOM") ||
                    valor.includes("SECUENCIAL")
                ) {

                    update
                        .transmision_fiscal =
                        "SECUENCIAL";

                } else if (
                    valor.includes("MANUAL")
                ) {

                    update
                        .transmision_fiscal =
                        "MANUAL";

                } else {

                    errorValidacion =
                        "Indícame si es manual o secuencial/automático.";
                }

                break;
            }


            /* =============================================
               PARTICULAR / EMPRESA
            ============================================= */

            case "TIPO_VENDEDOR": {

                const valor =
                    normalizarTexto(
                        mensaje
                    )
                    .toUpperCase();


                if (
                    valor.includes("EMPRESA") ||
                    valor.includes("PROFESIONAL") ||
                    valor.includes("CONCESIONARIO")
                ) {

                    update
                        .tipo_vendedor_declarado =
                        "EMPRESA";

                    update
                        .tipo_vendedor_verificado =
                        null;

                    update
                        .factura_verificada =
                        false;

                    update
                        .paso_actual =
                        "FACTURA_PENDIENTE";

                    update.estado =
                        "FACTURA_PENDIENTE";


                    respuestaDirecta =
                        "Perfecto. Al tratarse de una empresa/profesional necesitaremos verificar la factura antes de determinar el tratamiento fiscal. No podrás reducir el impuesto únicamente marcando esta opción.";

                    pasoDirecto =
                        "FACTURA_PENDIENTE";

                } else if (
                    valor.includes("PARTICULAR") ||
                    valor.includes("PERSONA")
                ) {

                    update
                        .tipo_vendedor_declarado =
                        "PARTICULAR";

                    update
                        .tipo_vendedor_verificado =
                        "PARTICULAR";

                    update
                        .paso_actual =
                        "CALCULO_FISCAL";

                    update.estado =
                        "CALCULO_FISCAL";


                    respuestaDirecta =
                        "Perfecto. Ya tengo todo lo necesario. Voy a calcular el impuesto, la tasa DGT y el servicio Gestor-IA.";

                    pasoDirecto =
                        "CALCULO_FISCAL";

                } else {

                    errorValidacion =
                        "Respóndeme únicamente: particular o empresa/profesional.";
                }

                break;
            }


            case "FACTURA_PENDIENTE": {

                return res
                    .status(200)
                    .json({

                        ok: true,

                        respuesta:
                            "La factura está pendiente de verificación. Más adelante habilitaremos aquí la subida del documento.",

                        paso_actual:
                            "FACTURA_PENDIENTE",

                        requiere_factura:
                            true

                    });
            }


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
                    "TIPO_VENDEDOR"
                ) {

                    await db
                        .from("expedientes")
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


            case "CALCULO_FISCAL": {

                return res
                    .status(200)
                    .json({

                        ok: true,

                        respuesta:
                            "Voy a calcular ahora el coste total del traspaso.",

                        paso_actual:
                            "CALCULO_FISCAL",

                        solicitar_calculo:
                            true

                    });
            }


            case "PAGO_PENDIENTE": {

                return res
                    .status(200)
                    .json({

                        ok: true,

                        respuesta:
                            "El cálculo está terminado. Revisa el desglose del pago.",

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
           ERROR
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
           RESPUESTA DIRECTA
        ================================================= */

        if (
            respuestaDirecta &&
            (
                expediente.paso_actual ===
                "TIPO_VENDEDOR"
            )
        ) {

            update.updated_at =
                new Date()
                    .toISOString();


            const {
                error: updateError
            } =
                await db
                    .from("expedientes")
                    .update(update)
                    .eq(
                        "id",
                        expedienteId
                    );


            if (updateError) {
                throw updateError;
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

                    requiere_factura:
                        pasoDirecto ===
                        "FACTURA_PENDIENTE"

                });
        }


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
                .update(update)
                .eq(
                    "id",
                    expedienteId
                );


        if (updateError) {
            throw updateError;
        }


        const actualizado = {
            ...expediente,
            ...update
        };


        /* =================================================
           IDENTIFICACIÓN AUTOMÁTICA
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
                "TIPO_VENDEDOR"
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
                        false,

                    vehiculo:
                        resultado.vehiculo ||
                        null

                });
        }


        /* =================================================
           SIGUIENTE PREGUNTA
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