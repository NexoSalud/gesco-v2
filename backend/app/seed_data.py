"""Seed data — perfiles predefinidos con objeto y obligaciones específicas.
Perfiles tomados del proyecto gestionContractos (EBS ESE Norte 3)."""

import json
import logging

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session_factory
from app.models.perfil import Perfil, ActividadPerfil
from app.services.actividades_referencia import ACTIVIDADES_POR_PERFIL, PROFILE_MAP
from app.models.plantilla import PlantillaObservacion
from app.models.resolucion import Resolucion
from app.models.contrato import Contrato
from app.models.contratista import Contratista
from app.models.pago import Pago
from app.models.planilla import Planilla
from app.models.auth import Role, Usuario, Acceso
from app.services.auth_service import hash_password

logger = logging.getLogger(__name__)

PERFILES_DATA = []
# Mapa de perfiles que queremos crear (nombre -> referencia)
PERFILES_REF = [
    ("MEDICINA", "MEDICINA"),
    ("ENFERMERIA", "ENFERMERIA"),
    ("PSICOLOGIA", "PSICOLOGIA"),
    ("SALUD ORAL", "SALUD ORAL"),
    ("HIGIENISTA ORAL", "HIGIENISTA ORAL"),
    ("FONOAUDIOLOGIA", "FONOAUDIOLOGIA"),
    ("AUXILIAR ENFERMERIA", "AUXILIAR ENFERMERIA"),
    ("AUXILIAR VACUNACION", "AUXILIAR VACUNACION"),
    ("GESTOR COMUNITARIO", "GESTOR COMUNITARIO"),
    ("TRANSPORTE", "TRANSPORTE_188"),
    ("SINDICATO", "SINDICATO_103"),
    ("FIOSOTERAPIA", "FIOSOTERAPIA"),
    ("OTRO", None),
]

