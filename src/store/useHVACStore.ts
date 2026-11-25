import { create } from 'zustand';
import {
  Audience,
  CameraPreset,
  EQUIPMENT_CATALOG,
  Language,
  ServiceMode,
} from '../data/hvacData';

export type AppStage = 'home' | 'entering' | 'experience';
export type QualityTier = 'high' | 'medium' | 'low';
export type FanSpeed = 'low' | 'med' | 'high';
export type MobileSheetSnap = 'peek' | 'half' | 'full';

export interface RoomCalculatorInput {
  sqm: number;
  sunExposure: 'shaded' | 'normal' | 'direct_sun';
  occupants: number;
  appliances: number;
}

export interface CameraFlyTarget {
  position: [number, number, number];
  target: [number, number, number];
  nonce: number;
}

interface InitialRouteState {
  stage: AppStage;
  audience: Audience;
}

export function parseRouteFromLocation(): InitialRouteState {
  if (typeof window === 'undefined') {
    return { stage: 'home', audience: 'residential' };
  }
  const params = new URLSearchParams(window.location.search);
  const view = params.get('view')?.toLowerCase();
  const hash = window.location.hash.replace('#', '').toLowerCase();

  if (view === 'residential' || hash === 'residential') {
    return { stage: 'experience', audience: 'residential' };
  }
  if (view === 'commercial' || hash === 'commercial') {
    return { stage: 'experience', audience: 'commercial' };
  }
  return { stage: 'home', audience: 'residential' };
}

export function syncUrlForRoute(stage: AppStage, audience: Audience, replace = false) {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  if (stage === 'home') {
    url.searchParams.delete('view');
    if (url.hash === '#residential' || url.hash === '#commercial') {
      url.hash = '';
    }
  } else {
    url.searchParams.set('view', audience);
  }
  const nextHref = url.pathname + url.search + url.hash;
  const currentHref = window.location.pathname + window.location.search + window.location.hash;
  if (nextHref === currentHref) return;

  if (replace) {
    window.history.replaceState({ stage, audience }, '', nextHref);
  } else {
    window.history.pushState({ stage, audience }, '', nextHref);
  }
}

interface HVACState {
  stage: AppStage;
  enteringTarget: Audience | null;
  hoveredHomeBuilding: Audience | null;
  transitionVeil: number; // 0..1 opacity cross-dissolve at doorway swap

  audience: Audience;
  service: ServiceMode;
  language: Language;
  cameraPreset: CameraPreset;
  cameraNonce: number;
  cameraFlyTarget: CameraFlyTarget | null;

  // Scene toggles
  exploded: boolean;
  xray: boolean;
  airflowOn: boolean;
  fanSpeed: FanSpeed;
  powerOn: boolean;
  heatMapOn: boolean;

  // Inspection
  selectedPart: string | null;
  hoveredPart: string | null;

  // Service 1: Repair
  selectedSymptom: string | null;

  // Service 2: Cleaning
  cleaningBeforeAfter: number; // 0 = dirty, 1 = clean
  dirtyAirflowMode: boolean; // true = weak/dirty airflow, false = strong/clean

  // Service 3: Equipment
  selectedEquipmentId: string;
  compareMode: boolean;
  compareEquipmentIds: string[];
  roomCalc: RoomCalculatorInput;

  // Service 4: Installation
  installStep: number; // 1..7

  // Performance, Accessibility, UI
  quality: QualityTier;
  postProcessingEnabled: boolean;
  reduceMotion: boolean;
  non3dMode: boolean;
  hasInteracted: boolean;
  hudCollapsed: boolean;
  quoteModalOpen: boolean;
  mobileSheetSnap: MobileSheetSnap;
  whyApexOpen: boolean;

  // Actions
  setHoveredHomeBuilding: (target: Audience | null) => void;
  setTransitionVeil: (opacity: number) => void;
  enterExperience: (
    audience: Audience,
    opts?: { service?: ServiceMode; skipHistory?: boolean; immediate?: boolean },
  ) => void;
  completeEnterExperience: () => void;
  backToHome: (opts?: { skipHistory?: boolean }) => void;
  applyPopStateRoute: (route: InitialRouteState) => void;

