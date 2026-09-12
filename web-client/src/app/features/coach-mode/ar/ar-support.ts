/**
 * Detección de soporte WebXR para RA inmersiva.
 *
 * Hoy en día `immersive-ar` solo está disponible en Chrome/Android (vía ARCore); Safari/iOS
 * no lo soporta. Esta función es la única fuente de verdad sobre el soporte, para que el
 * resto de la feature (config y sesión AR) puedan reaccionar de forma consistente.
 */
export async function isArSupported(): Promise<boolean> {
  if (!isSecureContext) return false;
  const xr = (navigator as Navigator & { xr?: XRSystem }).xr;
  if (!xr) return false;
  try {
    return await xr.isSessionSupported('immersive-ar');
  } catch {
    return false;
  }
}
