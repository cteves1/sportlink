import { Athlete } from './players.service';

/**
 * Construye el enlace de WhatsApp Web API (https://wa.me/{telefono}?text={mensaje}).
 * 1) El teléfono se limpia a solo dígitos (wa.me no acepta espacios/guiones/"+").
 * 2) El mensaje se arma con los datos del jugador y se codifica con encodeURIComponent
 *    para que espacios, tildes y símbolos viajen correctamente en la URL.
 */
export function buildWhatsappLink(athlete: Athlete): string {
  const digitsOnly = athlete.phone.replace(/[^0-9]/g, '');
  const message =
    `¡Hola ${athlete.firstName}! El entrenador te ha dado de alta en SportLink. ` +
    `Tu usuario es: ${athlete.username} y tu clave temporal es: ${athlete.tempPassword}. ` +
    `Ingresa en: https://sportlink.app para gestionar tus asistencias.`;

  return `https://wa.me/${digitsOnly}?text=${encodeURIComponent(message)}`;
}

export function sendWhatsapp(athlete: Athlete): void {
  window.open(buildWhatsappLink(athlete), '_blank', 'noopener');
}
