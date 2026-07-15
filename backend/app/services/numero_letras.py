"""Conversión de números a letras en español (pesos colombianos).

Migrado de GESCO app.py. Soporta montos con decimales y formato colombiano.
"""

import re


def numero_a_letras(numero: float | int | str) -> str:
    """Convierte un número a su representación en letras para contratos colombianos.

    Ejemplo: 1250000 → "UN MILLÓN DOSCIENTOS CINCUENTA MIL PESOS M/CTE"
    """
    try:
        s = str(numero).strip().replace("$", "").replace(",", "").replace("\xa0", "").replace(" ", "")

        # Detectar separador decimal según contexto colombiano
        if "," in s and "." in s:
            if s.rfind(".") > s.rfind(","):
                s = s.replace(",", "")  # 16,000,000.00
            else:
                s = s.replace(".", "").replace(",", ".")  # 16.000.000,00
        elif "," in s:
            parts = s.split(",")
            if len(parts) == 2 and len(parts[1]) <= 2:
                s = s.replace(",", ".")
            else:
                s = s.replace(",", "")
        elif "." in s:
            parts = s.split(".")
            if len(parts) == 2 and len(parts[1]) <= 2:
                pass  # ya está bien: 16000000.00
            else:
                s = s.replace(".", "")  # 16.000.000

        n = int(float(s))
        unidades = [
            "", "UN", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE",
            "DIEZ", "ONCE", "DOCE", "TRECE", "CATORCE", "QUINCE", "DIECISÉIS",
            "DIECISIETE", "DIECIOCHO", "DIECINUEVE",
        ]
        decenas = ["", "DIEZ", "VEINTE", "TREINTA", "CUARENTA", "CINCUENTA",
                   "SESENTA", "SETENTA", "OCHENTA", "NOVENTA"]
        centenas = ["", "CIENTO", "DOSCIENTOS", "TRESCIENTOS", "CUATROCIENTOS", "QUINIENTOS",
                    "SEISCIENTOS", "SETECIENTOS", "OCHOCIENTOS", "NOVECIENTOS"]

        def menos_mil(n):
            if n == 0:
                return ""
            if n == 100:
                return "CIEN"
            if n < 20:
                return unidades[n]
            if n < 100:
                d, u = divmod(n, 10)
                return decenas[d] + (" Y " + unidades[u] if u else "")
            c, r = divmod(n, 100)
            return centenas[c] + (" " + menos_mil(r) if r else "")

        if n == 0:
            return "CERO PESOS M/CTE"
        if n < 0:
            return "MENOS " + numero_a_letras(-n)

        millones, resto = divmod(n, 1_000_000)
        miles, centavos_n = divmod(resto, 1000)
        partes = []
        if millones == 1:
            partes.append("UN MILLÓN")
        elif millones > 1:
            partes.append(menos_mil(millones) + " MILLONES")
        if miles > 0:
            partes.append(menos_mil(miles) + " MIL")
        if centavos_n > 0:
            partes.append(menos_mil(centavos_n))
        texto = " ".join(partes)
        # "DE" solo cuando el último componente es MILLÓN/MILLONES
        ultimo = partes[-1] if partes else ""
        if ultimo.endswith("MILLÓN") or ultimo.endswith("MILLONES"):
            texto += " DE"
        return texto + " PESOS M/CTE"
    except Exception:
        return str(numero) + " PESOS M/CTE"
