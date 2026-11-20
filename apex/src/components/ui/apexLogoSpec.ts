export type ApexLogoVariant = 'primary' | 'alt-a' | 'alt-b';
export type ApexLogoTone = 'cyan' | 'monochrome';
export type ApexLogoSurface = 'dark' | 'light';

/**
 * Single switch to compare the three logo designs across Header, Favicon, and OG Card:
 *  - 'primary': Three stacked apex chevrons (airflow louvers + peak) in square technical frame
 *  - 'alt-a':   Hexagonal engineering badge with stylised 3-blade rotor inside
 *  - 'alt-b':   Tight geometric AM monogram where the A doubles as the apex chevron
 */
export const ACTIVE_LOGO_VARIANT: ApexLogoVariant = 'primary';

export interface LogoPalette {
  frame: string;
  frameOpacity: number;
  ticks: string;
  ticksOpacity: number;
  primaryStroke: string;
  secondaryStroke: string;
  accentOpacity: number;
  secondaryOpacity: number;
}

export function getLogoPalette(
  tone: ApexLogoTone = 'cyan',
  surface: ApexLogoSurface = 'dark',
): LogoPalette {
  if (tone === 'monochrome') {
    return {
      frame: 'currentColor',
      frameOpacity: 0.38,
      ticks: 'currentColor',
      ticksOpacity: 0.9,
      primaryStroke: 'currentColor',
      secondaryStroke: 'currentColor',
      accentOpacity: 1,
      secondaryOpacity: 0.78,
    };
  }

  if (surface === 'light') {
    return {
      frame: 'currentColor',
      frameOpacity: 0.28,
      ticks: '#0E7490',
      ticksOpacity: 0.9,
      primaryStroke: '#06B6D4',
      secondaryStroke: '#0E7490',
      accentOpacity: 1,
      secondaryOpacity: 1,
    };
  }

  // Default: dark navy (#0B1F3A) surface
  return {
    frame: 'currentColor',
    frameOpacity: 0.34,
    ticks: '#22D3EE',
    ticksOpacity: 0.85,
    primaryStroke: '#67E8F9',
    secondaryStroke: '#22D3EE',
    accentOpacity: 1,
    secondaryOpacity: 0.92,
  };
}

export const APEX_MARK_COORDS = {
  squareFrame: { x: 2, y: 2, width: 28, height: 28, rx: 1 },
  squareTicksPath:
    'M 2 6.5 V 2 H 6.5 M 25.5 2 H 30 V 6.5 M 2 25.5 V 30 H 6.5 M 25.5 30 H 30 V 25.5',
  primaryChevrons: {
    bottom: 'M 7.5 23.6 L 16 18.5 L 24.5 23.6',
    middle: 'M 9.8 17.3 L 16 13.6 L 22.2 17.3',
    top: 'M 12.1 11 L 16 8.7 L 19.9 11',
  },
  altA: {
    hexPoints: '16,2.5 27.7,9.25 27.7,22.75 16,29.5 4.3,22.75 4.3,9.25',
    bladePath: 'M 16 13.8 C 16.4 9.8 19.6 8.5 21.6 9.9',
  },
  altB: {
    mPath: 'M 8 24 V 13.5 L 16 19 L 24 13.5 V 24',
    aApexPath: 'M 10.5 16.5 L 16 7.5 L 21.5 16.5',
    crossbar: { x1: 13, y1: 14.5, x2: 19, y2: 14.5 },
  },
} as const;

/**
 * Returns self-contained SVG inner markup for a 32x32 viewBox so React JSX,
 * favicon generation, and the Open Graph SVG card share identical coordinates.
 */
