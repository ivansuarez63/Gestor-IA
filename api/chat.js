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

function normalizarTexto(texto) {
    return String(texto || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .replace(/\s+/g, " ");
}

function convertirFecha(texto) {
    const match = String(texto || "")
        .match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);

    if (!match) return null;

    const dia = match[1].padStart(2, "0");
    const mes = match[2].padStart(2, "0");
    const anio = match[3];

    const fecha = new Date(`${anio}-${mes}-${dia}T00:00:00`);

    if (Number.isNaN(fecha.getTime())) return null;

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
    const match = String(fecha || "").match(/^(\d{4})/);
    return match ? Number(match[1]) : null;
}

function extraerPotencia(texto) {
    const valor = String(texto || "")
        .toLowerCase()
        .replace(",", ".");

    const kw = valor.match(/(\d+(?:\.\d+)?)\s*kw/);

    if (kw) {
        return {
            tipo: "KW",
            valor: Number(kw[1])
        };
    }

    const cv = valor.match(/(\d+(?:\.\d+)?)\s*(cv|caballos)/);

    if (cv) {
        return {
            tipo: "CV",
            valor: Number(cv[1])
        };
    }

    const numero = valor.match(/(\d+(?:\.\d+)?)/);

    if (numero) {
        return {
            tipo: "DESCONOCIDA",
            valor: Number(numero[1])
        };
    }

    return null;
}

function esDescapotable(nombre) {
    const n = normalizarTexto(nombre).toUpperCase();

    return (
        /\bCABRIO\b/.test(n) ||
        /\bCABRIOLET\b/.test(n) ||
        /\bSPIDER\b/.test(n) ||
        /\bCONVERTIBLE\b/.test(n) ||
        /\bROADSTER\b/.test(n) ||
        /\b500 C\b/.test(n)
    );
}

function esSecuencial(nombre) {
    const n = normalizarTexto(nombre).toUpperCase();

    return (
        n.includes("SECUENCIAL") ||
        n.includes("AUT.") ||
        n.includes("AUTOMATIC")
    );
}

function siguientePregunta(expediente) {
    switch (expediente.paso_actual) {
        case "PRECIO":
            return "Â¿CuÃ¡l fue el precio de compraventa del vehÃ­culo?";

        case "FECHA":
            return "Â¿En quÃ© fecha se realizÃ³ la compraventa? Puedes escribirla como 14/08/2026.";

        case "MARCA":
            return "Â¿CuÃ¡l es la marca del vehÃ­culo?";

        case "MODELO":
            return "Â¿CuÃ¡l es el modelo y, si lo sabes, la versiÃ³n del vehÃ­culo?";

        case "PRIMERA_MATRICULACION":
            return "Â¿CuÃ¡l es la fecha de primera matriculaciÃ³n del vehÃ­culo?";

        case "COMBUSTIBLE":
            return "Â¿QuÃ© combustible utiliza el vehÃ­culo?";

        case "CILINDRADA":
            return "Â¿CuÃ¡l es la cilindrada en cc?";

        case "POTENCIA":
            return "Â¿CuÃ¡l es la potencia? Indica tambiÃ©n kW o CV.";

        case "KILOMETROS":
            return "Â¿CuÃ¡ntos kilÃ³metros tiene?";

        case "COMUNIDAD":
            return "Â¿En quÃ© comunidad autÃ³noma tiene su domicilio fiscal el comprador?";

        case "PROVINCIA":
            return "Â¿En quÃ© provincia tiene su domicilio fiscal el comprador?";

        case "CARROCERIA_FISCAL":
            return "Â¿El vehÃ­culo es normal/cerrado o descapotable/cabrio?";

        case "TRANSMISION_FISCAL":
            return "Â¿El cambio es manual o secuencial/automÃ¡tico?";

        case "VERSION_EXACTA":
            return "IndÃ­came la versiÃ³n exacta tal como aparece en la documentaciÃ³n.";

        case "TIPO_VENDEDOR":
            return "Â¿Lo compras a un particular o a una empresa/profesional que te entrega factura?";

        case "FACTURA_PENDIENTE":
            return "Necesitamos verificar la factura antes de continuar.";

        case "CALCULO_FISCAL":
            return "Voy a calcular ahora el coste del traspaso.";

        case "PAGO_PENDIENTE":
            return "El cÃ¡lculo estÃ¡ terminado.";

        default:
            return "Vamos a continuar con tu traspaso.";
    }
}

