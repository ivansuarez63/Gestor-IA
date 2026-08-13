import crypto from "crypto";
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
   CLIENTE SUPABASE DEL USUARIO
===================================================== */

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


/* =====================================================
   OBTENER USUARIO
===================================================== */

async function obtenerUsuario(req, res) {

    const authorization =
        req.headers.authorization || "";


    if (
        !authorization.startsWith(
            "Bearer "
        )
    ) {

        res.status(401).json({
            ok: false,
            error:
                "Necesitas iniciar sesión."
        });

        return null;
    }


    const token =
        authorization
            .substring(7)
            .trim();


    const {
        data,
        error
    } =
        await supabase.auth.getUser(
            token
        );


    if (
        error ||
        !data?.user
    ) {

        res.status(401).json({
            ok: false,
            error:
                "Sesión no válida."
        });

        return null;
    }


    return {

        token,

        usuario:
            data.user,

        db:
            crearClienteUsuario(
                token
            )

    };
}


/* =====================================================
   NORMALIZAR TEXTO
===================================================== */

function normalizarTexto(texto) {

    return String(texto || "")
        .normalize("NFD")
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .trim()
        .replace(/\s+/g, " ");
}


/* =====================================================
   EXTRAER AÑO
===================================================== */

function obtenerAnio(fecha) {

    if (!fecha) {
        return null;
    }


    const match =
        String(fecha)
            .match(
                /^(\d{4})/
            );


    if (!match) {
        return null;
    }


    const anio =
        Number(
            match[1]
        );


    return Number.isInteger(anio)
        ? anio
        : null;
}


/* =====================================================
   EXTRAER POTENCIA EN KW

   Acepta por ejemplo:
   "132 kW"
   "132kw"
   "180 CV"
===================================================== */

function extraerPotenciaKW(texto) {

    const valor =
        String(texto || "")
            .trim()
            .toLowerCase();


    const matchKW =
        valor.match(
            /(\d+(?:[.,]\d+)?)\s*kw/
        );


    if (matchKW) {

        const numero =
            Number(
                matchKW[1]
                    .replace(",", ".")
            );


        if (
            Number.isFinite(numero) &&
            numero > 0
        ) {

            return numero;
        }
    }


    return null;
}


/* =====================================================
   CREAR EXPEDIENTE
===================================================== */

async function crearExpediente(
    req,
    res,
    auth
) {

    const matricula =
        String(
            req.body?.matricula || ""
        )
        .trim()
        .replace(/\s/g, "")
        .toUpperCase();


    if (!matricula) {

        return res.status(400).json({
            ok: false,
            error:
                "Introduce la matrícula."
        });
    }


    /*
       Comprobar si el usuario ya tiene
       un expediente activo para esa matrícula.
    */

    const {
        data: existente,
        error: buscarError
    } =
        await auth.db
            .from("expedientes")
            .select("*")
            .eq(
                "creador_id",
                auth.usuario.id
            )
            .eq(
                "matricula",
                matricula
            )
            .neq(
                "estado",
                "FINALIZADO"
            )
            .order(
                "created_at",
                {
                    ascending: false
                }
            )
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

            existente:
                true,

            expediente:
                existente

        });
    }


    /*
       Crear expediente nuevo.
    */

    const {
        data: expediente,
        error: insertarError
    } =
        await auth.db
            .from("expedientes")
            .insert({

                creador_id:
                    auth.usuario.id,

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

        existente:
            false,

        expediente

    });
}


/* =====================================================
   LISTAR EXPEDIENTES
===================================================== */

async function listarExpedientes(
    req,
    res,
    auth
) {

    const {
        data,
        error
    } =
        await auth.db
            .from("expedientes")
            .select("*")
            .order(
                "created_at",
                {
                    ascending: false
                }
            );


    if (error) {

        console.error(
            "Error listando expedientes:",
            error
        );


        return res.status(500).json({

            ok: false,

            error:
                "No se pudieron cargar los expedientes."

        });
    }


    return res.status(200).json({

        ok: true,

        expedientes:
            data || []

    });
}


/* =====================================================
   BUSCAR VEHÍCULO EN CATÁLOGO FISCAL 2026
===================================================== */

