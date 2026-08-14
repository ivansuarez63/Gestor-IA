import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const DGT_TASA_15 = 55.70;

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

  if (
    !authorization.startsWith("Bearer ")
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
    await supabase
      .auth
      .getUser(token);

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
      crearClienteUsuario(token)
  };
}

function normalizar(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}

function dinero(numero) {
  return Math.round(
    (
      Number(numero) +
      Number.EPSILON
    ) * 100
  ) / 100;
}

function numeroONull(valor) {
  if (
    valor === null ||
    valor === undefined ||
    valor === ""
  ) {
    return null;
  }

  const numero =
    Number(valor);

  return Number.isFinite(numero)
    ? numero
    : null;
}

function fechaLocal(fecha) {
  if (!fecha) {
    return null;
  }

  const valor =
    String(fecha)
      .slice(0, 10);

  const fechaConvertida =
    new Date(
      `${valor}T12:00:00`
    );

  return Number.isNaN(
    fechaConvertida.getTime()
  )
    ? null
    : fechaConvertida;
}

function antiguedadVehiculo(
  primeraMatriculacion,
  fechaOperacion
) {
  const inicio =
    fechaLocal(
      primeraMatriculacion
    );

  const fin =
    fechaLocal(
      fechaOperacion
    );

  if (
    !inicio ||
    !fin ||
    fin < inicio
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
      inicio.getDate(),
      12,
      0,
      0
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

function porcentajeDepreciacion(anios) {
  if (
    anios === null ||
    !Number.isFinite(anios)
  ) {
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

function codigoTerritorio(
  comunidad,
  provincia
) {
  const c =
    normalizar(comunidad);

  const p =
    normalizar(provincia);

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

  if (
    c.includes("ANDALUC")
  ) {
    return "AND";
  }

  if (
    c.includes("ARAGON")
  ) {
    return "ARA";
  }

  if (
    c.includes("ASTURIAS") ||
    c.includes("PRINCIPADO")
  ) {
    return "AST";
  }

  if (
    c.includes("BALEAR") ||
    c.includes("ILLES")
  ) {
    return "BAL";
  }

  if (
    c.includes("CANARI")
  ) {
    return "CAN";
  }

  if (
    c.includes("CANTABR")
  ) {
    return "CNT";
  }

  if (
    c.includes(
      "CASTILLA-LA MANCHA"
    ) ||
    c.includes(
      "CASTILLA LA MANCHA"
    )
  ) {
    return "CLM";
  }

  if (
    c.includes(
      "CASTILLA Y LEON"
    ) ||
    c.includes(
      "CASTILLA LEON"
    )
  ) {
    return "CYL";
  }

  if (
    c.includes("CATALU")
  ) {
    return "CAT";
  }

  if (
    c.includes("EXTREMADURA")
  ) {
    return "EXT";
  }

  if (
    c.includes("GALICIA")
  ) {
    return "GAL";
  }

  if (
    c.includes("MADRID")
  ) {
    return "MAD";
  }

  if (
    c.includes("MURCIA")
  ) {
    return "MUR";
  }

  if (
    c.includes("RIOJA")
  ) {
    return "RIO";
  }

  if (
    c.includes("VALENCIANA") ||
    c.includes("VALENCIA")
  ) {
    return "VAL";
  }

  if (
    c.includes("NAVARRA")
  ) {
    return "NAV";
  }

  if (
    c.includes("CEUTA")
  ) {
    return "CEU";
  }

  if (
    c.includes("MELILLA")
  ) {
    return "MEL";
  }

  if (
    c.includes("PAIS VASCO") ||
    c.includes("EUSKADI")
  ) {
    return null;
  }

  return null;
}

function calcularTarifaGestorIA(
  fecha = new Date()
) {
  const dia =
    fecha.getDay();

  const hora =
    fecha.getHours() +
    fecha.getMinutes() / 60;

  if (
    dia === 0 ||
    dia === 6 ||
    hora < 8.5 ||
    hora >= 18
  ) {
    return {
      importe: 65,
      tipo:
        "FUERA_HORARIO"
    };
  }

  return {
    importe: 60,
    tipo:
      "ESTANDAR"
  };
}

function cumpleRango(
  valor,
  minimo,
  maximo
) {
  if (
    minimo === null &&
    maximo === null
  ) {
    return true;
  }

  const numero =
    numeroONull(valor);

  if (
    numero === null
  ) {
    return false;
  }

  if (
    minimo !== null &&
    minimo !== undefined &&
    numero < Number(minimo)
  ) {
    return false;
  }

  if (
    maximo !== null &&
    maximo !== undefined &&
    numero > Number(maximo)
  ) {
    return false;
  }

  return true;
}

function reglaCompatible(
  regla,
  contexto
) {
  if (
    !cumpleRango(
      contexto.antiguedad,
      regla.antiguedad_min,
      regla.antiguedad_max
    )
  ) {
    return false;
  }

  if (
    !cumpleRango(
      contexto.cilindrada,
      regla.cilindrada_min,
      regla.cilindrada_max
    )
  ) {
    return false;
  }

  if (
    !cumpleRango(
      contexto
        .caballosFiscales,
      regla
        .potencia_fiscal_min,
      regla
        .potencia_fiscal_max
    )
  ) {
    return false;
  }

  if (
    !cumpleRango(
      contexto.base,
      regla.valor_min,
      regla.valor_max
    )
  ) {
    return false;
  }

  if (
    regla
      .distintivo_ambiental
  ) {
    if (
      !contexto
        .distintivoAmbiental
    ) {
      return false;
    }

    if (
      normalizar(
        contexto
          .distintivoAmbiental
      ) !==
      normalizar(
        regla
          .distintivo_ambiental
      )
    ) {
      return false;
    }
  }

  if (
    regla.clase_vehiculo
  ) {
    if (
      normalizar(
        contexto
          .claseVehiculo
      ) !==
      normalizar(
        regla
          .clase_vehiculo
      )
    ) {
      return false;
    }
  }

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

  if (
    regla.vendedor_tipo
  ) {
    if (
      normalizar(
        regla.vendedor_tipo
      ) !==
      normalizar(
        contexto.tipoVendedor
      )
    ) {
      return false;
    }
  }

  return true;
}

function detectarDatoFiscalFaltante(
  reglas,
  contexto
) {
  const reglasEspeciales =
    reglas.filter(
      regla =>
        Number(
          regla.prioridad
        ) < 100
    );

  const usaDistintivo =
    reglasEspeciales.some(
      regla =>
        Boolean(
          regla
            .distintivo_ambiental
        )
    );

  if (
    usaDistintivo &&
    !contexto
      .distintivoAmbiental
  ) {
    const combustible =
      normalizar(
        contexto.combustible
      );

    if (
      combustible.includes(
        "ELECTR"
      ) ||
      combustible.includes(
        "HIBRID"
      )
    ) {
      return {
        campo:
          "distintivo_ambiental",

        mensaje:
          "Necesito confirmar el distintivo ambiental del vehículo (0, ECO, C o B) antes de cerrar el impuesto."
      };
    }
  }

  return null;
}

function aplicarRegla(
  regla,
  contexto
) {
  if (
    regla
      .requiere_documentacion ===
    true
  ) {
    return {
      verificado: false,
      bloqueado: true,
      motivo:
        regla.descripcion ||
        "Esta regla requiere una comprobación adicional."
    };
  }

  if (
    regla.requiere_factura === true &&
    contexto
      .facturaVerificada !==
    true
  ) {
    return {
      verificado: false,
      bloqueado: true,
      motivo:
        "Esta regla exige verificar la factura antes de aplicarse."
    };
  }

  if (
    regla.exento === true ||
    regla.no_sujeto === true
  ) {
    return {
      verificado: true,
      impuesto: 0,
      base:
        contexto.base
    };
  }

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

async function crearExpediente(
  req,
  res,
  auth
) {
  const matricula =
    String(
      req.body?.matricula ||
      ""
    )
      .trim()
      .replace(/\s/g, "")
      .toUpperCase();

  if (!matricula) {
    return res
      .status(400)
      .json({
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

  if (
    buscarError
  ) {
    console.error(
      "Error buscando expediente:",
      buscarError
    );
  }

  if (
    existente
  ) {
    return res
      .status(200)
      .json({
        ok: true,
        existente: true,
        expediente:
          existente
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

  if (
    error
  ) {
    return res
      .status(500)
      .json({
        ok: false,
        error:
          "Supabase: " +
          error.message
      });
  }

  return res
    .status(200)
    .json({
      ok: true,
      existente: false,
      expediente
    });
}

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

  if (
    error
  ) {
    return res
      .status(500)
      .json({
        ok: false,
        error:
          "No se pudieron cargar los expedientes."
      });
  }

  return res
    .status(200)
    .json({
      ok: true,
      expedientes:
        data || []
    });
}

async function buscarVehiculo(
  req,
  res,
  auth
) {
  const expedienteId =
    String(
      req.body
        ?.expediente_id ||
      ""
    )
      .trim();

  let marca =
    String(
      req.body?.marca ||
      ""
    )
      .trim();

  let modelo =
    String(
      req.body?.modelo ||
      ""
    )
      .trim();

  let cilindrada =
    Number(
      req.body
        ?.cilindrada ||
      0
    );

  let potenciaKW =
    Number(
      req.body
        ?.potencia_kw ||
      0
    );

  let anio =
    Number(
      req.body?.anio ||
      0
    );

  let expediente =
    null;

  if (
    expedienteId
  ) {
    const {
      data,
      error
    } =
      await auth.db
        .from(
          "expedientes"
        )
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
      return res
        .status(404)
        .json({
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
        expediente
          .cilindrada ||
        0
      );

    if (
      !anio &&
      expediente
        .fecha_primera_matriculacion
    ) {
      anio =
        Number(
          String(
            expediente
              .fecha_primera_matriculacion
          )
            .slice(0, 4)
        );
    }
  }

  const marcaNormalizada =
    normalizar(marca);

  const modeloNormalizado =
    normalizar(modelo);

  if (
    !marcaNormalizada ||
    !modeloNormalizado ||
    !cilindrada
  ) {
    return res
      .status(400)
      .json({
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
        marcaNormalizada
      )
      .eq(
        "cilindrada",
        Math.round(
          cilindrada
        )
      )
      .limit(1000);

  if (
    error
  ) {
    return res
      .status(500)
      .json({
        ok: false,
        error:
          "No se pudo consultar el catálogo oficial."
      });
  }

  const palabras =
    modeloNormalizado
      .split(" ")
      .filter(
        palabra =>
          palabra.length >=
          2
      );

  let candidatos =
    (data || [])
      .filter(
        item => {
          const oficial =
            normalizar(
              item
                .modelo_tipo
            );

          return palabras
            .every(
              palabra =>
                oficial.includes(
                  palabra
                )
            );
        }
      );

  if (
    Number.isInteger(
      anio
    ) &&
    anio > 1900
  ) {
    candidatos =
      candidatos.filter(
        item => {
          const inicio =
            numeroONull(
              item
                .periodo_inicio
            );

          const fin =
            numeroONull(
              item
                .periodo_fin
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
    Number.isFinite(
      potenciaKW
    ) &&
    potenciaKW > 0
  ) {
    const filtrados =
      candidatos.filter(
        item => {
          const potencia =
            numeroONull(
              item
                .potencia_kw
            );

          return (
            potencia !== null &&
            Math.abs(
              potencia -
              potenciaKW
            ) <= 0.5
          );
        }
      );

    if (
      filtrados.length >
      0
    ) {
      candidatos =
        filtrados;
    }
  }

  if (
    candidatos.length ===
    0
  ) {
    return res
      .status(200)
      .json({
        ok: true,
        encontrado: false,
        coincidencia_exacta:
          false,
        necesita_mas_datos:
          true,
        numero_coincidencias:
          0
      });
  }

  if (
    candidatos.length ===
    1
  ) {
    const vehiculo =
      candidatos[0];

    if (
      expedienteId
    ) {
      await auth.db
        .from(
          "expedientes"
        )
        .update({
          valoracion_id:
            vehiculo.id,

          modelo_fiscal_identificado:
            vehiculo
              .modelo_tipo,

          valor_oficial_boe:
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
    }

    return res
      .status(200)
      .json({
        ok: true,
        encontrado: true,
        coincidencia_exacta:
          true,
        necesita_mas_datos:
          false,
        vehiculo
      });
  }

  return res
    .status(200)
    .json({
      ok: true,
      encontrado: true,
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

async function guardarBloqueo(
  auth,
  expedienteId,
  motivo,
  datos = {}
) {
  const {
    error
  } =
    await auth.db
      .from("expedientes")
      .update({
        calculo_fiscal_verificado:
          false,

        motivo_calculo_bloqueado:
          motivo,

        estado:
          "CALCULO_FISCAL",

        paso_actual:
          "CALCULO_FISCAL",

        updated_at:
          new Date()
            .toISOString(),

        ...datos
      })
      .eq(
        "id",
        expedienteId
      );

  if (
    error
  ) {
    console.error(
      "No se pudo guardar bloqueo fiscal:",
      error
    );
  }
}

async function calcularCoste(
  req,
  res,
  auth
) {
  const expedienteId =
    String(
      req.body
        ?.expediente_id ||
      ""
    )
      .trim();

  if (
    !expedienteId
  ) {
    return res
      .status(400)
      .json({
        ok: false,
        error:
          "Falta el expediente."
      });
  }

  const {
    data: expediente,
    error:
      expedienteError
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
    return res
      .status(404)
      .json({
        ok: false,
        error:
          "Expediente no encontrado."
      });
  }

  if (
    expediente
      .tipo_vendedor_declarado ===
    "EMPRESA" &&
    expediente
      .factura_verificada !==
    true
  ) {
    const motivo =
      "Has indicado que el vendedor es una empresa/profesional. Hay que verificar la factura antes de determinar el tratamiento fiscal.";

    await guardarBloqueo(
      auth,
      expedienteId,
      motivo
    );

    return res
      .status(409)
      .json({
        ok: false,
        calculo_verificado:
          false,
        pago_bloqueado:
          true,
        requiere_documentacion:
          true,
        requiere_factura:
          true,
        error:
          motivo
      });
  }

  if (
    expediente
      .tipo_vendedor_verificado ===
    "EMPRESA"
  ) {
    const motivo =
      "La operación está documentada con vendedor empresario. No debe tratarse como el ITP ordinario entre particulares.";

    await guardarBloqueo(
      auth,
      expedienteId,
      motivo
    );

    return res
      .status(409)
      .json({
        ok: false,
        calculo_verificado:
          false,
        pago_bloqueado:
          true,
        requiere_factura:
          true,
        error:
          motivo
      });
  }

  if (
    expediente
      .tipo_vendedor_verificado !==
    "PARTICULAR"
  ) {
    const motivo =
      "Falta verificar si el vendedor actúa como particular o como empresario.";

    await guardarBloqueo(
      auth,
      expedienteId,
      motivo
    );

    return res
      .status(409)
      .json({
        ok: false,
        calculo_verificado:
          false,
        pago_bloqueado:
          true,
        error:
          motivo
      });
  }

  if (
    !expediente
      .valoracion_id
  ) {
    const motivo =
      "El vehículo todavía no está identificado exactamente.";

    await guardarBloqueo(
      auth,
      expedienteId,
      motivo
    );

    return res
      .status(409)
      .json({
        ok: false,
        calculo_verificado:
          false,
        pago_bloqueado:
          true,
        error:
          motivo
      });
  }

  const {
    data: vehiculo,
    error:
      vehiculoError
  } =
    await auth.db
      .from(
        "valoraciones_vehiculos"
      )
      .select("*")
      .eq(
        "id",
        expediente
          .valoracion_id
      )
      .single();

  if (
    vehiculoError ||
    !vehiculo
  ) {
    const motivo =
      "No se pudo recuperar la valoración oficial del vehículo.";

    await guardarBloqueo(
      auth,
      expedienteId,
      motivo
    );

    return res
      .status(409)
      .json({
        ok: false,
        calculo_verificado:
          false,
        pago_bloqueado:
          true,
        error:
          motivo
      });
  }

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
    const motivo =
      "No se pudo determinar correctamente la antigüedad del vehículo.";

    await guardarBloqueo(
      auth,
      expedienteId,
      motivo
    );

    return res
      .status(409)
      .json({
        ok: false,
        calculo_verificado:
          false,
        pago_bloqueado:
          true,
        error:
          motivo
      });
  }

  const depreciacion =
    porcentajeDepreciacion(
      antiguedad
    );

  const valorOficial =
    numeroONull(
      vehiculo
        .valor_oficial
    );

  if (
    depreciacion === null ||
    valorOficial === null ||
    valorOficial <= 0
  ) {
    const motivo =
      "La valoración fiscal del vehículo no es válida.";

    await guardarBloqueo(
      auth,
      expedienteId,
      motivo
    );

    return res
      .status(409)
      .json({
        ok: false,
        calculo_verificado:
          false,
        pago_bloqueado:
          true,
        error:
          motivo
      });
  }

  const valorFiscal =
    dinero(
      valorOficial *
      depreciacion /
      100
    );

  const precioDeclarado =
    numeroONull(
      expediente
        .precio_compraventa
    ) || 0;

  const baseGeneral =
    dinero(
      Math.max(
        precioDeclarado,
        valorFiscal
      )
    );

  const codigo =
    codigoTerritorio(
      expediente
        .comunidad_autonoma,

      expediente
        .provincia
    );

  if (
    !codigo
  ) {
    const motivo =
      "No se pudo determinar el territorio fiscal del comprador. Si es País Vasco, necesitamos la provincia (Álava, Bizkaia o Gipuzkoa).";

    await guardarBloqueo(
      auth,
      expedienteId,
      motivo,
      {
        valor_oficial_boe:
          valorOficial,

        porcentaje_depreciacion:
          depreciacion,

        valor_fiscal_depreciado:
          valorFiscal,

        valor_fiscal:
          valorFiscal
      }
    );

    return res
      .status(409)
      .json({
        ok: false,
        calculo_verificado:
          false,
        pago_bloqueado:
          true,
        error:
          motivo
      });
  }

  const {
    data: reglas,
    error:
      reglasError
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
    return res
      .status(500)
      .json({
        ok: false,
        pago_bloqueado:
          true,
        error:
          "No se pudieron consultar las reglas fiscales."
      });
  }

  if (
    !reglas ||
    reglas.length ===
    0
  ) {
    const motivo =
      `El territorio ${codigo} todavía no tiene reglas 2026 verificadas para cálculo automático.`;

    await guardarBloqueo(
      auth,
      expedienteId,
      motivo,
      {
        valor_oficial_boe:
          valorOficial,

        porcentaje_depreciacion:
          depreciacion,

        valor_fiscal_depreciado:
          valorFiscal,

        valor_fiscal:
          valorFiscal
      }
    );

    return res
      .status(409)
      .json({
        ok: false,
        calculo_verificado:
          false,
        pago_bloqueado:
          true,
        territorio:
          codigo,
        error:
          motivo
      });
  }

  const contexto = {
    antiguedad,

    cilindrada:
      numeroONull(
        vehiculo.cilindrada
      ),

    caballosFiscales:
      numeroONull(
        vehiculo
          .caballos_fiscales
      ),

    base:
      baseGeneral,

    combustible:
      expediente
        .combustible,

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
      true,

    tipoVendedor:
      expediente
        .tipo_vendedor_verificado,

    facturaVerificada:
      expediente
        .factura_verificada ===
      true
  };

  const datoFaltante =
    detectarDatoFiscalFaltante(
      reglas,
      contexto
    );

  if (
    datoFaltante
  ) {
    const motivo =
      datoFaltante.mensaje;

    await guardarBloqueo(
      auth,
      expedienteId,
      motivo,
      {
        valor_oficial_boe:
          valorOficial,

        porcentaje_depreciacion:
          depreciacion,

        valor_fiscal_depreciado:
          valorFiscal,

        valor_fiscal:
          valorFiscal
      }
    );

    return res
      .status(409)
      .json({
        ok: false,
        calculo_verificado:
          false,
        pago_bloqueado:
          true,
        necesita_mas_datos:
          true,
        solicitar:
          datoFaltante.campo,
        territorio:
          codigo,
        error:
          motivo
      });
  }

  const compatibles =
    reglas.filter(
      regla =>
        reglaCompatible(
          regla,
          contexto
        )
    );

  if (
    compatibles.length ===
    0
  ) {
    const motivo =
      "No existe una regla fiscal verificada compatible con las características de este vehículo.";

    await guardarBloqueo(
      auth,
      expedienteId,
      motivo,
      {
        valor_oficial_boe:
          valorOficial,

        porcentaje_depreciacion:
          depreciacion,

        valor_fiscal_depreciado:
          valorFiscal,

        valor_fiscal:
          valorFiscal
      }
    );

    return res
      .status(409)
      .json({
        ok: false,
        calculo_verificado:
          false,
        pago_bloqueado:
          true,
        territorio:
          codigo,
        error:
          motivo
      });
  }

  const regla =
    compatibles[0];

  let baseRegla =
    baseGeneral;

  if (
    regla
      .base_minima_tipo ===
    "VALOR_FISCAL"
  ) {
    baseRegla =
      valorFiscal;
  }

  if (
    regla
      .base_minima_tipo ===
    "PRECIO_DECLARADO"
  ) {
    baseRegla =
      dinero(
        precioDeclarado
      );
  }

  const resultado =
    aplicarRegla(
      regla,
      {
        ...contexto,
        base:
          baseRegla
      }
    );

  if (
    !resultado
      .verificado
  ) {
    const motivo =
      resultado.motivo ||
      "La regla fiscal requiere una comprobación adicional.";

    await guardarBloqueo(
      auth,
      expedienteId,
      motivo,
      {
        valor_oficial_boe:
          valorOficial,

        porcentaje_depreciacion:
          depreciacion,

        valor_fiscal_depreciado:
          valorFiscal,

        valor_fiscal:
          valorFiscal
      }
    );

    return res
      .status(409)
      .json({
        ok: false,
        calculo_verificado:
          false,
        pago_bloqueado:
          true,
        requiere_documentacion:
          true,
        territorio:
          codigo,
        regla:
          regla.tipo_regla,
        error:
          motivo
      });
  }

  const impuesto =
    dinero(
      resultado.impuesto
    );

  const tasaDGT =
    DGT_TASA_15;

  const servicio =
    calcularTarifaGestorIA(
      new Date()
    );

  const total =
    dinero(
      impuesto +
      tasaDGT +
      servicio.importe
    );

  const actualizacion = {
    valoracion_id:
      vehiculo.id,

    modelo_fiscal_identificado:
      vehiculo.modelo_tipo,

    valor_oficial_boe:
      valorOficial,

    porcentaje_depreciacion:
      depreciacion,

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
    error:
      guardarError
  } =
    await auth.db
      .from(
        "expedientes"
      )
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
    return res
      .status(500)
      .json({
        ok: false,
        error:
          "No se pudo guardar el cálculo fiscal."
      });
  }

  const auditoria = {
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
  };

  const {
    error:
      auditoriaError
  } =
    await auth.db
      .from(
        "calculos_fiscales"
      )
      .upsert(
        auditoria,
        {
          onConflict:
            "expediente_id"
        }
      );

  if (
    auditoriaError
  ) {
    console.error(
      "Error guardando auditoría fiscal:",
      auditoriaError
    );
  }

  return res
    .status(200)
    .json({
      ok: true,

      calculo_verificado:
        true,

      pago_bloqueado:
        false,

      vehiculo: {
        id:
          vehiculo.id,

        marca:
          vehiculo.marca,

        modelo:
          vehiculo.modelo_tipo,

        antiguedad,

        valor_oficial:
          valorOficial,

        depreciacion,

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

        prioridad:
          regla.prioridad,

        porcentaje:
          regla.porcentaje,

        cuota_fija:
          regla.cuota_fija,

        impuesto,

        fuente:
          regla.fuente_oficial
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

async function simularPago(
  req,
  res,
  auth
) {
  const expedienteId =
    String(
      req.body
        ?.expediente_id ||
      ""
    )
      .trim();

  if (
    !expedienteId
  ) {
    return res
      .status(400)
      .json({
        ok: false,
        error:
          "Falta el expediente."
      });
  }

  const {
    data: expediente,
    error
  } =
    await auth.db
      .from(
        "expedientes"
      )
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
    return res
      .status(404)
      .json({
        ok: false,
        error:
          "Expediente no encontrado."
      });
  }

  if (
    expediente
      .calculo_fiscal_verificado !==
    true ||
    expediente
      .total_calculado ===
    null
  ) {
    return res
      .status(409)
      .json({
        ok: false,
        pago_bloqueado:
          true,
        error:
          "El cálculo fiscal debe estar verificado antes del pago."
      });
  }

  const {
    data,
    error:
      pagoError
  } =
    await auth.db
      .from(
        "expedientes"
      )
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

  if (
    pagoError
  ) {
    return res
      .status(500)
      .json({
        ok: false,
        error:
          "No se pudo simular el pago."
      });
  }

  return res
    .status(200)
    .json({
      ok: true,
      expediente:
        data
    });
}

async function generarInvitacion(
  req,
  res,
  auth
) {
  const expedienteId =
    String(
      req.body
        ?.expediente_id ||
      ""
    )
      .trim();

  if (
    !expedienteId
  ) {
    return res
      .status(400)
      .json({
        ok: false,
        error:
          "Falta el expediente."
      });
  }

  const {
    data: expediente,
    error
  } =
    await auth.db
      .from(
        "expedientes"
      )
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
    return res
      .status(404)
      .json({
        ok: false,
        error:
          "Expediente no encontrado."
      });
  }

  if (
    expediente
      .pago_validado !==
    true ||
    expediente
      .invitacion_habilitada !==
    true
  ) {
    return res
      .status(403)
      .json({
        ok: false,
        error:
          "La invitación solo está disponible después del pago."
      });
  }

  const {
    data: existente,
    error:
      existenteError
  } =
    await auth.db
      .from(
        "invitaciones"
      )
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

  if (
    existenteError
  ) {
    console.error(
      "Error buscando invitación:",
      existenteError
    );
  }

  if (
    existente
  ) {
    return res
      .status(200)
      .json({
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
      48 *
      60 *
      60 *
      1000
    );

  const {
    data: invitacion,
    error:
      invitacionError
  } =
    await auth.db
      .from(
        "invitaciones"
      )
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
    return res
      .status(500)
      .json({
        ok: false,
        error:
          "No se pudo generar la invitación."
      });
  }

  await auth.db
    .from(
      "expedientes"
    )
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

  return res
    .status(200)
    .json({
      ok: true,

      enlace:
        `https://gestor-ia.eu/?invitacion=${invitacion.token}`,

      caduca_en:
        invitacion.caduca_en
    });
}

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

    if (
      !auth
    ) {
      return;
    }

    const action =
      String(
        req.query?.action ||
        ""
      )
        .trim()
        .toLowerCase();

    switch (
      action
    ) {
      case "crear":

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

      case "listar":

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

      case "buscar-vehiculo":

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

      case "calcular-coste":

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

        return calcularCoste(
          req,
          res,
          auth
        );

      case "simular-pago":

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

      case "generar-invitacion":

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

      default:

        return res
          .status(400)
          .json({
            ok: false,
            error:
              "Acción no válida."
          });
    }

  } catch (
    error
  ) {
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