for nombre, ref_key in PERFILES_REF:
    if ref_key and ref_key in ACTIVIDADES_POR_PERFIL:
        actividades = ACTIVIDADES_POR_PERFIL[ref_key]
    else:
        actividades = [
            "Desarrollo de funciones asignadas",
            "Presentación de informes",
            "Participación en capacitaciones",
            "Cumplimiento de protocolos",
        ]
    
    objeto_map = {
        "MEDICINA": "Prestar servicios profesionales como Médico en los Equipos Básicos en Salud (EBS) para el fortalecimiento de la Atención Primaria en Salud, desarrollando actividades de promoción, prevención, diagnóstico, tratamiento y seguimiento de la población asignada en el marco de la Resolución 1010 de 2025.",
        "ENFERMERIA": "Prestar servicios profesionales como Enfermero(a) en los Equipos Básicos en Salud (EBS), desarrollando actividades de cuidado integral, promoción de la salud, prevención de la enfermedad.",
        "PSICOLOGIA": "Prestar servicios profesionales como Psicólogo en los programas de salud mental de la ESE Norte 3.",
        "SALUD ORAL": "Prestar servicios profesionales como Odontólogo en los puntos de atención de la ESE Norte 3.",
        "HIGIENISTA ORAL": "Prestar servicios profesionales como Higienista Oral en los puntos de atención de la ESE Norte 3, desarrollando actividades de promoción de la salud oral y prevención de enfermedades bucodentales.",
        "FONOAUDIOLOGIA": "Prestar servicios profesionales como Fonoaudiólogo en los Equipos Básicos en Salud (EBS), desarrollando actividades de evaluación, diagnóstico, intervención y seguimiento en el área de la fonoaudiología para la población asignada.",
        "AUXILIAR ENFERMERIA": "Prestar servicios de apoyo como Auxiliar de Enfermería en los Equipos Básicos en Salud.",
        "AUXILIAR VACUNACION": "Prestar servicios de apoyo como Auxiliar de Vacunación en los Equipos Básicos en Salud.",
        "GESTOR COMUNITARIO": "Prestar servicios como Gestor Comunitario en los Equipos Básicos en Salud, promoviendo la participación comunitaria.",
        "TRANSPORTE": "Prestar servicios de conducción y transporte para el desplazamiento del talento humano, insumos y usuarios de la ESE Norte 3.",
        "SINDICATO": "Prestar servicios de apoyo administrativo y operativo para el fortalecimiento de la Atención Primaria en Salud.",
        "FIOSOTERAPIA": "Prestar servicios profesionales como Fisioterapeuta en los Equipos Básicos en Salud (EBS), desarrollando actividades de promoción, prevención, diagnóstico, intervención y rehabilitación funcional en el área de fisioterapia para la población asignada.",
        "OTRO": "Prestar servicios profesionales o de apoyo a la gestión según las necesidades del servicio.",
    }
    
    obligaciones_map = {
        "MEDICINA": [
            "Realizar la identificación integral del riesgo individual, familiar y comunitario.",
            "Ejecutar las atenciones individuales de promoción y mantenimiento de la salud.",
            "Identificar, notificar y gestionar oportunamente los eventos de interés en salud pública.",
            "Diligenciar diaria, completa y oportunamente los RIPS con códigos CIE-10.",
            "Cumplir con los protocolos de bioseguridad y seguridad del paciente.",
        ],
        "ENFERMERIA": [
            "Formular, implementar y realizar seguimiento al Plan Integral de Cuidado Primario (PICP).",
            "Identificar y analizar los riesgos individuales, familiares y comunitarios.",
            "Realizar canalización oportuna a servicios de nivel primario y red de prestación.",
            "Diligenciar los RIPS utilizando los códigos CIE-10.",
            "Cumplir con las normas de bioseguridad y seguridad del paciente.",
        ],
        "SALUD ORAL": [
            "Realizar consulta odontológica general a la población asignada.",
            "Ejecutar actividades de promoción de la salud oral y prevención de enfermedades bucodentales.",
            "Aplicar sellantes, flúor y demás medidas preventivas según lineamientos.",
            "Registrar adecuadamente la información clínica en los sistemas.",
            "Participar en jornadas de salud extramurales.",
        ],
        "HIGIENISTA ORAL": [
            "Realizar actividades de promoción de la salud oral y prevención de enfermedades bucodentales.",
            "Aplicar sellantes, flúor y demás medidas preventivas según lineamientos institucionales.",
            "Educar a pacientes y cuidadores sobre técnicas de higiene oral y autocuidado.",
            "Registrar adecuadamente la información de las atenciones realizadas.",
            "Participar en jornadas de salud extramurales programadas.",
        ],
        "FONOAUDIOLOGIA": [
            "Realizar evaluación, diagnóstico e intervención fonoaudiológica a la población asignada.",
            "Desarrollar actividades de promoción y prevención en el área de la comunicación humana.",
            "Educar a pacientes y familias sobre estrategias de comunicación y lenguaje.",
            "Diligenciar los registros clínicos y RIPS correspondientes.",
            "Cumplir con los protocolos de bioseguridad y seguridad del paciente.",
        ],
        "FIOSOTERAPIA": [
            "Realizar evaluación, diagnóstico e intervención fisioterapéutica a la población asignada.",
            "Desarrollar actividades de promoción y prevención en el área de la rehabilitación funcional.",
            "Educar a pacientes y familias sobre estrategias de rehabilitación y cuidado funcional.",
            "Diligenciar los registros clínicos y RIPS correspondientes.",
            "Cumplir con los protocolos de bioseguridad y seguridad del paciente.",
        ],
    }
    
    unspsc_map = {
        "MEDICINA": ("85111600", "SERVICIOS DE PERSONAL TEMPORAL"),
        "ENFERMERIA": ("85101601", "SERVICIOS DE ENFERMERÍA"),
        "PSICOLOGIA": ("85121608", "SERVICIOS DE PSICOLOGÍA"),
        "SALUD ORAL": ("85122001", "SERVICIOS DE ODONTÓLOGOS"),
        "HIGIENISTA ORAL": ("85122002", "SERVICIOS DE HIGIENISTAS ORALES"),
        "FONOAUDIOLOGIA": ("85111600", "SERVICIOS DE PERSONAL TEMPORAL"),
        "GESTOR COMUNITARIO": ("85111600", "SERVICIOS DE PERSONAL TEMPORAL"),
        "AUXILIAR ENFERMERIA": ("85101601", "SERVICIOS DE ENFERMERÍA"),
        "FIOSOTERAPIA": ("85111600", "SERVICIOS DE PERSONAL TEMPORAL"),
    }
    
    PERFILES_DATA.append({
        "nombre": nombre,
        "objeto": objeto_map.get(nombre, "Prestar servicios profesionales o de apoyo según el perfil asignado."),
        "obligaciones": obligaciones_map.get(nombre, [
            "Desarrollar las actividades y funciones asignadas por el supervisor.",
            "Cumplir con los horarios y cronogramas establecidos.",
            "Presentar informes periódicos de las actividades realizadas.",
            "Cumplir con los protocolos y procedimientos institucionales.",
        ]),
        "actividades": actividades,
        "codigo_unspsc": unspsc_map.get(nombre, (None, None))[0],
        "descripcion_unspsc": unspsc_map.get(nombre, (None, None))[1],
    })