export function buildApexMarkInnerMarkup(
  variant: ApexLogoVariant,
  palette: LogoPalette,
): string {
  if (variant === 'alt-a') {
    return `
      <polygon
        points="${APEX_MARK_COORDS.altA.hexPoints}"
        fill="none"
        stroke="${palette.ticks}"
        stroke-opacity="${palette.ticksOpacity}"
        stroke-width="1.35"
        stroke-linejoin="miter"
      />
      <circle
        cx="16"
        cy="16"
        r="9.2"
        fill="none"
        stroke="${palette.frame}"
        stroke-opacity="${palette.frameOpacity}"
        stroke-width="1"
      />
      <circle
        cx="16"
        cy="16"
        r="2.1"
        fill="none"
        stroke="${palette.primaryStroke}"
        stroke-opacity="${palette.accentOpacity}"
        stroke-width="1.9"
      />
      <g
        fill="none"
        stroke="${palette.secondaryStroke}"
        stroke-opacity="${palette.secondaryOpacity}"
        stroke-width="2.1"
        stroke-linecap="round"
      >
        <path d="${APEX_MARK_COORDS.altA.bladePath}" />
        <path d="${APEX_MARK_COORDS.altA.bladePath}" transform="rotate(120 16 16)" />
        <path d="${APEX_MARK_COORDS.altA.bladePath}" transform="rotate(240 16 16)" />
      </g>
    `.trim();
  }

  const sf = APEX_MARK_COORDS.squareFrame;
  const squareFrame = `
    <rect
      x="${sf.x}"
      y="${sf.y}"
      width="${sf.width}"
      height="${sf.height}"
      rx="${sf.rx}"
      fill="none"
      stroke="${palette.frame}"
      stroke-opacity="${palette.frameOpacity}"
      stroke-width="1"
    />
    <path
      d="${APEX_MARK_COORDS.squareTicksPath}"
      fill="none"
      stroke="${palette.ticks}"
      stroke-opacity="${palette.ticksOpacity}"
      stroke-width="1.4"
      stroke-linecap="square"
      stroke-linejoin="miter"
    />
  `.trim();

  if (variant === 'alt-b') {
    const cb = APEX_MARK_COORDS.altB.crossbar;
    return `
      ${squareFrame}
      <path
        d="${APEX_MARK_COORDS.altB.mPath}"
        fill="none"
        stroke="${palette.secondaryStroke}"
        stroke-opacity="${palette.secondaryOpacity}"
        stroke-width="2.2"
        stroke-linecap="square"
        stroke-linejoin="miter"
      />
      <path
        d="${APEX_MARK_COORDS.altB.aApexPath}"
        fill="none"
        stroke="${palette.primaryStroke}"
        stroke-opacity="${palette.accentOpacity}"
        stroke-width="2.2"
        stroke-linecap="square"
        stroke-linejoin="miter"
      />
      <line
        x1="${cb.x1}"
        y1="${cb.y1}"
        x2="${cb.x2}"
        y2="${cb.y2}"
        stroke="${palette.primaryStroke}"
        stroke-opacity="${palette.accentOpacity}"
        stroke-width="1.6"
        stroke-linecap="square"
      />
    `.trim();
  }

  return `
    ${squareFrame}
    <path
      d="${APEX_MARK_COORDS.primaryChevrons.bottom}"
      fill="none"
      stroke="${palette.secondaryStroke}"
      stroke-opacity="${palette.secondaryOpacity}"
      stroke-width="2.2"
      stroke-linecap="square"
      stroke-linejoin="miter"
    />
    <path
      d="${APEX_MARK_COORDS.primaryChevrons.middle}"
      fill="none"
      stroke="${palette.secondaryStroke}"
      stroke-opacity="${palette.secondaryOpacity}"
      stroke-width="2.2"
      stroke-linecap="square"
      stroke-linejoin="miter"
    />
    <path
      d="${APEX_MARK_COORDS.primaryChevrons.top}"
      fill="none"
      stroke="${palette.primaryStroke}"
      stroke-opacity="${palette.accentOpacity}"
      stroke-width="2.2"
      stroke-linecap="square"
      stroke-linejoin="miter"
    />
  `.trim();
}

