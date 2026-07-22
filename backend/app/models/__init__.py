# Orden de importación: clases referenciadas por relationship() como string
# deben importarse antes de la clase que las referencia.
from app.models.resolucion import Resolucion
from app.models.contratista import Contratista
from app.models.perfil import Perfil, ActividadPerfil
from app.models.actividad_supervision import ActividadSupervision
from app.models.planilla import Planilla
from app.models.pago import Pago
from app.models.actividad_contrato import ActividadContrato
from app.models.contrato import Contrato
from app.models.plantilla import PlantillaObservacion
from app.models.plantilla_objeto import PlantillaObjeto
from app.models.supervisor import Supervisor
from app.models.almacen import Almacen
from app.models.inventario import Articulo, UnidadInventario, MovimientoInventario, Acta
from app.models.auth import Role, Usuario, Acceso
from app.models.evidencia import Evidencia

__all__ = [
    "Resolucion",
    "Contratista",
    "Perfil",
    "ActividadPerfil",
    "ActividadSupervision",
    "Planilla",
    "Pago",
    "ActividadContrato",
    "Contrato",
    "PlantillaObservacion",
    "PlantillaObjeto",
    "Supervisor",
    "Almacen",
    "Articulo",
    "UnidadInventario",
    "MovimientoInventario",
    "Acta",
    "Role",
    "Usuario",
    "Acceso",
]
