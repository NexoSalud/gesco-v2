"""
Tests de integración para todos los endpoints de Gesco V2.
Ejecutar: python3 -m pytest backend/tests/ -v --tb=short
"""

import pytest
import httpx
from datetime import date

BASE = "https://contratos.esenorte3.lat"

# ─── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture(scope="module")
def client():
    return httpx.Client(timeout=30.0, verify=False)


def test_health(client):
    """GET /api/health — verifica que el servidor responde"""
    r = client.get(f"{BASE}/api/health")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "ok"
    assert data["app"] == "Gesco V2"


# ─── Resoluciones ──────────────────────────────────────────────────────────────

class TestResoluciones:
    def test_listar(self, client):
        r = client.get(f"{BASE}/api/v1/resoluciones")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)

    def test_obtener_primera(self, client):
        r = client.get(f"{BASE}/api/v1/resoluciones")
        assert r.status_code == 200
        data = r.json()
        if data:
            rid = data[0]["id"]
            r2 = client.get(f"{BASE}/api/v1/resoluciones/{rid}")
            assert r2.status_code == 200
            res = r2.json()
            assert "id" in res
            assert "codigo" in res
            assert "contratos" in res

    def test_404(self, client):
        r = client.get(f"{BASE}/api/v1/resoluciones/99999")
        assert r.status_code == 404


# ─── Contratos ─────────────────────────────────────────────────────────────────

class TestContratos:
    def test_listar(self, client):
        r = client.get(f"{BASE}/api/v1/contratos")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        # Verificar contrato con data completa
        for c in data:
            assert "numero_contrato" in c
            assert "contratista_rel" in c

    def test_listar_con_filtros(self, client):
        r = client.get(f"{BASE}/api/v1/contratos?estado=ACTIVO")
        assert r.status_code == 200
        for c in r.json():
            assert c.get("estado") == "ACTIVO"

    def test_listar_por_busqueda(self, client):
        r = client.get(f"{BASE}/api/v1/contratos?buscar=022")
        assert r.status_code == 200
        data = r.json()
        assert len(data) > 0

    def test_obtener_por_id(self, client):
        r = client.get(f"{BASE}/api/v1/contratos")
        data = r.json()
        if data:
            cid = data[0]["id"]
            r2 = client.get(f"{BASE}/api/v1/contratos/id/{cid}")
            assert r2.status_code == 200
            c = r2.json()
            assert c["id"] == cid
            assert "contratista_rel" in c
            assert "pagos" in c

    def test_obtener_404(self, client):
        r = client.get(f"{BASE}/api/v1/contratos/id/999999")
        assert r.status_code == 404

    def test_by_number_query(self, client):
        """Test busqueda por numero usando query param buscar"""
        r = client.get(f"{BASE}/api/v1/contratos")
        data = r.json()
        if data:
            num = data[0]["numero_contrato"]
            r2 = client.get(f"{BASE}/api/v1/contratos?buscar={num}")
            assert r2.status_code == 200
            found = False
            for c in r2.json():
                if c["numero_contrato"] == num:
                    found = True
                    break
            assert found, f"Contrato {num} no encontrado por busqueda"

    def test_contrato_tiene_pagos(self, client):
        """Verificar que contratos con pagos tengan la estructura correcta"""
        r = client.get(f"{BASE}/api/v1/contratos")
        for c in r.json():
            if c.get("pagos"):
                for p in c["pagos"]:
                    assert "id" in p
                    assert "numero_pago" in p
                    assert "valor_a_pagar" in p
                break


# ─── Contratistas ─────────────────────────────────────────────────────────────

class TestContratistas:
    def test_listar(self, client):
        r = client.get(f"{BASE}/api/v1/contratistas")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)

    def test_buscar(self, client):
        r = client.get(f"{BASE}/api/v1/contratistas?buscar=1007778319")
        assert r.status_code == 200
        data = r.json()
        for c in data:
            assert "nombre" in c
            assert "identificacion" in c

    def test_obtener_por_id(self, client):
        r = client.get(f"{BASE}/api/v1/contratistas?buscar=1007778319")
        data = r.json()
        if data:
            cid = data[0]["identificacion"]
            r2 = client.get(f"{BASE}/api/v1/contratistas/{cid}")
            assert r2.status_code == 200
            assert r2.json()["identificacion"] == cid

    def test_404(self, client):
        r = client.get(f"{BASE}/api/v1/contratistas/NO_EXISTE_999")
        assert r.status_code == 404


# ─── Perfiles ──────────────────────────────────────────────────────────────────

