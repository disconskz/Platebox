import { ProductType } from "@/lib/calc/types";

interface Props {
  type: ProductType;
  x: number;
  y: number;
  w: number;
  h: number;
  index: number;
}

/**
 * Renders a stylised mini-illustration of the product inside the layout cell.
 * All graphics live in a local 0..100 / 0..100 viewBox and are scaled into
 * the actual cell via a nested <svg>. Colors use semantic tokens so they
 * adapt to light/dark themes.
 */
export const ProductGlyph = ({ type, x, y, w, h, index }: Props) => {
  const minSide = Math.min(w, h);
  const tooSmall = minSide < 14; // mm — fall back to a plain numbered cell
  const landscape = w > h;

  const stroke = "hsl(var(--primary))";
  const soft = "hsl(var(--primary) / 0.08)";
  const ink = "hsl(var(--primary) / 0.35)";
  const muted = "hsl(var(--muted-foreground) / 0.45)";

  // Number badge — small, top-left, never covers the artwork
  const numFontMm = Math.max(2.5, Math.min(minSide * 0.18, 6));

  return (
    <g>
      {/* Cell background + border */}
      <rect x={x} y={y} width={w} height={h} fill={soft} stroke={stroke} strokeWidth={0.4} />

      {!tooSmall && (
        <svg x={x} y={y} width={w} height={h} viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
          <Glyph type={type} landscape={landscape} stroke={stroke} ink={ink} muted={muted} />
        </svg>
      )}

      <text
        x={x + numFontMm * 0.6}
        y={y + numFontMm * 1.1}
        fontSize={numFontMm}
        fill="hsl(var(--primary))"
        fontWeight={700}
        opacity={0.7}
      >
        {index}
      </text>
    </g>
  );
};

interface GlyphProps {
  type: ProductType;
  landscape: boolean;
  stroke: string;
  ink: string;
  muted: string;
}

