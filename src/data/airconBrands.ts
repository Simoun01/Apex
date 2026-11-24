/* ============================================================================
   Brand data for the 3D aircon inspector.
   Figures are typical values for each brand's range in the Philippine market,
   scaled to the selected capacity. They are indicative only: the exact model's
   data sheet always wins, and the inspector says so.
   ============================================================================ */

export type UnitKind = 'wall' | 'floor' | 'window' | 'vrf' | 'packaged' | 'ducted' | 'cassette';

export type BrandId = 'daikin' | 'trane' | 'carrier' | 'mitsubishi' | 'gree';

/** Part ids the 3D models know how to highlight. */
export type PartId =
  | 'louver'
  | 'crossflow'
  | 'filter'
  | 'display'
  | 'sensor'
  | 'coil'
  | 'fan'
  | 'compressor'
  | 'grille'
  | 'controls'
  | 'panel'
  | 'ports';

export interface BrandFeature {
  part: PartId;
  nameEn: string;
  nameTl: string;
  textEn: string;
  textTl: string;
}

export interface Brand {
  id: BrandId;
  name: string;
  origin: string;
  /** Body / accent colours used on the 3D model */
  body: string;
  trim: string;
  accent: string;
  /** Efficiency multiplier on the base CSPF / EER (1 = market average) */
  eff: number;
  /** dBA offset on the base noise level */
  noise: number;
  fanSteps: number;
  refrigerantRes: string;
  refrigerantCom: string;
  compressor: string;
  warranty: string;
  /** Unique, highlighted parts — keyed by unit kind, with a fallback */
  features: Partial<Record<UnitKind, BrandFeature[]>> & { default: BrandFeature[] };
}

const f = (part: PartId, nameEn: string, textEn: string, nameTl = nameEn, textTl = textEn): BrandFeature => ({ part, nameEn, nameTl, textEn, textTl });