/**
 * Generates a standalone 32x32 favicon SVG on a crisp navy blueprint backing
 * so it stays legible in both light and dark browser tab chrome.
 */
export function buildFaviconSvg(variant: ApexLogoVariant = ACTIVE_LOGO_VARIANT): string {
  const palette: LogoPalette = {
    frame: '#94A3B8',
    frameOpacity: 0.36,
    ticks: '#22D3EE',
    ticksOpacity: 0.9,
    primaryStroke: '#67E8F9',
    secondaryStroke: '#22D3EE',
    accentOpacity: 1,
    secondaryOpacity: 0.94,
  };

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" role="img" aria-label="Apex Mechanical &amp; Cooling logo">
  <title>Apex Mechanical &amp; Cooling logo</title>
  <rect width="32" height="32" rx="2" fill="#0B1F3A"/>
  ${buildApexMarkInnerMarkup(variant, palette)}
</svg>`;
}

/**
 * Generates a 1200x630 Open Graph / Twitter social share SVG card
 * driven by the exact same geometric mark specification.
 */
export function buildOpenGraphSvg(variant: ApexLogoVariant = ACTIVE_LOGO_VARIANT): string {
  const palette: LogoPalette = {
    frame: '#CBD5E1',
    frameOpacity: 0.38,
    ticks: '#22D3EE',
    ticksOpacity: 0.92,
    primaryStroke: '#67E8F9',
    secondaryStroke: '#22D3EE',
    accentOpacity: 1,
    secondaryOpacity: 0.94,
  };

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630" role="img" aria-label="Apex Mechanical &amp; Cooling — Pampanga Aircon &amp; HVAC">
  <title>Apex Mechanical &amp; Cooling</title>
  <defs>
    <pattern id="bp-minor" width="24" height="24" patternUnits="userSpaceOnUse">
      <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#67E8F9" stroke-opacity="0.06" stroke-width="1"/>
    </pattern>
    <pattern id="bp-major" width="120" height="120" patternUnits="userSpaceOnUse">
      <rect width="120" height="120" fill="url(#bp-minor)"/>
      <path d="M 120 0 L 0 0 0 120" fill="none" stroke="#67E8F9" stroke-opacity="0.12" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="1200" height="630" fill="#0B1F3A"/>
  <rect width="1200" height="630" fill="url(#bp-major)"/>
  <rect x="36" y="36" width="1128" height="558" fill="none" stroke="#22D3EE" stroke-opacity="0.28" stroke-width="1"/>
  <path d="M 36 68 V 36 H 68 M 1132 36 H 1164 V 68 M 36 562 V 594 H 68 M 1132 594 H 1164 V 562" fill="none" stroke="#22D3EE" stroke-width="2"/>
  <g transform="translate(108, 175) scale(8.75)">
    ${buildApexMarkInnerMarkup(variant, palette)}
  </g>
  <text x="438" y="220" fill="#67E8F9" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" font-size="20" letter-spacing="4">SAN MATIAS · PAMPANGA · REGION III</text>
  <text x="438" y="294" fill="#FFFFFF" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="52" font-weight="700" letter-spacing="-1">Apex Mechanical &amp; Cooling</text>
  <line x1="438" y1="330" x2="880" y2="330" stroke="#22D3EE" stroke-opacity="0.55" stroke-width="1.5"/>
  <line x1="880" y1="322" x2="880" y2="338" stroke="#22D3EE" stroke-opacity="0.75" stroke-width="1.5"/>
  <text x="438" y="388" fill="#CBD5E1" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="28">Aircon Repair, Deep Cleaning &amp; Inverter Installation</text>
  <text x="438" y="440" fill="#94A3B8" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" font-size="20" letter-spacing="2">RESIDENTIAL SPLIT-TYPE · COMMERCIAL VRF &amp; DUCTED HVAC</text>
</svg>`;
}