const Glyph = ({ type, landscape, stroke, ink, muted }: GlyphProps) => {
  const sw = 1.2;
  const common = { stroke, strokeWidth: sw, fill: "none" } as const;

  switch (type) {
    case "leaflet":
    case "leaflet_diecut":
    case "blank":
    case "selfcopy":
      return (
        <g>
          <line x1={20} y1={35} x2={80} y2={35} stroke={ink} strokeWidth={sw} />
          <line x1={20} y1={50} x2={80} y2={50} stroke={ink} strokeWidth={sw} />
          <line x1={20} y1={65} x2={65} y2={65} stroke={ink} strokeWidth={sw} />
        </g>
      );
    case "booklet":
    case "brochure":
      return (
        <g>
          <line x1={50} y1={10} x2={50} y2={90} stroke={muted} strokeWidth={sw} strokeDasharray="2 2" />
          <line x1={20} y1={35} x2={45} y2={35} stroke={ink} strokeWidth={sw} />
          <line x1={55} y1={35} x2={80} y2={35} stroke={ink} strokeWidth={sw} />
          <line x1={20} y1={55} x2={45} y2={55} stroke={ink} strokeWidth={sw} />
          <line x1={55} y1={55} x2={80} y2={55} stroke={ink} strokeWidth={sw} />
        </g>
      );
    case "businesscard":
      return (
        <g>
          <rect x={18} y={30} width={64} height={40} rx={3} {...common} />
          <line x1={26} y1={48} x2={62} y2={48} stroke={ink} strokeWidth={sw} />
          <line x1={26} y1={58} x2={50} y2={58} stroke={ink} strokeWidth={sw} />
        </g>
      );
    case "sticker":
    case "sticker_diecut":
    case "label":
      return (
        <g>
          <rect x={15} y={15} width={70} height={70} rx={12} stroke={muted} strokeWidth={sw} strokeDasharray="3 2" fill="none" />
          <circle cx={50} cy={50} r={14} {...common} />
        </g>
      );
    case "bag":
      return (
        <g>
          <path d={`M 25 35 L 75 35 L 78 88 L 22 88 Z`} {...common} />
          <path d={`M 35 35 C 35 18, 50 18, 50 35`} {...common} />
          <path d={`M 50 35 C 50 18, 65 18, 65 35`} {...common} />
        </g>
      );
    case "envelope":
      return (
        <g>
          <rect x={18} y={30} width={64} height={42} {...common} />
          <path d={`M 18 30 L 50 55 L 82 30`} {...common} />
        </g>
      );
    case "box":
      return (
        <g>
          <rect x={35} y={15} width={30} height={20} {...common} />
          <rect x={35} y={35} width={30} height={30} {...common} />
          <rect x={35} y={65} width={30} height={20} {...common} />
          <rect x={15} y={35} width={20} height={30} {...common} />
          <rect x={65} y={35} width={20} height={30} {...common} />
        </g>
      );
    case "folder":
      return (
        <g>
          <path d={`M 15 30 L 40 30 L 45 22 L 85 22 L 85 85 L 15 85 Z`} {...common} />
        </g>
      );
    case "poster":
      return (
        <g>
          <rect x={20} y={20} width={60} height={18} fill={ink} stroke="none" />
          <line x1={20} y1={50} x2={80} y2={50} stroke={ink} strokeWidth={sw} />
          <line x1={20} y1={60} x2={80} y2={60} stroke={ink} strokeWidth={sw} />
          <line x1={20} y1={70} x2={70} y2={70} stroke={ink} strokeWidth={sw} />
        </g>
      );
    case "notepad":
      return (
        <g>
          {[20, 32, 44, 56, 68, 80].map((cx) => (
            <circle key={cx} cx={cx} cy={18} r={2.5} {...common} />
          ))}
          <rect x={15} y={24} width={70} height={66} {...common} />
          <line x1={22} y1={42} x2={78} y2={42} stroke={ink} strokeWidth={sw} />
          <line x1={22} y1={54} x2={78} y2={54} stroke={ink} strokeWidth={sw} />
          <line x1={22} y1={66} x2={70} y2={66} stroke={ink} strokeWidth={sw} />
          <line x1={22} y1={78} x2={60} y2={78} stroke={ink} strokeWidth={sw} />
        </g>
      );
    case "book":
      return (
        <g>
          <rect x={15} y={20} width={35} height={60} {...common} />
          <rect x={50} y={20} width={35} height={60} {...common} />
          <line x1={50} y1={20} x2={50} y2={80} stroke={muted} strokeWidth={sw} />
          <line x1={22} y1={40} x2={43} y2={40} stroke={ink} strokeWidth={sw} />
          <line x1={22} y1={50} x2={43} y2={50} stroke={ink} strokeWidth={sw} />
          <line x1={57} y1={40} x2={78} y2={40} stroke={ink} strokeWidth={sw} />
          <line x1={57} y1={50} x2={78} y2={50} stroke={ink} strokeWidth={sw} />
        </g>
      );
    case "magazine":
      return (
        <g>
          <rect x={18} y={18} width={64} height={36} fill={ink} stroke="none" />
          <line x1={18} y1={62} x2={82} y2={62} stroke={ink} strokeWidth={sw} />
          <line x1={18} y1={72} x2={82} y2={72} stroke={ink} strokeWidth={sw} />
          <line x1={18} y1={82} x2={60} y2={82} stroke={ink} strokeWidth={sw} />
        </g>
      );
    case "calendar_wall":
      return (
        <g>
          <rect x={15} y={15} width={70} height={14} fill={ink} stroke="none" />
          <rect x={15} y={32} width={70} height={55} {...common} />
          {[0, 1, 2, 3].map((r) =>
            [0, 1, 2, 3, 4, 5, 6].map((c) => (
              <circle key={`${r}-${c}`} cx={20 + c * 10} cy={40 + r * 12} r={1.6} fill={ink} />
            ))
          )}
        </g>
      );
    case "calendar_desk":
      return (
        <g>
          <rect x={12} y={20} width={76} height={45} {...common} />
          {[0, 1, 2].map((r) =>
            [0, 1, 2, 3, 4, 5, 6].map((c) => (
              <circle key={`${r}-${c}`} cx={18 + c * 11} cy={30 + r * 12} r={1.6} fill={ink} />
            ))
          )}
          <path d={`M 30 65 L 50 85 L 70 65 Z`} {...common} />
        </g>
      );
    case "calendar_quarter":
      return (
        <g>
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <rect x={20} y={12 + i * 28} width={60} height={22} {...common} />
              <line x1={20} y1={20 + i * 28} x2={80} y2={20 + i * 28} stroke={ink} strokeWidth={sw} />
            </g>
          ))}
        </g>
      );
    case "wobbler":
      return (
        <g>
          <circle cx={50} cy={35} r={22} {...common} />
          <line x1={50} y1={57} x2={50} y2={88} stroke={muted} strokeWidth={sw} strokeDasharray="2 2" />
        </g>
      );
    case "shelftalker":
      return (
        <g>
          {landscape ? (
            <>
              <rect x={10} y={35} width={70} height={30} {...common} />
              <path d={`M 80 35 L 92 50 L 80 65 Z`} {...common} />
            </>
          ) : (
            <>
              <rect x={35} y={10} width={30} height={70} {...common} />
              <path d={`M 35 80 L 50 92 L 65 80 Z`} {...common} />
            </>
          )}
        </g>
      );
    case "kubus":
      return (
        <g>
          <path d={`M 25 35 L 50 22 L 75 35 L 75 70 L 50 83 L 25 70 Z`} {...common} />
          <path d={`M 25 35 L 50 48 L 75 35`} {...common} />
          <path d={`M 50 48 L 50 83`} {...common} />
        </g>
      );
    case "envelope" as never:
    default:
      return (
        <g>
          <rect x={20} y={25} width={60} height={50} {...common} />
        </g>
      );
  }
};