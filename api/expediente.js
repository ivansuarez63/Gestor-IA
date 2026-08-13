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
   AUTENTICACIÓN
===================================================== */

async function obtenerUsuario(req, res) {

    const authorization =
        req.headers.authorization || "";


    if (
        !authorization.startsWith("Bearer ")
    ) {

        res.status(401).json({
            ok: false,
            error: "Necesitas iniciar sesión."
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
        await supabase.auth.getUser(token);


    if (
        error ||
        !data?.user
    ) {

        res.status(401).json({
            ok: false,
            error: "Sesión no válida."
        });

        return null;
    }


    return {

        token,

        usuario:
            data.user,

        db:
            crearClienteUsuario(token)

    };
}


/* =====================================================
   UTILIDADES
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


function redondearDinero(numero) {

    return Math.round(
        (Number(numero) + Number.EPSILON) * 100
    ) / 100;
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

    const anio =
        Number(match[1]);

    return Number.isInteger(anio)
        ? anio
        : null;
}


function diferenciaAnios(
    fechaInicial,
    fechaFinal
) {

    const inicio =
        new Date(
            `${fechaInicial}T00:00:00`
        );

    const fin =
        new Date(
            `${fechaFinal}T00:00:00`
        );


    if (
        Number.isNaN(inicio.getTime()) ||
        Number.isNaN(fin.getTime())
    ) {
        return null;
    }


    let anios =
        fin.getFullYear() -
        inicio.getFullYear();


    const aniversario =
        new Date(
            fin.getFullYear(),
            inicio.getMonth(),
            inicio.getDate()
        );


    if (
        fin < aniversario
    ) {
        anios--;
    }


    return Math.max(
        0,
        anios
    );
}


/* =====================================================
   DEPRECIACIÓN VEHÍCULO

   Tabla aplicada según años de utilización.
===================================================== */

function porcentajeDepreciacion(
    fechaPrimeraMatriculacion,
    fechaOperacion
) {

    const anios =
        diferenciaAnios(
            fechaPrimeraMatriculacion,
            fechaOperacion
        );


    if (
        anios === null
    ) {

        return null;
    }


    if (anios < 1) {
        return 100;
    }

    if (anios < 2) {
        return 84;
    }

    if (anios < 3) {
        return 67;
    }

    if (anios < 4) {
        return 56;
    }

    if (anios < 5) {
        return 47;
    }

    if (anios < 6) {
        return 39;
    }

    if (anios < 7) {
        return 34;
    }

    if (anios < 8) {
        return 28;
    }

    if (anios < 9) {
        return 24;
    }

    if (anios < 10) {
        return 19;
    }

    if (anios < 11) {
        return 17;
    }

    if (anios < 12) {
        return 13;
    }


    return 10;
}


/* =====================================================
   TARIFA GESTOR-IA

   PROVISIONALMENTE:
   FESTIVOS todavía deben conectarse al calendario
   territorial oficial.
===================================================== */

function calcularTarifaGestorIA(
    fecha = new Date()
) {

    const diaSemana =
        fecha.getDay();


    const horaDecimal =
        fecha.getHours() +
        fecha.getMinutes() / 60;


    /*
       Domingo = 0
       Sábado = 6
    */

    if (
        diaSemana === 0 ||
        diaSemana === 6
    ) {

        return {
            importe: 65,
            tarifa: "FUERA_HORARIO"
        };
    }


    if (
        horaDecimal < 8.5 ||
        horaDecimal >= 18
    ) {

        return {
            importe: 65,
            tarifa: "FUERA_HORARIO"
        };
    }


    return {
        importe: 60,
        tarifa: "ESTANDAR"
    };
}


/* =====================================================
   TASA DGT

   Transferencia ordinaria.
===================================================== */

function calcularTasaDGT(
    expediente
) {

    /*
       Más adelante:
       - ciclomotores
       - Canarias/Ceuta/Melilla a Península
       - otros supuestos especiales

       De momento solo aceptamos transferencia
       ordinaria de vehículo no ciclomotor.
    */

    const tipo =
        normalizarTexto(
            expediente.tipo_vehiculo
        )
        .toUpperCase();


    if (
        tipo.includes("CICLOMOTOR")
    ) {

        return {
            verificada: false,
            importe: null,
            motivo:
                "El expediente corresponde a un ciclomotor y requiere su tasa específica."
        };
    }


    return {
        verificada: true,
        importe: 55.70,
        codigo: "1.5",
        motivo: null
    };
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
                    false,

                calculo_fiscal_verificado:
                    false

            })
            .select()
            .single();


    if (insertarError) {

        console.error(
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
   LISTAR
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

        console.error(error);


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
   BUSCAR VEHÍCULO
===================================================== */

async function buscarVehiculo(
    req,
    res,
    auth
) {

    const expedienteId =
        String(
            req.body?.expediente_id || ""
        )
        .trim();


    let marca =
        String(
            req.body?.marca || ""
        )
        .trim();


    let modelo =
        String(
            req.body?.modelo || ""
        )
        .trim();


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


        marca =
            marca ||
            expediente.marca ||
            "";


        modelo =
            modelo ||
            expediente.modelo ||
            "";


        cilindrada =
            cilindrada ||
            Number(
                expediente.cilindrada || 0
            );


        anio =
            anio ||
            obtenerAnio(
                expediente
                    .fecha_primera_matriculacion
            ) ||
            0;
    }


    marca =
        normalizarTexto(
            marca
        )
        .toUpperCase();


    modelo =
        normalizarTexto(
            modelo
        );


    if (
        !marca ||
        !modelo ||
        !cilindrada
    ) {

        return res.status(400).json({

            ok: false,

            error:
                "Faltan datos para identificar el vehículo."

        });
    }


    const {
        data,
        error
    } =
        await auth.db
            .from(
                "valoraciones_vehiculos"
            )
            .select("*")
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

        console.error(error);


        return res.status(500).json({

            ok: false,

            error:
                "No se pudo consultar el catálogo oficial."

        });
    }


    let candidatos =
        data || [];


    const palabras =
        modelo
            .toUpperCase()
            .split(" ")
            .filter(
                palabra =>
                    palabra.length >= 2
            );


    candidatos =
        candidatos.filter(
            item => {

                const oficial =
                    normalizarTexto(
                        item.modelo_tipo
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


    if (
        Number.isInteger(anio) &&
        anio > 1900
    ) {

        candidatos =
            candidatos.filter(
                item => {

                    const inicio =
                        item.periodo_inicio === null
                            ? null
                            : Number(
                                item.periodo_inicio
                            );


                    const fin =
                        item.periodo_fin === null
                            ? null
                            : Number(
                                item.periodo_fin
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


    if (
        potenciaKW > 0
    ) {

        const filtrados =
            candidatos.filter(
                item =>
                    Math.abs(
                        Number(
                            item.potencia_kw
                        ) -
                        potenciaKW
                    ) <= 0.5
            );


        if (
            filtrados.length
        ) {

            candidatos =
                filtrados;
        }
    }


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
                true

        });
    }


    if (
        candidatos.length === 1
    ) {

        const vehiculo =
            candidatos[0];


        if (expedienteId) {

            await auth.db
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

                    updated_at:
                        new Date()
                            .toISOString()

                })
                .eq(
                    "id",
                    expedienteId
                );
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

        candidatos:
            candidatos.slice(
                0,
                20
            )

    });
}


/* =====================================================
   CALCULAR COSTE

   Esta acción NO inventará el ITP.

   Primero calcula:
   - Valor oficial
   - depreciación
   - valor fiscal depreciado
   - tasa DGT
   - tarifa Gestor-IA

   El pago permanece bloqueado hasta
   verificar la regla territorial.
===================================================== */

async function calcularCoste(
    req,
    res,
    auth
) {

    const expedienteId =
        String(
            req.body?.expediente_id || ""
        )
        .trim();


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

        return res.status(404).json({

            ok: false,

            error:
                "Expediente no encontrado."

        });
    }


    /* =================================================
       VEHÍCULO IDENTIFICADO
    ================================================= */

    if (
        !expediente.valoracion_id
    ) {

        return res.status(409).json({

            ok: false,

            calculo_verificado:
                false,

            pago_bloqueado:
                true,

            error:
                "El vehículo todavía no está identificado exactamente."

        });
    }


    const {
        data: valoracion,
        error: valoracionError
    } =
        await auth.db
            .from(
                "valoraciones_vehiculos"
            )
            .select("*")
            .eq(
                "id",
                expediente.valoracion_id
            )
            .single();


    if (
        valoracionError ||
        !valoracion
    ) {

        return res.status(409).json({

            ok: false,

            calculo_verificado:
                false,

            pago_bloqueado:
                true,

            error:
                "No se ha podido recuperar la valoración oficial."

        });
    }


    /* =================================================
       FECHAS
    ================================================= */

    if (
        !expediente
            .fecha_primera_matriculacion ||
        !expediente
            .fecha_compraventa
    ) {

        return res.status(409).json({

            ok: false,

            calculo_verificado:
                false,

            pago_bloqueado:
                true,

            error:
                "Faltan fechas necesarias para calcular la antigüedad."

        });
    }


    /* =================================================
       DEPRECIACIÓN
    ================================================= */

    const porcentaje =
        porcentajeDepreciacion(

            expediente
                .fecha_primera_matriculacion,

            expediente
                .fecha_compraventa

        );


    if (
        porcentaje === null
    ) {

        return res.status(409).json({

            ok: false,

            calculo_verificado:
                false,

            pago_bloqueado:
                true,

            error:
                "No se pudo determinar la depreciación."

        });
    }


    const valorOficial =
        Number(
            valoracion.valor_oficial
        );


    const valorDepreciado =
        redondearDinero(

            valorOficial *
            porcentaje /
            100

        );


    /* =================================================
       DGT
    ================================================= */

    const dgt =
        calcularTasaDGT(
            expediente
        );


    if (
        !dgt.verificada
    ) {

        return res.status(409).json({

            ok: false,

            calculo_verificado:
                false,

            pago_bloqueado:
                true,

            error:
                dgt.motivo

        });
    }


    /* =================================================
       GESTOR-IA
    ================================================= */

    const tarifa =
        calcularTarifaGestorIA(
            new Date()
        );


    /* =================================================
       ITP

       TODAVÍA BLOQUEADO HASTA QUE
       LAS REGLAS TERRITORIALES ESTÉN
       CARGADAS Y VERIFICADAS.
    ================================================= */

    const comunidad =
        normalizarTexto(
            expediente
                .comunidad_autonoma
        );


    const motivoBloqueo =
        comunidad
            ?
            `Pendiente de verificar la regla fiscal 2026 correspondiente a ${comunidad}.`
            :
            "Falta la comunidad autónoma del domicilio fiscal del comprador.";


    /*
       Guardamos el cálculo nacional.
    */

    const actualizacion = {

        valoracion_id:
            valoracion.id,

        modelo_fiscal_identificado:
            valoracion.modelo_tipo,

        valor_oficial_boe:
            valorOficial,

        porcentaje_depreciacion:
            porcentaje,

        valor_fiscal_depreciado:
            valorDepreciado,

        valor_fiscal:
            valorDepreciado,

        tasa_dgt_calculada:
            dgt.importe,

        tarifa_gestor_ia:
            tarifa.importe,

        impuesto_calculado:
            null,

        total_calculado:
            null,

        calculo_fiscal_verificado:
            false,

        motivo_calculo_bloqueado:
            motivoBloqueo,

        estado:
            "CALCULO_FISCAL",

        paso_actual:
            "CALCULO_FISCAL",

        updated_at:
            new Date()
                .toISOString()

    };


    const {
        error: guardarError
    } =
        await auth.db
            .from("expedientes")
            .update(
                actualizacion
            )
            .eq(
                "id",
                expedienteId
            );


    if (guardarError) {

        console.error(
            guardarError
        );


        return res.status(500).json({

            ok: false,

            error:
                "No se pudo guardar el cálculo."

        });
    }


    /*
       Guardar auditoría del cálculo.
    */

    await auth.db
        .from(
            "calculos_fiscales"
        )
        .upsert(
            {

                expediente_id:
                    expedienteId,

                ejercicio:
                    2026,

                valor_declarado:
                    expediente
                        .precio_compraventa,

                valor_fiscal:
                    valorDepreciado,

                base_imponible:
                    null,

                tipo_impositivo:
                    null,

                impuesto:
                    null,

                tasa_dgt:
                    dgt.importe,

                tarifa_gestor_ia:
                    tarifa.importe,

                total:
                    null,

                comunidad_autonoma:
                    comunidad,

                regla_aplicada:
                    null,

                fuente_valoracion:
                    "Orden HAC/1501/2025",

                fuente_normativa:
                    null,

                calculo_verificado:
                    false,

                motivo_no_verificado:
                    motivoBloqueo,

                updated_at:
                    new Date()
                        .toISOString()

            },
            {
                onConflict:
                    "expediente_id"
            }
        );


    return res.status(200).json({

        ok: true,

        calculo_verificado:
            false,

        pago_bloqueado:
            true,

        mensaje:
            "La valoración del vehículo y los costes nacionales están calculados. Falta verificar el impuesto territorial antes de habilitar el pago.",

        vehiculo: {

            marca:
                valoracion.marca,

            modelo:
                valoracion.modelo_tipo,

            valor_oficial:
                valorOficial,

            porcentaje_depreciacion:
                porcentaje,

            valor_fiscal:
                valorDepreciado

        },

        costes: {

            servicio_gestor_ia:
                tarifa.importe,

            tarifa:
                tarifa.tarifa,

            tasa_dgt:
                dgt.importe,

            impuesto:
                null,

            total:
                null

        },

        fiscal: {

            comunidad,

            verificado:
                false,

            motivo:
                motivoBloqueo

        }

    });
}


/* =====================================================
   SIMULAR PAGO

   SOLO DESARROLLO
===================================================== */

async function simularPago(
    req,
    res,
    auth
) {

    const expedienteId =
        String(
            req.body?.expediente_id || ""
        )
        .trim();


    if (!expedienteId) {

        return res.status(400).json({

            ok: false,

            error:
                "Falta el expediente."

        });
    }


    const {
        data: expediente,
        error: buscarError
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
        buscarError ||
        !expediente
    ) {

        return res.status(404).json({

            ok: false,

            error:
                "Expediente no encontrado."

        });
    }


    /*
       IMPORTANTE:

       Incluso la simulación se bloquea
       si todavía no existe cálculo fiscal
       verificado.

       Esto evita saltarnos la seguridad
       durante las pruebas.
    */

    if (
        expediente
            .calculo_fiscal_verificado !==
        true
    ) {

        return res.status(409).json({

            ok: false,

            pago_bloqueado:
                true,

            error:
                "No se puede validar el pago mientras el cálculo fiscal no esté verificado."

        });
    }


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
        )
        .trim();


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


    const {
        data: existente
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
                    caduca.toISOString()

            })
            .select()
            .single();


    if (invitacionError) {

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
                new Date()
                    .toISOString()

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
   HANDLER
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


            case "crear": {

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


                return crearExpediente(
                    req,
                    res,
                    auth
                );
            }


            case "listar": {

                if (
                    req.method !== "GET"
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


            case "buscar-vehiculo": {

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


                return buscarVehiculo(
                    req,
                    res,
                    auth
                );
            }


            case "calcular-coste": {

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


                return calcularCoste(
                    req,
                    res,
                    auth
                );
            }


            case "simular-pago": {

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


                return simularPago(
                    req,
                    res,
                    auth
                );
            }


            case "generar-invitacion": {

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


                return generarInvitacion(
                    req,
                    res,
                    auth
                );
            }


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