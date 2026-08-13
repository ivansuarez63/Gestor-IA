import fs from "fs";

const ARCHIVO_XML = "boe-2026.xml";
const SALIDA_CSV = "valoraciones_vehiculos_2026.csv";
const SALIDA_JSON = "valoraciones_vehiculos_2026.json";


/* =====================================================
   UTILIDADES
===================================================== */

function decodificarEntidades(texto) {

    return String(texto || "")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&#(\d+);/g, (_, n) =>
            String.fromCharCode(Number(n))
        )
        .replace(/&#x([0-9a-f]+);/gi, (_, n) =>
            String.fromCharCode(
                parseInt(n, 16)
            )
        );
}


function limpiarTexto(texto) {

    return decodificarEntidades(
        String(texto || "")
            .replace(/<[^>]+>/g, " ")
    )
    .replace(/\s+/g, " ")
    .trim();
}


function numeroDecimal(valor) {

    const texto =
        limpiarTexto(valor);

    if (
        !texto ||
        texto === "-" ||
        texto === "--"
    ) {
        return null;
    }

    const limpio =
        texto
            .replace(/\./g, "")
            .replace(",", ".")
            .replace(/[^\d.-]/g, "");

    if (!limpio) {
        return null;
    }

    const numero =
        Number(limpio);

    return Number.isFinite(numero)
        ? numero
        : null;
}


function numeroEntero(valor) {

    const numero =
        numeroDecimal(valor);

    if (numero === null) {
        return null;
    }

    return Math.trunc(numero);
}


function escaparCSV(valor) {

    if (
        valor === null ||
        valor === undefined
    ) {
        return "";
    }

    const texto =
        String(valor);

    if (
        texto.includes(",") ||
        texto.includes('"') ||
        texto.includes("\n")
    ) {

        return `"${texto.replace(/"/g, '""')}"`;
    }

    return texto;
}


/* =====================================================
   LEER XML
===================================================== */

if (!fs.existsSync(ARCHIVO_XML)) {

    console.error(
        `No encuentro ${ARCHIVO_XML}`
    );

    console.error(
        "Ejecuta el script desde la carpeta principal GestorIA."
    );

    process.exit(1);
}


console.log(
    "Leyendo XML oficial BOE 2026..."
);

const xml =
    fs.readFileSync(
        ARCHIVO_XML,
        "utf8"
    );


console.log(
    `XML cargado: ${xml.length.toLocaleString("es-ES")} caracteres`
);


/* =====================================================
   EXTRAER TABLAS DE VEHÍCULOS
===================================================== */

const registros = [];

let tablasEncontradas = 0;
let filasDescartadas = 0;


/*
   Cada bloque oficial tiene:

   <table ...>
       ...
       Marca: ABARTH
       ...
       <tbody>
           <tr>
             10 columnas
           </tr>
       </tbody>
   </table>
*/

const regexTabla =
    /<table\b[\s\S]*?<\/table>/gi;

const tablas =
    xml.match(regexTabla) || [];


console.log(
    `Tablas encontradas en XML: ${tablas.length}`
);


for (const tabla of tablas) {

    const marcaMatch =
        tabla.match(
            /<th[^>]*colspan="10"[^>]*>\s*Marca:\s*([\s\S]*?)<\/th>/i
        );

    if (!marcaMatch) {
        continue;
    }


    const marca =
        limpiarTexto(
            marcaMatch[1]
        ).toUpperCase();


    if (!marca) {
        continue;
    }


    tablasEncontradas++;


    const tbodyMatch =
        tabla.match(
            /<tbody>([\s\S]*?)<\/tbody>/i
        );


    if (!tbodyMatch) {
        continue;
    }


    const tbody =
        tbodyMatch[1];


    const regexFila =
        /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;


    let filaMatch;


    while (
        (
            filaMatch =
                regexFila.exec(tbody)
        ) !== null
    ) {

        const fila =
            filaMatch[1];


        const columnas = [];

        const regexCelda =
            /<td\b[^>]*>([\s\S]*?)<\/td>/gi;


        let celdaMatch;


        while (
            (
                celdaMatch =
                    regexCelda.exec(fila)
            ) !== null
        ) {

            columnas.push(
                limpiarTexto(
                    celdaMatch[1]
                )
            );
        }


        /*
          La estructura oficial que acabamos
          de comprobar tiene exactamente:

          0 Modelo-Tipo
          1 Inicio
          2 Fin
          3 C.C.
          4 Nº cilindros
          5 Tipo motor
          6 Potencia kW
          7 cvf
          8 cv
          9 Valor euros
        */

        if (columnas.length !== 10) {

            filasDescartadas++;

            continue;
        }


        const modelo =
            columnas[0];


        const periodoInicio =
            numeroEntero(
                columnas[1]
            );


        const periodoFin =
            numeroEntero(
                columnas[2]
            );


        const cilindrada =
            numeroEntero(
                columnas[3]
            );


        const numeroCilindros =
            numeroEntero(
                columnas[4]
            );


        const tipoMotor =
            columnas[5];


        const potenciaKW =
            numeroDecimal(
                columnas[6]
            );


        const caballosFiscales =
            numeroDecimal(
                columnas[7]
            );


        const potenciaCV =
            numeroDecimal(
                columnas[8]
            );


        const valorOficial =
            numeroDecimal(
                columnas[9]
            );


        /*
          No aceptamos filas incompletas
          esenciales.
        */

        if (
            !modelo ||
            !marca ||
            !cilindrada ||
            valorOficial === null ||
            valorOficial <= 0
        ) {

            filasDescartadas++;

            continue;
        }


        registros.push({

            ejercicio:
                2026,

            marca,

            modelo_tipo:
                modelo,

            periodo_inicio:
                periodoInicio,

            periodo_fin:
                periodoFin,

            cilindrada,

            numero_cilindros:
                numeroCilindros,

            tipo_motor:
                tipoMotor || null,

            potencia_kw:
                potenciaKW,

            caballos_fiscales:
                caballosFiscales,

            potencia_cv:
                potenciaCV,

            valor_oficial:
                valorOficial,

            fuente:
                "Orden HAC/1501/2025"

        });
    }
}