export const BRANDS: Brand[] = [
  {
    id: 'daikin',
    name: 'Daikin',
    origin: 'Japan',
    body: '#f7f9fb',
    trim: '#d6dde6',
    accent: '#0ea5e9',
    eff: 1.12,
    noise: -2,
    fanSteps: 5,
    refrigerantRes: 'R32',
    refrigerantCom: 'R32 / R410A',
    compressor: 'Swing rotary inverter',
    warranty: '5 yrs compressor · 1 yr parts (typical)',
    features: {
      default: [
        f('filter', 'Streamer purification', 'A discharge of high-speed electrons breaks down mould, allergens and odours caught on the filter.', 'Streamer purification', 'Sinisira ng high-speed electrons ang amag, allergen at amoy na nahuli ng filter.'),
        f('louver', 'Coanda airflow', 'The flap angles upward so cold air hugs the ceiling and falls gently instead of blowing on you.', 'Coanda airflow', 'Pataas ang flap kaya dumadaloy ang lamig sa kisame at bumababa nang mahina.'),
        f('compressor', 'Swing compressor', 'A one-piece rolling piston: fewer leak paths and less friction than a standard rotary.', 'Swing compressor', 'Isang pirasong piston: mas kaunting leak at friction kaysa karaniwang rotary.'),
      ],
      vrf: [
        f('compressor', 'VRV inverter scroll', 'Variable refrigerant volume: one outdoor module modulates for many indoor units.', 'VRV inverter scroll', 'Isang outdoor module para sa maraming indoor unit, nag-aadjust ng refrigerant.'),
        f('fan', 'Aero spiral fan', 'Bell-mouth spiral blades move more air at lower rpm and noise.', 'Aero spiral fan', 'Mas maraming hangin sa mas mababang rpm at ingay.'),
        f('controls', 'VRV configurator', 'Auto-charge and diagnostics from the outdoor PCB.', 'VRV configurator', 'Auto-charge at diagnostics mula sa outdoor PCB.'),
      ],
    },
  },
  {
    id: 'trane',
    name: 'Trane',
    origin: 'USA',
    body: '#eef1f4',
    trim: '#3b4350',
    accent: '#e11d48',
    eff: 1.05,
    noise: 1,
    fanSteps: 3,
    refrigerantRes: 'R32',
    refrigerantCom: 'R410A',
    compressor: 'Climatuff® scroll',
    warranty: '5 yrs compressor (typical, commercial)',
    features: {
      default: [
        f('compressor', 'Climatuff scroll compressor', 'Heavy-duty scroll built for continuous commercial runtime.', 'Climatuff scroll compressor', 'Matibay na scroll para sa tuloy-tuloy na pang-negosyong gamit.'),
        f('coil', 'Spine Fin coil', 'All-aluminium coil with spine fins: corrosion resistant and easy to clean.', 'Spine Fin coil', 'Aluminium na coil na hindi madaling kalawangin at madaling linisin.'),
        f('panel', 'Galvanised cabinet', 'Powder-coated galvanised steel for coastal and rooftop installs.', 'Galvanised cabinet', 'Powder-coated na bakal para sa rooftop at malapit sa dagat.'),
      ],
      ducted: [
        f('fan', 'Forward-curved blower', 'High static pressure pushes air through long duct runs.', 'Forward-curved blower', 'Malakas na static pressure para sa mahabang duct.'),
        f('filter', 'Slide-out filter rack', 'Filters change without opening the casing.', 'Slide-out filter rack', 'Napapalitan ang filter nang hindi binubuksan ang casing.'),
        f('coil', 'Spine Fin coil', 'All-aluminium coil, corrosion resistant.', 'Spine Fin coil', 'Aluminium na coil, hindi madaling kalawangin.'),
      ],
    },
  },
  {
    id: 'carrier',
    name: 'Carrier',
    origin: 'USA',
    body: '#fbfcfd',
    trim: '#cfd6df',
    accent: '#1d4ed8',
    eff: 1.03,
    noise: 0,
    fanSteps: 4,
    refrigerantRes: 'R32',
    refrigerantCom: 'R410A',
    compressor: 'Twin-rotary inverter',
    warranty: '5 yrs compressor · 1 yr parts (typical)',
    features: {
      default: [
        f('filter', 'Multi-layer filtration', 'Catechin / silver-ion layers reduce dust, bacteria and odour.', 'Multi-layer filtration', 'Binabawasan ng catechin / silver-ion layers ang alikabok, bacteria at amoy.'),
        f('crossflow', 'Turbo cool fan', 'Large cross-flow wheel reaches set temperature fast after start-up.', 'Turbo cool fan', 'Malaking cross-flow wheel, mabilis lumamig pagka-on.'),
        f('coil', 'Gold-fin coil', 'Anti-corrosion coating on the fins for humid, salty air.', 'Gold-fin coil', 'Anti-corrosion coating sa fins para sa mahalumigmig na hangin.'),
      ],
      packaged: [
        f('compressor', 'Twin scroll compressors', 'Two stages: one runs at part load, both at peak.', 'Twin scroll compressors', 'Dalawang stage: isa sa mahinang load, dalawa sa peak.'),
        f('fan', 'Top-discharge condenser fans', 'Hot air is thrown upward, away from the building.', 'Top-discharge condenser fans', 'Paitaas ang init, palayo sa gusali.'),
        f('panel', 'Service access panels', 'Hinged panels open the controls and blower without tools.', 'Service access panels', 'Nabubuksan ang controls at blower nang walang tools.'),
      ],
    },
  },
  {
    id: 'mitsubishi',
    name: 'Mitsubishi Electric / Heavy Industries',
    origin: 'Japan',
    body: '#ffffff',
    trim: '#e2e6eb',
    accent: '#dc2626',
    eff: 1.15,
    noise: -3,
    fanSteps: 5,
    refrigerantRes: 'R32',
    refrigerantCom: 'R410A',
    compressor: 'Hyper inverter rotary / scroll',
    warranty: '5 yrs compressor · 1–2 yrs parts (typical)',
    features: {
      default: [
        f('sensor', '3D i-see sensor', 'Infrared sensor scans the room and aims air at (or away from) people. (Mitsubishi Electric)', '3D i-see sensor', 'Infrared sensor na nag-scan ng kwarto at itinututok ang hangin. (Mitsubishi Electric)'),
        f('louver', 'Jet / dual-vane airflow', 'Split vanes send air left and right at once for even cooling. (Mitsubishi Heavy Industries)', 'Jet / dual-vane airflow', 'Hati ang vane kaya pantay ang lamig sa kaliwa at kanan. (Mitsubishi Heavy Industries)'),
        f('filter', 'Plasma Quad filter', 'Electric field captures fine dust, bacteria and allergens.', 'Plasma Quad filter', 'Electric field na humuhuli ng pinong alikabok at bacteria.'),
      ],
      vrf: [
        f('compressor', 'City Multi / KX scroll', 'Inverter scroll VRF with heat-recovery option.', 'City Multi / KX scroll', 'Inverter scroll VRF na may heat-recovery option.'),
        f('fan', 'Low-noise propeller fan', 'Night-quiet mode drops the fan rpm after hours.', 'Low-noise propeller fan', 'Tahimik na mode sa gabi.'),
        f('coil', 'Blue-fin coil', 'Corrosion-resistant fin coating.', 'Blue-fin coil', 'Anti-corrosion na coating ng fins.'),
      ],
    },
  },
  {
    id: 'gree',
    name: 'Gree',
    origin: 'China',
    body: '#f6f7f8',
    trim: '#c8ced6',
    accent: '#16a34a',
    eff: 1.0,
    noise: 0,
    fanSteps: 7,
    refrigerantRes: 'R32',
    refrigerantCom: 'R410A',
    compressor: 'G10 inverter rotary',
    warranty: '5–10 yrs compressor (typical, by series)',
    features: {
      default: [
        f('compressor', 'G10 inverter', 'Inverter compressor that ramps from very low frequency for steady temperature.', 'G10 inverter', 'Inverter compressor na kayang bumaba ang frequency para steady ang temp.'),
        f('sensor', 'I-Feel temperature', 'Reads temperature at the remote, where you are, not at the unit.', 'I-Feel temperature', 'Binabasa ang temperatura sa remote, kung nasaan ka.'),
        f('display', 'Wi-Fi smart control', 'App control, scheduling and energy view.', 'Wi-Fi smart control', 'Kontrol sa app, schedule at energy view.'),
      ],
    },
  },
];

