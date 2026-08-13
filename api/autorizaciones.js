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


/* =====================================================
   DGT
===================================================== */

const DGT_REA =
    "https://sede.dgt.gob.es/es/otros-tramites/autorizaciones-de-representaciones-rea/";


/* =====================================================
   TERRITORIOS TRIBUTARIOS

   directa = true
   Hemos localizado una página oficial específicamente
   relacionada con representación / apoderamiento.

   directa = false
   Se dirige al portal oficial correspondiente porque
   no debemos inventar un procedimiento de apoderamiento.
===================================================== */

const TERRITORIOS = {

    ANDALUCIA: {

        nombre:
            "Andalucía",

        organismo:
            "Agencia Tributaria de Andalucía",

        enlace:
            "https://www.juntadeandalucia.es/servicios/sede/tramites/procedimientos/detalle/442.html",

        directa:
            true
    },


    ARAGON: {

        nombre:
            "Aragón",

        organismo:
            "Administración Tributaria de Aragón",

        enlace:
            "https://sede.administracion.gob.es/servicios-electronicos/rea",

        directa:
            true
    },


    ASTURIAS: {

        nombre:
            "Principado de Asturias",

        organismo:
            "Servicios Tributarios del Principado de Asturias",

        enlace:
            "https://sede.tributasenasturias.es/",

        directa:
            false
    },


    BALEARES: {

        nombre:
            "Illes Balears",

        organismo:
            "Agència Tributària de les Illes Balears",

        enlace:
            "https://www.atib.es/carpetafiscal/default.aspx?lang=es",

        directa:
            true
    },


    CANARIAS: {

        nombre:
            "Canarias",

        organismo:
            "Agencia Tributaria Canaria",

        enlace:
            "https://sede.gobiernodecanarias.org/tributos/jsf/publico/sede/tramites/tramite.jsp?categoria=apoderamientos",

        directa:
            true
    },


    CANTABRIA: {

        nombre:
            "Cantabria",

        organismo:
            "Agencia Cántabra de Administración Tributaria",

        enlace:
            "https://www.agenciacantabratributaria.es/tramites/modelos-y-formularios",

        directa:
            true
    },


    CASTILLA_LEON: {

        nombre:
            "Castilla y León",

        organismo:
            "Administración Tributaria de Castilla y León",

        enlace:
            "https://tributos.jcyl.es/web/es/modelos-formularios/modelo-solicitud-representacion-voluntaria.html",

        directa:
            true
    },


    CASTILLA_LA_MANCHA: {

        nombre:
            "Castilla-La Mancha",

        organismo:
            "Portal Tributario de Castilla-La Mancha",

        enlace:
            "https://portaltributario.jccm.es/colaboradores/modelo-de-representacion",

        directa:
            true
    },


    CATALUNA: {

        nombre:
            "Cataluña",

        organismo:
            "Agència Tributària de Catalunya",

        enlace:
            "https://atc.gencat.cat/es/gestions/representacio/",

        directa:
            true
    },


    COMUNIDAD_VALENCIANA: {

        nombre:
            "Comunitat Valenciana",

        organismo:
            "Agència Tributària Valenciana",

        enlace:
            "https://atv.gva.es/es/vull-otorgar-representacio",

        directa:
            true
    },


    EXTREMADURA: {

        nombre:
            "Extremadura",

        organismo:
            "Junta de Extremadura - Administración Tributaria",

        enlace:
            "https://www.juntaex.es/w/5879",

        directa:
            true
    },


    GALICIA: {

        nombre:
            "Galicia",

        organismo:
            "Axencia Tributaria de Galicia",

        enlace:
            "https://www.atriga.gal/es/servizos/modelos-e-formularios/modelos-e-formularios-para-tramites-administrativos/-/asset_publisher/sqkLOCjfFLq5/content/modelo-de-representacion-voluntaria",

        directa:
            true
    },


    MADRID: {

        nombre:
            "Comunidad de Madrid",

        organismo:
            "Comunidad de Madrid - Administración Tributaria",

        enlace:
            "https://sede.comunidad.madrid/node/214406",

        directa:
            true
    },


    MURCIA: {

        nombre:
            "Región de Murcia",

        organismo:
            "Agencia Tributaria de la Región de Murcia",

        enlace:
            "https://agenciatributaria.carm.es/modelos-y-formularios?_101_assetEntryId=68266&_101_struts_action=%2Fasset_publisher%2Fview_content&_101_type=content&_101_urlTitle=autorizacion-acreditativa-de-representacion&inheritRedirect=false&p_p_id=101&p_p_lifecycle=0&p_p_mode=view&p_p_state=maximized",

        directa:
            true
    },


    NAVARRA: {

        nombre:
            "Comunidad Foral de Navarra",

        organismo:
            "Hacienda Foral de Navarra",

        enlace:
            "https://www.navarra.es/es/tramites/on/-/line/censo-de-representacion-voluntaria",

        directa:
            true
    },


    PAIS_VASCO_ALAVA: {

        nombre:
            "País Vasco - Álava",

        organismo:
            "Hacienda Foral de Álava",

        enlace:
            "https://web.araba.eus/es/hacienda/representacion-voluntaria",

        directa:
            true
    },


    PAIS_VASCO_BIZKAIA: {

        nombre:
            "País Vasco - Bizkaia",

        organismo:
            "Hacienda Foral de Bizkaia",

        enlace:
            "https://www.bizkaia.eus/es/tramites-tributarios/representacion-en-sede-electronica",

        directa:
            true
    },


    PAIS_VASCO_GIPUZKOA: {

        nombre:
            "País Vasco - Gipuzkoa",

        organismo:
            "Hacienda Foral de Gipuzkoa",

        enlace:
            "https://egoitza.gipuzkoa.eus/es/representacion",

        directa:
            true
    },


    LA_RIOJA: {

        nombre:
            "La Rioja",

        organismo:
            "Gobierno de La Rioja - Tributos",

        enlace:
            "https://www.larioja.org/tributos/es/modelos-consultas-tramites/modelos-formularios",

        directa:
            true
    },


    CEUTA: {

        nombre:
            "Ceuta",

        organismo:
            "Servicios Tributarios de Ceuta",

        enlace:
            "https://sede.ceuta.es/",

        directa:
            false
    },


    MELILLA: {

        nombre:
            "Melilla",

        organismo:
            "Ciudad Autónoma de Melilla",

        enlace:
            "https://sede.melilla.es/",

        directa:
            false
    }

};


