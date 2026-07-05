import json


def marcar_identificado(tipo):

    archivo = "clientes/empresa_demo/estado.json"


    with open(
        archivo,
        "r",
        encoding="utf-8"
    ) as f:

        estado = json.load(f)


    estado["identificado"] = True
    estado["tipo_identificacion"] = tipo


    with open(
        archivo,
        "w",
        encoding="utf-8"
    ) as f:

        json.dump(
            estado,
            f,
            indent=4,
            ensure_ascii=False
        )


    print("Identificación guardada")
    print("Tipo:", tipo)



# prueba
marcar_identificado("certificado_electronico")