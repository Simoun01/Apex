import { useId } from 'react';
import {
  ACTIVE_LOGO_VARIANT,
  APEX_MARK_COORDS,
  ApexLogoSurface,
  ApexLogoTone,
  ApexLogoVariant,
  getLogoPalette,
} from './apexLogoSpec';

export type { ApexLogoSurface, ApexLogoTone, ApexLogoVariant };

export interface ApexLogoProps {
  /** Pixel width and height of the square mark (e.g. 24, 32, 48). */
  size?: number;
  /** Switch between 'primary' (stacked chevrons), 'alt-a' (hex rotor), or 'alt-b' (AM monogram). */
  variant?: ApexLogoVariant;
  /** Use 'monochrome' to inherit currentColor across every stroke. */
  tone?: ApexLogoTone;
  /** Adjust cyan tint contrast for dark navy headers vs light grounds. */
  surface?: ApexLogoSurface;
  className?: string;
  label?: string;
}

export function ApexLogo({
  size = 32,
  variant = ACTIVE_LOGO_VARIANT,
  tone = 'cyan',
  surface = 'dark',
  className = '',
  label = 'Apex Mechanical & Cooling logo',
}: ApexLogoProps) {
  const titleId = useId();
  const palette = getLogoPalette(tone, surface);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-labelledby={titleId}
      className={className}
    >
      <title id={titleId}>{label}</title>

      {variant === 'alt-a' && (
        <>
          <polygon
            points={APEX_MARK_COORDS.altA.hexPoints}
            stroke={palette.ticks}
            strokeOpacity={palette.ticksOpacity}
            strokeWidth={1.35}
            strokeLinejoin="miter"
          />
          <circle
            cx={16}
            cy={16}
            r={9.2}
            stroke={palette.frame}
            strokeOpacity={palette.frameOpacity}
            strokeWidth={1}
          />
          <circle
            cx={16}
            cy={16}
            r={2.1}
            stroke={palette.primaryStroke}
            strokeOpacity={palette.accentOpacity}
            strokeWidth={1.9}
          />
          <g
            stroke={palette.secondaryStroke}
            strokeOpacity={palette.secondaryOpacity}
            strokeWidth={2.1}
            strokeLinecap="round"
          >
            <path d={APEX_MARK_COORDS.altA.bladePath} />
            <path d={APEX_MARK_COORDS.altA.bladePath} transform="rotate(120 16 16)" />
            <path d={APEX_MARK_COORDS.altA.bladePath} transform="rotate(240 16 16)" />
          </g>
        </>
      )}

      {variant !== 'alt-a' && (
        <>
          <rect
            x={APEX_MARK_COORDS.squareFrame.x}
            y={APEX_MARK_COORDS.squareFrame.y}
            width={APEX_MARK_COORDS.squareFrame.width}
            height={APEX_MARK_COORDS.squareFrame.height}
            rx={APEX_MARK_COORDS.squareFrame.rx}
            stroke={palette.frame}
            strokeOpacity={palette.frameOpacity}
            strokeWidth={1}
          />
          <path
            d={APEX_MARK_COORDS.squareTicksPath}
            stroke={palette.ticks}
            strokeOpacity={palette.ticksOpacity}
            strokeWidth={1.4}
            strokeLinecap="square"
            strokeLinejoin="miter"
          />
        </>
      )}

      {variant === 'alt-b' && (
        <>
          <path
            d={APEX_MARK_COORDS.altB.mPath}
            stroke={palette.secondaryStroke}
            strokeOpacity={palette.secondaryOpacity}
            strokeWidth={2.2}
            strokeLinecap="square"
            strokeLinejoin="miter"
          />
          <path
            d={APEX_MARK_COORDS.altB.aApexPath}
            stroke={palette.primaryStroke}
            strokeOpacity={palette.accentOpacity}
            strokeWidth={2.2}
            strokeLinecap="square"
            strokeLinejoin="miter"
          />
          <line
            x1={APEX_MARK_COORDS.altB.crossbar.x1}
            y1={APEX_MARK_COORDS.altB.crossbar.y1}
            x2={APEX_MARK_COORDS.altB.crossbar.x2}
            y2={APEX_MARK_COORDS.altB.crossbar.y2}
            stroke={palette.primaryStroke}
            strokeOpacity={palette.accentOpacity}
            strokeWidth={1.6}
            strokeLinecap="square"
          />
        </>
      )}

      {variant === 'primary' && (
        <>
          <path
            d={APEX_MARK_COORDS.primaryChevrons.bottom}
            stroke={palette.secondaryStroke}
            strokeOpacity={palette.secondaryOpacity}
            strokeWidth={2.2}
            strokeLinecap="square"
            strokeLinejoin="miter"
          />
          <path
            d={APEX_MARK_COORDS.primaryChevrons.middle}
            stroke={palette.secondaryStroke}
            strokeOpacity={palette.secondaryOpacity}
            strokeWidth={2.2}
            strokeLinecap="square"
            strokeLinejoin="miter"
          />
          <path
            d={APEX_MARK_COORDS.primaryChevrons.top}
            stroke={palette.primaryStroke}
            strokeOpacity={palette.accentOpacity}
            strokeWidth={2.2}
            strokeLinecap="square"
            strokeLinejoin="miter"
          />
        </>
      )}
    </svg>
  );
}