function siguientePaso(actual) {
    const pasos = {
        PRECIO: "FECHA",
        FECHA: "MARCA",
        MARCA: "MODELO",
        MODELO: "PRIMERA_MATRICULACION",
        PRIMERA_MATRICULACION: "COMBUSTIBLE",
        COMBUSTIBLE: "CILINDRADA",
        CILINDRADA: "POTENCIA",
        POTENCIA: "KILOMETROS",
        KILOMETROS: "COMUNIDAD",
        COMUNIDAD: "PROVINCIA",
        PROVINCIA: "IDENTIFICAR_VEHICULO"
    };

    return pasos[actual] || actual;
}

async function buscarCandidatos(db, expediente, versionExtra = null) {
    const marca = normalizarTexto(expediente.marca).toUpperCase();

    const modeloBase = versionExtra
        ? normalizarTexto(versionExtra)
        : normalizarTexto(expediente.modelo);

    const cilindrada = Number(expediente.cilindrada || 0);

    if (!marca || !modeloBase || !cilindrada) {
        return [];
    }

    const {
        data,
        error
    } = await db
        .from("valoraciones_vehiculos")
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
        .eq("ejercicio", 2026)
        .ilike("marca", marca)
        .eq("cilindrada", Math.round(cilindrada))
        .limit(1000);

    if (error) throw error;

    let candidatos = data || [];

    const palabras = normalizarTexto(modeloBase)
        .toUpperCase()
        .split(" ")
        .filter(palabra => palabra.length >= 2);

    candidatos = candidatos.filter(vehiculo => {
        const oficial = normalizarTexto(
            vehiculo.modelo_tipo
        ).toUpperCase();

        return palabras.every(
            palabra => oficial.includes(palabra)
        );
    });

    const anio = obtenerAnio(
        expediente.fecha_primera_matriculacion
    );

    if (Number.isInteger(anio)) {
        candidatos = candidatos.filter(vehiculo => {
            const inicio =
                vehiculo.periodo_inicio === null
                    ? null
                    : Number(vehiculo.periodo_inicio);

            const fin =
                vehiculo.periodo_fin === null
                    ? null
                    : Number(vehiculo.periodo_fin);

            if (inicio !== null && anio < inicio) return false;
            if (fin !== null && anio > fin) return false;

            return true;
        });
    }

    const potencia = extraerPotencia(
        expediente.potencia_declarada
    );

    if (
        potencia &&
        potencia.tipo !== "DESCONOCIDA"
    ) {
        const filtrados = candidatos.filter(vehiculo => {
            if (potencia.tipo === "KW") {
                const oficial = Number(
                    vehiculo.potencia_kw
                );

                return (
                    Number.isFinite(oficial) &&
                    Math.abs(
                        oficial - potencia.valor
                    ) <= 0.5
                );
            }

            if (potencia.tipo === "CV") {
                const oficial = Number(
                    vehiculo.potencia_cv
                );

                return (
                    Number.isFinite(oficial) &&
                    Math.abs(
                        oficial - potencia.valor
                    ) <= 1
                );
            }

            return true;
        });

        if (filtrados.length > 0) {
            candidatos = filtrados;
        }
    }

    if (
        expediente.carroceria_fiscal === "CABRIO"
    ) {
        candidatos = candidatos.filter(
            v => esDescapotable(v.modelo_tipo)
        );
    }

    if (
        expediente.carroceria_fiscal === "NORMAL"
    ) {
        candidatos = candidatos.filter(
            v => !esDescapotable(v.modelo_tipo)
        );
    }

    if (
        expediente.transmision_fiscal === "SECUENCIAL"
    ) {
        candidatos = candidatos.filter(
            v => esSecuencial(v.modelo_tipo)
        );
    }

    if (
        expediente.transmision_fiscal === "MANUAL"
    ) {
        candidatos = candidatos.filter(
            v => !esSecuencial(v.modelo_tipo)
        );
    }

    return candidatos;
}

