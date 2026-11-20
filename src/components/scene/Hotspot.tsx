import { Html } from '@react-three/drei';
import { HVAC_PARTS } from '../../data/hvacData';
import { useHVACStore } from '../../store/useHVACStore';
import { getPartHighlightState } from './hvacSceneUtils';

interface HotspotProps {
  partId: string;
  position: [number, number, number];
}

export function Hotspot({ partId, position }: HotspotProps) {
  const part = HVAC_PARTS[partId];
  const language = useHVACStore((s) => s.language);
  const service = useHVACStore((s) => s.service);
  const selectedPart = useHVACStore((s) => s.selectedPart);
  const hoveredPart = useHVACStore((s) => s.hoveredPart);
  const selectedSymptom = useHVACStore((s) => s.selectedSymptom);
  const hudCollapsed = useHVACStore((s) => s.hudCollapsed);
  const setSelectedPart = useHVACStore((s) => s.setSelectedPart);
  const setHoveredPart = useHVACStore((s) => s.setHoveredPart);
  const flyToPart = useHVACStore((s) => s.flyToPart);
  const markInteracted = useHVACStore((s) => s.markInteracted);

  if (!part || hudCollapsed) return null;

  const state = getPartHighlightState(partId, {
    service,
    selectedPart,
    hoveredPart,
    selectedSymptom,
  });

  const isSelected = selectedPart === partId;
  const isHighlighted = state === 'highlighted' || state === 'selected';
  const label = language === 'en' ? part.nameEn : part.nameTaglish;
  const desc = language === 'en' ? part.whatItDoesEn : part.whatItDoesTaglish;

  const handleActivate = () => {
    markInteracted();
    setSelectedPart(partId);
    const [x, y, z] = position;
    const [ox, oy, oz] = part.cameraOffset;
    flyToPart([x + ox, y + oy, z + oz], [x, y, z]);
  };

  return (
    <Html
      position={position}
      center
      distanceFactor={7.5}
      zIndexRange={[15, 0]}
      occlude={false}
    >
      <div className="relative group select-none pointer-events-auto">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleActivate();
          }}
          onMouseEnter={() => setHoveredPart(partId)}
          onMouseLeave={() => setHoveredPart(null)}
          aria-label={`Inspect ${label}: ${desc}`}
          aria-pressed={isSelected}
          className={`flex items-center justify-center rounded-full border transition-transform duration-150 focus-visible:outline-2 focus-visible:outline-[#22D3EE] ${
            isSelected
              ? 'w-7 h-7 bg-[#F97316] border-white text-white scale-110 shadow-lg'
              : isHighlighted
                ? 'w-6 h-6 bg-[#22D3EE] border-[#0B1F3A] text-[#0B1F3A] hover:scale-115 shadow-md'
                : 'w-5 h-5 bg-[#0B1F3A]/90 border-[#22D3EE]/70 text-[#22D3EE] hover:scale-115 opacity-85 hover:opacity-100'
          }`}
        >
          <span className="text-[10px] font-bold leading-none">
            {isSelected ? '×' : '+'}
          </span>
        </button>

        {/* Clean label on hover or when selected */}
        <div
          className={`pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 px-2 py-0.5 rounded bg-[#0B1F3A]/95 border border-white/15 text-[11px] font-medium text-white whitespace-nowrap transition-opacity duration-150 ${
            isSelected || hoveredPart === partId ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
        >
          {label}
        </div>
      </div>
    </Html>
  );
}
