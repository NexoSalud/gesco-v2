"""
Tests de frontend para Gesco V2.
Verifica que las paginas principales carguen correctamente.
"""

import pytest
import httpx

BASE = "https://contratos.esenorte3.lat"

@pytest.fixture(scope="module")
def client():
    return httpx.Client(timeout=15.0, verify=False)


class TestFrontendPages:
    """Verifica que todas las paginas del frontend carguen sin errores (HTTP 200)"""

    def test_dashboard(self, client):
        r = client.get(f"{BASE}/dashboard")
        assert r.status_code == 200
        assert "text/html" in r.headers["content-type"]

    def test_resoluciones_list(self, client):
        r = client.get(f"{BASE}/dashboard/resoluciones")
        assert r.status_code == 200

    def test_resoluciones_nuevo(self, client):
        r = client.get(f"{BASE}/dashboard/resoluciones/nuevo")
        assert r.status_code == 200

    def test_resoluciones_detail(self, client):
        # Obtener un ID real
        api = client.get(f"{BASE}/api/v1/resoluciones")
        data = api.json()
        if data:
            rid = data[0]["id"]
            r = client.get(f"{BASE}/dashboard/resoluciones/{rid}")
            assert r.status_code == 200

    def test_contratos_list(self, client):
        r = client.get(f"{BASE}/dashboard/contratos")
        assert r.status_code == 200

    def test_contratos_nuevo(self, client):
        r = client.get(f"{BASE}/dashboard/contratos/nuevo")
        assert r.status_code == 200

    def test_contratos_detail(self, client):
        api = client.get(f"{BASE}/api/v1/contratos")
        data = api.json()
        if data:
            import urllib.parse
            num = urllib.parse.quote(data[0]["numero_contrato"], safe='')
            r = client.get(f"{BASE}/dashboard/contratos/{num}")
            assert r.status_code == 200

    def test_contratos_editar(self, client):
        api = client.get(f"{BASE}/api/v1/contratos")
        data = api.json()
        if data:
            import urllib.parse
            num = urllib.parse.quote(data[0]["numero_contrato"], safe='')
            r = client.get(f"{BASE}/dashboard/contratos/{num}/editar")
            assert r.status_code == 200

    def test_contratistas_list(self, client):
        r = client.get(f"{BASE}/dashboard/contratistas")
        assert r.status_code == 200

    def test_contratistas_detail(self, client):
        api = client.get(f"{BASE}/api/v1/contratistas")
        data = api.json()
        if data:
            import urllib.parse
            cid = urllib.parse.quote(data[0]["identificacion"])
            r = client.get(f"{BASE}/dashboard/contratistas/{cid}")
            assert r.status_code == 200

    def test_perfiles(self, client):
        r = client.get(f"{BASE}/dashboard/perfiles")
        assert r.status_code == 200

    def test_plantillas(self, client):
        r = client.get(f"{BASE}/dashboard/plantillas")
        assert r.status_code == 200

    def test_importar(self, client):
        r = client.get(f"{BASE}/dashboard/importar")
        assert r.status_code == 200

    def test_configuracion(self, client):
        r = client.get(f"{BASE}/dashboard/configuracion")
        assert r.status_code == 200


class TestFrontendAssets:
    """Verifica que los assets estaticos funcionen"""

    def test_nextjs_runtime(self, client):
        """El frontend no debe devolver 500 en paginas principales"""
        pages = [
            "/",
            "/dashboard",
            "/dashboard/contratos",
            "/dashboard/perfiles",
            "/dashboard/contratistas",
        ]
        for path in pages:
            r = client.get(f"{BASE}{path}")
            assert r.status_code in (200, 301, 302, 307), f"{path} devolvio {r.status_code}"
