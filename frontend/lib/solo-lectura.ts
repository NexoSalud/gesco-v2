/**
 * Los contratos y contratistas se gestionan en Gestión Contractual (/gestion).
 * En el GESCO principal solo se consultan. Debe coincidir con CONTRATOS_SOLO_LECTURA del backend.
 */
export const CONTRATOS_SOLO_LECTURA = process.env.NEXT_PUBLIC_CONTRATOS_SOLO_LECTURA !== "false"