/* ── Unit kinds ── */

export interface KindInfo {
  labelEn: string;
  labelTl: string;
  /** Typical parts every unit of this kind has (shown when the brand has no special entry) */
  parts: BrandFeature[];
  /** Base efficiency (CSPF for residential, EER for commercial) at eff = 1 */
  effBase: number;
  effUnit: 'CSPF' | 'EER';
  /** Base noise at lowest fan step, dBA */
  noiseBase: number;
  /** Airflow per 1,000 BTU/h, m³/h */
  airPerKbtu: number;
  /** Max fan rpm */
  rpm: number;
  /** Air throw at high fan, metres */
  throwM: number;
  commercial: boolean;
}

export const KINDS: Record<UnitKind, KindInfo> = {
  wall: {
    labelEn: 'Wall-mounted split',
    labelTl: 'Wall-mounted split',
    parts: [
      f('louver', 'Swing louver', 'Motorised flap that sweeps the airflow up and down.', 'Swing louver', 'De-motor na flap na nagwawalis ng hangin pataas-pababa.'),
      f('crossflow', 'Cross-flow fan', 'Long squirrel-cage wheel that draws air through the coil.', 'Cross-flow fan', 'Mahabang gulong na humihigop ng hangin sa coil.'),
      f('filter', 'Washable filter', 'Clean every 2 weeks for full airflow.', 'Washable filter', 'Linisin kada 2 linggo.'),
    ],
    effBase: 5.4,
    effUnit: 'CSPF',
    noiseBase: 24,
    airPerKbtu: 62,
    rpm: 1350,
    throwM: 8,
    commercial: false,
  },
  floor: {
    labelEn: 'Floor-standing tower',
    labelTl: 'Floor-standing tower',
    parts: [
      f('louver', 'Vertical swing vanes', 'Side-to-side vanes cover a wide living area.', 'Vertical swing vanes', 'Kaliwa-kanan na vane para sa malawak na sala.'),
      f('display', 'Front display', 'Large LED set-point and mode display.', 'Front display', 'Malaking LED display ng temperatura.'),
      f('filter', 'Lower intake filter', 'Return air enters at the base, through the filter.', 'Lower intake filter', 'Sa ibaba pumapasok ang hangin, dumadaan sa filter.'),
    ],
    effBase: 4.6,
    effUnit: 'CSPF',
    noiseBase: 32,
    airPerKbtu: 60,
    rpm: 1100,
    throwM: 12,
    commercial: false,
  },
  window: {
    labelEn: 'Window type',
    labelTl: 'Window type',
    parts: [
      f('grille', 'Front grille & vanes', 'Adjustable vanes direct the cold air into the room.', 'Front grille & vanes', 'Naiaayos na vane para itutok ang lamig.'),
      f('controls', 'Control panel', 'Thermostat and fan speed knobs or digital panel.', 'Control panel', 'Knob o digital na thermostat at fan speed.'),
      f('fan', 'Condenser fan', 'Rear fan throws heat outside through the side louvres.', 'Condenser fan', 'Sa likod na fan, inilalabas ang init.'),
    ],
    effBase: 3.6,
    effUnit: 'CSPF',
    noiseBase: 45,
    airPerKbtu: 48,
    rpm: 1050,
    throwM: 6,
    commercial: false,
  },
  vrf: {
    labelEn: 'VRF outdoor module',
    labelTl: 'VRF outdoor module',
    parts: [
      f('fan', 'Top-discharge fan', 'Large propeller throws heat straight up.', 'Top-discharge fan', 'Malaking propeller na paitaas ang init.'),
      f('coil', 'Three-sided coil', 'Wraps the cabinet for more heat-exchange area.', 'Three-sided coil', 'Paikot sa cabinet para mas malaking heat exchange.'),
      f('ports', 'Refrigerant ports', 'Brass service valves for the liquid and gas lines.', 'Refrigerant ports', 'Brass valve para sa liquid at gas lines.'),
    ],
    effBase: 3.9,
    effUnit: 'EER',
    noiseBase: 54,
    airPerKbtu: 95,
    rpm: 900,
    throwM: 0,
    commercial: true,
  },
  packaged: {
    labelEn: 'Packaged rooftop unit',
    labelTl: 'Packaged rooftop unit',
    parts: [
      f('fan', 'Condenser fans', 'Twin top fans reject heat from the coils.', 'Condenser fans', 'Dalawang fan sa itaas na naglalabas ng init.'),
      f('panel', 'Access panels', 'Service doors for the blower, filters and controls.', 'Access panels', 'Pinto para sa blower, filter at controls.'),
      f('compressor', 'Scroll compressors', 'Staged scroll compressors inside the base.', 'Scroll compressors', 'Scroll compressors sa loob ng base.'),
    ],
    effBase: 3.2,
    effUnit: 'EER',
    noiseBase: 62,
    airPerKbtu: 34,
    rpm: 850,
    throwM: 0,
    commercial: true,
  },
  ducted: {
    labelEn: 'Ducted indoor unit',
    labelTl: 'Ducted indoor unit',
    parts: [
      f('fan', 'Centrifugal blower', 'Pushes air through ducts to the ceiling diffusers.', 'Centrifugal blower', 'Itinutulak ang hangin sa duct papunta sa diffuser.'),
      f('filter', 'Return filter', 'Filters the return air before the coil.', 'Return filter', 'Sinasala ang balik na hangin bago ang coil.'),
      f('ports', 'Supply flange', 'Duct connection on the supply side.', 'Supply flange', 'Koneksiyon ng duct sa supply side.'),
    ],
    effBase: 3.5,
    effUnit: 'EER',
    noiseBase: 33,
    airPerKbtu: 40,
    rpm: 1200,
    throwM: 0,
    commercial: true,
  },
  cassette: {
    labelEn: '4-way ceiling cassette',
    labelTl: '4-way ceiling cassette',
    parts: [
      f('louver', 'Four-way louvers', 'Air leaves on all four sides for even coverage.', 'Four-way louvers', 'Sa apat na gilid lumalabas ang hangin.'),
      f('grille', 'Centre intake grille', 'Return air is drawn in through the centre panel.', 'Centre intake grille', 'Sa gitna humihigop ng hangin.'),
      f('sensor', 'Corner sensor', 'Occupancy and floor-temperature sensor (model dependent).', 'Corner sensor', 'Sensor ng tao at temperatura (depende sa model).'),
    ],
    effBase: 3.6,
    effUnit: 'EER',
    noiseBase: 29,
    airPerKbtu: 52,
    rpm: 1000,
    throwM: 5,
    commercial: true,
  },
};