async function buscarVehiculo(
    req,
    res,
    auth
) {

    /*
       Podemos recibir los datos directamente
       o solo expediente_id.

       Si viene expediente_id,
       recuperamos los datos guardados por chat.js.
    */

    const expedienteId =
        String(
            req.body?.expediente_id || ""
        ).trim();


    let marca =
        String(
            req.body?.marca || ""
        ).trim();


    let modelo =
        String(
            req.body?.modelo || ""
        ).trim();


    let cilindrada =
        Number(
            req.body?.cilindrada || 0
        );


    let potenciaKW =
        Number(
            req.body?.potencia_kw || 0
        );


    let anio =
        Number(
            req.body?.anio || 0
        );


    /*
       Si recibimos expediente_id,
       usamos directamente los datos
       que la IA ya recopiló.
    */

    let expediente =
        null;


    if (expedienteId) {

        const {
            data,
            error
        } =
            await auth.db
                .from("expedientes")
                .select("*")
                .eq(
                    "id",
                    expedienteId
                )
                .single();


        if (
            error ||
            !data
        ) {

            return res.status(404).json({

                ok: false,

                error:
                    "Expediente no encontrado."

            });
        }


        expediente =
            data;


        if (!marca) {

            marca =
                expediente.marca || "";
        }


        if (!modelo) {

            modelo =
                expediente.modelo || "";
        }


        if (
            !cilindrada ||
            cilindrada <= 0
        ) {

            cilindrada =
                Number(
                    expediente.cilindrada || 0
                );
        }


        if (
            !potenciaKW ||
            potenciaKW <= 0
        ) {

            potenciaKW =
                extraerPotenciaKW(
                    expediente
                        .potencia_declarada
                ) || 0;
        }


        if (
            !anio ||
            anio <= 1900
        ) {

            anio =
                obtenerAnio(
                    expediente
                        .fecha_primera_matriculacion
                ) || 0;
        }
    }


    /* =================================================
       VALIDACIONES
    ================================================= */

    marca =
        normalizarTexto(
            marca
        )
        .toUpperCase();


    modelo =
        normalizarTexto(
            modelo
        );


    if (!marca) {

        return res.status(400).json({

            ok: false,

            error:
                "Falta la marca del vehículo."

        });
    }


    if (!modelo) {

        return res.status(400).json({

            ok: false,

            error:
                "Falta el modelo del vehículo."

        });
    }


    if (
        !Number.isFinite(cilindrada) ||
        cilindrada <= 0
    ) {

        return res.status(400).json({

            ok: false,

            error:
                "Falta la cilindrada del vehículo."

        });
    }


    /* =================================================
       BUSCAR POR MARCA + CILINDRADA

       No empezamos haciendo ilike con todo el modelo
       porque el cliente puede escribir:
       "595 Competizione"

       y el BOE puede tener:
       "500 1.4 T-Jet 595 Competizione"
    ================================================= */

    const {
        data: baseMarca,
        error: errorMarca
    } =
        await auth.db
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


    if (errorMarca) {

        console.error(
            "Error consultando valoraciones:",
            errorMarca
        );


        return res.status(500).json({

            ok: false,

            error:
                "No se pudo consultar la tabla oficial de valoraciones."

        });
    }


    let candidatos =
        baseMarca || [];


    /* =================================================
       NORMALIZAR MODELO PARA COMPARACIÓN
    ================================================= */

    const palabrasModelo =
        normalizarTexto(
            modelo
        )
        .toUpperCase()
        .split(" ")
        .filter(
            palabra =>
                palabra.length >= 2
        );


    /*
       Filtramos candidatos cuyo nombre oficial
       contenga las palabras importantes indicadas
       por el usuario.
    */

    if (
        palabrasModelo.length > 0
    ) {

        candidatos =
            candidatos.filter(
                vehiculo => {

                    const nombreOficial =
                        normalizarTexto(
                            vehiculo.modelo_tipo
                        )
                        .toUpperCase();


                    return palabrasModelo.every(
                        palabra =>
                            nombreOficial.includes(
                                palabra
                            )
                    );
                }
            );
    }


    /* =================================================
       FILTRAR POR AÑO DE PRIMERA MATRICULACIÓN
    ================================================= */

    if (
        Number.isInteger(anio) &&
        anio > 1900
    ) {

        candidatos =
            candidatos.filter(
                vehiculo => {

                    const inicio =
                        vehiculo
                            .periodo_inicio ===
                            null
                            ?
                            null
                            :
                            Number(
                                vehiculo
                                    .periodo_inicio
                            );


                    const fin =
                        vehiculo
                            .periodo_fin ===
                            null
                            ?
                            null
                            :
                            Number(
                                vehiculo
                                    .periodo_fin
                            );


                    if (
                        Number.isFinite(inicio) &&
                        anio < inicio
                    ) {

                        return false;
                    }


                    if (
                        Number.isFinite(fin) &&
                        anio > fin
                    ) {

                        return false;
                    }


                    return true;
                }
            );
    }


    /* =================================================
       FILTRAR POR POTENCIA KW SI LA TENEMOS
    ================================================= */

    if (
        Number.isFinite(potenciaKW) &&
        potenciaKW > 0
    ) {

        const candidatosPotencia =
            candidatos.filter(
                vehiculo => {

                    const potencia =
                        Number(
                            vehiculo
                                .potencia_kw
                        );


                    if (
                        !Number.isFinite(
                            potencia
                        )
                    ) {

                        return false;
                    }


                    /*
                       Permitimos una diferencia muy pequeña
                       por posibles decimales.
                    */

                    return (
                        Math.abs(
                            potencia -
                            potenciaKW
                        ) <= 0.5
                    );
                }
            );


        /*
           Solo aplicamos este filtro si
           encontramos resultados.

           Si no, mantenemos candidatos y
           pediremos aclaración en vez de
           afirmar que no existe el vehículo.
        */

        if (
            candidatosPotencia.length > 0
        ) {

            candidatos =
                candidatosPotencia;
        }
    }


    /* =================================================
       SIN COINCIDENCIAS
    ================================================= */

    if (
        candidatos.length === 0
    ) {

        return res.status(200).json({

            ok: true,

            encontrado:
                false,

            coincidencia_exacta:
                false,

            necesita_mas_datos:
                true,

            numero_coincidencias:
                0,

            mensaje:
                "No se ha podido identificar con certeza una versión compatible en la tabla oficial de valoraciones de 2026.",

            solicitar:
                "version_exacta"

        });
    }


    /* =================================================
       UNA ÚNICA COINCIDENCIA
    ================================================= */

    if (
        candidatos.length === 1
    ) {

        const vehiculo =
            candidatos[0];


        /*
           Si tenemos expediente,
           guardamos la valoración localizada.

           Todavía NO significa que el ITP
           esté calculado.

           Solo hemos identificado el vehículo.
        */

        if (expedienteId) {

            const {
                error: guardarError
            } =
                await auth.db
                    .from(
                        "expedientes"
                    )
                    .update({

                        valor_fiscal:
                            vehiculo
                                .valor_oficial,

                        updated_at:
                            new Date()
                                .toISOString()

                    })
                    .eq(
                        "id",
                        expedienteId
                    );


            if (guardarError) {

                console.error(
                    "Error guardando valoración:",
                    guardarError
                );
            }
        }


        return res.status(200).json({

            ok: true,

            encontrado:
                true,

            coincidencia_exacta:
                true,

            necesita_mas_datos:
                false,

            vehiculo

        });
    }


    /* =================================================
       VARIAS COINCIDENCIAS

       NUNCA elegimos una al azar.
    ================================================= */

    /*
       Averiguar qué datos podrían distinguirlas.
    */

    const potencias =
        [
            ...new Set(
                candidatos
                    .map(
                        item =>
                            item.potencia_kw
                    )
                    .filter(
                        valor =>
                            valor !== null
                    )
            )
        ];


    const cvs =
        [
            ...new Set(
                candidatos
                    .map(
                        item =>
                            item.potencia_cv
                    )
                    .filter(
                        valor =>
                            valor !== null
                    )
            )
        ];


    const motores =
        [
            ...new Set(
                candidatos
                    .map(
                        item =>
                            item.tipo_motor
                    )
                    .filter(Boolean)
            )
        ];


    let datoNecesario =
        "version_exacta";


    if (
        potencias.length > 1
    ) {

        datoNecesario =
            "potencia_kw";

    } else if (
        cvs.length > 1
    ) {

        datoNecesario =
            "potencia_cv";

    } else if (
        motores.length > 1
    ) {

        datoNecesario =
            "tipo_motor";
    }


    return res.status(200).json({

        ok: true,

        encontrado:
            true,

        coincidencia_exacta:
            false,

        necesita_mas_datos:
            true,

        numero_coincidencias:
            candidatos.length,

        solicitar:
            datoNecesario,

        mensaje:
            "Hay varias versiones compatibles. Es necesario identificar la versión exacta antes de calcular los impuestos.",

        opciones_disponibles: {

            potencia_kw:
                potencias,

            potencia_cv:
                cvs,

            tipo_motor:
                motores

        },

        candidatos:
            candidatos.slice(
                0,
                20
            )

    });
}