/* =====================================================
   ELIMINAR DUPLICADOS
===================================================== */

const mapa =
    new Map();


for (const registro of registros) {

    const clave = [

        registro.ejercicio,
        registro.marca,
        registro.modelo_tipo,
        registro.periodo_inicio,
        registro.periodo_fin,
        registro.cilindrada,
        registro.numero_cilindros,
        registro.tipo_motor,
        registro.potencia_kw,
        registro.caballos_fiscales,
        registro.potencia_cv,
        registro.valor_oficial

    ].join("|");


    if (!mapa.has(clave)) {

        mapa.set(
            clave,
            registro
        );
    }
}


const unicos =
    [...mapa.values()];


/* =====================================================
   VALIDACIONES
===================================================== */

console.log("");
console.log("==========================================");
console.log("GESTOR-IA · VALORACIONES OFICIALES 2026");
console.log("==========================================");

console.log(
    `Tablas de marcas: ${tablasEncontradas}`
);

console.log(
    `Filas válidas: ${registros.length}`
);

console.log(
    `Filas únicas: ${unicos.length}`
);

console.log(
    `Filas descartadas: ${filasDescartadas}`
);


if (unicos.length < 1000) {

    console.error("");
    console.error(
        "IMPORTACIÓN DETENIDA"
    );

    console.error(
        "Se han encontrado demasiado pocos vehículos."
    );

    console.error(
        "No se generará ningún archivo para Supabase."
    );

    process.exit(1);
}


/* =====================================================
   COMPROBAR ABARTH
===================================================== */

const abarth =
    unicos.filter(
        x => x.marca === "ABARTH"
    );


console.log("");
console.log(
    `Registros ABARTH: ${abarth.length}`
);

console.log("");

console.table(
    abarth.slice(0, 8)
);


/* =====================================================
   GENERAR JSON
===================================================== */

fs.writeFileSync(

    SALIDA_JSON,

    JSON.stringify(
        unicos,
        null,
        2
    ),

    "utf8"
);


/* =====================================================
   GENERAR CSV
===================================================== */

const columnasCSV = [

    "ejercicio",
    "marca",
    "modelo_tipo",
    "periodo_inicio",
    "periodo_fin",
    "cilindrada",
    "numero_cilindros",
    "tipo_motor",
    "potencia_kw",
    "caballos_fiscales",
    "potencia_cv",
    "valor_oficial",
    "fuente"

];


const filasCSV = [

    columnasCSV.join(",")

];


for (const registro of unicos) {

    const fila =
        columnasCSV.map(
            columna =>
                escaparCSV(
                    registro[columna]
                )
        );

    filasCSV.push(
        fila.join(",")
    );
}


fs.writeFileSync(

    SALIDA_CSV,

    filasCSV.join("\n"),

    "utf8"

);


/* =====================================================
   RESULTADO
===================================================== */

console.log("");
console.log("✅ CATÁLOGO GENERADO");
console.log("");

console.log(
    `CSV: ${SALIDA_CSV}`
);

console.log(
    `JSON: ${SALIDA_JSON}`
);

console.log("");

console.log(
    "Todavía NO se ha enviado nada a Supabase."
);