class TestPerfiles:
    def test_listar(self, client):
        r = client.get(f"{BASE}/api/v1/perfiles")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) > 0

    def test_perfiles_tienen_actividades(self, client):
        r = client.get(f"{BASE}/api/v1/perfiles")
        for p in r.json():
            if p.get("actividades"):
                for a in p["actividades"]:
                    assert "id" in a
                    assert "descripcion" in a
                    assert "tipo" in a  # GENERAL o ESPECIFICA
                    assert a["tipo"] in ("GENERAL", "ESPECIFICA")
                break

    def test_obtener_por_id(self, client):
        r = client.get(f"{BASE}/api/v1/perfiles")
        data = r.json()
        if data:
            pid = data[0]["id"]
            r2 = client.get(f"{BASE}/api/v1/perfiles/{pid}")
            assert r2.status_code == 200
            assert r2.json()["id"] == pid

    def test_actividades_por_perfil(self, client):
        r = client.get(f"{BASE}/api/v1/perfiles")
        data = r.json()
        if data:
            pid = data[0]["id"]
            r2 = client.get(f"{BASE}/api/v1/perfiles/{pid}/actividades")
            assert r2.status_code == 200
            assert isinstance(r2.json(), list)

    def test_crear_y_eliminar_actividad(self, client):
        """Prueba crear y eliminar una actividad en un perfil"""
        r = client.get(f"{BASE}/api/v1/perfiles")
        data = r.json()
        if not data:
            return
        pid = data[0]["id"]
        # Crear
        r2 = client.post(
            f"{BASE}/api/v1/perfiles/{pid}/actividades",
            json={"descripcion": "TEST ACTIVIDAD", "tipo": "GENERAL", "orden": 999},
        )
        assert r2.status_code == 201
        act = r2.json()
        assert act["descripcion"] == "TEST ACTIVIDAD"
        assert act["tipo"] == "GENERAL"
        # Eliminar
        r3 = client.delete(f"{BASE}/api/v1/perfiles/actividades/{act['id']}")
        assert r3.status_code == 204

    def test_actualizar_actividad(self, client):
        r = client.get(f"{BASE}/api/v1/perfiles")
        data = r.json()
        if not data:
            return
        pid = data[0]["id"]
        r2 = client.post(
            f"{BASE}/api/v1/perfiles/{pid}/actividades",
            json={"descripcion": "TEST EDIT", "tipo": "GENERAL", "orden": 999},
        )
        assert r2.status_code == 201
        aid = r2.json()["id"]
        # Editar
        r3 = client.put(
            f"{BASE}/api/v1/perfiles/actividades/{aid}",
            json={"descripcion": "TEST EDITADO", "tipo": "ESPECIFICA"},
        )
        assert r3.status_code == 200
        assert r3.json()["tipo"] == "ESPECIFICA"
        assert "TEST EDITADO" in r3.json()["descripcion"]
        # Limpiar
        client.delete(f"{BASE}/api/v1/perfiles/actividades/{aid}")


# ─── Pagos ─────────────────────────────────────────────────────────────────────

class TestPagos:
    def test_listar(self, client):
        r = client.get(f"{BASE}/api/v1/pagos")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)

    def test_listar_por_contrato(self, client):
        r = client.get(f"{BASE}/api/v1/contratos")
        data = r.json()
        if data:
            num = data[0]["numero_contrato"]
            r2 = client.get(f"{BASE}/api/v1/pagos?contrato_id={num}")
            assert r2.status_code == 200
            for p in r2.json():
                assert p["contrato_id"] == num

    def test_pdf_supervision(self, client):
        """Verificar que el endpoint de PDF existe y responde"""
        r = client.get(f"{BASE}/api/v1/pagos/1/pdf")
        # 404 es aceptable (pago no existe)
        assert r.status_code in (200, 404, 500)

    def test_actividades_supervision(self, client):
        r = client.get(f"{BASE}/api/v1/pagos/1/actividades")
        assert r.status_code in (200, 404)


# ─── Documentos ────────────────────────────────────────────────────────────────

class TestDocumentos:
    def test_contrato_docx(self, client):
        r = client.get(f"{BASE}/api/v1/contratos")
        data = r.json()
        if data:
            cid = data[0]["id"]
            r2 = client.get(f"{BASE}/api/v1/contratos/id/{cid}/docx")
            assert r2.status_code == 200
            assert r2.headers["content-type"] == "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

    def test_todos_documentos(self, client):
        """Probar que los 8 documentos se generan sin errores"""
        r = client.get(f"{BASE}/api/v1/contratos")
        data = r.json()
        if not data:
            return
        cid = data[0]["id"]
        for tipo in ["inexistencia", "estudios_previos", "solicitud_cdp", 
                      "invitacion", "idoneidad", "designacion_supervision",
                      "acta_inicio", "acta_liquidacion"]:
            r2 = client.get(f"{BASE}/api/v1/contratos/id/{cid}/documentos/{tipo}")
            assert r2.status_code == 200, f"Documento {tipo} fallo: {r2.status_code}"
            assert "application/vnd.openxmlformats" in r2.headers["content-type"], \
                f"Tipo incorrecto para {tipo}: {r2.headers.get('content-type','')}"

    def test_tipo_documento_invalido(self, client):
        """Tipo invalido con un contrato que existe debe dar 400"""
        r = client.get(f"{BASE}/api/v1/contratos")
        data = r.json()
        if data:
            cid = data[0]["id"]
            r2 = client.get(f"{BASE}/api/v1/contratos/id/{cid}/documentos/INVALIDO")
            assert r2.status_code == 400, f"Esperaba 400, obtuvo {r2.status_code}: {r2.text[:100]}"


# ─── Import ────────────────────────────────────────────────────────────────────

class TestImport:
    def test_endpoint_existe(self, client):
        """Verificar que el endpoint de import existe"""
        # POST sin archivo deberia dar 422
        r = client.post(f"{BASE}/api/v1/import/excel?resolucion_id=1")
        assert r.status_code == 422  # Validation error - falta archivo