/* =====================================================
   NORMALIZAR TEXTO
===================================================== */

function normalizar(texto) {

    return String(texto || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toUpperCase();
}


/* =====================================================
   IDENTIFICAR TERRITORIO
===================================================== */

function obtenerTerritorio(
    comunidad,
    provincia
) {

    const c =
        normalizar(comunidad);

    const p =
        normalizar(provincia);


    if (c.includes("ANDALUC")) {
        return TERRITORIOS.ANDALUCIA;
    }


    if (c.includes("ARAGON")) {
        return TERRITORIOS.ARAGON;
    }


    if (
        c.includes("ASTURIAS") ||
        c.includes("PRINCIPADO")
    ) {
        return TERRITORIOS.ASTURIAS;
    }


    if (
        c.includes("BALEARES") ||
        c.includes("BALEARS") ||
        c.includes("ILLES")
    ) {
        return TERRITORIOS.BALEARES;
    }


    if (c.includes("CANARI")) {
        return TERRITORIOS.CANARIAS;
    }


    if (c.includes("CANTABRIA")) {
        return TERRITORIOS.CANTABRIA;
    }


    if (
        c.includes("CASTILLA Y LEON") ||
        c.includes("CASTILLA LEON")
    ) {
        return TERRITORIOS.CASTILLA_LEON;
    }


    if (
        c.includes("CASTILLA-LA MANCHA") ||
        c.includes("CASTILLA LA MANCHA")
    ) {
        return TERRITORIOS.CASTILLA_LA_MANCHA;
    }


    if (
        c.includes("CATALUNA") ||
        c.includes("CATALUNYA")
    ) {
        return TERRITORIOS.CATALUNA;
    }


    if (
        c.includes("VALENCIANA") ||
        c.includes("VALENCIA")
    ) {
        return TERRITORIOS.COMUNIDAD_VALENCIANA;
    }


    if (c.includes("EXTREMADURA")) {
        return TERRITORIOS.EXTREMADURA;
    }


    if (c.includes("GALICIA")) {
        return TERRITORIOS.GALICIA;
    }


    if (c.includes("MADRID")) {
        return TERRITORIOS.MADRID;
    }


    if (c.includes("MURCIA")) {
        return TERRITORIOS.MURCIA;
    }


    if (c.includes("NAVARRA")) {
        return TERRITORIOS.NAVARRA;
    }


    if (
        c.includes("RIOJA")
    ) {
        return TERRITORIOS.LA_RIOJA;
    }


    if (c.includes("CEUTA")) {
        return TERRITORIOS.CEUTA;
    }


    if (c.includes("MELILLA")) {
        return TERRITORIOS.MELILLA;
    }


    /*
       PAÍS VASCO

       Aquí NO basta con saber que es
       País Vasco.

       Hay que saber territorio histórico.
    */

    if (
        c.includes("PAIS VASCO") ||
        c.includes("EUSKADI")
    ) {

        if (
            p.includes("ALAVA") ||
            p.includes("ARABA")
        ) {

            return TERRITORIOS.PAIS_VASCO_ALAVA;
        }


        if (
            p.includes("BIZKAIA") ||
            p.includes("VIZCAYA")
        ) {

            return TERRITORIOS.PAIS_VASCO_BIZKAIA;
        }


        if (
            p.includes("GIPUZKOA") ||
            p.includes("GUIPUZCOA")
        ) {

            return TERRITORIOS.PAIS_VASCO_GIPUZKOA;
        }


        return {

            requiereProvincia:
                true,

            nombre:
                "País Vasco",

            organismo:
                null,

            enlace:
                null,

            directa:
                false

        };
    }


    return null;
}


/* =====================================================
   API
===================================================== */

export default async function handler(
    req,
    res
) {

    if (req.method !== "POST") {

        return res.status(405).json({

            ok: false,

            error:
                "Método no permitido"

        });
    }


    try {


        /* =============================================
           AUTENTICACIÓN
        ============================================= */

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

            return res.status(401).json({

                ok: false,

                error:
                    "Sesión no válida."

            });
        }


        /* =============================================
           EXPEDIENTE
        ============================================= */

        const expedienteId =
            String(
                req.body?.expediente_id ||
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
            createClient(

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

                        persistSession:
                            false,

                        autoRefreshToken:
                            false

                    }

                }

            );


        const {
            data: expediente,
            error: expedienteError
        } =
            await db
                .from("expedientes")
                .select(
                    "id,matricula,comunidad_autonoma,provincia,estado,pago_validado"
                )
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


        /* =============================================
           SEGURIDAD:

           MÁS ADELANTE ACTIVAREMOS ESTA PARTE CUANDO
           EL SISTEMA DE PAGOS ESTÉ TERMINADO.

           Así las autorizaciones solo aparecerán
           después de contratar Gestor-IA.
        ============================================= */

        /*
        if (!expediente.pago_validado) {

            return res.status(403).json({

                ok: false,

                error:
                    "Las autorizaciones se habilitarán después de validar el pago."

            });
        }
        */


        /* =============================================
           TERRITORIO
        ============================================= */

        const territorio =
            obtenerTerritorio(

                expediente
                    .comunidad_autonoma,

                expediente
                    .provincia

            );


        if (!territorio) {

            return res.status(400).json({

                ok: false,

                requiereUbicacion:
                    true,

                error:
                    "No hemos podido determinar la administración tributaria competente."

            });
        }


        /* =============================================
           PAÍS VASCO SIN PROVINCIA
        ============================================= */

        if (
            territorio.requiereProvincia
        ) {

            return res.status(200).json({

                ok: true,

                requiereProvincia:
                    true,

                mensaje:
                    "Necesitamos saber si el trámite corresponde a Álava, Bizkaia o Gipuzkoa.",

                opciones: [

                    {
                        codigo:
                            "ALAVA",

                        nombre:
                            "Álava / Araba"
                    },

                    {
                        codigo:
                            "BIZKAIA",

                        nombre:
                            "Bizkaia"
                    },

                    {
                        codigo:
                            "GIPUZKOA",

                        nombre:
                            "Gipuzkoa"
                    }

                ],

                dgt: {

                    disponible:
                        true,

                    titulo:
                        "Autorizar gestión ante la DGT",

                    enlace:
                        DGT_REA

                }

            });
        }


        /* =============================================
           GUARDAR ORGANISMO
        ============================================= */

        const {
            error: guardarError
        } =
            await db
                .from("expedientes")
                .update({

                    organismo_tributario:
                        territorio.organismo,

                    enlace_tributario:
                        territorio.enlace,

                    updated_at:
                        new Date()
                            .toISOString()

                })
                .eq(
                    "id",
                    expediente.id
                );


        if (guardarError) {

            console.error(
                "Error guardando organismo:",
                guardarError
            );
        }


        /* =============================================
           RESPUESTA
        ============================================= */

        return res.status(200).json({

            ok: true,

            territorio: {

                nombre:
                    territorio.nombre,

                organismo:
                    territorio.organismo

            },


            tributaria: {

                disponible:
                    true,

                directa:
                    territorio.directa,

                titulo:
                    "Autorizar gestión tributaria",

                descripcion:
                    "Autoriza a Gestor-IA para realizar en tu nombre las gestiones tributarias necesarias asociadas a este expediente.",

                organismo:
                    territorio.organismo,

                enlace:
                    territorio.enlace

            },


            dgt: {

                disponible:
                    true,

                titulo:
                    "Autorizar gestión ante la DGT",

                descripcion:
                    "Autoriza la representación necesaria para gestionar el cambio de titularidad del vehículo.",

                enlace:
                    DGT_REA

            }

        });


    } catch (error) {


        console.error(
            "Error autorizaciones:",
            error
        );


        return res.status(500).json({

            ok: false,

            error:
                "Error interno del servidor."

        });

    }

}