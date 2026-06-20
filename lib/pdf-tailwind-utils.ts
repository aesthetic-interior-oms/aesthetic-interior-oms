/**
 * Tailwind-like utility system for @react-pdf/renderer
 * Provides helper functions to easily style PDF components
 */

export type StyleValue = string | number
export type FlexDirection = 'row' | 'column' | 'row-reverse' | 'column-reverse'
export type JustifyContent = 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly'
export type AlignItems = 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline'
export type TextAlign = 'left' | 'right' | 'center' | 'justify'
export type BorderStyle = 'solid' | 'dashed' | 'dotted'

export interface PdfStyle {
  [key: string]: any
}

// ============ COLOR UTILITIES ============
export const colors = {
  // Primary Colors
  primary: '#0f5b53', // Teal
  secondary: '#bf9000', // Gold
  
  // Accent Colors
  accent: '#76933c', // Green
  blue: '#0070c0',
  lightBlue: '#e8f1ff', // Light blue for alternating rows
  red: '#ff0000',
  
  // Neutral Colors
  white: '#ffffff',
  black: '#000000',
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
}

// ============ SPACING UTILITIES ============
const spacingValue = (size: string | number): number => {
  if (typeof size === 'number') return size
  
  const spacingMap: Record<string, number> = {
    '0': 0,
    '1': 2,
    '2': 4,
    '3': 6,
    '4': 8,
    '5': 10,
    '6': 12,
    '7': 14,
    '8': 16,
    '9': 18,
    '10': 20,
    '12': 24,
    '16': 32,
    '20': 40,
    '24': 48,
    '32': 64,
  }
  
  return spacingMap[size] || 0
}

export const padding = (value: string | number): number => spacingValue(value)
export const margin = (value: string | number): number => spacingValue(value)

// ============ FLEX UTILITIES ============
export const flex = (
  direction: FlexDirection = 'row',
  justify: JustifyContent = 'flex-start',
  align: AlignItems = 'flex-start',
  gap: string | number = 0
): PdfStyle => ({
  display: 'flex',
  flexDirection: direction,
  justifyContent: justify,
  alignItems: align,
  gap: spacingValue(gap),
})

export const flexCol = (justify?: JustifyContent, align?: AlignItems, gap?: string | number): PdfStyle =>
  flex('column', justify, align, gap)

export const flexRow = (justify?: JustifyContent, align?: AlignItems, gap?: string | number): PdfStyle =>
  flex('row', justify, align, gap)

export const flexCenter = (): PdfStyle =>
  flex('row', 'center', 'center')

export const flexBetween = (): PdfStyle =>
  flex('row', 'space-between', 'center')

export const flexAround = (): PdfStyle =>
  flex('row', 'space-around', 'center')

// ============ TEXT UTILITIES ============
export const text = (
  size: string | number = 9,
  weight: 'normal' | 'bold' = 'normal',
  color: string = colors.black,
  align: TextAlign = 'left'
): PdfStyle => ({
  fontSize: typeof size === 'string' ? parseInt(size) : size,
  fontWeight: weight,
  color,
  textAlign: align,
})

export const textXs = (color?: string): PdfStyle => text(6, 'normal', color)
export const textSm = (color?: string): PdfStyle => text(7, 'normal', color)
export const textBase = (color?: string): PdfStyle => text(9, 'normal', color)
export const textLg = (color?: string): PdfStyle => text(11, 'normal', color)
export const textXl = (color?: string): PdfStyle => text(13, 'normal', color)
export const text2xl = (color?: string): PdfStyle => text(15, 'normal', color)

export const fontBold = (size: string | number = 9, color?: string): PdfStyle =>
  text(size, 'bold', color)

export const fontCenter = (size: string | number = 9, color?: string): PdfStyle =>
  text(size, 'normal', color, 'center')

export const fontBoldCenter = (size: string | number = 9, color?: string): PdfStyle =>
  text(size, 'bold', color, 'center')

// ============ BORDER UTILITIES ============
export const border = (
  width: number = 0.5,
  color: string = colors.black,
  style: BorderStyle = 'solid'
): PdfStyle => ({
  borderWidth: width,
  borderColor: color,
  borderStyle: style,
})

export const borderTop = (width: number = 0.5, color: string = colors.black): PdfStyle => ({
  borderTopWidth: width,
  borderTopColor: color,
  borderTopStyle: 'solid',
})