export const CATALOG_KIND: Record<string, UnitKind> = {
  res_split_inv: 'wall',
  res_split_non_inv: 'wall',
  res_floor_mounted: 'floor',
  res_window_inv: 'window',
  com_vrf: 'vrf',
  com_packaged: 'packaged',
  com_ducted: 'ducted',
  com_cassette: 'cassette',
};

/** "1.5 HP Premium White" → 13,500 BTU/h; "7.5 TR Packaged" → 90,000 BTU/h. */
export function btuFromVariant(variant: string): number {
  const tr = variant.match(/([\d.]+)\s*TR/i);
  if (tr) return Math.round(parseFloat(tr[1]) * 12000);
  const hp = variant.match(/([\d.]+)\s*HP/i);
  return Math.round((hp ? parseFloat(hp[1]) : 1) * 9000);
}

export interface Spec {
  btu: number;
  kw: number;
  airflow: number; // m³/h at high fan
  rpm: number;
  eff: number;
  effUnit: string;
  noiseLow: number;
  noiseHigh: number;
  throwM: number;
  fanSteps: number;
  refrigerant: string;
  compressor: string;
  warranty: string;
  inverter: boolean;
}

export function specFor(kind: UnitKind, brand: Brand, variant: string, inverter: boolean): Spec {
  const k = KINDS[kind];
  const btu = btuFromVariant(variant);
  const effPenalty = inverter || k.commercial ? 1 : 0.78; // fixed-speed units rate lower
  return {
    btu,
    kw: Math.round((btu / 3412) * 10) / 10,
    airflow: Math.round((btu / 1000) * k.airPerKbtu / 10) * 10,
    rpm: Math.round(k.rpm * (brand.noise < 0 ? 0.95 : 1)),
    eff: Math.round(k.effBase * brand.eff * effPenalty * 100) / 100,
    effUnit: k.effUnit,
    noiseLow: k.noiseBase + brand.noise,
    noiseHigh: k.noiseBase + brand.noise + (k.commercial ? 8 : 16),
    throwM: k.throwM,
    fanSteps: brand.fanSteps,
    refrigerant: k.commercial ? brand.refrigerantCom : brand.refrigerantRes,
    compressor: inverter || k.commercial ? brand.compressor : 'Fixed-speed rotary',
    warranty: brand.warranty,
    inverter: inverter || kind === 'vrf',
  };
}

/** The brand's own unique parts for this kind, else the kind's standard parts. */
export function featuresFor(kind: UnitKind, brand: Brand): BrandFeature[] {
  const own = brand.features[kind];
  if (own) return own;
  // Commercial kinds: brands without a commercial entry show the unit's standard parts
  // (Trane's defaults are already commercial).
  return KINDS[kind].commercial && brand.id !== 'trane' ? KINDS[kind].parts : brand.features.default;
}
