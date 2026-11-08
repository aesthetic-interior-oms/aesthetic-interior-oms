'use client'

import {
  Circle,
  Document,
  Font,
  G,
  Image,
  Line,
  Page,
  Path,
  Polygon,
  Rect,
  StyleSheet,
  Svg,
  Text,
  View,
} from '@react-pdf/renderer'

const getBaseUrl = () => {
  if (typeof window !== 'undefined') return window.location.origin
  if (typeof process !== 'undefined' && process.cwd) {
    return `${process.cwd()}/public`
  }
  return 'https://www.aestheticinteriortech.com'
}

Font.register({
  family: 'Noto Sans Bengali',
  fonts: [
    { src: `${getBaseUrl()}/fonts/NotoSansBengali-Regular.ttf` },
    { src: `${getBaseUrl()}/fonts/NotoSansBengali-Bold.ttf`, fontWeight: 'bold' },
  ],
})

Font.registerHyphenationCallback((word) => [word])

// ─── Theme Colors & Constants ────────────────────────────────────────────────
const PRIMARY = '#1f363d'
const PRIMARY_DARK = '#142429'
const CHARCOAL = '#1a1f23'
const CHARCOAL_MUTED = '#2f373d'
const GOLD = '#a57c00'
const GOLD_MUTED = '#bda056'
const BEIGE_LIGHT = '#faf8f5'
const BEIGE_CARD = '#f4f0e8'
const GREY_WARM = '#8c867a'
const GREY_BORDER = '#d6d0c4'
const TEXT_MUTED = '#5b564e'

export type MepCoverDocumentProps = {
  clientName: string
  clientPhone?: string | null
  clientEmail?: string | null
  clientAddress?: string | null
  projectName?: string | null
  projectAddress?: string | null
  workOrderId?: string | null
  subContractId?: string | null
  reference?: string | null
  agreementDate?: string | null
  quotationCode?: string | null
  srCrmName?: string | null
  companyRepresentative?: string | null
  companyRepresentativeTitle?: string | null
}

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Noto Sans Bengali',
    fontSize: 9,
    color: CHARCOAL,
    backgroundColor: BEIGE_LIGHT,
    position: 'relative',
    height: '100%',
    padding: 0,
    margin: 0,
  },
  bold: {
    fontWeight: 'bold',
  },
})

