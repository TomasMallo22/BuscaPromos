#!/usr/bin/env python3
"""Valida los casos de fixtures/rappi/casos/ contra la implementacion ORIGINAL en Python.

Para que existe: los casos sinteticos definen que tiene que devolver el motor. Antes de portar
el algoritmo a TypeScript hay que estar seguro de que los valores esperados son los correctos y
no lo que nosotros creemos. La implementacion de referencia es la del repo del que se porta.

    git clone --depth 1 https://github.com/ivokalaizic/rappi-turbo-radar /tmp/rtr
    python3 -I scripts/validar-casos-contra-original.py /tmp/rtr

Despues del port, este script sigue sirviendo: si un caso nuevo se agrega a casos/, se valida
aca primero y recien despues se escribe el test de TypeScript. Asi los dos lados comparan
contra la misma verdad en vez de compararse entre si.

Lo corre una persona a mano, no el CI: el CI no clona el repo del original.
"""
import glob
import json
import os
import sys

RUTA_ORIGINAL = sys.argv[1] if len(sys.argv) > 1 else "/home/user/ivokalaizic/rappi-turbo-radar"
if not os.path.isdir(os.path.join(RUTA_ORIGINAL, "turbo")):
    sys.exit(f"No encontre el paquete `turbo` en {RUTA_ORIGINAL}.\n{__doc__}")
sys.path.insert(0, RUTA_ORIGINAL)

from turbo import db, detect  # noqa: E402

DIA = 86400
AHORA = 1000 * DIA  # base arbitraria: el reloj es inyectado, los casos usan diasAtras
REGLAS = dict(detect.DEFAULT_RULES)
CASOS = os.path.join(os.path.dirname(__file__), "..", "fixtures", "rappi", "casos")

fallos = 0


def chequear(nombre: str, quiero, tengo) -> None:
    global fallos
    ok = quiero == tengo
    if not ok:
        fallos += 1
    print(f"   {'OK ' if ok else 'MAL'} {nombre}: esperado={quiero!r} obtenido={tengo!r}")


def a_filas(caso: dict) -> list[dict]:
    """Las filas del caso, con diasAtras convertido a epoch y los nombres del original."""
    return [
        {
            "ts": AHORA - f["diasAtras"] * DIA,
            "price": f["precio"],
            "global_offer": 1 if f["promoExcluida"] else 0,
            "in_stock": 1 if f["enStock"] else 0,
        }
        for f in caso["filas"]
    ]


def validar_serie(caso: dict) -> None:
    filas = a_filas(caso)
    esperado = caso["esperado"]
    oferta = detect.offer_status(filas, REGLAS, AHORA)
    habitual = db.typical_from_changes(filas, REGLAS["historial_dias"], AHORA)

    if "estadoOferta" in esperado:
        chequear("estadoOferta", esperado["estadoOferta"], oferta["status"])
    if "precioReferencia" in esperado:
        chequear("precioReferencia", esperado["precioReferencia"], oferta["ref_price"])
    if "desdeDiasAtras" in esperado:
        chequear("desdeDiasAtras", esperado["desdeDiasAtras"], (AHORA - oferta["since"]) // DIA)
    if "precioHabitualAhora" in esperado:
        chequear("precioHabitualAhora", esperado["precioHabitualAhora"], habitual)
    if "duracionesSegundos" in esperado:
        desde = AHORA - REGLAS["historial_dias"] * DIA
        sostenido: dict[float, int] = {}
        for fila, siguiente in zip(filas, filas[1:]):
            if fila["global_offer"] or not fila["in_stock"]:
                continue
            inicio = max(fila["ts"], desde)
            if siguiente["ts"] > inicio:
                sostenido[fila["price"]] = sostenido.get(fila["price"], 0) + (siguiente["ts"] - inicio)
        chequear(
            "duracionesSegundos",
            {float(k): v for k, v in esperado["duracionesSegundos"].items()},
            sostenido,
        )
        # El punto del caso: con duraciones empatadas gana el insertado primero (el mas viejo).
        chequear("gana el mas viejo", esperado["precioHabitualAhora"], max(sostenido, key=sostenido.get))


def validar_pasillo(caso: dict) -> None:
    sub = caso["subPasillo"]

    def producto(d: dict) -> dict:
        return {
            "subaisle": sub,
            "presentation": d["presentacion"],
            "price": d["precio"],
            "global_offer": 1 if d["promoExcluida"] else 0,
            "in_stock": 1 if d["enStock"] else 0,
            "product_id": d["idExterno"],
        }

    bajo_test = producto(caso["bajoTest"])
    comparables = [producto(d) for d in caso["comparables"]]
    ignorados = [producto(d) for d in caso["ignorados"]]

    idx = detect.unit_index([bajo_test] + comparables + ignorados)
    referencia = detect.subaisle_reference(idx, bajo_test)
    esperado = caso["esperado"]["conOchoComparables"]
    chequear("referencia", esperado["referencia"], referencia[0] if referencia else None)
    chequear("n", esperado["n"], referencia[1] if referencia else None)
    ratio = bajo_test["price"] / referencia[0]
    chequear("ratio", esperado["ratio"], ratio)
    chequear("dispara", esperado["dispara"], ratio <= REGLAS["nuevo_vs_pasillo"])

    # Con un comparable menos queda por debajo de MIN_COMPARABLES y la regla no corre.
    sin_uno = [c for c in comparables if c["product_id"] != comparables[-1]["product_id"]]
    ref_corta = detect.subaisle_reference(detect.unit_index([bajo_test] + sin_uno + ignorados), bajo_test)
    esperado_corto = caso["esperado"]["conSieteComparables"]
    chequear("referencia con 7", esperado_corto["referencia"], ref_corta[0] if ref_corta else None)
    chequear("dispara con 7", esperado_corto["dispara"], bool(ref_corta))

    # Los ignorados no entran al indice, cada uno por su razon.
    precios = idx[(sub, "g")]
    chequear("las Und no generan clave", [], [k for k in idx if k[1] not in ("g", "ml")])
    chequear("entradas en el indice", 1 + len(comparables), len(precios))


def main() -> int:
    for ruta in sorted(glob.glob(os.path.join(CASOS, "*.json"))):
        caso = json.load(open(ruta, encoding="utf-8"))
        print(f"\n== {caso['nombre']}")
        if "filas" in caso:
            validar_serie(caso)
        elif "subPasillo" in caso:
            validar_pasillo(caso)
        else:
            print("   (sin validador para la forma de este caso)")

    print(f"\n{'TODO OK' if fallos == 0 else f'{fallos} FALLOS'}")
    return 1 if fallos else 0


if __name__ == "__main__":
    sys.exit(main())
