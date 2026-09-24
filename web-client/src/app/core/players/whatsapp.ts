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

/** Datos del turno que quedó con un lugar libre, para armar el mensaje del aviso. */
export interface FreedSlotInfo {
  shiftLabel: string;
  startTime: string;
  endTime: string;
  dateLabel: string;
}

/** Enlace de WhatsApp avisándole a un jugador que se liberó un cupo en un turno. */
export function buildFreedSlotWhatsappLink(athlete: Athlete, slot: FreedSlotInfo): string {
  const digitsOnly = athlete.phone.replace(/[^0-9]/g, '');
  const message =
    `¡Hola ${athlete.firstName}! Se liberó un cupo en el ${slot.shiftLabel} ` +
    `del ${slot.dateLabel} de ${slot.startTime} a ${slot.endTime}. ` +
    `Si quieres tomarlo, entra a SportLink y reserva tu lugar.`;

  return `https://wa.me/${digitsOnly}?text=${encodeURIComponent(message)}`;
}

/**
 * Abre un chat de WhatsApp por destinatario. El navegador puede bloquear varias pestañas
 * seguidas, por eso la UI avisa cuando la lista es larga.
 */
export function sendFreedSlotWhatsapp(athletes: readonly Athlete[], slot: FreedSlotInfo): void {
  for (const athlete of athletes) {
    window.open(buildFreedSlotWhatsappLink(athlete, slot), '_blank', 'noopener');
  }
}
