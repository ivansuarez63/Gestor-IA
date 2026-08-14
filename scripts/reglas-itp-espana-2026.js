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
   UTILIDADES
===================================================== */

function normalizar(texto) {

    return String(texto || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .replace(/\s+/g, " ")
        .toUpperCase();
}


function dinero(numero) {

    return Math.round(
        (Number(numero) + Number.EPSILON) * 100
    ) / 100;
}


function fechaValida(fecha) {

    const d = new Date(
        `${fecha}T00:00:00`
    );

    return Number.isNaN(d.getTime())
        ? null
        : d;
}


function antiguedadVehiculo(
    primeraMatriculacion,
    fechaOperacion
) {

    const inicio =
        fechaValida(
            primeraMatriculacion
        );

    const fin =
        fechaValida(
            fechaOperacion
        );

    if (!inicio || !fin) {
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

    if (fin < aniversario) {
        anios--;
    }

    return Math.max(
        0,
        anios
    );
}


/* =====================================================
   DEPRECIACIÓN OFICIAL
===================================================== */

function porcentajeDepreciacion(anios) {

    if (anios === null) {
        return null;
    }

    if (anios < 1) return 100;
    if (anios < 2) return 84;
    if (anios < 3) return 67;
    if (anios < 4) return 56;
    if (anios < 5) return 47;
    if (anios < 6) return 39;
    if (anios < 7) return 34;
    if (anios < 8) return 28;
    if (anios < 9) return 24;
    if (anios < 10) return 19;
    if (anios < 11) return 17;
    if (anios < 12) return 13;

    return 10;
}


/* =====================================================
   TERRITORIO FISCAL
===================================================== */

function codigoTerritorio(
    comunidad,
    provincia
) {

    const c =
        normalizar(comunidad);

    const p =
        normalizar(provincia);


    /*
       País Vasco:
       importa el territorio histórico.
    */

    if (
        p.includes("ALAVA") ||
        p.includes("ARABA")
    ) {
        return "ALA";
    }

    if (
        p.includes("BIZKAIA") ||
        p.includes("VIZCAYA")
    ) {
        return "BIZ";
    }

    if (
        p.includes("GIPUZKOA") ||
        p.includes("GUIPUZCOA")
    ) {
        return "GIP";
    }


    if (c.includes("ANDALUC")) return "AND";

    if (c.includes("ARAGON")) return "ARA";

    if (
        c.includes("ASTURIAS") ||
        c.includes("PRINCIPADO")
    ) return "AST";

    if (
        c.includes("BALEAR") ||
        c.includes("ILLES")
    ) return "BAL";

    if (c.includes("CANARI")) return "CAN";

    if (c.includes("CANTABR")) return "CNT";

    if (
        c.includes("CASTILLA-LA MANCHA") ||
        c.includes("CASTILLA LA MANCHA")
    ) return "CLM";

    if (
        c.includes("CASTILLA Y LEON") ||
        c.includes("CASTILLA LEON")
    ) return "CYL";

    if (
        c.includes("CATALU") ||
        c.includes("CATALUN")
    ) return "CAT";

    if (c.includes("EXTREMADURA")) return "EXT";

    if (c.includes("GALICIA")) return "GAL";

    if (c.includes("MADRID")) return "MAD";

    if (c.includes("MURCIA")) return "MUR";

    if (c.includes("RIOJA")) return "RIO";

    if (
        c.includes("VALENCIANA") ||
        c.includes("VALENCIA")
    ) return "VAL";

    if (c.includes("NAVARRA")) return "NAV";

    if (
        c.includes("PAIS VASCO") ||
        c.includes("EUSKADI")
    ) {

        return null;
    }

    if (c.includes("CEUTA")) return "CEU";

    if (c.includes("MELILLA")) return "MEL";

    return null;
}


/* =====================================================
   TARIFA GESTOR-IA

   Festivos se conectarán después al calendario.
===================================================== */

function calcularTarifaGestorIA() {

    const ahora =
        new Date();

    const dia =
        ahora.getDay();

    const hora =
        ahora.getHours() +
        ahora.getMinutes() / 60;


    if (
        dia === 0 ||
        dia === 6
    ) {

        return {
            importe: 65,
            tipo: "FUERA_HORARIO"
        };
    }


    if (
        hora < 8.5 ||
        hora >= 18
    ) {

        return {
            importe: 65,
            tipo: "FUERA_HORARIO"
        };
    }


    return {
        importe: 60,
        tipo: "ESTANDAR"
    };
}


/* =====================================================
   COMPROBAR RANGO
===================================================== */

function cumpleRango(
    valor,
    minimo,
    maximo
) {

    if (
        minimo !== null &&
        minimo !== undefined &&
        Number(valor) < Number(minimo)
    ) {
        return false;
    }

    if (
        maximo !== null &&
        maximo !== undefined &&
        Number(valor) > Number(maximo)
    ) {
        return false;
    }

    return true;
}


/* =====================================================
   COMPROBAR REGLA ITP
===================================================== */

function reglaCompatible(
    regla,
    contexto
) {

    /*
       Antigüedad
    */

    if (
        !cumpleRango(
            contexto.antiguedad,
            regla.antiguedad_min,
            regla.antiguedad_max
        )
    ) {
        return false;
    }


    /*
       Cilindrada
    */

    if (
        !cumpleRango(
            contexto.cilindrada,
            regla.cilindrada_min,
            regla.cilindrada_max
        )
    ) {
        return false;
    }


    /*
       Caballos fiscales
    */

    if (
        regla.potencia_fiscal_min !== null ||
        regla.potencia_fiscal_max !== null
    ) {

        if (
            contexto.caballosFiscales === null
        ) {
            return false;
        }

        if (
            !cumpleRango(
                contexto.caballosFiscales,
                regla.potencia_fiscal_min,
                regla.potencia_fiscal_max
            )
        ) {
            return false;
        }
    }


    /*
       Valor
    */

    if (
        regla.valor_min !== null ||
        regla.valor_max !== null
    ) {

        if (
            !cumpleRango(
                contexto.base,
                regla.valor_min,
                regla.valor_max
            )
        ) {
            return false;
        }
    }


    /*
       Distintivo ambiental
    */

    if (
        regla.distintivo_ambiental
    ) {

        if (
            normalizar(
                contexto.distintivoAmbiental
            ) !==
            normalizar(
                regla.distintivo_ambiental
            )
        ) {

            return false;
        }
    }


    /*
       Clase vehículo
    */

    if (
        regla.clase_vehiculo
    ) {

        if (
            normalizar(
                contexto.claseVehiculo
            ) !==
            normalizar(
                regla.clase_vehiculo
            )
        ) {

            return false;
        }
    }


    /*
       Histórico
    */

    if (
        regla.historico !== null &&
        regla.historico !== undefined
    ) {

        if (
            Boolean(
                contexto.historico
            ) !==
            Boolean(
                regla.historico
            )
        ) {

            return false;
        }
    }


    return true;
}


/* =====================================================
   APLICAR REGLA
===================================================== */

function aplicarRegla(
    regla,
    contexto
) {

    /*
       Regla especial que requiere
       comprobación humana/documental.
    */

    if (
        regla.requiere_documentacion === true
    ) {

        return {
            verificado: false,
            bloqueado: true,
            motivo:
                regla.descripcion ||
                "Esta regla requiere documentación."
        };
    }


    /*
       No sujeto / exento
    */

    if (
        regla.exento === true ||
        regla.no_sujeto === true
    ) {

        return {
            verificado: true,
            impuesto: 0,
            base: contexto.base
        };
    }


    /*
       Cuota fija.
    */

    if (
        regla.cuota_fija !== null &&
        regla.cuota_fija !== undefined
    ) {

        return {
            verificado: true,
            impuesto:
                dinero(
                    regla.cuota_fija
                ),
            base:
                contexto.base
        };
    }


    /*
       Porcentaje.
    */

    if (
        regla.porcentaje !== null &&
        regla.porcentaje !== undefined
    ) {

        return {
            verificado: true,

            impuesto:
                dinero(
                    contexto.base *
                    Number(
                        regla.porcentaje
                    ) /
                    100
                ),

            base:
                contexto.base
        };
    }


    return {
        verificado: false,
        bloqueado: true,
        motivo:
            "La regla fiscal no contiene una fórmula utilizable."
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
        data: existente
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


    if (existente) {

        return res.status(200).json({

            ok: true,
            existente: true,
            expediente: existente

        });
    }


    const {
        data: expediente,
        error
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


    if (error) {

        return res.status(500).json({
            ok: false,
            error:
                error.message
        });
    }


    return res.status(200).json({

        ok: true,
        existente: false,
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
        ).trim();


    const {
        data: expediente,
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
        !expediente
    ) {

        return res.status(404).json({
            ok: false,
            error:
                "Expediente no encontrado."
        });
    }


    const marca =
        normalizar(
            expediente.marca
        );


    const modelo =
        normalizar(
            expediente.modelo
        );


    const cilindrada =
        Number(
            expediente.cilindrada
        );


    if (
        !marca ||
        !modelo ||
        !cilindrada
    ) {

        return res.status(400).json({

            ok: false,

            error:
                "Faltan datos del vehículo."

        });
    }


    const {
        data,
        error: busquedaError
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
                Math.round(
                    cilindrada
                )
            )
            .limit(1000);


    if (busquedaError) {

        return res.status(500).json({

            ok: false,

            error:
                "No se pudo consultar el catálogo."

        });
    }


    const palabras =
        modelo
            .split(" ")
            .filter(
                palabra =>
                    palabra.length >= 2
            );


    let candidatos =
        (data || [])
            .filter(
                item => {

                    const oficial =
                        normalizar(
                            item.modelo_tipo
                        );


                    return palabras.every(
                        palabra =>
                            oficial.includes(
                                palabra
                            )
                    );
                }
            );


    if (
        candidatos.length === 1
    ) {

        const vehiculo =
            candidatos[0];


        await auth.db
            .from("expedientes")
            .update({

                valoracion_id:
                    vehiculo.id,

                modelo_fiscal_identificado:
                    vehiculo.modelo_tipo,

                valor_oficial_boe:
                    vehiculo.valor_oficial,

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

            encontrado:
                true,

            coincidencia_exacta:
                true,

            vehiculo

        });
    }


    return res.status(200).json({

        ok: true,

        encontrado:
            candidatos.length > 0,

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
   CALCULAR COSTE COMPLETO
===================================================== */

async function calcularCoste(
    req,
    res,
    auth
) {

    const expedienteId =
        String(
            req.body?.expediente_id || ""
        ).trim();


    const {
        data: expediente,
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
        !expediente
    ) {

        return res.status(404).json({

            ok: false,

            error:
                "Expediente no encontrado."

        });
    }


    /* =================================================
       VEHÍCULO EXACTO
    ================================================= */

    if (
        !expediente.valoracion_id
    ) {

        return res.status(409).json({

            ok: false,

            pago_bloqueado:
                true,

            error:
                "El vehículo todavía no está identificado exactamente."

        });
    }


    const {
        data: vehiculo,
        error: vehiculoError
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
        vehiculoError ||
        !vehiculo
    ) {

        return res.status(409).json({

            ok: false,

            pago_bloqueado:
                true,

            error:
                "No se pudo recuperar la valoración oficial."

        });
    }


    /* =================================================
       VENDEDOR
    ================================================= */

    if (
        expediente
            .tipo_vendedor_declarado ===
        "EMPRESA" &&
        expediente
            .factura_verificada !==
        true
    ) {

        return res.status(409).json({

            ok: false,

            pago_bloqueado:
                true,

            requiere_documentacion:
                true,

            error:
                "Has indicado que el vendedor es empresa/profesional. Debemos verificar la factura antes de determinar el tratamiento fiscal."

        });
    }


    /*
       Mientras no exista verificación de empresa,
       el motor solo automatiza compraventa
       particular-particular.
    */

    if (
        expediente
            .tipo_vendedor_verificado ===
        "EMPRESA"
    ) {

        return res.status(200).json({

            ok: true,

            calculo_verificado:
                false,

            pago_bloqueado:
                true,

            requiere_factura:
                true,

            mensaje:
                "Operación con vendedor empresario. Se utilizará la factura y no el cálculo ITP ordinario entre particulares."

        });
    }


    /* =================================================
       ANTIGÜEDAD Y VALOR
    ================================================= */

    const antiguedad =
        antiguedadVehiculo(

            expediente
                .fecha_primera_matriculacion,

            expediente
                .fecha_compraventa

        );


    if (
        antiguedad === null
    ) {

        return res.status(409).json({

            ok: false,

            pago_bloqueado:
                true,

            error:
                "No se pudo determinar la antigüedad del vehículo."

        });
    }


    const porcentaje =
        porcentajeDepreciacion(
            antiguedad
        );


    const valorOficial =
        Number(
            vehiculo.valor_oficial
        );


    const valorFiscal =
        dinero(
            valorOficial *
            porcentaje /
            100
        );


    const precioDeclarado =
        Number(
            expediente
                .precio_compraventa ||
            0
        );


    /*
       Para las reglas que hemos cargado con
       MAYOR_PRECIO_VALOR_FISCAL.
    */

    const base =
        dinero(
            Math.max(
                valorFiscal,
                precioDeclarado
            )
        );


    /* =================================================
       TERRITORIO
    ================================================= */

    const codigo =
        codigoTerritorio(

            expediente
                .comunidad_autonoma,

            expediente.provincia

        );


    if (!codigo) {

        return res.status(409).json({

            ok: false,

            pago_bloqueado:
                true,

            error:
                "No se pudo determinar el territorio fiscal del comprador."

        });
    }


    /* =================================================
       REGLAS DEL TERRITORIO

       Por RLS solo obtenemos reglas verificadas.
    ================================================= */

    const {
        data: reglas,
        error: reglasError
    } =
        await auth.db
            .from(
                "reglas_itp_vehiculos"
            )
            .select("*")
            .eq(
                "ejercicio",
                2026
            )
            .eq(
                "codigo_territorio",
                codigo
            )
            .eq(
                "activa",
                true
            )
            .eq(
                "verificada",
                true
            )
            .order(
                "prioridad",
                {
                    ascending: true
                }
            );


    if (
        reglasError
    ) {

        return res.status(500).json({

            ok: false,

            pago_bloqueado:
                true,

            error:
                "No se pudieron consultar las reglas fiscales."

        });
    }


    if (
        !reglas ||
        reglas.length === 0
    ) {

        return res.status(409).json({

            ok: false,

            pago_bloqueado:
                true,

            territorio:
                codigo,

            error:
                "La normativa fiscal de este territorio todavía no está verificada para cálculo automático."

        });
    }


    /* =================================================
       CONTEXTO
    ================================================= */

    const contexto = {

        antiguedad,

        cilindrada:
            Number(
                vehiculo.cilindrada
            ),

        caballosFiscales:
            vehiculo
                .caballos_fiscales ===
            null
                ?
                null
                :
                Number(
                    vehiculo
                        .caballos_fiscales
                ),

        base,

        distintivoAmbiental:
            expediente
                .distintivo_ambiental,

        claseVehiculo:
            expediente
                .clase_vehiculo ||
            "TURISMO_TODOTERRENO",

        historico:
            expediente
                .vehiculo_historico ===
            true

    };


    const compatibles =
        reglas.filter(
            regla =>
                reglaCompatible(
                    regla,
                    contexto
                )
        );


    if (
        compatibles.length === 0
    ) {

        return res.status(409).json({

            ok: false,

            pago_bloqueado:
                true,

            error:
                "No existe una regla fiscal verificada compatible con este vehículo."

        });
    }


    /*
       La de menor prioridad numérica
       es la más específica.
    */

    const regla =
        compatibles[0];


    const resultado =
        aplicarRegla(
            regla,
            contexto
        );


    if (
        !resultado.verificado
    ) {

        return res.status(409).json({

            ok: false,

            pago_bloqueado:
                true,

            requiere_documentacion:
                true,

            regla:
                regla.tipo_regla,

            error:
                resultado.motivo

        });
    }


    /* =================================================
       RESTO DE COSTES
    ================================================= */

    const impuesto =
        resultado.impuesto;


    const tasaDGT =
        55.70;


    const servicio =
        calcularTarifaGestorIA();


    const total =
        dinero(

            impuesto +
            tasaDGT +
            servicio.importe

        );


    /* =================================================
       GUARDAR
    ================================================= */

    const actualizacion = {

        valor_oficial_boe:
            valorOficial,

        porcentaje_depreciacion:
            porcentaje,

        valor_fiscal_depreciado:
            valorFiscal,

        valor_fiscal:
            valorFiscal,

        impuesto_calculado:
            impuesto,

        tasa_dgt_calculada:
            tasaDGT,

        tarifa_gestor_ia:
            servicio.importe,

        total_calculado:
            total,

        calculo_fiscal_verificado:
            true,

        motivo_calculo_bloqueado:
            null,

        estado:
            "PAGO_PENDIENTE",

        paso_actual:
            "PAGO_PENDIENTE",

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


    if (
        guardarError
    ) {

        return res.status(500).json({

            ok: false,

            error:
                "No se pudo guardar el cálculo."

        });
    }


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
                    precioDeclarado,

                valor_fiscal:
                    valorFiscal,

                base_imponible:
                    resultado.base,

                tipo_impositivo:
                    regla.porcentaje,

                impuesto,

                tasa_dgt:
                    tasaDGT,

                tarifa_gestor_ia:
                    servicio.importe,

                total,

                comunidad_autonoma:
                    expediente
                        .comunidad_autonoma,

                regla_aplicada:
                    regla.tipo_regla,

                fuente_valoracion:
                    "Orden HAC/1501/2025",

                fuente_normativa:
                    regla.fuente_oficial,

                calculo_verificado:
                    true,

                motivo_no_verificado:
                    null,

                updated_at:
                    new Date()
                        .toISOString()

            },
            {
                onConflict:
                    "expediente_id"
            }
        );


    /* =================================================
       RESULTADO
    ================================================= */

    return res.status(200).json({

        ok: true,

        calculo_verificado:
            true,

        pago_bloqueado:
            false,

        vehiculo: {

            marca:
                vehiculo.marca,

            modelo:
                vehiculo.modelo_tipo,

            antiguedad,

            valor_oficial:
                valorOficial,

            depreciacion:
                porcentaje,

            valor_fiscal:
                valorFiscal

        },

        fiscal: {

            territorio:
                codigo,

            base_imponible:
                resultado.base,

            regla:
                regla.tipo_regla,

            porcentaje:
                regla.porcentaje,

            cuota_fija:
                regla.cuota_fija,

            impuesto

        },

        costes: {

            impuestos:
                impuesto,

            tasa_dgt:
                tasaDGT,

            gestor_ia:
                servicio.importe,

            tarifa_gestor_ia:
                servicio.tipo,

            total

        }

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


    const {
        data: expediente,
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
        !expediente
    ) {

        return res.status(404).json({
            ok: false,
            error:
                "Expediente no encontrado."
        });
    }


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
                "El cálculo fiscal debe estar verificado antes del pago."

        });
    }


    const {
        data,
        error: pagoError
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


    if (pagoError) {

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
   INVITACIÓN
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


    const {
        data: expediente,
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
        !expediente
    ) {

        return res.status(404).json({
            ok: false,
            error:
                "Expediente no encontrado."
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
                    caduca
                        .toISOString()

            })
            .select()
            .single();


    if (
        invitacionError
    ) {

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

            case "crear":

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


            case "listar":

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


            case "buscar-vehiculo":

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


            case "calcular-coste":

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


            case "simular-pago":

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


            case "generar-invitacion":

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


            default:

                return res
                    .status(400)
                    .json({

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


        return res
            .status(500)
            .json({

                ok: false,

                error:
                    "Error interno del servidor."

            });
    }
}