export const borderBottom = (width: number = 0.5, color: string = colors.black): PdfStyle => ({
  borderBottomWidth: width,
  borderBottomColor: color,
  borderBottomStyle: 'solid',
})

export const borderLeft = (width: number = 0.5, color: string = colors.black): PdfStyle => ({
  borderLeftWidth: width,
  borderLeftColor: color,
  borderLeftStyle: 'solid',
})

export const borderRight = (width: number = 0.5, color: string = colors.black): PdfStyle => ({
  borderRightWidth: width,
  borderRightColor: color,
  borderRightStyle: 'solid',
})

// ============ BACKGROUND UTILITIES ============
export const bg = (color: string): PdfStyle => ({
  backgroundColor: color,
})

export const bgPrimary = (): PdfStyle => bg(colors.primary)
export const bgSecondary = (): PdfStyle => bg(colors.secondary)
export const bgAccent = (): PdfStyle => bg(colors.accent)
export const bgBlue = (): PdfStyle => bg(colors.blue)
export const bgLightBlue = (): PdfStyle => bg(colors.lightBlue)
export const bgWhite = (): PdfStyle => bg(colors.white)

// ============ SIZING UTILITIES ============
export const w = (value: string | number): PdfStyle => ({
  width: typeof value === 'string' ? value : value,
})

export const h = (value: string | number): PdfStyle => ({
  height: typeof value === 'string' ? value : value,
})

export const wFull = (): PdfStyle => w('100%')
export const hFull = (): PdfStyle => h('100%')

export const size = (width: string | number, height: string | number): PdfStyle => ({
  width,
  height,
})

// ============ PADDING & MARGIN UTILITIES ============
export const p = (value: string | number): PdfStyle => ({
  padding: spacingValue(value),
})

export const px = (value: string | number): PdfStyle => ({
  paddingHorizontal: spacingValue(value),
})

export const py = (value: string | number): PdfStyle => ({
  paddingVertical: spacingValue(value),
})

export const pt = (value: string | number): PdfStyle => ({
  paddingTop: spacingValue(value),
})

export const pb = (value: string | number): PdfStyle => ({
  paddingBottom: spacingValue(value),
})

export const pl = (value: string | number): PdfStyle => ({
  paddingLeft: spacingValue(value),
})

export const pr = (value: string | number): PdfStyle => ({
  paddingRight: spacingValue(value),
})

export const m = (value: string | number): PdfStyle => ({
  margin: spacingValue(value),
})

export const mx = (value: string | number): PdfStyle => ({
  marginHorizontal: spacingValue(value),
})

export const my = (value: string | number): PdfStyle => ({
  marginVertical: spacingValue(value),
})

export const mt = (value: string | number): PdfStyle => ({
  marginTop: spacingValue(value),
})

export const mb = (value: string | number): PdfStyle => ({
  marginBottom: spacingValue(value),
})

export const ml = (value: string | number): PdfStyle => ({
  marginLeft: spacingValue(value),
})

export const mr = (value: string | number): PdfStyle => ({
  marginRight: spacingValue(value),
})

// ============ POSITION UTILITIES ============
export const absolute = (): PdfStyle => ({
  position: 'absolute',
})

export const fixed = (): PdfStyle => ({
  position: 'absolute',
  fixed: true,
})

export const top = (value: string | number): PdfStyle => ({
  top: spacingValue(value),
})

export const bottom = (value: string | number): PdfStyle => ({
  bottom: spacingValue(value),
})

export const left = (value: string | number): PdfStyle => ({
  left: spacingValue(value),
})

export const right = (value: string | number): PdfStyle => ({
  right: spacingValue(value),
})

// ============ OPACITY UTILITIES ============
export const opacity = (value: number): PdfStyle => ({
  opacity: value,
})

// ============ COMPOSED UTILITIES ============
export const section = (pt_val: string | number = 8, pb_val: string | number = 0): PdfStyle =>
  compose(pt(pt_val), pb(pb_val))

export const container = (): PdfStyle =>
  compose(wFull(), p(30))

export const btn = (bgColor: string = colors.primary, textColor: string = colors.white): PdfStyle =>
  compose(
    bg(bgColor),
    p(3),
    fontBoldCenter(9, textColor),
  )

export const card = (bgColor: string = colors.white): PdfStyle =>
  compose(
    bg(bgColor),
    p(4),
    border(0.5, colors.gray[300]),
  )