function decidirDatoFaltante(candidatos) {
    if (candidatos.length <= 1) {
        return null;
    }

    const carrocerias = new Set(
        candidatos.map(
            v => esDescapotable(v.modelo_tipo)
                ? "CABRIO"
                : "NORMAL"
        )
    );

    if (carrocerias.size > 1) {
        return "CARROCERIA_FISCAL";
    }

    const transmisiones = new Set(
        candidatos.map(
            v => esSecuencial(v.modelo_tipo)
                ? "SECUENCIAL"
                : "MANUAL"
        )
    );

    if (transmisiones.size > 1) {
        return "TRANSMISION_FISCAL";
    }

    return "VERSION_EXACTA";
}

async function guardarVehiculoIdentificado(
    db,
    expedienteId,
    vehiculo
) {
    const {
        error
    } = await db
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

            paso_actual:
                "TIPO_VENDEDOR",

            estado:
                "DATOS_FISCALES",

            calculo_fiscal_verificado:
                false,

            updated_at:
                new Date().toISOString()
        })
        .eq("id", expedienteId);

    if (error) throw error;
}

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

    if (candidatos.length === 0) {
        return {
            paso: "VERSION_EXACTA",
            respuesta:
                "No he podido identificar la versiÃ³n exacta. EscrÃ­beme la versiÃ³n tal como aparece en la documentaciÃ³n."
        };
    }

    if (candidatos.length === 1) {
        const vehiculo = candidatos[0];

        await guardarVehiculoIdentificado(
            db,
            expediente.id,
            vehiculo
        );

        return {
            paso: "TIPO_VENDEDOR",
            vehiculo,
            respuesta:
                `Perfecto. He identificado el vehÃ­culo como ${vehiculo.marca} ${vehiculo.modelo_tipo}. Â¿Lo compras a un particular o a una empresa/profesional que te entrega factura?`
        };
    }

    const paso =
        decidirDatoFaltante(
            candidatos
        );

    if (
        paso === "CARROCERIA_FISCAL"
    ) {
        return {
            paso,
            respuesta:
                "Necesito distinguir la versiÃ³n exacta. Â¿El vehÃ­culo es normal/cerrado o descapotable/cabrio?"
        };
    }

    if (
        paso === "TRANSMISION_FISCAL"
    ) {
        return {
            paso,
            respuesta:
                "Perfecto. Ahora necesito saber si el cambio es manual o secuencial/automÃ¡tico."
        };
    }

    const nombres = [
        ...new Set(
            candidatos.map(
                v => v.modelo_tipo
            )
        )
    ].slice(0, 8);

    return {
        paso: "VERSION_EXACTA",
        respuesta:
            "He encontrado varias versiones posibles:\n\n" +
            nombres.map(
                (nombre, i) =>
                    `${i + 1}. ${nombre}`
            ).join("\n")
    };
}


/* =====================================================
   HANDLER
===================================================== */

