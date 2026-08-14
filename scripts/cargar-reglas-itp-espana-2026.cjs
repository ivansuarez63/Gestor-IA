const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();


/* =====================================================
   CONFIGURACIÓN
===================================================== */

const supabaseUrl =
    process.env.SUPABASE_URL;

const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;


if (!supabaseUrl) {
    throw new Error(
        "Falta SUPABASE_URL en .env"
    );
}


if (!serviceKey) {
    throw new Error(
        "Falta SUPABASE_SERVICE_ROLE_KEY en .env"
    );
}


const supabase =
    createClient(
        supabaseUrl,
        serviceKey,
        {
            auth: {
                persistSession: false,
                autoRefreshToken: false
            }
        }
    );


/* =====================================================
   TERRITORIOS

   IMPORTANTE:
   Todavía NO insertamos tipos impositivos inventados.

   El siguiente paso cargará las reglas verificadas.
===================================================== */

const territorios = [

    {
        codigo: "AND",
        nombre: "Andalucía"
    },

    {
        codigo: "ARA",
        nombre: "Aragón"
    },

    {
        codigo: "AST",
        nombre: "Principado de Asturias"
    },

    {
        codigo: "BAL",
        nombre: "Illes Balears"
    },

    {
        codigo: "CAN",
        nombre: "Canarias"
    },

    {
        codigo: "CNT",
        nombre: "Cantabria"
    },

    {
        codigo: "CLM",
        nombre: "Castilla-La Mancha"
    },

    {
        codigo: "CYL",
        nombre: "Castilla y León"
    },

    {
        codigo: "CAT",
        nombre: "Cataluña"
    },

    {
        codigo: "EXT",
        nombre: "Extremadura"
    },

    {
        codigo: "GAL",
        nombre: "Galicia"
    },

    {
        codigo: "MAD",
        nombre: "Comunidad de Madrid"
    },

    {
        codigo: "MUR",
        nombre: "Región de Murcia"
    },

    {
        codigo: "RIO",
        nombre: "La Rioja"
    },

    {
        codigo: "VAL",
        nombre: "Comunitat Valenciana"
    },


    /*
       RÉGIMEN FORAL
    */

    {
        codigo: "NAV",
        nombre: "Navarra"
    },

    {
        codigo: "ALA",
        nombre: "Álava"
    },

    {
        codigo: "BIZ",
        nombre: "Bizkaia"
    },

    {
        codigo: "GIP",
        nombre: "Gipuzkoa"
    },


    /*
       CIUDADES AUTÓNOMAS
    */

    {
        codigo: "CEU",
        nombre: "Ceuta"
    },

    {
        codigo: "MEL",
        nombre: "Melilla"
    }

];


/* =====================================================
   COMPROBAR TABLA
===================================================== */

async function comprobarTabla() {

    const {
        error
    } =
        await supabase
            .from(
                "reglas_itp_vehiculos"
            )
            .select("id")
            .limit(1);


    if (error) {

        throw new Error(
            "No se puede acceder a reglas_itp_vehiculos: " +
            error.message
        );
    }
}


/* =====================================================
   LIMPIAR REGLAS 2026 NO VERIFICADAS

   No borra reglas verificadas.
===================================================== */

async function limpiarPendientes() {

    const {
        error
    } =
        await supabase
            .from(
                "reglas_itp_vehiculos"
            )
            .delete()
            .eq(
                "ejercicio",
                2026
            )
            .eq(
                "verificada",
                false
            );


    if (error) {

        throw new Error(
            "Error limpiando reglas pendientes: " +
            error.message
        );
    }
}


/* =====================================================
   CREAR REGISTROS DE CONTROL

   Estos registros NO pueden utilizarse para calcular
   impuestos porque verificada = false.
===================================================== */

async function crearTerritorios() {

    const filas =
        territorios.map(
            territorio => ({

                territorio:
                    territorio.nombre,

                codigo_territorio:
                    territorio.codigo,

                ejercicio:
                    2026,

                tipo_regla:
                    "PENDIENTE_VERIFICACION",

                porcentaje:
                    null,

                cuota_fija:
                    null,

                cilindrada_min:
                    null,

                cilindrada_max:
                    null,

                potencia_fiscal_min:
                    null,

                potencia_fiscal_max:
                    null,

                antiguedad_min:
                    null,

                antiguedad_max:
                    null,

                valor_min:
                    null,

                valor_max:
                    null,

                combustible:
                    null,

                distintivo_ambiental:
                    null,

                descripcion:
                    "Territorio preparado para importar normativa ITP de vehículos usados 2026.",

                fuente_oficial:
                    null,

                fecha_verificacion:
                    null,

                verificada:
                    false,

                activa:
                    true

            })
        );


    const {
        error
    } =
        await supabase
            .from(
                "reglas_itp_vehiculos"
            )
            .insert(
                filas
            );


    if (error) {

        throw new Error(
            "Error creando territorios: " +
            error.message
        );
    }
}


/* =====================================================
   COMPROBAR RESULTADO
===================================================== */

async function comprobarResultado() {

    const {
        data,
        error
    } =
        await supabase
            .from(
                "reglas_itp_vehiculos"
            )
            .select(`
                codigo_territorio,
                territorio,
                tipo_regla,
                verificada
            `)
            .eq(
                "ejercicio",
                2026
            )
            .order(
                "territorio"
            );


    if (error) {

        throw new Error(
            error.message
        );
    }


    console.table(
        data
    );


    const verificadas =
        data.filter(
            fila =>
                fila.verificada === true
        );


    const pendientes =
        data.filter(
            fila =>
                fila.verificada !== true
        );


    console.log("");
    console.log(
        "======================================"
    );

    console.log(
        "MOTOR ITP ESPAÑA 2026"
    );

    console.log(
        "======================================"
    );

    console.log(
        "Territorios preparados:",
        territorios.length
    );

    console.log(
        "Reglas verificadas:",
        verificadas.length
    );

    console.log(
        "Pendientes:",
        pendientes.length
    );

    console.log("");
}


/* =====================================================
   MAIN
===================================================== */

async function main() {

    console.log("");
    console.log(
        "Preparando motor fiscal España 2026..."
    );
    console.log("");


    await comprobarTabla();


    console.log(
        "✓ Tabla reglas_itp_vehiculos encontrada"
    );


    await limpiarPendientes();


    console.log(
        "✓ Reglas pendientes anteriores eliminadas"
    );


    await crearTerritorios();


    console.log(
        "✓ Territorios fiscales creados"
    );


    await comprobarResultado();


    console.log(
        "✓ Estructura nacional preparada"
    );

    console.log("");
    console.log(
        "IMPORTANTE:"
    );

    console.log(
        "Ninguna regla pendiente puede calcular impuestos."
    );

    console.log(
        "Solo se utilizarán reglas con verificada = true."
    );

    console.log("");
}


main()
    .then(() => {

        process.exit(0);

    })
    .catch(error => {

        console.error("");
        console.error(
            "ERROR:"
        );

        console.error(
            error.message
        );

        console.error("");

        process.exit(1);
    });