  setAudience: (audience: Audience) => void;
  setService: (service: ServiceMode) => void;
  setLanguage: (lang: Language) => void;
  setCameraPreset: (preset: CameraPreset) => void;
  flyToPart: (position: [number, number, number], target: [number, number, number]) => void;
  resetView: () => void;
  setExploded: (val: boolean) => void;
  setXray: (val: boolean) => void;
  setAirflowOn: (val: boolean) => void;
  setFanSpeed: (speed: FanSpeed) => void;
  setPowerOn: (val: boolean) => void;
  setHeatMapOn: (val: boolean) => void;
  setSelectedPart: (partId: string | null) => void;
  setHoveredPart: (partId: string | null) => void;
  setSelectedSymptom: (symptomId: string | null) => void;
  setCleaningBeforeAfter: (val: number) => void;
  setDirtyAirflowMode: (val: boolean) => void;
  setSelectedEquipmentId: (id: string) => void;
  setCompareMode: (val: boolean) => void;
  toggleCompareEquipment: (id: string) => void;
  updateRoomCalc: (patch: Partial<RoomCalculatorInput>) => void;
  setInstallStep: (step: number) => void;
  setQuality: (q: QualityTier) => void;
  setPostProcessingEnabled: (val: boolean) => void;
  setReduceMotion: (val: boolean) => void;
  setNon3dMode: (val: boolean) => void;
  markInteracted: () => void;
  setHudCollapsed: (val: boolean) => void;
  setQuoteModalOpen: (val: boolean) => void;
  setMobileSheetSnap: (snap: MobileSheetSnap) => void;
  setWhyApexOpen: (val: boolean) => void;
}

/** Every visitor starts on Low graphics (fast on any device); they can raise it in Settings. */
const detectInitialQuality = (): QualityTier => 'low';

const detectReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
};


const initialRoute = parseRouteFromLocation();

function getDefaultAudienceConfig(audience: Audience) {
  return {
    selectedEquipmentId: audience === 'residential' ? 'res_split_inv' : 'com_cassette',
    compareEquipmentIds:
      audience === 'residential'
        ? ['res_split_inv', 'res_split_non_inv']
        : ['com_cassette', 'com_ducted'],
  };
}

const initialEquip = getDefaultAudienceConfig(initialRoute.audience);