export default async function handler(req, res) {

    if (req.method !== "POST") {
        return res.status(405).json({
            ok: false,
            error: "MÃ©todo no permitido"
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
            return res.status(401).json({
                ok: false,
                error:
                    "Necesitas iniciar sesiÃ³n."
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
                error:
                    "SesiÃ³n no vÃ¡lida."
            });
        }

        const usuario =
            userData.user;

        const expedienteId =
            String(
                req.body?.expediente_id ||
                ""
            ).trim();

        const mensaje =
            String(
                req.body?.mensaje ||
                ""
            ).trim();

        if (!expedienteId) {
            return res.status(400).json({
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
            return res.status(403).json({
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
                expediente.paso_actual ===
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

                return res.status(200).json({
                    ok: true,
                    respuesta:
                        resultado.respuesta,
                    paso_actual:
                        resultado.paso,
                    vehiculo:
                        resultado.vehiculo ||
                        null
                });
            }

            if (
                expediente.paso_actual ===
                "CALCULO_FISCAL"
            ) {
                return res.status(200).json({
                    ok: true,
                    respuesta:
                        "Voy a calcular ahora el coste total del traspaso.",
                    paso_actual:
                        "CALCULO_FISCAL",
                    solicitar_calculo:
                        true
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


        /* =================================================
           CASOS DE IDENTIFICACIÃ“N QUE DEBEN
           REEJECUTAR LA BÃšSQUEDA DESPUÃ‰S DE GUARDAR
        ================================================= */

        if (
            expediente.paso_actual ===
            "CARROCERIA_FISCAL"
        ) {

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
                update.carroceria_fiscal =
                    "CABRIO";

            } else if (
                valor.includes("NORMAL") ||
                valor.includes("CERRAD")
            ) {
                update.carroceria_fiscal =
                    "NORMAL";

            } else {
                errorValidacion =
                    "RespÃ³ndeme normal/cerrado o descapotable/cabrio.";
            }

            if (!errorValidacion) {

                update.updated_at =
                    new Date()
                        .toISOString();

                const {
                    error: guardarError
                } =
                    await db
                        .from("expedientes")
                        .update(update)
                        .eq(
                            "id",
                            expedienteId
                        );

                if (guardarError) {
                    throw guardarError;
                }

                const actualizado = {
                    ...expediente,
                    ...update
                };

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

                return res.status(200).json({
                    ok: true,
                    respuesta:
                        resultado.respuesta,
                    paso_actual:
                        resultado.paso,
                    vehiculo:
                        resultado.vehiculo ||
                        null
                });
            }
        }


        if (
            expediente.paso_actual ===
            "TRANSMISION_FISCAL"
        ) {

            const valor =
                normalizarTexto(
                    mensaje
                )
                .toUpperCase();

            if (
                valor.includes("AUTOM") ||
                valor.includes("SECUENCIAL")
            ) {
                update.transmision_fiscal =
                    "SECUENCIAL";

            } else if (
                valor.includes("MANUAL")
            ) {
                update.transmision_fiscal =
                    "MANUAL";

            } else {
                errorValidacion =
                    "RespÃ³ndeme manual o secuencial/automÃ¡tico.";
            }

            if (!errorValidacion) {

                update.updated_at =
                    new Date()
                        .toISOString();

                const {
                    error: guardarError
                } =
                    await db
                        .from("expedientes")
                        .update(update)
                        .eq(
                            "id",
                            expedienteId
                        );

                if (guardarError) {
                    throw guardarError;
                }

                const actualizado = {
                    ...expediente,
                    ...update
                };

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

                return res.status(200).json({
                    ok: true,
                    respuesta:
                        resultado.respuesta,
                    paso_actual:
                        resultado.paso,
                    vehiculo:
                        resultado.vehiculo ||
                        null
                });
            }
        }


        /* =================================================
           FLUJO NORMAL
        ================================================= */

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
                        "IndÃ­came el precio de compraventa.";
                } else {
                    update.precio_compraventa =
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
                        "IndÃ­came una fecha vÃ¡lida.";
                } else {
                    update.fecha_compraventa =
                        fecha;
                }

                break;
            }


            case "MARCA": {

                const valor =
                    normalizarTexto(
                        mensaje
                    );

                if (valor.length < 2) {
                    errorValidacion =
                        "IndÃ­came la marca.";
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
                        "IndÃ­came el modelo.";
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
                        "IndÃ­came la fecha de primera matriculaciÃ³n.";
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

                if (valor.length < 2) {
                    errorValidacion =
                        "IndÃ­came el combustible.";
                } else {
                    update.combustible =
                        valor;
                }

                break;
            }


            case "CILINDRADA": {

                const numero =
                    Number(
                        mensaje.replace(
                            /[^\d]/g,
                            ""
                        )
                    );

                if (
                    !Number.isInteger(numero) ||
                    numero <= 0
                ) {
                    errorValidacion =
                        "IndÃ­came la cilindrada en cc.";
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
                        "IndÃ­came la potencia.";

                } else if (
                    potencia.tipo ===
                    "DESCONOCIDA"
                ) {
                    errorValidacion =
                        "IndÃ­came si la potencia estÃ¡ en kW o CV.";

                } else {
                    update.potencia_declarada =
                        mensaje.trim();
                }

                break;
            }


            case "KILOMETROS": {

                const numero =
                    Number(
                        mensaje.replace(
                            /[^\d]/g,
                            ""
                        )
                    );

                if (
                    !Number.isInteger(numero) ||
                    numero < 0
                ) {
                    errorValidacion =
                        "IndÃ­came los kilÃ³metros.";
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

                if (valor.length < 3) {
                    errorValidacion =
                        "IndÃ­came la comunidad autÃ³noma.";
                } else {
                    update.comunidad_autonoma =
                        valor;
                }

                break;
            }


            case "PROVINCIA": {

                const valor =
                    normalizarTexto(
                        mensaje
                    );

                if (valor.length < 2) {
                    errorValidacion =
                        "IndÃ­came la provincia.";
                } else {
                    update.provincia =
                        valor;
                }

                break;
            }


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

                    update.tipo_vendedor_declarado =
                        "EMPRESA";

                    update.tipo_vendedor_verificado =
                        null;

                    update.factura_verificada =
                        false;

                    update.paso_actual =
                        "FACTURA_PENDIENTE";

                    update.estado =
                        "FACTURA_PENDIENTE";

                    update.updated_at =
                        new Date()
                            .toISOString();

                    await db
                        .from("expedientes")
                        .update(update)
                        .eq(
                            "id",
                            expedienteId
                        );

                    const respuesta =
                        "Perfecto. Necesitamos verificar la factura antes de determinar el tratamiento fiscal.";

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
                                respuesta
                        });

                    return res.status(200).json({
                        ok: true,
                        respuesta,
                        paso_actual:
                            "FACTURA_PENDIENTE",
                        requiere_factura:
                            true
                    });


                } else if (
                    valor.includes("PARTICULAR") ||
                    valor.includes("PERSONA")
                ) {

                    update.tipo_vendedor_declarado =
                        "PARTICULAR";

                    update.tipo_vendedor_verificado =
                        "PARTICULAR";

                    update.paso_actual =
                        "CALCULO_FISCAL";

                    update.estado =
                        "CALCULO_FISCAL";

                    update.updated_at =
                        new Date()
                            .toISOString();

                    await db
                        .from("expedientes")
                        .update(update)
                        .eq(
                            "id",
                            expedienteId
                        );

                    const respuesta =
                        "Perfecto. Voy a calcular ahora el impuesto, la tasa DGT y el servicio Gestor-IA.";

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
                                respuesta
                        });

                    return res.status(200).json({
                        ok: true,
                        respuesta,
                        paso_actual:
                            "CALCULO_FISCAL",
                        solicitar_calculo:
                            true
                    });

                } else {

                    errorValidacion =
                        "RespÃ³ndeme particular o empresa/profesional.";
                }

                break;
            }


            case "VERSION_EXACTA": {

                const resultado =
                    await procesarIdentificacion(
                        db,
                        expediente,
                        mensaje
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

                return res.status(200).json({
                    ok: true,
                    respuesta:
                        resultado.respuesta,
                    paso_actual:
                        resultado.paso,
                    vehiculo:
                        resultado.vehiculo ||
                        null
                });
            }


            case "FACTURA_PENDIENTE":

                return res.status(200).json({
                    ok: true,
                    respuesta:
                        "La factura estÃ¡ pendiente de verificaciÃ³n.",
                    paso_actual:
                        "FACTURA_PENDIENTE",
                    requiere_factura:
                        true
                });


            case "CALCULO_FISCAL":

                return res.status(200).json({
                    ok: true,
                    respuesta:
                        "Voy a calcular ahora el coste.",
                    paso_actual:
                        "CALCULO_FISCAL",
                    solicitar_calculo:
                        true
                });


            case "PAGO_PENDIENTE":

                return res.status(200).json({
                    ok: true,
                    respuesta:
                        "El cÃ¡lculo estÃ¡ terminado.",
                    paso_actual:
                        "PAGO_PENDIENTE"
                });
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

            return res.status(200).json({
                ok: true,
                respuesta:
                    resultado.respuesta,
                paso_actual:
                    resultado.paso,
                vehiculo:
                    resultado.vehiculo ||
                    null
            });
        }


        const respuesta =
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
                    respuesta
            });

        return res.status(200).json({
            ok: true,
            respuesta,
            paso_actual:
                nuevoPaso
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