function formatDateString(value?: string | null) {
  if (!value) return new Date().toLocaleDateString('en-GB')
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

export function MepCoverDocument({
  clientName,
  clientPhone,
  clientEmail,
  clientAddress,
  projectName,
  projectAddress,
  workOrderId,
  subContractId,
  reference,
  agreementDate,
  quotationCode,
  srCrmName,
  companyRepresentative,
  companyRepresentativeTitle,
}: MepCoverDocumentProps) {
  const logoSrc = `${getBaseUrl()}/Logo/HeaderLogo.png`
  const formattedDate = formatDateString(agreementDate)
  const effectiveAddress = projectAddress || clientAddress || 'Dhaka, Bangladesh'
  const effectiveRef = workOrderId || quotationCode || reference || 'AIT-MEP-2026'

  return (
    <Document title={`MEP Drawing Cover - ${clientName}`} author="Aesthetic Interior">
      <Page size="A3" orientation="landscape" style={styles.page} wrap={false}>
        {/* ─── FULL-BLEED ARCHITECTURAL SVG BACKGROUND LAYER ─────────── */}
        <Svg
          width="100%"
          height="100%"
          viewBox="0 0 1191 842"
          style={{ position: 'absolute', top: 0, left: 0 }}
        >
          {/* Base Paper Surface */}
          <Rect x={0} y={0} width={1191} height={842} fill="#FAF7F2" />

          {/* Architectural Outer Coordinate Border */}
          <Rect x={18} y={18} width={1155} height={806} stroke={CHARCOAL} strokeWidth={1.2} fill="none" />
          <Rect x={22} y={22} width={1147} height={798} stroke={GREY_BORDER} strokeWidth={0.6} fill="none" />

          {/* Inner Safety Boundary Line */}
          <Rect x={30} y={30} width={1131} height={782} stroke="#E5DFC5" strokeWidth={0.5} strokeDasharray="3 3" fill="none" />

          {/* Coordinate Tick Marks & Labels - Horizontal */}
          {[120, 240, 360, 480, 600, 720, 840, 960, 1080].map((x, idx) => (
            <G key={`x-tick-${x}`}>
              <Line x1={x} y1={18} x2={x} y2={25} stroke={CHARCOAL} strokeWidth={0.8} />
              <Line x1={x} y1={817} x2={x} y2={824} stroke={CHARCOAL} strokeWidth={0.8} />
            </G>
          ))}

          {/* Coordinate Tick Marks & Labels - Vertical */}
          {[120, 240, 360, 480, 600, 720].map((y, idx) => (
            <G key={`y-tick-${y}`}>
              <Line x1={18} y1={y} x2={25} y2={y} stroke={CHARCOAL} strokeWidth={0.8} />
              <Line x1={1166} y1={y} x2={1173} y2={y} stroke={CHARCOAL} strokeWidth={0.8} />
            </G>
          ))}

          {/* ─── BACKGROUND LINEWORK: WALLS & ROOM DIVISIONS ───────────── */}
          <G opacity={0.18}>
            {/* Extended Architectural Construction Grid Lines */}
            <Line x1={30} y1={148} x2={1161} y2={148} stroke={GREY_WARM} strokeWidth={0.5} strokeDasharray="6 6" />
            <Line x1={30} y1={515} x2={1161} y2={515} stroke={GREY_WARM} strokeWidth={0.5} strokeDasharray="6 6" />
            <Line x1={650} y1={30} x2={650} y2={812} stroke={GREY_WARM} strokeWidth={0.5} strokeDasharray="4 4" />

            {/* Phantom Wall Projections in Background */}
            <Line x1={700} y1={85} x2={1120} y2={85} stroke={CHARCOAL} strokeWidth={1} />
            <Line x1={700} y1={89} x2={1120} y2={89} stroke={CHARCOAL} strokeWidth={1} />
            <Line x1={1120} y1={85} x2={1120} y2={220} stroke={CHARCOAL} strokeWidth={1} />
            <Line x1={1124} y1={85} x2={1124} y2={220} stroke={CHARCOAL} strokeWidth={1} />

            {/* Diagonal Construction Drafting Lines */}
            <Line x1={650} y1={150} x2={780} y2={20} stroke={GOLD} strokeWidth={0.6} strokeDasharray="2 4" />
            <Line x1={1020} y1={780} x2={1160} y2={640} stroke={GOLD} strokeWidth={0.6} strokeDasharray="2 4" />
          </G>

          {/* ─── LARGE OVERLAPPING CIRCLES AND SEMI-CIRCLES ───────────── */}
          {/* Focal Center for the Circles: (890, 410) */}
          <G>
            {/* Outermost Faint Drafting Arc */}
            <Circle cx={890} cy={410} r={360} stroke={GREY_BORDER} strokeWidth={0.8} opacity={0.35} fill="none" strokeDasharray="8 6" />

            {/* Upper Overlapping Semi-Circle (Muted Beige & Gold Accents) */}
            <Circle cx={790} cy={270} r={280} stroke={GOLD} strokeWidth={1.2} opacity={0.22} fill="#F4EFE6" />

            {/* Lower Overlapping Semi-Circle (Muted Charcoal & Warm Grey) */}
            <Circle cx={990} cy={530} r={240} stroke={CHARCOAL_MUTED} strokeWidth={0.9} opacity={0.16} fill="#ECE6DB" />

            {/* Secondary Accent Interlocking Arc */}
            <Circle cx={810} cy={510} r={180} stroke={PRIMARY} strokeWidth={1.4} opacity={0.12} fill="none" />

            {/* Concentric Architectural Compass Ring */}
            <Circle cx={890} cy={410} r={265} stroke={GREY_WARM} strokeWidth={0.8} opacity={0.45} fill="none" />
            <Circle cx={890} cy={410} r={258} stroke={GOLD} strokeWidth={1.5} opacity={0.35} strokeDasharray="4 4" fill="none" />

            {/* Primary Hero Circle - Housing the Floor Plan */}
            <Circle cx={890} cy={410} r={245} fill="#FFFFFF" stroke={CHARCOAL} strokeWidth={1.4} />

            {/* Inner Decorative Framing Ring */}
            <Circle cx={890} cy={410} r={238} stroke={GREY_BORDER} strokeWidth={0.8} strokeDasharray="2 3" fill="none" />

            {/* Radial Ticks along the Circle (Compass/Degrees) */}
            {[0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330].map((deg) => {
              const rad = (deg * Math.PI) / 180
              const x1 = 890 + Math.cos(rad) * 238
              const y1 = 410 + Math.sin(rad) * 238
              const x2 = 890 + Math.cos(rad) * 245
              const y2 = 410 + Math.sin(rad) * 245
              return <Line key={`rad-${deg}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={GREY_WARM} strokeWidth={1} />
            })}
          </G>

          {/* ─── 2D APARTMENT FLOOR PLAN (INSIDE HERO CIRCLE) ─────────── */}
          {/* Centered around (890, 410) with width ~330, height ~270 */}
          <G>
            {/* Subtle Tile Grid in Living / Dining Area */}
            <G opacity={0.15}>
              {[745, 765, 785, 805, 825, 845].map((x) => (
                <Line key={`grid-x-${x}`} x1={x} y1={300} x2={x} y2={450} stroke={GREY_WARM} strokeWidth={0.4} />
              ))}
              {[320, 340, 360, 380, 400, 420, 440].map((y) => (
                <Line key={`grid-y-${y}`} x1={735} y1={y} x2={855} y2={y} stroke={GREY_WARM} strokeWidth={0.4} />
              ))}
            </G>

            {/* Room Shading Fills */}
            {/* Master Bed */}
            <Rect x={870} y={290} width={135} height={120} fill="#FAF8F5" />
            {/* Bedroom 02 */}
            <Rect x={870} y={420} width={135} height={115} fill="#FAF8F5" />
            {/* Kitchen */}
            <Rect x={735} y={455} width={85} height={80} fill="#F4F0E8" />
            {/* Toilet 01 (En-suite) */}
            <Rect x={940} y={290} width={65} height={55} fill="#EDF3F5" />
            {/* Toilet 02 (Common) */}
            <Rect x={825} y={470} width={45} height={65} fill="#EDF3F5" />

            {/* EXTERIOR WALLS (Thick Architectural Charcoal Stroke) */}
            {/* Perimeter Walls: Outer line */}
            <Path
              d="M 735 290 L 1005 290 L 1005 535 L 735 535 Z"
              stroke={CHARCOAL}
              strokeWidth={3}
              fill="none"
            />
            {/* Cavity / Wall Thickness Line */}
            <Path
              d="M 740 295 L 1000 295 L 1000 530 L 740 530 Z"
              stroke={CHARCOAL}
              strokeWidth={0.8}
              fill="none"
            />

            {/* INTERIOR PARTITION WALLS */}
            {/* Vertical dividing main wall between Living/Dining and Bedrooms */}
            <Line x1={865} y1={290} x2={865} y2={535} stroke={CHARCOAL} strokeWidth={2.4} />
            <Line x1={869} y1={290} x2={869} y2={535} stroke={CHARCOAL} strokeWidth={0.6} />

            {/* Horizontal dividing wall between Master Bed and Bedroom 02 */}
            <Line x1={865} y1={415} x2={1005} y2={415} stroke={CHARCOAL} strokeWidth={2.4} />

            {/* Kitchen Partition */}
            <Line x1={735} y1={450} x2={825} y2={450} stroke={CHARCOAL} strokeWidth={2} />
            <Line x1={825} y1={450} x2={825} y2={535} stroke={CHARCOAL} strokeWidth={2} />

            {/* Toilet En-suite Partition */}
            <Line x1={938} y1={290} x2={938} y2={345} stroke={CHARCOAL} strokeWidth={1.8} />
            <Line x1={938} y1={345} x2={1005} y2={345} stroke={CHARCOAL} strokeWidth={1.8} />

            {/* WINDOW OPENINGS (Double cyan/grey lines breaking the exterior wall) */}
            {/* Master Bed Window */}
            <Line x1={1005} y1={355} x2={1005} y2={400} stroke="#FFFFFF" strokeWidth={4} />
            <Line x1={1005} y1={355} x2={1005} y2={400} stroke={PRIMARY} strokeWidth={1.5} />
            <Line x1={1003} y1={355} x2={1003} y2={400} stroke={GREY_WARM} strokeWidth={0.7} />

            {/* Bedroom 02 Window */}
            <Line x1={1005} y1={440} x2={1005} y2={490} stroke="#FFFFFF" strokeWidth={4} />
            <Line x1={1005} y1={440} x2={1005} y2={490} stroke={PRIMARY} strokeWidth={1.5} />
            <Line x1={1003} y1={440} x2={1003} y2={490} stroke={GREY_WARM} strokeWidth={0.7} />

            {/* Living Room Large French Window / Balcony Glazing */}
            <Line x1={735} y1={320} x2={735} y2={390} stroke="#FFFFFF" strokeWidth={4} />
            <Line x1={735} y1={320} x2={735} y2={390} stroke={PRIMARY} strokeWidth={1.8} />
            <Line x1={737} y1={320} x2={737} y2={390} stroke={GREY_WARM} strokeWidth={0.8} />

            {/* Kitchen Window */}
            <Line x1={735} y1={480} x2={735} y2={515} stroke="#FFFFFF" strokeWidth={4} />
            <Line x1={735} y1={480} x2={735} y2={515} stroke={PRIMARY} strokeWidth={1.2} />

            {/* DOOR SWINGS (Quarter Arc + Door Panel Line) */}
            {/* Main Entrance Door */}
            <Line x1={780} y1={290} x2={808} y2={290} stroke="#FFFFFF" strokeWidth={4} />
            <Line x1={780} y1={290} x2={800} y2={270} stroke={CHARCOAL} strokeWidth={1.2} />
            <Path d="M 808 290 A 28 28 0 0 0 780 262" stroke={GOLD} strokeWidth={0.8} strokeDasharray="2 2" fill="none" />

            {/* Master Bed Door */}
            <Line x1={865} y1={345} x2={865} y2={370} stroke="#FFFFFF" strokeWidth={4} />
            <Line x1={865} y1={345} x2={885} y2={330} stroke={CHARCOAL} strokeWidth={1} />
            <Path d="M 865 370 A 25 25 0 0 0 885 345" stroke={GREY_WARM} strokeWidth={0.7} strokeDasharray="2 2" fill="none" />

            {/* Bedroom 02 Door */}
            <Line x1={865} y1={430} x2={865} y2={455} stroke="#FFFFFF" strokeWidth={4} />
            <Line x1={865} y1={430} x2={885} y2={445} stroke={CHARCOAL} strokeWidth={1} />
            <Path d="M 865 455 A 25 25 0 0 0 885 430" stroke={GREY_WARM} strokeWidth={0.7} strokeDasharray="2 2" fill="none" />

            {/* FURNITURE & INTERIOR LINEWORK */}
            {/* Master Bed (Double Bed + Pillows + Nightstands) */}
            <Rect x={895} y={320} width={50} height={60} stroke={CHARCOAL_MUTED} strokeWidth={0.8} fill="#FFFFFF" />
            <Rect x={900} y={325} width={18} height={12} stroke={GREY_WARM} strokeWidth={0.6} fill="#F4F0E8" />
            <Rect x={922} y={325} width={18} height={12} stroke={GREY_WARM} strokeWidth={0.6} fill="#F4F0E8" />
            {/* Nightstands */}
            <Rect x={882} y={322} width={10} height={12} stroke={GREY_WARM} strokeWidth={0.6} fill="#F4F0E8" />
            <Rect x={948} y={322} width={10} height={12} stroke={GREY_WARM} strokeWidth={0.6} fill="#F4F0E8" />

            {/* Bed 02 (Queen Bed) */}
            <Rect x={910} y={450} width={50} height={55} stroke={CHARCOAL_MUTED} strokeWidth={0.8} fill="#FFFFFF" />
            <Rect x={915} y={455} width={18} height={10} stroke={GREY_WARM} strokeWidth={0.6} fill="#F4F0E8" />
            <Rect x={937} y={455} width={18} height={10} stroke={GREY_WARM} strokeWidth={0.6} fill="#F4F0E8" />

            {/* Living Room L-Sofa */}
            <Path
              d="M 750 340 L 785 340 L 785 355 L 765 355 L 765 385 L 750 385 Z"
              stroke={CHARCOAL_MUTED}
              strokeWidth={0.9}
              fill="#F4F0E8"
            />
            {/* Coffee Table */}
            <Rect x={768} y={362} width={16} height={14} stroke={GREY_WARM} strokeWidth={0.6} fill="#FFFFFF" />
            {/* TV Console against wall */}
            <Rect x={845} y={335} width={8} height={45} stroke={PRIMARY} strokeWidth={0.8} fill="#E5DFC5" />

            {/* Dining Table with 4 Chairs */}
            <Rect x={775} y={405} width={40} height={24} rx={2} stroke={CHARCOAL_MUTED} strokeWidth={0.8} fill="#FFFFFF" />
            <Rect x={783} y={398} width={10} height={4} stroke={GREY_WARM} strokeWidth={0.6} fill="#F4F0E8" />
            <Rect x={798} y={398} width={10} height={4} stroke={GREY_WARM} strokeWidth={0.6} fill="#F4F0E8" />
            <Rect x={783} y={432} width={10} height={4} stroke={GREY_WARM} strokeWidth={0.6} fill="#F4F0E8" />
            <Rect x={798} y={432} width={10} height={4} stroke={GREY_WARM} strokeWidth={0.6} fill="#F4F0E8" />

            {/* Kitchen L-Counter with Sink & Cooktop */}
            <Path
              d="M 740 460 L 795 460 L 795 480 L 760 480 L 760 525 L 740 525 Z"
              stroke={PRIMARY}
              strokeWidth={0.9}
              fill="#EAE5DA"
            />
            {/* Sink */}
            <Rect x={745} y={490} width={12} height={18} stroke={GREY_WARM} strokeWidth={0.6} fill="#FFFFFF" />
            <Circle cx={751} cy={499} r={2} fill={PRIMARY} />
            {/* 2-Burner Hob */}
            <Circle cx={770} cy={470} r={4} stroke={CHARCOAL} strokeWidth={0.7} fill="none" />
            <Circle cx={784} cy={470} r={4} stroke={CHARCOAL} strokeWidth={0.7} fill="none" />

            {/* ─── MEP TECHNICAL SYMBOLS & CALLOUTS ────────────────────── */}
            {/* Distribution Board [DB] at entrance */}
            <Rect x={772} y={293} width={14} height={6} fill={PRIMARY} />

            {/* Ceiling Electrical Light Points (⊗ in gold) */}
            <G>
              {/* Living Area Light */}
              <Circle cx={780} cy={365} r={4.5} stroke={GOLD} strokeWidth={0.8} fill="#FFFFFF" />
              <Line x1={777} y1={362} x2={783} y2={368} stroke={GOLD} strokeWidth={0.7} />
              <Line x1={783} y1={362} x2={777} y2={368} stroke={GOLD} strokeWidth={0.7} />

              {/* Dining Light */}
              <Circle cx={795} cy={417} r={4.5} stroke={GOLD} strokeWidth={0.8} fill="#FFFFFF" />
              <Line x1={792} y1={414} x2={798} y2={420} stroke={GOLD} strokeWidth={0.7} />
              <Line x1={798} y1={414} x2={792} y2={420} stroke={GOLD} strokeWidth={0.7} />

              {/* Master Bed Light */}
              <Circle cx={920} cy={370} r={4.5} stroke={GOLD} strokeWidth={0.8} fill="#FFFFFF" />
              <Line x1={917} y1={367} x2={923} y2={373} stroke={GOLD} strokeWidth={0.7} />
              <Line x1={923} y1={367} x2={917} y2={373} stroke={GOLD} strokeWidth={0.7} />

              {/* Bed 02 Light */}
              <Circle cx={925} cy={480} r={4.5} stroke={GOLD} strokeWidth={0.8} fill="#FFFFFF" />
              <Line x1={922} y1={477} x2={928} y2={483} stroke={GOLD} strokeWidth={0.7} />
              <Line x1={928} y1={477} x2={922} y2={483} stroke={GOLD} strokeWidth={0.7} />
            </G>

            {/* AC Units [AC] Wall-mounted (Teal bars) */}
            <Rect x={872} y={300} width={16} height={6} stroke={PRIMARY} strokeWidth={0.7} fill="#E0EFF1" />
            <Rect x={872} y={490} width={16} height={6} stroke={PRIMARY} strokeWidth={0.7} fill="#E0EFF1" />
            <Rect x={835} y={340} width={6} height={18} stroke={PRIMARY} strokeWidth={0.7} fill="#E0EFF1" />

            {/* Plumbing Waste / Water Outlets */}
            <Circle cx={751} cy={515} r={3} fill="#0284c7" opacity={0.7} />
            <Circle cx={970} cy={335} r={3} fill="#0284c7" opacity={0.7} />
            <Circle cx={845} cy={520} r={3} fill="#0284c7" opacity={0.7} />
          </G>

          {/* ─── THIN ARCHITECTURAL DIMENSION LINES (PLAN FRAME) ──────── */}
          <G>
            {/* Top Overall Dimension Line */}
            <Line x1={735} y1={270} x2={1005} y2={270} stroke={GREY_WARM} strokeWidth={0.7} />
            {/* Extension Lines */}
            <Line x1={735} y1={265} x2={735} y2={288} stroke={GREY_WARM} strokeWidth={0.5} />
            <Line x1={865} y1={265} x2={865} y2={288} stroke={GREY_WARM} strokeWidth={0.5} />
            <Line x1={1005} y1={265} x2={1005} y2={288} stroke={GREY_WARM} strokeWidth={0.5} />
            {/* 45-degree Slash Ticks */}
            <Line x1={732} y1={273} x2={738} y2={267} stroke={CHARCOAL} strokeWidth={1} />
            <Line x1={862} y1={273} x2={868} y2={267} stroke={CHARCOAL} strokeWidth={1} />
            <Line x1={1002} y1={273} x2={1008} y2={267} stroke={CHARCOAL} strokeWidth={1} />

            {/* Right Side Vertical Dimension Line */}
            <Line x1={1025} y1={290} x2={1025} y2={535} stroke={GREY_WARM} strokeWidth={0.7} />
            {/* Extension Lines */}
            <Line x1={1007} y1={290} x2={1030} y2={290} stroke={GREY_WARM} strokeWidth={0.5} />
            <Line x1={1007} y1={415} x2={1030} y2={415} stroke={GREY_WARM} strokeWidth={0.5} />
            <Line x1={1007} y1={535} x2={1030} y2={535} stroke={GREY_WARM} strokeWidth={0.5} />
            {/* 45-degree Slash Ticks */}
            <Line x1={1022} y1={293} x2={1028} y2={287} stroke={CHARCOAL} strokeWidth={1} />
            <Line x1={1022} y1={418} x2={1028} y2={412} stroke={CHARCOAL} strokeWidth={1} />
            <Line x1={1022} y1={538} x2={1028} y2={532} stroke={CHARCOAL} strokeWidth={1} />
          </G>

          {/* ─── ARCHITECTURAL NORTH ARROW & GRAPHIC SCALE ────────────── */}
          <G>
            {/* Compass Outer Ring */}
            <Circle cx={700} cy={250} r={14} stroke={GREY_WARM} strokeWidth={0.8} fill="#FFFFFF" />
            <Circle cx={700} cy={250} r={11} stroke={GOLD} strokeWidth={0.5} strokeDasharray="2 2" fill="none" />
            {/* North Arrow Triangle (Black half, Grey half) */}
            <Polygon points="700,239 696,255 700,251" fill={PRIMARY} />
            <Polygon points="700,239 704,255 700,251" fill="#8C867A" />
            {/* N Label Pointer */}
            <Line x1={700} y1={233} x2={700} y2={228} stroke={PRIMARY} strokeWidth={0.6} />
          </G>

          {/* Graphic Scale Bar at bottom of circle */}
          <G>
            <Rect x={800} y={560} width={40} height={4} fill={CHARCOAL} />
            <Rect x={840} y={560} width={40} height={4} fill="#FFFFFF" stroke={CHARCOAL} strokeWidth={0.5} />
            <Rect x={880} y={560} width={40} height={4} fill={CHARCOAL} />
            <Rect x={920} y={560} width={40} height={4} fill="#FFFFFF" stroke={CHARCOAL} strokeWidth={0.5} />
            <Line x1={800} y1={558} x2={800} y2={566} stroke={CHARCOAL} strokeWidth={0.6} />
            <Line x1={840} y1={558} x2={840} y2={566} stroke={CHARCOAL} strokeWidth={0.6} />
            <Line x1={880} y1={558} x2={880} y2={566} stroke={CHARCOAL} strokeWidth={0.6} />
            <Line x1={920} y1={558} x2={920} y2={566} stroke={CHARCOAL} strokeWidth={0.6} />
            <Line x1={960} y1={558} x2={960} y2={566} stroke={CHARCOAL} strokeWidth={0.6} />
          </G>
        </Svg>

        {/* ─── FOREGROUND DOCUMENT CONTENT & ARCHITECTURAL TITLE BLOCKS ── */}
        <View style={{ position: 'relative', width: '100%', height: '100%', paddingHorizontal: 48, paddingTop: 36 }} wrap={false}>
          {/* ══════════ 1. TOP HEADER SECTION ══════════ */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
            {/* Brand Logo & Studio Identity */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <Image src={logoSrc} style={{ width: 168 }} />
              <View style={{ width: 1, height: 44, backgroundColor: GREY_BORDER, marginHorizontal: 6 }} />
              <View>
                <Text style={{ fontSize: 7, color: GOLD, fontWeight: 'bold', letterSpacing: 1.5, textTransform: 'uppercase' }}>
                  Architectural &amp; Engineering Consultancy
                </Text>
                <Text style={{ fontSize: 11, fontWeight: 'bold', color: PRIMARY_DARK, letterSpacing: 0.5, marginTop: 1 }}>
                  Aesthetic Interior Studio
                </Text>
                <Text style={{ fontSize: 7, color: TEXT_MUTED, marginTop: 1 }}>
                  Technical Drawings • MEP Engineering • Interior Fit-out
                </Text>
              </View>
            </View>

            {/* Document Classification Badge (Top-Right) */}
            <View style={{ alignItems: 'flex-end' }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: PRIMARY,
                  paddingVertical: 4,
                  paddingHorizontal: 10,
                  borderRadius: 2,
                }}
              >
                <Text style={{ fontSize: 7.5, color: '#FFFFFF', fontWeight: 'bold', letterSpacing: 1.2 }}>
                  OFFICIAL MEP DRAWING SET &bull; SHEET A3-LANDSCAPE
                </Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 5, alignItems: 'center' }}>
                <Text style={{ fontSize: 7.5, color: TEXT_MUTED }}>Project Ref:</Text>
                <Text style={{ fontSize: 7.5, fontWeight: 'bold', color: CHARCOAL }}>{effectiveRef}</Text>
                <Text style={{ fontSize: 7.5, color: GREY_BORDER }}>|</Text>
                <Text style={{ fontSize: 7.5, color: TEXT_MUTED }}>Issue Date:</Text>
                <Text style={{ fontSize: 7.5, fontWeight: 'bold', color: CHARCOAL }}>{formattedDate}</Text>
              </View>
            </View>
          </View>

          {/* Thin Gold Brand Divider */}
          <View style={{ height: 1.5, backgroundColor: GOLD, width: '100%', marginBottom: 16 }} />

          {/* ══════════ 2. MAIN DOCUMENT TITLE & SCOPE ══════════ */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 }}>
            <View style={{ maxWidth: 620 }}>
              <Text style={{ fontSize: 8, fontWeight: 'bold', color: GOLD, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 3 }}>
                Technical Specification &amp; Execution Document
              </Text>
              <Text style={{ fontSize: 24, fontWeight: 'bold', color: PRIMARY_DARK, letterSpacing: 1, lineHeight: 1.15 }}>
                MEP DRAWING SIGNATURE COVER
              </Text>
              <Text style={{ fontSize: 8.5, color: TEXT_MUTED, marginTop: 5, letterSpacing: 0.3 }}>
                Mechanical, Electrical, Plumbing, Reflected Ceiling &amp; Architectural Working Drawings Package
              </Text>
            </View>

            {/* Scope Pill Badges */}
            <View style={{ flexDirection: 'row', gap: 5 }}>
              {['ELECTRICAL', 'PLUMBING', 'HVAC', 'CEILING PLAN', 'WORKING SET'].map((badge) => (
                <View
                  key={badge}
                  style={{
                    backgroundColor: BEIGE_CARD,
                    borderWidth: 0.8,
                    borderColor: GREY_BORDER,
                    paddingHorizontal: 6,
                    paddingVertical: 3,
                    borderRadius: 2,
                  }}
                >
                  <Text style={{ fontSize: 6.5, fontWeight: 'bold', color: CHARCOAL_MUTED, letterSpacing: 0.8 }}>
                    {badge}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* ══════════ 3. TWO-COLUMN DATA SECTION: PREPARED FOR & PREPARED BY ══════════ */}
          {/* Width of left area: 620pt */}
          <View style={{ width: 620, flexDirection: 'row', gap: 14, marginBottom: 16 }}>
            {/* ── CARD 1: PREPARED FOR (CLIENT DATA) ── */}
            <View
              style={{
                flex: 1,
                backgroundColor: '#FFFFFF',
                borderWidth: 1,
                borderColor: GREY_BORDER,
                borderLeftWidth: 3.5,
                borderLeftColor: GOLD,
                borderRadius: 2,
                padding: 12,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <Text style={{ fontSize: 7, fontWeight: 'bold', color: GOLD, letterSpacing: 1.2, textTransform: 'uppercase' }}>
                  PREPARED FOR (CLIENT)
                </Text>
                <View style={{ backgroundColor: '#FAF7F0', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 2 }}>
                  <Text style={{ fontSize: 6, color: GREY_WARM, fontWeight: 'bold' }}>CLIENT DATA</Text>
                </View>
              </View>

              {/* Client Name */}
              <Text style={{ fontSize: 13, fontWeight: 'bold', color: PRIMARY_DARK, marginBottom: 4, lineHeight: 1.2 }}>
                {clientName}
              </Text>

              {/* Client Metadata Table */}
              <View style={{ marginTop: 4, gap: 3 }}>
                <View style={{ flexDirection: 'row' }}>
                  <Text style={{ width: 72, fontSize: 7, color: TEXT_MUTED }}>Site / Address:</Text>
                  <Text style={{ flex: 1, fontSize: 7.5, color: CHARCOAL, fontWeight: 'bold' }}>{effectiveAddress}</Text>
                </View>
                {clientPhone ? (
                  <View style={{ flexDirection: 'row' }}>
                    <Text style={{ width: 72, fontSize: 7, color: TEXT_MUTED }}>Contact Phone:</Text>
                    <Text style={{ flex: 1, fontSize: 7.5, color: CHARCOAL }}>{clientPhone}</Text>
                  </View>
                ) : null}
                {clientEmail ? (
                  <View style={{ flexDirection: 'row' }}>
                    <Text style={{ width: 72, fontSize: 7, color: TEXT_MUTED }}>Email Address:</Text>
                    <Text style={{ flex: 1, fontSize: 7.5, color: CHARCOAL }}>{clientEmail}</Text>
                  </View>
                ) : null}
                {projectName ? (
                  <View style={{ flexDirection: 'row' }}>
                    <Text style={{ width: 72, fontSize: 7, color: TEXT_MUTED }}>Project Name:</Text>
                    <Text style={{ flex: 1, fontSize: 7.5, color: CHARCOAL, fontWeight: 'bold' }}>{projectName}</Text>
                  </View>
                ) : null}
              </View>
            </View>

            {/* ── CARD 2: PREPARED BY (CONSULTANT / MEP TEAM) ── */}
            <View
              style={{
                flex: 1,
                backgroundColor: '#FFFFFF',
                borderWidth: 1,
                borderColor: GREY_BORDER,
                borderLeftWidth: 3.5,
                borderLeftColor: PRIMARY,
                borderRadius: 2,
                padding: 12,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <Text style={{ fontSize: 7, fontWeight: 'bold', color: PRIMARY, letterSpacing: 1.2, textTransform: 'uppercase' }}>
                  PREPARED BY (CONSULTANT)
                </Text>
                <View style={{ backgroundColor: '#F0F5F6', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 2 }}>
                  <Text style={{ fontSize: 6, color: PRIMARY, fontWeight: 'bold' }}>ENGINEERING</Text>
                </View>
              </View>

              {/* Company / Lead Name */}
              <Text style={{ fontSize: 13, fontWeight: 'bold', color: PRIMARY_DARK, marginBottom: 4, lineHeight: 1.2 }}>
                Aesthetic Interior
              </Text>

              {/* Company Metadata Table */}
              <View style={{ marginTop: 4, gap: 3 }}>
                <View style={{ flexDirection: 'row' }}>
                  <Text style={{ width: 72, fontSize: 7, color: TEXT_MUTED }}>Department:</Text>
                  <Text style={{ flex: 1, fontSize: 7.5, color: CHARCOAL, fontWeight: 'bold' }}>
                    MEP &amp; Architectural Division
                  </Text>
                </View>
                <View style={{ flexDirection: 'row' }}>
                  <Text style={{ width: 72, fontSize: 7, color: TEXT_MUTED }}>Representative:</Text>
                  <Text style={{ flex: 1, fontSize: 7.5, color: CHARCOAL }}>
                    {companyRepresentative || srCrmName || 'Lead MEP Engineer & Project Architect'}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row' }}>
                  <Text style={{ width: 72, fontSize: 7, color: TEXT_MUTED }}>Studio Location:</Text>
                  <Text style={{ flex: 1, fontSize: 7.5, color: CHARCOAL }}>Dhaka, Bangladesh</Text>
                </View>
                <View style={{ flexDirection: 'row' }}>
                  <Text style={{ width: 72, fontSize: 7, color: TEXT_MUTED }}>Web &amp; Email:</Text>
                  <Text style={{ flex: 1, fontSize: 7.5, color: CHARCOAL }}>
                    www.aestheticinteriortech.com
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* ══════════ 4. TECHNICAL DRAWING METADATA BAR ══════════ */}
          <View
            style={{
              width: 620,
              backgroundColor: BEIGE_CARD,
              borderWidth: 1,
              borderColor: GREY_BORDER,
              borderRadius: 2,
              paddingVertical: 7,
              paddingHorizontal: 12,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 14,
            }}
          >
            <View>
              <Text style={{ fontSize: 6, color: GREY_WARM, textTransform: 'uppercase', fontWeight: 'bold' }}>Drawing Code</Text>
              <Text style={{ fontSize: 8, fontWeight: 'bold', color: PRIMARY }}>AIT-MEP-SIG-01</Text>
            </View>
            <View style={{ width: 1, height: 18, backgroundColor: GREY_BORDER }} />
            <View>
              <Text style={{ fontSize: 6, color: GREY_WARM, textTransform: 'uppercase', fontWeight: 'bold' }}>Drawing Scale</Text>
              <Text style={{ fontSize: 8, fontWeight: 'bold', color: CHARCOAL }}>1:50 / As Noted</Text>
            </View>
            <View style={{ width: 1, height: 18, backgroundColor: GREY_BORDER }} />
            <View>
              <Text style={{ fontSize: 6, color: GREY_WARM, textTransform: 'uppercase', fontWeight: 'bold' }}>Sheet Size</Text>
              <Text style={{ fontSize: 8, fontWeight: 'bold', color: CHARCOAL }}>A3 (420 x 297 mm)</Text>
            </View>
            <View style={{ width: 1, height: 18, backgroundColor: GREY_BORDER }} />
            <View>
              <Text style={{ fontSize: 6, color: GREY_WARM, textTransform: 'uppercase', fontWeight: 'bold' }}>Revision Status</Text>
              <Text style={{ fontSize: 8, fontWeight: 'bold', color: GOLD }}>Rev-01 (Approved)</Text>
            </View>
            <View style={{ width: 1, height: 18, backgroundColor: GREY_BORDER }} />
            <View>
              <Text style={{ fontSize: 6, color: GREY_WARM, textTransform: 'uppercase', fontWeight: 'bold' }}>Execution Stage</Text>
              <Text style={{ fontSize: 8, fontWeight: 'bold', color: PRIMARY_DARK }}>Issued For Construction</Text>
            </View>
          </View>

          {/* ══════════ 5. FORMAL DECLARATION / APPROVAL NOTICE ══════════ */}
          <View
            style={{
              width: 620,
              backgroundColor: '#FFFFFF',
              borderWidth: 0.8,
              borderColor: GREY_BORDER,
              borderRadius: 2,
              padding: 9,
              marginBottom: 16,
            }}
          >
            <Text style={{ fontSize: 6.8, fontWeight: 'bold', color: PRIMARY, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 3 }}>
              ARCHITECTURAL &amp; MEP APPROVAL DECLARATION
            </Text>
            <Text style={{ fontSize: 7.2, color: TEXT_MUTED, lineHeight: 1.35 }}>
              By signing below, the Client confirms full review and acceptance of the MEP (Mechanical, Electrical,
              Plumbing, and Ceiling) layout drawings, socket distributions, piping runs, and fixture positions. The
              approved drawings shall serve as the sole technical benchmark for on-site procurement and installation.
              Any modifications requested after signature shall require formal written revision approval.
            </Text>
          </View>

          {/* ══════════ 6. SIGNATURE, WITNESS & CLIENT APPROVAL GRID ══════════ */}
          {/* 3 Columns: Prepared/Checked By, Witness, Client Signature */}
          <View style={{ width: 620, flexDirection: 'row', gap: 12 }}>
            {/* COLUMN 1: PREPARED & CHECKED BY */}
            <View
              style={{
                flex: 1,
                backgroundColor: '#FFFFFF',
                borderWidth: 1,
                borderColor: GREY_BORDER,
                borderRadius: 2,
                padding: 10,
                justifyContent: 'space-between',
                height: 145,
              }}
            >
              <View>
                <Text style={{ fontSize: 6.8, fontWeight: 'bold', color: PRIMARY, letterSpacing: 0.8, textTransform: 'uppercase' }}>
                  PREPARED &amp; CHECKED BY
                </Text>
                <Text style={{ fontSize: 6.2, color: TEXT_MUTED, marginTop: 1 }}>MEP Consultant / Architect</Text>
              </View>

              {/* Stamp & Signature Line */}
              <View>
                <View style={{ borderBottomWidth: 1, borderBottomColor: CHARCOAL, marginBottom: 5 }} />
                <Text style={{ fontSize: 7.8, fontWeight: 'bold', color: CHARCOAL }}>
                  {companyRepresentative || srCrmName || 'Lead MEP Engineer'}
                </Text>
                <Text style={{ fontSize: 6.5, color: TEXT_MUTED }}>
                  {companyRepresentativeTitle || 'Project Architect'}, Aesthetic Interior
                </Text>
                <Text style={{ fontSize: 6.2, color: GREY_WARM, marginTop: 2 }}>Date: {formattedDate}</Text>
              </View>
            </View>

            {/* COLUMN 2: WITNESS */}
            <View
              style={{
                flex: 1,
                backgroundColor: '#FFFFFF',
                borderWidth: 1,
                borderColor: GREY_BORDER,
                borderRadius: 2,
                padding: 10,
                justifyContent: 'space-between',
                height: 145,
              }}
            >
              <View>
                <Text style={{ fontSize: 6.8, fontWeight: 'bold', color: CHARCOAL_MUTED, letterSpacing: 0.8, textTransform: 'uppercase' }}>
                  OFFICIAL WITNESS
                </Text>
                <Text style={{ fontSize: 6.2, color: TEXT_MUTED, marginTop: 1 }}>Project In-Charge / Witness</Text>
              </View>

              {/* Witness Placeholder Lines */}
              <View>
                <View style={{ borderBottomWidth: 1, borderBottomColor: GREY_BORDER, marginBottom: 5 }} />
                <Text style={{ fontSize: 7.2, color: TEXT_MUTED }}>Name: ______________________</Text>
                <Text style={{ fontSize: 7.2, color: TEXT_MUTED, marginTop: 2 }}>Signature &amp; Date</Text>
                <Text style={{ fontSize: 6.2, color: GREY_WARM, marginTop: 2 }}>Date: ____ / ____ / 2026</Text>
              </View>
            </View>

            {/* COLUMN 3: CLIENT ACCEPTANCE & SIGNATURE */}
            <View
              style={{
                flex: 1.15,
                backgroundColor: '#FFFFFF',
                borderWidth: 1.5,
                borderColor: GOLD,
                borderRadius: 2,
                padding: 10,
                justifyContent: 'space-between',
                height: 145,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 7, fontWeight: 'bold', color: GOLD, letterSpacing: 0.8, textTransform: 'uppercase' }}>
                  CLIENT APPROVAL &amp; SIGNATURE
                </Text>
                <View style={{ backgroundColor: '#FAF4E4', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 2 }}>
                  <Text style={{ fontSize: 5.5, fontWeight: 'bold', color: GOLD }}>FINAL ACCEPTANCE</Text>
                </View>
              </View>

              {/* Prominent Signature Target */}
              <View>
                <View
                  style={{
                    height: 44,
                    borderWidth: 0.8,
                    borderColor: '#EAE4D4',
                    borderStyle: 'dashed',
                    borderRadius: 2,
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginBottom: 5,
                    backgroundColor: '#FCFAF6',
                  }}
                >
                  <Text style={{ fontSize: 6.5, color: '#B0A795' }}>
                    [ Authorized Client Signature &amp; Stamp ]
                  </Text>
                </View>
                <Text style={{ fontSize: 8.5, fontWeight: 'bold', color: PRIMARY_DARK }}>{clientName}</Text>
                <Text style={{ fontSize: 6.5, color: TEXT_MUTED }}>Owner / Authorized Representative</Text>
                <Text style={{ fontSize: 6.2, color: GREY_WARM, marginTop: 2 }}>Date: ____ / ____ / 2026</Text>
              </View>
            </View>
          </View>

          {/* ══════════ 7. RIGHT-SIDE DRAWING TITLE BLOCK & LEGEND ══════════ */}
          {/* Positioned on the right side over the architectural background */}
          <View style={{ position: 'absolute', top: 40, right: 48, width: 440 }}>
            {/* Top-Right Architectural Stamp Box */}
            <View
              style={{
                backgroundColor: '#FFFFFF',
                borderWidth: 1,
                borderColor: CHARCOAL,
                borderRadius: 2,
                padding: 10,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 10,
              }}
            >
              <View>
                <Text style={{ fontSize: 6, color: GREY_WARM, textTransform: 'uppercase', fontWeight: 'bold' }}>PROJECT TITLE</Text>
                <Text style={{ fontSize: 8.5, fontWeight: 'bold', color: PRIMARY_DARK, maxWidth: 260 }}>
                  {projectName || 'INTERIOR ARCHITECTURAL & MEP DRAWINGS'}
                </Text>
                <Text style={{ fontSize: 6.5, color: TEXT_MUTED, marginTop: 1 }}>Location: {effectiveAddress}</Text>
              </View>
              <View style={{ alignItems: 'flex-end', borderLeftWidth: 1, borderLeftColor: GREY_BORDER, paddingLeft: 10 }}>
                <Text style={{ fontSize: 6, color: GOLD, fontWeight: 'bold', textTransform: 'uppercase' }}>SHEET NUMBER</Text>
                <Text style={{ fontSize: 13, fontWeight: 'bold', color: PRIMARY_DARK }}>MEP-001</Text>
              </View>
            </View>
          </View>

          {/* Drawing Key / MEP Legend (Bottom Right, under the floor plan circle) */}
          <View
            style={{
              position: 'absolute',
              bottom: 40,
              right: 48,
              width: 440,
              backgroundColor: '#FFFFFF',
              borderWidth: 1,
              borderColor: GREY_BORDER,
              borderRadius: 2,
              padding: 9,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
              <Text style={{ fontSize: 6.5, fontWeight: 'bold', color: PRIMARY, letterSpacing: 0.8, textTransform: 'uppercase' }}>
                DRAWING LEGEND &amp; MEP SYMBOLS KEY
              </Text>
              <Text style={{ fontSize: 6, color: GREY_WARM }}>STANDARD ISO/BNBC NOTATION</Text>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, width: 95 }}>
                <View style={{ width: 8, height: 4, backgroundColor: PRIMARY }} />
                <Text style={{ fontSize: 6, color: CHARCOAL }}>[DB] Main Board</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, width: 95 }}>
                <View style={{ width: 7, height: 7, borderRadius: 3.5, borderWidth: 0.7, borderColor: GOLD }} />
                <Text style={{ fontSize: 6, color: CHARCOAL }}>&otimes; Ceiling Light</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, width: 95 }}>
                <View style={{ width: 9, height: 4, backgroundColor: '#E0EFF1', borderWidth: 0.5, borderColor: PRIMARY }} />
                <Text style={{ fontSize: 6, color: CHARCOAL }}>[AC] Indoor Split</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, width: 95 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#0284c7' }} />
                <Text style={{ fontSize: 6, color: CHARCOAL }}>Plumbing Waste</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, width: 95 }}>
                <View style={{ width: 12, height: 2, backgroundColor: CHARCOAL }} />
                <Text style={{ fontSize: 6, color: CHARCOAL }}>Solid Brick Wall</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, width: 95 }}>
                <View style={{ width: 12, height: 2, backgroundColor: PRIMARY }} />
                <Text style={{ fontSize: 6, color: CHARCOAL }}>Glazing / Window</Text>
              </View>
            </View>
          </View>

          {/* ══════════ 8. BOTTOM FOOTER LEGAL STRIP ══════════ */}
          <View
            style={{
              position: 'absolute',
              bottom: 22,
              left: 48,
              right: 48,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 6, color: GREY_WARM }}>
              &copy; {new Date().getFullYear()} Aesthetic Interior Studio. All rights reserved. Confidential technical specification.
            </Text>
            <Text style={{ fontSize: 6, color: GREY_WARM }}>
              House #45, Road #11, Banani, Dhaka &bull; www.aestheticinteriortech.com &bull; info@aestheticinteriortech.com
            </Text>
            <Text style={{ fontSize: 6, fontWeight: 'bold', color: GOLD }}>
              A3 LANDSCAPE &bull; MEP COVER SHEET 01/01
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}