PLANTILLAS_OBSERVACION = [
    {"titulo": "Cumplimiento total", "contenido": "El contratista cumplió a cabalidad con las actividades programadas durante el período."},
    {"titulo": "Cumplimiento parcial", "contenido": "El contratista cumplió parcialmente con las actividades programadas."},
    {"titulo": "Incumplimiento", "contenido": "El contratista no cumplió con las actividades programadas."},
    {"titulo": "Documentación incompleta", "contenido": "El contratista presentó la documentación de manera incompleta."},
    {"titulo": "Novedades en seguridad social", "contenido": "Se presentan novedades en los aportes a seguridad social del contratista."},
]

PERFIL_NORMALIZATION = {
    "MEDICO": "MEDICINA",
    "MEDICINA": "MEDICINA",
    "MEDICO GENERAL": "MEDICINA",
    "MEDICO RURAL": "MEDICINA",
    "MEDICINA GENERAL": "MEDICINA",
    "ENFERMERO": "ENFERMERIA",
    "ENFERMERA": "ENFERMERIA",
    "ENFERMERIA": "ENFERMERIA",
    "ENFERMERO(A)": "ENFERMERIA",
    "ENF": "ENFERMERIA",
    "PSICOLOGO": "PSICOLOGIA",
    "PSICÓLOGO": "PSICOLOGIA",
    "PSICOLOGIA": "PSICOLOGIA",
    "PSIC": "PSICOLOGIA",
    "ODONTOLOGO": "SALUD ORAL",
    "ODONTÓLOGO": "SALUD ORAL",
    "SALUD ORAL": "SALUD ORAL",
    "DENTISTA": "SALUD ORAL",
    "AUXILIAR ENFERMERIA": "AUXILIAR ENFERMERIA",
    "AUXILIAR DE ENFERMERÍA": "AUXILIAR ENFERMERIA",
    "AUX ENFERMERIA": "AUXILIAR ENFERMERIA",
    "AUX ENF": "AUXILIAR ENFERMERIA",
    "AUXILIAR DE ENFERMERIA": "AUXILIAR ENFERMERIA",
    "AUXILIAR VACUNACION": "AUXILIAR VACUNACION",
    "AUX VACUNACION": "AUXILIAR VACUNACION",
    "VACUNADOR": "AUXILIAR VACUNACION",
    "GESTOR COMUNITARIO": "GESTOR COMUNITARIO",
    "GESTOR": "GESTOR COMUNITARIO",
    "SINDICATO": "SINDICATO",
    "SINDICATO_103": "SINDICATO",
    "SINDICATO_106": "SINDICATO",
    "APOYO ADMINISTRATIVO": "SINDICATO",
    "CONDUCTOR": "OTRO",
    "BACTERIÓLOGO": "OTRO",
    "BACTERIOLOGO": "OTRO",
    "TÉCNICO AMBIENTAL": "OTRO",
    "TECNICO AMBIENTAL": "OTRO",
    "TECNÓLOGO EN SISTEMAS": "OTRO",
    "TECNOLOGO SISTEMAS": "OTRO",
    "HIGIENISTA ORAL": "HIGIENISTA ORAL",
    "HIGIENISTA": "HIGIENISTA ORAL",
    "AUXILIAR ENFERMERIA HIGIENISTA": "AUXILIAR ENFERMERIA",
    "FONOAUDIOLOGIA": "FONOAUDIOLOGIA",
    "FONOAUDIÓLOGO": "FONOAUDIOLOGIA",
    "FONOAUDIOLOGO": "FONOAUDIOLOGIA",
    "FIOSOTERAPIA": "FIOSOTERAPIA",
    "FISIOTERAPIA": "FIOSOTERAPIA",
    "FISIOTERAPEUTA": "FIOSOTERAPIA",
    "CONDUCTOR": "TRANSPORTE",
    "TRANSPORTE": "TRANSPORTE",
}


