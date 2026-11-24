export type Audience = 'residential' | 'commercial';
export type ServiceMode = 'repair' | 'cleaning' | 'equipment' | 'installation';
export type Language = 'en' | 'taglish' | 'zh';
export type CameraPreset = 'overview' | 'indoor' | 'outdoor' | 'piping' | 'top';

export interface PartInfo {
  id: string;
  nameEn: string;
  nameTaglish: string;
  audience: 'both' | Audience;
  positionResidential?: [number, number, number];
  positionCommercial?: [number, number, number];
  cameraOffset: [number, number, number];
  whatItDoesEn: string;
  whatItDoesTaglish: string;
  tropicalIssuesEn: string;
  tropicalIssuesTaglish: string;
}

export const HVAC_PARTS: Record<string, PartInfo> = {
  evaporator_coil: {
    id: 'evaporator_coil',
    nameEn: 'Evaporator Coil',
    nameTaglish: 'Evaporator Coil (Cooling Fins)',
    audience: 'both',
    positionResidential: [-1.45, 2.28, -2.14],
    positionCommercial: [-1.95, 2.55, -1.65],
    cameraOffset: [0.9, 0.25, 1.5],
    whatItDoesEn:
      'Absorbs indoor heat and condenses humid tropical air into water droplets as refrigerant expands inside copper tubes.',
    whatItDoesTaglish:
      'Sumisipsip ng init sa loob ng kwarto at nagko-condense ng alinsangan (humidity) para lumamig ang hangin.',
    tropicalIssuesEn:
      'In Pampanga’s high humidity and dust, damp fins trap lint and mold—reducing heat transfer and causing coil icing or foul odors.',
    tropicalIssuesTaglish:
      'Dahil sa alinsangan at alikabok, madaling kapitan ng dumi at amag ang fins kaya humihina ang lamig o nag-yeyelo.',
  },
  filter: {
    id: 'filter',
    nameEn: 'Intake Air Filter',
    nameTaglish: 'Air Filter (Saan Pumapasok ang Hangin)',
    audience: 'both',
    positionResidential: [-1.45, 2.42, -2.02],
    positionCommercial: [-1.95, 2.75, -1.55],
    cameraOffset: [0.85, 0.35, 1.55],
    whatItDoesEn:
      'Captures airborne dust, pet dander, and road soot before warm room air hits the wet evaporator fins.',
    whatItDoesTaglish:
      'Sinasala ang alikabok at dumi bago pumasok ang mainit na hangin sa evaporator coil.',
    tropicalIssuesEn:
      'Dry-season road dust quickly clogs mesh filters, choking airflow, raising inverter power draw, and straining the blower motor.',
    tropicalIssuesTaglish:
      'Mabilis magbara sa alikabok lalo na tuwing tag-init—humihina ang buga at tumataas ang konsumo sa kuryente.',
  },
  blower_wheel: {
    id: 'blower_wheel',
    nameEn: 'Cross-Flow Blower Wheel',
    nameTaglish: 'Blower Wheel (Taga-Buga ng Malamig na Hangin)',
    audience: 'both',
    positionResidential: [-1.45, 2.15, -2.12],
    positionCommercial: [-1.95, 2.48, -1.35],
    cameraOffset: [0.8, 0.15, 1.45],
    whatItDoesEn:
      'Draws warm indoor air through the filter and coil, then pushes chilled air evenly across the room.',
    whatItDoesTaglish:
      'Humihigop ng hangin sa kwarto at nagtutulak ng malamig na hangin palabas sa louvers.',
    tropicalIssuesEn:
      'Sticky dust buildup on curved blades creates imbalance, loud humming/rattling noises, and uneven weak airflow.',
    tropicalIssuesTaglish:
      'Kapag namuo ang dumi sa blades, nagiging maingay, umaalog, at mahina ang buga ng aircon.',
  },
  drain_pan: {
    id: 'drain_pan',
    nameEn: 'Condensate Drain Pan & Line',
    nameTaglish: 'Drain Pan at Drain Pipe (Daluyan ng Tubig)',
    audience: 'both',
    positionResidential: [-1.45, 2.02, -2.08],
    positionCommercial: [-1.95, 2.38, -1.55],
    cameraOffset: [0.95, 0.1, 1.45],
    whatItDoesEn:
      'Collects moisture stripped from humid indoor air and routes it safely outdoors via a pitched PVC drain line.',
    whatItDoesTaglish:
      'Sumasalo ng tubig galing sa humidity ng kwarto at nagpapalabas nito sa drain hose papunta sa labas.',
    tropicalIssuesEn:
      'High Philippine humidity creates heavy condensate; algae/slime clogs the drain pipe and causes indoor water dripping.',
    tropicalIssuesTaglish:
      'Dahil sobrang maalinsangan, maraming tubig ang naipon—kapag nagbara sa lumot, tumutulo sa loob ng bahay.',
  },
  thermostat: {
    id: 'thermostat',
    nameEn: 'Thermostat & PCB Controller',
    nameTaglish: 'Thermostat, Sensor & Inverter PCB',
    audience: 'both',
    positionResidential: [-0.95, 2.18, -2.02],
    positionCommercial: [0.35, 1.42, -2.35],
    cameraOffset: [0.75, 0.2, 1.3],
    whatItDoesEn:
      'Monitors room temperature and modulates inverter compressor speed and fan RPM for steady comfort and lower kWh.',
    whatItDoesTaglish:
      'Nagbabantay ng temperatura at nagkokontrol sa bilis ng inverter compressor para tipid sa kuryente.',
    tropicalIssuesEn:
      'Voltage fluctuations and tropical lizards/insects entering outdoor PCBs are top causes of error codes and unresponsive controls.',
    tropicalIssuesTaglish:
      'Ang pabago-bagong boltahe (voltage fluctuation) at insekto sa board ay madalas na sanhi ng error codes.',
  },
  compressor: {
    id: 'compressor',
    nameEn: 'Inverter Compressor',
    nameTaglish: 'Inverter Compressor (Puso ng Aircon)',
    audience: 'both',
    positionResidential: [2.85, 0.92, -1.65],
    positionCommercial: [2.9, 2.95, -1.45],
    cameraOffset: [1.5, 0.55, 1.8],
    whatItDoesEn:
      'Pressurizes and circulates refrigerant between indoor and outdoor coils to reject indoor heat outdoors.',
    whatItDoesTaglish:
      'Nagpapadaloy at nagpi-pressure ng freon/refrigerant para mailabas ang init mula sa loob ng kwarto.',
    tropicalIssuesEn:
      'Sustained 36–40°C summer heat plus dirty condenser coils cause high head pressure, thermal trip-offs, and high electric bills.',
    tropicalIssuesTaglish:
      'Sa matinding init ng Pampanga + maruming outdoor unit, nahihirapan ang compressor kaya tumataas ang bill.',
  },
  condenser_coil: {
    id: 'condenser_coil',
    nameEn: 'Outdoor Condenser Coil',
    nameTaglish: 'Outdoor Condenser Coil',
    audience: 'both',
    positionResidential: [2.72, 1.05, -1.88],
    positionCommercial: [2.8, 3.15, -1.75],
    cameraOffset: [1.65, 0.45, 1.9],
    whatItDoesEn:
      'Releases absorbed room heat into the outdoor air using dense aluminum fins around copper tubing.',
    whatItDoesTaglish:
      'Naglalabas ng init papunta sa hangin sa labas gamit ang copper tubes at aluminum fins.',
    tropicalIssuesEn:
      'Direct afternoon sun, leaves, and road dust blanket the fins—forcing the compressor to work harder and draw excess current.',
    tropicalIssuesTaglish:
      'Kapag nababalot ng alikabok at init ng araw, hindi makalabas ang init kaya humihina ang lamig sa loob.',
  },
  fan_motor: {
    id: 'fan_motor',
    nameEn: 'Condenser Fan Motor & Blades',
    nameTaglish: 'Outdoor Fan Motor & Blades',
    audience: 'both',
    positionResidential: [3.08, 1.04, -1.58],
    positionCommercial: [2.85, 3.45, -1.1],
    cameraOffset: [1.5, 0.45, 1.8],
    whatItDoesEn:
      'Pulls outdoor air across the condenser coil to cool down hot high-pressure refrigerant.',
    whatItDoesTaglish:
      'Humihigop ng hangin sa labas para palamigin ang condenser coil.',
    tropicalIssuesEn:
      'Worn bearings, weak run capacitors, or monsoon moisture cause fan slowdown, overheating, and buzzing noises.',
    tropicalIssuesTaglish:
      'Sirang capacitor o bearing ang madalas dahilan ng mabagal na ikot o maingay na outdoor unit.',
  },
  expansion_valve: {
    id: 'expansion_valve',
    nameEn: 'Expansion Valve (EEV) & Service Valves',
    nameTaglish: 'Expansion Valve & Flare Connections',
    audience: 'both',
    positionResidential: [2.56, 0.78, -1.52],
    positionCommercial: [2.45, 2.75, -1.15],
    cameraOffset: [1.25, 0.3, 1.45],
    whatItDoesEn:
      'Meters exact refrigerant flow into the evaporator so pressure drops cleanly for maximum cooling.',
    whatItDoesTaglish:
      'Nagtatakda ng tamang daloy ng freon/refrigerant papasok sa indoor coil.',
    tropicalIssuesEn:
      'Poor flare torque or vibration loosens service valves, causing slow refrigerant leaks and iced-up suction pipes.',
    tropicalIssuesTaglish:
      'Ang maluwag na flare nut ay sanhi ng mabagal na tagas ng freon at pag-yelo ng tubo.',
  },
  refrigerant_lines: {
    id: 'refrigerant_lines',
    nameEn: 'Insulated Copper Refrigerant Lines',
    nameTaglish: 'Copper Pipes at Insulation',
    audience: 'both',
    positionResidential: [0.65, 1.75, -2.28],
    positionCommercial: [1.45, 2.72, -1.3],
    cameraOffset: [1.1, 0.5, 2.1],
    whatItDoesEn:
      'Carries cold vapor and high-pressure liquid refrigerant between indoor and outdoor units inside closed-cell foam insulation.',
    whatItDoesTaglish:
      'Nagdadala ng freon sa pagitan ng indoor at outdoor unit na may makapal na foam insulation.',
    tropicalIssuesEn:
      'Sun-baked exterior insulation cracks over time, causing condensation ("sweating pipes") and cooling capacity loss.',
    tropicalIssuesTaglish:
      'Kapag naluto sa araw ang rubber insulation, nagpapawis ang tubo at nasasayang ang lamig.',
  },
  vrf_branch_box: {
    id: 'vrf_branch_box',
    nameEn: 'VRF Branch Selector & Header',
    nameTaglish: 'VRF Branch Box & Distribution Header',
    audience: 'commercial',
    positionCommercial: [1.3, 2.78, -1.45],
    cameraOffset: [1.3, 0.55, 1.8],
    whatItDoesEn:
      'Splits refrigerant capacity proportionally across multiple office zones, cassettes, and ducted AHUs from one outdoor cluster.',
    whatItDoesTaglish:
      'Nagdidistribute ng tamang lamig sa iba-ibang opisina at zones mula sa isang VRF outdoor cluster.',
    tropicalIssuesEn:
      'Improper brazing or missed nitrogen purging leaves scale inside copper headers, fouling electronic valves.',
    tropicalIssuesTaglish:
      'Kailangan ng tamang brazing at nitrogen purging sa install para hindi magbara ang mga valves.',
  },
  ductwork: {
    id: 'ductwork',
    nameEn: 'Insulated Supply Ductwork',
    nameTaglish: 'Insulated Air Ducts (Ceiling Plenum)',
    audience: 'commercial',
    positionCommercial: [-0.45, 2.68, -0.45],
    cameraOffset: [1.6, 0.75, 2.2],
    whatItDoesEn:
      'Delivers conditioned air from the ceiling-concealed AHU across open-plan retail or office ceilings.',
    whatItDoesTaglish:
      'Nagdadala ng malamig na hangin mula sa ceiling AHU papunta sa mga diffusers ng opisina.',
    tropicalIssuesEn:
      'Unsealed duct joints or missing vapor barriers above hot Philippine roof decks cause ceiling condensation stains.',
    tropicalIssuesTaglish:
      'Kapag may singaw o kulang ang insulation sa kisame, nagpapawis at tumutulo sa acoustic ceiling.',
  },
  diffusers: {
    id: 'diffusers',
    nameEn: '4-Way Ceiling Diffusers',
    nameTaglish: 'Ceiling Diffusers (Labasan ng Hangin)',
    audience: 'commercial',
    positionCommercial: [-0.25, 2.38, 0.45],
    cameraOffset: [1.3, 0.5, 1.9],
    whatItDoesEn:
      'Distributes chilled air evenly in four directions while minimizing drafts over workstations and customers.',
    whatItDoesTaglish:
      'Pantay na nagpapakalat ng lamig sa apat na direksyon sa buong commercial floor.',
    tropicalIssuesEn:
      'Dust streaks around ceiling diffusers signal dirty upstream filters or unsealed plenum air leaks.',
    tropicalIssuesTaglish:
      'Ang itim na mantsa sa paligid ng diffuser ay senyales ng maruming filter o tagas sa duct.',
  },
};

