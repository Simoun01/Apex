import { create } from 'zustand';
import type { BrandId } from '../data/airconBrands';

/** Which model part the visitor clicked, for the "how it works" card. */
export interface PartTarget {
  /** Model kind: wall | floor | window | vrf | packaged | ducted | cassette | outdoor */
  kind: string;
  brandId: BrandId;
  partId: string;
  /** Capacity of the unit it came from ("1.5 HP"), for the indicative part price */
  variant?: string;
}

interface PartGuideState {
  open: PartTarget | null;
  show: (t: PartTarget) => void;
  close: () => void;
}

export const usePartGuide = create<PartGuideState>((set) => ({
  open: null,
  show: (open) => set({ open }),
  close: () => set({ open: null }),
}));