async def seed_database():
    async with async_session_factory() as db:
        try:
            # Seed Roles, Users, and Accesses
            res_roles = await db.execute(select(Role))
            if not res_roles.scalars().first():
                logger.info("Insertando roles, usuarios y accesos por defecto...")
                super_role = Role(nombre="SUPER_ADMIN", descripcion="Super Administrador con control total del sistema y seguridad")
                admin_role = Role(nombre="ADMIN", descripcion="Administrador del sistema de gestión contractual, sin gestión de usuarios")
                db.add(super_role)
                db.add(admin_role)
                await db.flush()
                # Crear usuarios por defecto
                super_user = Usuario(
                    username="superadmin",
                    password_hash=hash_password("superadmin123"),
                    nombre_completo="Super Administrador",
                    role_id=super_role.id,
                    activo=True
                )
                db.add(super_user)

                # Definir accesos por defecto
                vistas = ["dashboard", "resoluciones", "contratos", "contratistas", "inventario", "perfiles", "plantillas", "importar"]
                
                # SUPER_ADMIN tiene acceso a todo, incluyendo "usuarios"
                for v in vistas + ["usuarios"]:
                    db.add(Acceso(role_id=super_role.id, vista=v, crear=True, leer=True, actualizar=True, eliminar=True))
                
                # ADMIN tiene acceso a todo, excepto a "usuarios"
                for v in vistas:
                    db.add(Acceso(role_id=admin_role.id, vista=v, crear=True, leer=True, actualizar=True, eliminar=True))
                
                await db.commit()
                logger.info("Roles, usuarios y accesos inicializados.")

            existing = await db.execute(select(Perfil))
            perfiles_existentes = existing.scalars().all()
            if perfiles_existentes:
                nombres_actuales = {p.nombre for p in perfiles_existentes}
                nombres_viejos = {"AUXILIAR DE ENFERMERÍA", "MÉDICO GENERAL", "ENFERMERO(A)", "ODONTÓLOGO", "PSICÓLOGO", "BACTERIÓLOGO"}
                # Verificar si los perfiles tienen las actividades completas (version corta vs larga)
                necesita_migracion = bool(nombres_actuales & nombres_viejos)
                if not necesita_migracion and "MEDICINA" in nombres_actuales:
                    # Verificar si MEDICINA tiene 37 actividades (version completa) o solo 7
                    perf_med = [p for p in perfiles_existentes if p.nombre == "MEDICINA"]
                    if perf_med:
                        count = await db.execute(
                            text("SELECT COUNT(*) FROM actividades_perfil WHERE perfil_id = :pid"),
                            {"pid": perf_med[0].id}
                        )
                        if count.scalar() < 37:
                            necesita_migracion = True
                            logger.info(f"MEDICINA tiene solo {count.scalar()} actividades, necesita actualizacion")
                
                if necesita_migracion:
                    logger.info("Migrando perfiles a version completa gestionContractos...")
                    await db.execute(text("DELETE FROM actividades_perfil"))
                    await db.execute(text("DELETE FROM perfiles"))
                    await db.commit()
                else:
                    logger.info("Seed data ya existe, saltando...")
                    return

            logger.info("Insertando datos iniciales...")

            for pdata in PERFILES_DATA:
                obligaciones_json = json.dumps(pdata["obligaciones"], ensure_ascii=False)
                perfil = Perfil(
                    nombre=pdata["nombre"],
                    objeto=pdata["objeto"],
                    obligaciones_json=obligaciones_json,
                    codigo_unspsc=pdata.get("codigo_unspsc"),
                    descripcion_unspsc=pdata.get("descripcion_unspsc"),
                )
                db.add(perfil)
                await db.flush()

                for i, act in enumerate(pdata.get("actividades", [])):
                    actividad = ActividadPerfil(
                        perfil_id=perfil.id,
                        descripcion=act,
                        tipo="GENERAL",
                        orden=i,
                    )
                    db.add(actividad)

            for pt in PLANTILLAS_OBSERVACION:
                plantilla = PlantillaObservacion(
                    titulo=pt["titulo"],
                    contenido=pt["contenido"],
                )
                db.add(plantilla)

            await db.commit()
            logger.info(f"Seed completado: {len(PERFILES_DATA)} perfiles creados")

        except Exception as e:
            await db.rollback()
            logger.warning(f"Error en seed: {e}")