export interface SymptomItem {
  id: string;
  labelEn: string;
  labelTaglish: string;
  partIds: string[];
  focusPartId: string;
  causesEn: string[];
  causesTaglish: string[];
  actionEn: string;
  actionTaglish: string;
}

export const SYMPTOM_ITEMS: SymptomItem[] = [
  {
    id: 'not_cooling',
    labelEn: 'Not cooling / blowing warm air',
    labelTaglish: 'Hindi lumalamig / hangin lang',
    partIds: ['compressor', 'condenser_coil', 'refrigerant_lines', 'expansion_valve'],
    focusPartId: 'compressor',
    causesEn: [
      'Low refrigerant charge from a flare or coil leak',
      'Clogged outdoor condenser fins trapping heat',
      'Failed compressor capacitor or inverter board fault',
    ],
    causesTaglish: [
      'Kulang sa freon dahil sa tagas sa flare nut o coil',
      'Barado ng alikabok ang outdoor condenser kaya nag-overheat',
      'Mahinang capacitor o error sa inverter PCB',
    ],
    actionEn: 'Book pressure/subcooling diagnostics, nitrogen leak test, and coil check.',
    actionTaglish: 'Magpa-check ng pressure/temperature, leak test, at outdoor coil check.',
  },
  {
    id: 'water_leaking',
    labelEn: 'Water dripping indoors',
    labelTaglish: 'Tumutulo ang tubig sa loob',
    partIds: ['drain_pan', 'evaporator_coil', 'filter'],
    focusPartId: 'drain_pan',
    causesEn: [
      'Slime/algae blockage inside the condensate drain pipe',
      'Overflowing drain pan due to clogged evaporator fins',
      'Ice melt-off from restricted airflow or low freon',
    ],
    causesTaglish: [
      'Baradong drain pipe dahil sa lumot at dumi',
      'Umaapaw ang drain pan dahil puno ng alikabok ang coil',
      'Natutunaw na yelo mula sa maruming filter o kulang na freon',
    ],
    actionEn: 'Pressurized drain line flushing + full chemical-free coil & pan cleaning.',
    actionTaglish: 'Drain line flushing at full cleaning ng evaporator at drain pan.',
  },
  {
    id: 'weird_noise',
    labelEn: 'Rattling, buzzing, or loud hum',
    labelTaglish: 'Maingay / umuugong / kumakalampag',
    partIds: ['blower_wheel', 'fan_motor', 'compressor'],
    focusPartId: 'blower_wheel',
    causesEn: [
      'Unbalanced dirt buildup on the indoor blower wheel',
      'Worn outdoor fan motor bearings or loose casing screws',
      'Missing anti-vibration rubber mounts on outdoor bracket',
    ],
    causesTaglish: [
      'Makapal at hindi pantay na dumi sa blower wheel',
      'Sira o tuyo ang bearing ng fan motor sa labas',
      'Maluwag na turnilyo o sira ang rubber damper pads',
    ],
    actionEn: 'Blower wheel balancing/cleaning, bearing inspection, and mount tightening.',
    actionTaglish: 'Linisin ang blower wheel, i-check ang motor bearings, at higpitan ang bracket.',
  },
  {
    id: 'high_bill',
    labelEn: 'Sudden spike in electric bill',
    labelTaglish: 'Biglang taas ng electric bill',
    partIds: ['filter', 'condenser_coil', 'compressor', 'thermostat'],
    focusPartId: 'condenser_coil',
    causesEn: [
      'Dirty indoor filter & outdoor coil forcing 100% compressor load',
      'Undersized unit running non-stop against Pampanga afternoon heat',
      'Faulty room thermistor keeping inverter at peak frequency',
    ],
    causesTaglish: [
      'Maruming filter at outdoor coil kaya hindi makapag-idle ang inverter',
      'Bitin ang HP ng unit para sa laki at init ng kwarto',
      'Sirang temperature sensor kaya tuloy-tuloy sa high power',
    ],
    actionEn: 'Amp-draw & delta-T performance check plus deep cleaning.',
    actionTaglish: 'Ampere check, temperature drop test, at deep cleaning ng unit.',
  },
  {
    id: 'bad_smell',
    labelEn: 'Musty or sour odor',
    labelTaglish: 'Maasim o amoy amag na hangin',
    partIds: ['evaporator_coil', 'drain_pan', 'filter'],
    focusPartId: 'evaporator_coil',
    causesEn: [
      'Biofilm and mold growing on wet evaporator fins & drain pan',
      'Stagnant water trapped in a poorly pitched drain line',
    ],
    causesTaglish: [
      'Amag at bacteria na namuo sa basang evaporator fins at drain pan',
      'Naka-stock na tubig sa drain hose na walang tamang slope',
    ],
    actionEn: 'Pull-down or in-place pressure wash with coil-safe sanitizer & drain flush.',
    actionTaglish: 'Deep pressure wash gamit ang coil-safe sanitizer at drain flush.',
  },
  {
    id: 'freezing_coil',
    labelEn: 'Ice forming on indoor coil/pipes',
    labelTaglish: 'Nagyeyelo ang coil o copper pipe',
    partIds: ['evaporator_coil', 'filter', 'expansion_valve', 'refrigerant_lines'],
    focusPartId: 'evaporator_coil',
    causesEn: [
      'Severely blocked filter/blower starving warm air over the coil',
      'Low refrigerant pressure dropping coil temp below 0°C',
    ],
    causesTaglish: [
      'Sobrang baradong filter o blower kaya hindi umiikot ang hangin',
      'Kulang na freon pressure kaya nag-yeyelo ang indoor coil',
    ],
    actionEn: 'Turn unit to FAN only, thaw safely, then inspect airflow & refrigerant pressure.',
    actionTaglish: 'I-switch sa FAN mode para matunaw, tapos i-check ang linis at freon.',
  },
  {
    id: 'remote_unresponsive',
    labelEn: 'Remote or controls not responding',
    labelTaglish: 'Ayaw gumana ng remote o display',
    partIds: ['thermostat'],
    focusPartId: 'thermostat',
    causesEn: [
      'Tripped breaker, loose terminal block, or surge-damaged PCB',
      'Faulty IR receiver eye on indoor display board',
    ],
    causesTaglish: [
      'Nag-trip na breaker o PCB damage mula sa power surge',
      'Sirang IR receiver sensor sa indoor display',
    ],
    actionEn: 'Electrical continuity check, voltage measurement, and PCB/receiver diagnostics.',
    actionTaglish: 'Voltage & continuity check, at inspeksyon ng PCB at receiver.',
  },
];