/* =====================================================
   SIMULAR PAGO
===================================================== */

async function simularPago(
    req,
    res,
    auth
) {

    const expedienteId =
        String(
            req.body?.expediente_id || ""
        ).trim();


    if (!expedienteId) {

        return res.status(400).json({

            ok: false,

            error:
                "Falta el expediente."

        });
    }


    /*
       ATENCIÓN:

       Este endpoint es solo para desarrollo.

       Cuando exista pago real se eliminará
       y el pago se validará mediante el
       proveedor correspondiente.
    */

    const {
        data,
        error
    } =
        await auth.db
            .from("expedientes")
            .update({

                pago_validado:
                    true,

                invitacion_habilitada:
                    true,

                estado:
                    "PAGO_VALIDADO",

                updated_at:
                    new Date()
                        .toISOString()

            })
            .eq(
                "id",
                expedienteId
            )
            .select()
            .single();


    if (error) {

        console.error(
            "Error simulando pago:",
            error
        );


        return res.status(500).json({

            ok: false,

            error:
                "No se pudo simular el pago."

        });
    }


    return res.status(200).json({

        ok: true,

        expediente:
            data

    });
}


/* =====================================================
   GENERAR INVITACIÓN
===================================================== */

async function generarInvitacion(
    req,
    res,
    auth
) {

    const expedienteId =
        String(
            req.body?.expediente_id || ""
        ).trim();


    if (!expedienteId) {

        return res.status(400).json({

            ok: false,

            error:
                "Falta el expediente."

        });
    }


    const {
        data: expediente,
        error: expedienteError
    } =
        await auth.db
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


    /*
       Invitación bloqueada antes del pago.
    */

    if (
        expediente
            .pago_validado !== true ||
        expediente
            .invitacion_habilitada !== true
    ) {

        return res.status(403).json({

            ok: false,

            error:
                "La invitación solo está disponible después del pago."

        });
    }


    /*
       Si ya existe una invitación activa,
       devolvemos la misma.
    */

    const {
        data: existente,
        error: existenteError
    } =
        await auth.db
            .from("invitaciones")
            .select("*")
            .eq(
                "expediente_id",
                expedienteId
            )
            .eq(
                "usada",
                false
            )
            .gt(
                "caduca_en",
                new Date()
                    .toISOString()
            )
            .order(
                "created_at",
                {
                    ascending: false
                }
            )
            .limit(1)
            .maybeSingle();


    if (existenteError) {

        console.error(
            "Error buscando invitación:",
            existenteError
        );
    }


    if (existente) {

        return res.status(200).json({

            ok: true,

            enlace:
                `https://gestor-ia.eu/?invitacion=${existente.token}`,

            caduca_en:
                existente.caduca_en

        });
    }


    /*
       Crear token aleatorio seguro.
    */

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
    } =
        await auth.db
            .from("invitaciones")
            .insert({

                expediente_id:
                    expedienteId,

                token:
                    tokenInvitacion,

                usada:
                    false,

                caduca_en:
                    caduca
                        .toISOString()

            })
            .select()
            .single();


    if (invitacionError) {

        console.error(
            "Error creando invitación:",
            invitacionError
        );


        return res.status(500).json({

            ok: false,

            error:
                "No se pudo generar la invitación."

        });
    }


    /*
       Actualizar estado del expediente.
    */

    const {
        error: actualizarError
    } =
        await auth.db
            .from("expedientes")
            .update({

                estado:
                    "INVITACION_GENERADA",

                updated_at:
                    new Date()
                        .toISOString()

            })
            .eq(
                "id",
                expedienteId
            );


    if (actualizarError) {

        console.error(
            "Error actualizando expediente:",
            actualizarError
        );
    }


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

export default async function handler(
    req,
    res
) {

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


            /* =========================================
               CREAR
            ========================================= */

            case "crear": {

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


                return crearExpediente(
                    req,
                    res,
                    auth
                );
            }


            /* =========================================
               LISTAR
            ========================================= */

            case "listar": {

                if (
                    req.method !==
                    "GET"
                ) {

                    return res
                        .status(405)
                        .json({

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
            }


            /* =========================================
               BUSCAR VEHÍCULO
            ========================================= */

            case "buscar-vehiculo": {

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


                return buscarVehiculo(
                    req,
                    res,
                    auth
                );
            }


            /* =========================================
               SIMULAR PAGO
            ========================================= */

            case "simular-pago": {

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


                return simularPago(
                    req,
                    res,
                    auth
                );
            }


            /* =========================================
               GENERAR INVITACIÓN
            ========================================= */

            case "generar-invitacion": {

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


                return generarInvitacion(
                    req,
                    res,
                    auth
                );
            }


            /* =========================================
               ACCIÓN NO VÁLIDA
            ========================================= */

            default: {

                return res
                    .status(400)
                    .json({

                        ok: false,

                        error:
                            "Acción no válida."

                    });
            }
        }


    } catch (error) {

        console.error(
            "Error API expediente:",
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