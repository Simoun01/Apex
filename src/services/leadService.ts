import { siteConfig } from '../config/siteConfig';
import { Audience, ServiceMode } from '../data/hvacData';

export type ContactChannel = 'call' | 'sms' | 'messenger' | 'viber' | 'whatsapp';

export interface LeadPayload {
  id: string;
  createdAt: string;
  audience: Audience;
  service: ServiceMode;
  town: string;
  barangay: string;
  propertyType: string;
  roomSizeOrUnits: string;
  preferredSchedule: string;
  notes: string;
  name: string;
  mobile: string;
  email: string;
  preferredChannel: ContactChannel;
  selectionSummary: string;
}

const STORAGE_KEY = 'apex_mechanical_inquiries_v1';

/**
 * SUBMIT LEAD HANDLER
 * ===================
 * Currently persists inquiries to browser localStorage and builds prefilled
 * Messenger / WhatsApp / Viber / Email links for immediate direct dispatch.
 *
 * TO CONNECT A REAL BACKEND ENDPOINT (e.g., Formspree, Google Apps Script, Supabase):
 * Replace or extend the block below with a `fetch('https://your-endpoint.example/leads', { method: 'POST', ... })`.
 */
export async function submitLead(payload: Omit<LeadPayload, 'id' | 'createdAt'>): Promise<{
  savedLocally: boolean;
  record: LeadPayload;
}> {
  const record: LeadPayload = {
    ...payload,
    id: `APX-${Date.now().toString(36).toUpperCase()}`,
    createdAt: new Date().toISOString(),
  };

  try {
    const existingRaw = localStorage.getItem(STORAGE_KEY);
    const existing: LeadPayload[] = existingRaw ? JSON.parse(existingRaw) : [];
    existing.unshift(record);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing.slice(0, 25)));
    return { savedLocally: true, record };
  } catch {
    return { savedLocally: false, record };
  }
}

export function formatInquiryMessage(record: LeadPayload): string {
  return [
    `Hello ${siteConfig.brand.shortName}! Inquiry Ref: ${record.id}`,
    `Name: ${record.name}`,
    `Mobile: ${record.mobile}`,
    `Audience & Service: ${record.audience.toUpperCase()} · ${record.service.toUpperCase()}`,
    `Location: ${record.barangay ? `${record.barangay}, ` : ''}${record.town}, Pampanga`,
    `Property: ${record.propertyType} | Size/Units: ${record.roomSizeOrUnits || 'N/A'}`,
    `Preferred Schedule: ${record.preferredSchedule || 'Flexible'}`,
    record.selectionSummary ? `3D Scene Selection: ${record.selectionSummary}` : '',
    record.notes ? `Notes: ${record.notes}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

export function buildChannelDeepLinks(record: LeadPayload) {
  const msg = encodeURIComponent(formatInquiryMessage(record));
  return {
    whatsapp: `https://wa.me/${siteConfig.contact.whatsappNumber}?text=${msg}`,
    messenger: `https://m.me/${siteConfig.contact.messengerPageId}?text=${msg}`,
    viber: `viber://forward?text=${msg}`,
    mailto: `mailto:${siteConfig.contact.email}?subject=${encodeURIComponent(
      `HVAC Inquiry (${record.town}) - ${record.name}`,
    )}&body=${msg}`,
  };
}

export function validatePHMobile(input: string): boolean {
  const cleaned = input.replace(/[\s\-()]/g, '');
  return /^(09\d{9}|\+?639\d{9})$/.test(cleaned);
}