export interface EquipmentItem {
  id: string;
  audience: Audience;
  modelType:
    | 'split_inverter'
    | 'split_non_inverter'
    | 'window_inverter'
    | 'floor_mounted'
    | 'ceiling_cassette'
    | 'ducted_split'
    | 'packaged_rooftop'
    | 'vrf_system'
    | 'chiller_info';
  nameEn: string;
  nameTaglish: string;
  capacityRange: string;
  hpMin: number;
  hpMax: number;
  inverter: boolean;
  bestForEn: string;
  bestForTaglish: string;
  efficiencyTier: string;
  noiseDba: string;
  priceEstimatePhp: string;
  notesEn: string;
  notesTaglish: string;
  infoOnly?: boolean;
}

export const EQUIPMENT_CATALOG: EquipmentItem[] = [
  // RESIDENTIAL
  {
    id: 'res_split_inv',
    audience: 'residential',
    modelType: 'split_inverter',
    nameEn: 'Wall-Mounted Split Inverter',
    nameTaglish: 'Wall-Mounted Split-Type (Inverter)',
    capacityRange: '1.0 – 2.5 HP (9,000 – 24,000 BTU)',
    hpMin: 1.0,
    hpMax: 2.5,
    inverter: true,
    bestForEn: 'Bedrooms, master suites, condos & living rooms (12–42 sqm)',
    bestForTaglish: 'Mga kwarto, condo, at sala (12–42 sqm)',
    efficiencyTier: 'High EER / CSPF 5-Star Tier',
    noiseDba: '21–38 dBA (Whisper Quiet)',
    priceEstimatePhp: '₱28,000 – ₱62,000 (unit + standard install est.)',
    notesEn: 'Variable-speed compressor cuts kWh during long hot Pampanga nights.',
    notesTaglish: 'Nag-aadjust ang bilis ng compressor para mas tipid sa kuryente buong gabi.',
  },
  {
    id: 'res_split_non_inv',
    audience: 'residential',
    modelType: 'split_non_inverter',
    nameEn: 'Wall-Mounted Split (Non-Inverter)',
    nameTaglish: 'Wall-Mounted Split-Type (Fixed Speed)',
    capacityRange: '1.0 – 2.0 HP (9,000 – 18,000 BTU)',
    hpMin: 1.0,
    hpMax: 2.0,
    inverter: false,
    bestForEn: 'Guest rooms or spaces used < 4 hours/day (12–30 sqm)',
    bestForTaglish: 'Guest rooms o kwartong madalang gamitin (< 4 hrs/araw)',
    efficiencyTier: 'Standard EER Tier',
    noiseDba: '28–42 dBA',
    priceEstimatePhp: '₱21,000 – ₱42,000 (unit + standard install est.)',
    notesEn: 'Lower upfront cost; simple fixed-speed mechanics for short daily runtime.',
    notesTaglish: 'Mas mababa ang upfront budget; bagay kung panandalian lang gamitin.',
  },
  {
    id: 'res_window_inv',
    audience: 'residential',
    modelType: 'window_inverter',
    nameEn: 'Compact Window-Type Inverter',
    nameTaglish: 'Window-Type Inverter',
    capacityRange: '0.75 – 2.0 HP (7,000 – 18,000 BTU)',
    hpMin: 0.75,
    hpMax: 2.0,
    inverter: true,
    bestForEn: 'Bedrooms with pre-cut window sleeves (10–28 sqm)',
    bestForTaglish: 'Mga kwartong may nakahandang butas para sa window AC (10–28 sqm)',
    efficiencyTier: '4-Star Inverter Tier',
    noiseDba: '36–46 dBA',
    priceEstimatePhp: '₱19,500 – ₱39,000 (unit + bracket/sealing est.)',
    notesEn: 'All-in-one chassis; minimal wall work when window opening already exists.',
    notesTaglish: 'Isang buong unit na; mabilis ikabit kung may window sleeve na.',
  },
  {
    id: 'res_floor_mounted',
    audience: 'residential',
    modelType: 'floor_mounted',
    nameEn: 'Floor-Mounted Tower Split',
    nameTaglish: 'Floor-Mounted Inverter Split',
    capacityRange: '2.5 – 4.0 HP (24,000 – 36,000 BTU)',
    hpMin: 2.5,
    hpMax: 4.0,
    inverter: true,
    bestForEn: 'Large open living/dining areas & high ceilings (40–70 sqm)',
    bestForTaglish: 'Malalaking sala, dining area, at high-ceiling homes (40–70 sqm)',
    efficiencyTier: 'High Capacity Inverter Tier',
    noiseDba: '34–45 dBA',
    priceEstimatePhp: '₱68,000 – ₱115,000 (unit + install est.)',
    notesEn: 'Long air throw reaches wide open-plan Filipino sala & dining spaces.',
    notesTaglish: 'Malakas at malayo ang abot ng hangin para sa malalawak na sala.',
  },

  // COMMERCIAL
  {
    id: 'com_cassette',
    audience: 'commercial',
    modelType: 'ceiling_cassette',
    nameEn: '4-Way Ceiling Cassette Inverter',
    nameTaglish: '4-Way Ceiling Cassette Inverter',
    capacityRange: '2.0 – 5.0 HP (18,000 – 48,000 BTU)',
    hpMin: 2.0,
    hpMax: 5.0,
    inverter: true,
    bestForEn: 'Retail stores, clinics, cafés & medium offices (35–85 sqm)',
    bestForTaglish: 'Tindahan, clinic, café, at opisina (35–85 sqm)',
    efficiencyTier: 'Commercial Inverter CSPF',
    noiseDba: '32–43 dBA',
    priceEstimatePhp: '₱72,000 – ₱145,000 (estimate)',
    notesEn: 'Flush T-bar ceiling grille frees up wall space for displays & shelving.',
    notesTaglish: 'Nakalubog sa kisame kaya maluwag ang pader para sa mga shelves o display.',
  },
  {
    id: 'com_ducted',
    audience: 'commercial',
    modelType: 'ducted_split',
    nameEn: 'Concealed Ducted Split / AHU',
    nameTaglish: 'Concealed Ducted Split / AHU',
    capacityRange: '3.0 – 7.5 HP (36,000 – 72,000 BTU)',
    hpMin: 3.0,
    hpMax: 7.5,
    inverter: true,
    bestForEn: 'Showrooms, restaurants, multi-room clinics & offices (60–140 sqm)',
    bestForTaglish: 'Showroom, restaurant, at multi-room offices (60–140 sqm)',
    efficiencyTier: 'High-Static Inverter Tier',
    noiseDba: '29–40 dBA (at diffuser)',
    priceEstimatePhp: '₱115,000 – ₱260,000 (incl. ducting est.)',
    notesEn: 'Hidden above ceiling; distributes air evenly through insulated sheet-metal ducts.',
    notesTaglish: 'Nakatago sa kisame; pantay ang lamig sa lahat ng sulok gamit ang ducts.',
  },
  {
    id: 'com_packaged',
    audience: 'commercial',
    modelType: 'packaged_rooftop',
    nameEn: 'Rooftop Packaged Unit',
    nameTaglish: 'Rooftop Packaged Unit (RTU)',
    capacityRange: '5.0 – 15.0 TR (60,000 – 180,000 BTU)',
    hpMin: 5.0,
    hpMax: 15.0,
    inverter: true,
    bestForEn: 'Supermarkets, warehouses, chapels & event halls (150–350+ sqm)',
    bestForTaglish: 'Supermarket, warehouse, at event halls (150–350+ sqm)',
    efficiencyTier: 'Heavy-Duty Commercial Tier',
    noiseDba: '48–58 dBA (outdoor)',
    priceEstimatePhp: '₱280,000 – ₱650,000+ (estimate)',
    notesEn: 'Self-contained rooftop chassis built for continuous daytime cooling loads.',
    notesTaglish: 'Pang-malakihang espasyo; nasa bubong ang buong makina para walang abala sa loob.',
  },
  {
    id: 'com_vrf',
    audience: 'commercial',
    modelType: 'vrf_system',
    nameEn: 'VRF / VRV Multi-Zone System',
    nameTaglish: 'VRF / VRV Multi-Split System',
    capacityRange: '8.0 – 36.0 HP Modular',
    hpMin: 8.0,
    hpMax: 36.0,
    inverter: true,
    bestForEn: 'Multi-floor offices, boutique hotels & medical buildings',
    bestForTaglish: 'Multi-floor buildings, hotels, at malalaking opisina',
    efficiencyTier: 'Variable Refrigerant Flow (Top Efficiency)',
    noiseDba: '24–38 dBA (indoor zones)',
    priceEstimatePhp: '₱450,000 – ₱1,800,000+ (project estimate)',
    notesEn: 'One outdoor cluster serves dozens of independent indoor zones simultaneously.',
    notesTaglish: 'Isang outdoor cluster lang ang nagpapaandar ng maraming independent zones.',
  },
  {
    id: 'com_chiller',
    audience: 'commercial',
    modelType: 'chiller_info',
    nameEn: 'Chilled-Water Plant (Consultative)',
    nameTaglish: 'Chiller System (Project Consultation)',
    capacityRange: '20 – 200+ TR',
    hpMin: 20,
    hpMax: 200,
    inverter: true,
    bestForEn: 'Industrial facilities, hospitals, malls & large campuses',
    bestForTaglish: 'Pabrika, ospital, at malalaking commercial buildings',
    efficiencyTier: 'Custom Central Plant Engineering',
    noiseDba: 'Engineered to spec',
    priceEstimatePhp: 'Custom Engineering Quote (after site & load study)',
    notesEn: 'Info-only reference: requires mechanical plans & chilled-water piping review.',
    notesTaglish: 'Para sa malalaking planta; kailangan ng mechanical plans at site inspection.',
    infoOnly: true,
  },
];

