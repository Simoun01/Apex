import { Language } from './hvacData';

export interface FaqItem {
  id: string;
  questionEn: string;
  questionTaglish: string;
  answerEn: string;
  answerTaglish: string;
}

export const HOME_FAQ_ITEMS: FaqItem[] = [
  {
    id: 'faq-areas',
    questionEn: 'Which areas in Pampanga and Central Luzon do you cover for aircon repair and cleaning?',
    questionTaglish: 'Aling mga lugar sa Pampanga at Central Luzon ang abot ng aircon repair at cleaning ninyo?',
    answerEn:
      'Our technicians dispatch from San Matias across City of San Fernando, Angeles City, Mabalacat, Clark Freeport Zone, Mexico, Sta. Ana, Arayat, Magalang, Bacolor, Guagua, San Simon, Apalit, Candaba, and nearby Central Luzon Region III areas.',
    answerTaglish:
      'Mula San Matias, nagpapadala kami ng technicians sa City of San Fernando, Angeles City, Mabalacat, Clark Freeport Zone, Mexico, Sta. Ana, Arayat, Magalang, Bacolor, Guagua, San Simon, Apalit, Candaba, at karatig-lugar sa Central Luzon Region III.',
  },
  {
    id: 'faq-cleaning-freq',
    questionEn: 'How often should I schedule aircon cleaning in Pampanga’s hot and humid climate?',
    questionTaglish: 'Gaano kadalas dapat magpa-aircon cleaning sa init at alinsangan dito sa Pampanga?',
    answerEn:
      'For residential split-type and window aircons used daily, we recommend preventive aircon cleaning every 4 to 6 months. Commercial offices, clinics, and restaurants in high-dust or high-traffic zones benefit from quarterly cleaning every 3 months.',
    answerTaglish:
      'Para sa residential split-type o window aircon na araw-araw gamit, inirerekomenda ang general cleaning tuwing 4 hanggang 6 na buwan. Para sa mga opisina, clinic, o restaurant, mas mainam ang maintenance tuwing 3 buwan.',
  },
  {
    id: 'faq-install-process',
    questionEn: 'What is included in your split type and inverter aircon installation service?',
    questionTaglish: 'Ano ang kasama sa split type at inverter aircon installation service ninyo?',
    answerEn:
      'Every aircon installation includes an on-site BTU heat-load check, proper wall/outdoor bracket mounting with vibration dampers, insulated copper piping, sloped PVC drainage, dedicated breaker review, dry-nitrogen pressure leak testing, deep micron vacuuming, and workmanship warranty handover.',
    answerTaglish:
      'Kasama sa bawat aircon installation ang libreng site at BTU sizing check, matibay na indoor/outdoor bracket na may rubber pads, insulated copper pipe, maayos na drain slope, nitrogen leak test, deep vacuum, at workmanship warranty.',
  },
  {
    id: 'faq-repair-issues',
    questionEn: 'What aircon problems can your repair team fix?',
    questionTaglish: 'Anong mga sira ng aircon ang kayang ayusin ng repair team ninyo?',
    answerEn:
      'We diagnose and repair units that are not cooling, leaking water indoors, icing up on the evaporator coil or copper pipe, making rattling or buzzing noises, showing inverter PCB error codes, or causing sudden spikes in electric bills.',
    answerTaglish:
      'Inaayos namin ang aircon na hindi lumalamig, tumutulo sa loob, nagyeyelo ang coil o tubo, maingay o umaalog, may PCB error code, o biglang nagpapataas ng electric bill.',
  },
  {
    id: 'faq-sizing',
    questionEn: 'How do I choose the right aircon HP size for my room or business?',
    questionTaglish: 'Paano pipiliin ang tamang aircon HP para sa kwarto o negosyo?',
    answerEn:
      'Correct sizing depends on floor area in square meters, ceiling height, direct afternoon sunlight, occupants, and heat-generating appliances. Use our interactive 3D BTU estimator or book a free Pampanga site assessment before buying a unit.',
    answerTaglish:
      'Nakadepende ang tamang HP sa sukat ng kwarto (sqm), taas ng kisame, sikat ng araw, dami ng tao, at appliances. Pwedeng gamitin ang interactive 3D BTU estimator o magpa-libreng site assessment sa Pampanga.',
  },
  {
    id: 'faq-commercial',
    questionEn: 'Do you handle commercial HVAC systems like ceiling cassettes, ducted AHUs, and VRF?',
    questionTaglish: 'Gumagawa rin ba kayo ng commercial HVAC tulad ng ceiling cassette, ducted AHU, at VRF?',
    answerEn:
      'Yes. We supply, install, clean, and maintain 4-way ceiling cassettes, concealed ducted split AHUs, rooftop packaged units, and modular VRF multi-zone HVAC systems for offices, retail stores, clinics, and commercial buildings across Pampanga and Clark.',
    answerTaglish:
      'Opo. Nagsu-supply, nagkakabit, naglilinis, at nagme-maintain kami ng 4-way ceiling cassette, concealed ducted split/AHU, rooftop packaged unit, at VRF multi-zone HVAC para sa mga opisina, clinic, at commercial spaces sa Pampanga at Clark.',
  },
];

export function getFaqQuestion(item: FaqItem, lang: Language): string {
  return lang === 'en' ? item.questionEn : item.questionTaglish;
}

export function getFaqAnswer(item: FaqItem, lang: Language): string {
  return lang === 'en' ? item.answerEn : item.answerTaglish;
}