export const useHVACStore = create<HVACState>((set, get) => ({
  stage: initialRoute.stage,
  enteringTarget: null,
  hoveredHomeBuilding: null,
  transitionVeil: 0,

  audience: initialRoute.audience,
  service: 'repair',
  language: 'en',
  cameraPreset: 'overview',
  cameraNonce: 0,
  cameraFlyTarget: null,

  exploded: false,
  xray: false,
  airflowOn: true,
  fanSpeed: 'med',
  powerOn: true,
  heatMapOn: false,

  selectedPart: null,
  hoveredPart: null,

  selectedSymptom: null,

  cleaningBeforeAfter: 0.75,
  dirtyAirflowMode: false,

  selectedEquipmentId: initialEquip.selectedEquipmentId,
  compareMode: false,
  compareEquipmentIds: initialEquip.compareEquipmentIds,
  roomCalc: {
    sqm: 22,
    sunExposure: 'normal',
    occupants: 2,
    appliances: 1,
  },

  installStep: 7,

  quality: detectInitialQuality(),
  postProcessingEnabled: true,
  reduceMotion: detectReducedMotion(),
  non3dMode: false,
  hasInteracted: false,
  hudCollapsed: false,
  quoteModalOpen: false,
  mobileSheetSnap: 'peek',
  whyApexOpen: false,

  setHoveredHomeBuilding: (hoveredHomeBuilding) => set({ hoveredHomeBuilding }),
  setTransitionVeil: (transitionVeil) => set({ transitionVeil }),

  enterExperience: (audience, opts) => {
    const state = get();
    const equip = getDefaultAudienceConfig(audience);
    const service = opts?.service ?? 'repair';
    const shouldSkipFlight = Boolean(opts?.immediate || state.reduceMotion || state.non3dMode);

    let cameraPreset: CameraPreset = 'overview';
    let airflowOn = true;
    let xray = false;
    if (service === 'cleaning') {
      cameraPreset = 'indoor';
      xray = true;
    } else if (service === 'equipment') {
      cameraPreset = 'indoor';
    } else if (service === 'installation') {
      cameraPreset = 'piping';
    }

    if (!opts?.skipHistory) {
      syncUrlForRoute('experience', audience);
    }

    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: shouldSkipFlight ? 'auto' : 'smooth' });
    }

    set((s) => ({
      stage: shouldSkipFlight ? 'experience' : 'entering',
      enteringTarget: shouldSkipFlight ? null : audience,
      hoveredHomeBuilding: null,
      transitionVeil: 0,
      audience,
      service,
      ...equip,
      selectedPart: null,
      exploded: false,
      airflowOn,
      xray,
      cameraPreset,
      cameraFlyTarget: null,
      cameraNonce: s.cameraNonce + 1,
    }));
  },

  completeEnterExperience: () => {
    set((s) => ({
      stage: 'experience',
      enteringTarget: null,
      transitionVeil: 0,
      cameraFlyTarget: null,
      cameraNonce: s.cameraNonce + 1,
    }));
  },

  backToHome: (opts) => {
    if (!opts?.skipHistory) {
      syncUrlForRoute('home', get().audience);
    }
    set((s) => ({
      stage: 'home',
      enteringTarget: null,
      hoveredHomeBuilding: null,
      transitionVeil: 0,
      selectedPart: null,
      hoveredPart: null,
      exploded: false,
      xray: false,
      heatMapOn: false,
      whyApexOpen: false,
      cameraFlyTarget: null,
      cameraNonce: s.cameraNonce + 1,
    }));
  },

  applyPopStateRoute: (route) => {
    if (route.stage === 'home') {
      get().backToHome({ skipHistory: true });
    } else {
      get().enterExperience(route.audience, { skipHistory: true, immediate: true });
    }
  },

  setAudience: (audience) => {
    const equip = getDefaultAudienceConfig(audience);
    if (get().stage === 'experience') {
      syncUrlForRoute('experience', audience);
    }
    set((s) => ({
      audience,
      ...equip,
      selectedPart: null,
      cameraPreset: 'overview',
      cameraFlyTarget: null,
      cameraNonce: s.cameraNonce + 1,
    }));
  },

  setService: (service) => {
    set((s) => {
      let cameraPreset: CameraPreset = 'overview';
      let airflowOn = s.airflowOn;
      let exploded = s.exploded;
      let xray = s.xray;

      if (service === 'repair') {
        cameraPreset = 'overview';
        exploded = false;
      } else if (service === 'cleaning') {
        cameraPreset = 'indoor';
        airflowOn = true;
        xray = true;
      } else if (service === 'equipment') {
        cameraPreset = 'indoor';
        exploded = false;
        xray = false;
      } else if (service === 'installation') {
        cameraPreset = 'piping';
        exploded = false;
        xray = false;
      }

      return {
        service,
        cameraPreset,
        cameraFlyTarget: null,
        cameraNonce: s.cameraNonce + 1,
        airflowOn,
        exploded,
        xray,
        selectedPart: null,
      };
    });
  },

  setLanguage: (language) => set({ language }),

  setCameraPreset: (cameraPreset) =>
    set((s) => ({
      cameraPreset,
      cameraFlyTarget: null,
      cameraNonce: s.cameraNonce + 1,
    })),

  flyToPart: (position, target) =>
    set((s) => ({
      cameraFlyTarget: {
        position,
        target,
        nonce: s.cameraNonce + 1,
      },
      cameraNonce: s.cameraNonce + 1,
    })),

  resetView: () =>
    set((s) => ({
      cameraPreset: 'overview',
      cameraFlyTarget: null,
      cameraNonce: s.cameraNonce + 1,
      selectedPart: null,
      exploded: false,
      xray: false,
    })),

  setExploded: (exploded) => set({ exploded }),
  setXray: (xray) => set({ xray }),
  setAirflowOn: (airflowOn) => set({ airflowOn }),
  setFanSpeed: (fanSpeed) => set({ fanSpeed }),
  setPowerOn: (powerOn) => set({ powerOn }),
  setHeatMapOn: (heatMapOn) => set({ heatMapOn }),
  setSelectedPart: (selectedPart) => set({ selectedPart }),
  setHoveredPart: (hoveredPart) => set({ hoveredPart }),

  setSelectedSymptom: (selectedSymptom) => set({ selectedSymptom }),

  setCleaningBeforeAfter: (cleaningBeforeAfter) =>
    set({
      cleaningBeforeAfter,
      dirtyAirflowMode: cleaningBeforeAfter < 0.45,
    }),

  setDirtyAirflowMode: (dirtyAirflowMode) =>
    set({
      dirtyAirflowMode,
      cleaningBeforeAfter: dirtyAirflowMode ? 0.12 : 0.92,
    }),

  setSelectedEquipmentId: (selectedEquipmentId) => set({ selectedEquipmentId }),
  setCompareMode: (compareMode) => set({ compareMode }),
  toggleCompareEquipment: (id) => {
    const current = get().compareEquipmentIds;
    if (current.includes(id)) {
      if (current.length <= 1) return;
      set({ compareEquipmentIds: current.filter((x) => x !== id) });
    } else {
      const next = [...current, id].slice(-3);
      set({ compareEquipmentIds: next });
    }
  },

  updateRoomCalc: (patch) =>
    set((s) => ({ roomCalc: { ...s.roomCalc, ...patch } })),

  setInstallStep: (installStep) => set({ installStep }),
  setQuality: (quality) => set({ quality }),
  setPostProcessingEnabled: (postProcessingEnabled) => set({ postProcessingEnabled }),
  setReduceMotion: (reduceMotion) => set({ reduceMotion }),
  setNon3dMode: (non3dMode) => set({ non3dMode }),
  markInteracted: () => {
    if (!get().hasInteracted) set({ hasInteracted: true });
  },
  setHudCollapsed: (hudCollapsed) => set({ hudCollapsed }),
  setQuoteModalOpen: (quoteModalOpen) => set({ quoteModalOpen }),
  setMobileSheetSnap: (mobileSheetSnap) => set({ mobileSheetSnap }),
  setWhyApexOpen: (whyApexOpen) => set({ whyApexOpen }),
}));