export interface InstallStep {
  step: number;
  titleEn: string;
  titleTaglish: string;
  summaryEn: string;
  summaryTaglish: string;
  readings?: { label: string; value: string }[];
  cameraPreset: CameraPreset;
}

export const INSTALLATION_STEPS: InstallStep[] = [
  {
    step: 1,
    titleEn: 'Free Site Assessment',
    titleTaglish: 'Libreng Site Assessment',
    summaryEn:
      'Inspect wall load capacity, sun orientation, drainage slope, and breaker panel clearance on-site in Pampanga.',
    summaryTaglish:
      'Sinusuri ang tibay ng pader, sikat ng araw, drain path, at electrical breaker capacity sa site.',
    cameraPreset: 'overview',
  },
  {
    step: 2,
    titleEn: 'Load Sizing & BTU Planning',
    titleTaglish: 'Tamang Sizing & BTU Planning',
    summaryEn:
      'Calculate floor area, ceiling height, west-facing glass heat gain, and occupancy so the inverter neither short-cycles nor strains.',
    summaryTaglish:
      'Kinukwenta ang sukat ng kwarto, init mula sa bintana, at dami ng tao para sakto ang HP/BTU.',
    readings: [
      { label: 'Est. Cooling Load', value: '18,000 BTU/h (2.0 HP)' },
      { label: 'Target Room Delta', value: '24 °C Indoor / 37 °C Ambient' },
    ],
    cameraPreset: 'top',
  },
  {
    step: 3,
    titleEn: 'Piping & Ductwork Route',
    titleTaglish: 'Ruta ng Copper Pipe & Ductwork',
    summaryEn:
      'Core-drill cleanly with downward pitch, lay thick-walled copper lines in UV-resistant closed-cell insulation, and set drain slope.',
    summaryTaglish:
      'Maayos na core-drilling, makapal na copper pipe na may UV insulation, at tamang slope ng drain.',
    cameraPreset: 'piping',
  },
  {
    step: 4,
    titleEn: 'Mounting & Vibration Isolation',
    titleTaglish: 'Pagkabit ng Brackets & Units',
    summaryEn:
      'Level indoor steel backplate and anchor heavy-duty L-brackets or concrete pads with rubber anti-vibration dampers outdoors.',
    summaryTaglish:
      'Level na indoor bracket at matibay na outdoor stand na may rubber pads laban sa kalampag.',
    cameraPreset: 'outdoor',
  },
  {
    step: 5,
    titleEn: 'Electrical, Vacuum & Leak Test',
    titleTaglish: 'Wiring, Nitrogen Leak Test & Vacuum',
    summaryEn:
      'Dedicated breaker & grounding, dry-nitrogen pressure hold test, and deep micron vacuuming to remove humid tropical moisture from lines.',
    summaryTaglish:
      'Dedicated breaker, nitrogen pressure test laban sa tagas, at deep vacuum para walang moisture sa tubo.',
    readings: [
      { label: 'Nitrogen Hold', value: '450 PSI · 0.0 Drop' },
      { label: 'Deep Vacuum', value: '< 500 Microns' },
    ],
    cameraPreset: 'outdoor',
  },
  {
    step: 6,
    titleEn: 'Commissioning & Airflow Testing',
    titleTaglish: 'Commissioning & Performance Test',
    summaryEn:
      'Measure supply-vs-return temperature split, clamp-meter amperage, drain flow test, and static airflow balance.',
    summaryTaglish:
      'Sinusukat ang lamig ng buga, ampere draw, at daloy ng drain water bago i-turn over.',
    readings: [
      { label: 'Delta-T Split', value: '11.4 °C Drop' },
      { label: 'Running Draw', value: '4.6 A (Inverter Steady)' },
    ],
    cameraPreset: 'indoor',
  },
  {
    step: 7,
    titleEn: 'Warranty Handover & Walkthrough',
    titleTaglish: 'Warranty Handover & Client Briefing',
    summaryEn:
      'Walk through filter cleaning intervals, optimal 24–25 °C Eco settings, and hand over documented workmanship warranty.',
    summaryTaglish:
      'Itinuturo ang tamang paglinis ng filter, tipid-kuryente settings (24–25 °C), at dokumentadong warranty.',
    cameraPreset: 'overview',
  },
];