export const header = (): PdfStyle =>
  compose(
    fixed(),
    top(20),
    left(30),
    right(30),
    flexBetween(),
    borderBottom(1.5, colors.primary),
    pb(1),
  )

export const footer = (): PdfStyle =>
  compose(
    fixed(),
    bottom(5),
    left(30),
    right(30),
    borderTop(0.5, colors.gray[300]),
    pt(1),
  )

export const table = (): PdfStyle =>
  compose(
    wFull(),
    border(0.5, colors.black),
    mb(3),
  )

export const tableRow = (isEven: boolean = false): PdfStyle =>
  compose(
    flexRow(),
    borderBottom(0.5, colors.black),
    bg(isEven ? colors.lightBlue : colors.white),
  )

export const tableRowAlternate = (index: number): PdfStyle =>
  tableRow(index % 2 === 1) // Even indices get light blue

export const tableHeader = (): PdfStyle =>
  compose(
    bg(colors.blue),
    text(8, 'bold', colors.white, 'center'),
    borderBottom(0.5, colors.black),
  )

export const tableCell = (width: string = 'auto'): PdfStyle =>
  compose(
    p(2),
    text(7.5, 'normal', colors.black),
    w(width),
  )

// ============ UTILITY COMPOSER ============
/**
 * Merge multiple style objects into one
 * Later styles override earlier ones
 */
export const compose = (...styles: PdfStyle[]): PdfStyle => {
  return styles.reduce((acc, style) => ({ ...acc, ...style }), {})
}

// ============ CLASS MERGER (for handling multiple utilities) ============
/**
 * Merge multiple utility results safely
 */
export const mergeStyles = (...styles: (PdfStyle | undefined | false)[]): PdfStyle => {
  return styles
    .filter((style): style is PdfStyle => style !== undefined && style !== false)
    .reduce((acc, style) => ({ ...acc, ...style }), {})
}

// ============ PRESET COMBINATIONS ============
export const presets = {
  headerContainer: (): PdfStyle =>
    compose(
      fixed(),
      top(5),
      left(15),
      right(15),
      flexBetween(),
      borderBottom(1.5, colors.primary),
      pb(2),
    ),

  footerContainer: (): PdfStyle =>
    compose(
      fixed(),
      bottom(5),
      left(15),
      right(15),
      borderTop(0.5, colors.gray[200]),
      pt(2),
    ),

  pageContainer: (): PdfStyle =>
    compose(
      pt(25),
      pb(20),
      pl(8),
      pr(8),
      textBase(colors.gray[900]),
    ),

  sectionTitle: (): PdfStyle =>
    compose(
      fontBoldCenter(9),
      textTransform('uppercase'),
      bg(colors.accent),
      text(9, 'bold', colors.white, 'center'),
      p(1.5),
      mb(2),
    ),

  badge: (bgColor: string = colors.primary, textColor: string = colors.white): PdfStyle =>
    compose(
      bg(bgColor),
      px(2),
      py(0.5),
      textXs(textColor),
      fontBold(),
    ),

  divider: (color: string = colors.gray[300]): PdfStyle =>
    compose(
      wFull(),
      borderTop(0.5, color),
      my(2),
    ),
}

// ============ HELPER FUNCTIONS ============
export const textTransform = (transform: 'uppercase' | 'lowercase' | 'capitalize'): PdfStyle => ({
  textTransform: transform,
})

export const lineHeight = (value: number): PdfStyle => ({
  lineHeight: value,
})

export const letterSpacing = (value: number): PdfStyle => ({
  letterSpacing: value,
})

export const textDecoration = (value: 'underline' | 'line-through' | 'none'): PdfStyle => ({
  textDecoration: value,
})

export const underline = (): PdfStyle => textDecoration('underline')

export const strikethrough = (): PdfStyle => textDecoration('line-through')

export const zIndex = (value: number): PdfStyle => ({
  zIndex: value,
})

// ============ RESPONSIVE UTILITIES (for breakpoints in parent components) ============
export const responsive = {
  // You can define responsive behavior at component level
  // since PDF doesn't have real responsive design
  mobile: { paddingHorizontal: 4, paddingVertical: 4 },
  tablet: { paddingHorizontal: 8, paddingVertical: 8 },
  desktop: { paddingHorizontal: 12, paddingVertical: 12 },
}