export function computeRecommendedCapacity(calc: RoomCalculatorInput) {
  // Simple transparent thermal rule-of-thumb for tropical Philippine ambient:
  // ~650 BTU/h per sqm baseline + adjustments for sun, people, and appliances
  const sunMultiplier =
    calc.sunExposure === 'direct_sun' ? 1.2 : calc.sunExposure === 'shaded' ? 0.92 : 1.0;
  const baseBtu = calc.sqm * 650 * sunMultiplier;
  const peopleBtu = Math.max(0, calc.occupants - 2) * 550;
  const applianceBtu = calc.appliances * 700;
  const totalBtu = Math.round((baseBtu + peopleBtu + applianceBtu) / 500) * 500;
  const hpRaw = totalBtu / 9000;

  // Standard PH market HP tiers
  const standardTiers = [0.75, 1.0, 1.5, 2.0, 2.5, 3.0, 4.0, 5.0];
  const recommendedHp =
    standardTiers.find((t) => t >= hpRaw) ?? Math.ceil(hpRaw * 2) / 2;

  return {
    estimatedBtu: totalBtu,
    recommendedHp,
  };
}

export function getEquipmentById(id: string) {
  return EQUIPMENT_CATALOG.find((e) => e.id === id) ?? EQUIPMENT_CATALOG[0];
}
