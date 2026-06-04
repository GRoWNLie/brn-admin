/**
 * Bağımsız (dependency-free) Code128-B barkod üreteci.
 * SKU / barkod / lokasyon kodları gibi alfasayısal değerleri tarayıcıda
 * SVG olarak çizer. Hem React önizleme hem yazdırma penceresi aynı çıktıyı kullanır.
 *
 * Standart Code128 genişlik tablosu (her değer = 6 modül genişliği, bar/boşluk dönüşümlü).
 */
const CODE128_WIDTHS = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312',
  '132212', '221213', '221312', '231212', '112232', '122132', '122231', '113222',
  '123122', '123221', '223211', '221132', '221231', '213212', '223112', '312131',
  '311222', '321122', '321221', '312212', '322112', '322211', '212123', '212321',
  '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121',
  '313121', '211331', '231131', '213113', '213311', '213131', '311123', '311321',
  '331121', '312113', '312311', '332111', '314111', '221411', '431111', '111224',
  '111422', '121124', '121421', '141122', '141221', '112214', '112412', '122114',
  '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112',
  '421211', '212141', '214121', '412121', '111143', '111341', '131141', '114113',
  '114311', '411113', '411311', '113141', '114131', '311141', '411131', '211412',
  '211214', '211232', '233111',
]

const START_B = 104
const STOP = 106

function widthsToBits(w: string): string {
  let bits = ''
  let isBar = true
  for (const ch of w) {
    const n = parseInt(ch, 10)
    bits += (isBar ? '1' : '0').repeat(n)
    isBar = !isBar
  }
  return bits
}

/** Geçerli mi? Code128-B yalnızca yazdırılabilir ASCII (32..126) destekler. */
export function isValidCode128(value: string): boolean {
  if (!value) return false
  for (const ch of value) {
    const c = ch.charCodeAt(0)
    if (c < 32 || c > 126) return false
  }
  return true
}

/** Değeri Code128-B bit dizisine ('1'=bar, '0'=boşluk) çevirir. Geçersizse '' döner. */
export function code128Bits(value: string): string {
  if (!isValidCode128(value)) return ''
  const codes: number[] = [START_B]
  for (const ch of value) codes.push(ch.charCodeAt(0) - 32)

  let sum = START_B
  for (let i = 1; i < codes.length; i++) sum += codes[i] * i
  codes.push(sum % 103) // checksum
  codes.push(STOP)

  let bits = ''
  for (const c of codes) bits += widthsToBits(CODE128_WIDTHS[c])
  bits += '11' // sonlandırma bar'ı
  return bits
}

export interface BarcodeOpts {
  height?: number       // bar yüksekliği (px)
  moduleWidth?: number  // tek modül genişliği (px)
  displayValue?: boolean
  fontSize?: number
  margin?: number       // quiet zone (px)
  color?: string
}

/**
 * Verilen değer için tam SVG markup'ı (string) döner.
 * Geçersiz/boş değerde basit bir uyarı SVG'si döner.
 */
export function barcodeSvg(value: string, opts: BarcodeOpts = {}): string {
  const {
    height = 60,
    moduleWidth = 2,
    displayValue = true,
    fontSize = 13,
    margin = 10,
    color = '#000000',
  } = opts

  const bits = code128Bits(value)
  if (!bits) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="${height}"><text x="6" y="${height / 2}" font-size="11" fill="#DC2626">Geçersiz kod</text></svg>`
  }

  const textH = displayValue ? fontSize + 6 : 0
  const widthPx = bits.length * moduleWidth + margin * 2
  const heightPx = height + textH + margin

  let rects = ''
  let x = margin
  let i = 0
  while (i < bits.length) {
    if (bits[i] === '1') {
      let run = 0
      while (i < bits.length && bits[i] === '1') { run++; i++ }
      rects += `<rect x="${x}" y="${margin}" width="${run * moduleWidth}" height="${height}" fill="${color}"/>`
      x += run * moduleWidth
    } else {
      x += moduleWidth
      i++
    }
  }

  const text = displayValue
    ? `<text x="${widthPx / 2}" y="${margin + height + fontSize}" text-anchor="middle" font-family="monospace" font-size="${fontSize}" fill="${color}">${escapeXml(value)}</text>`
    : ''

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${widthPx}" height="${heightPx}" viewBox="0 0 ${widthPx} ${heightPx}">` +
    `<rect width="${widthPx}" height="${heightPx}" fill="#FFFFFF"/>${rects}${text}</svg>`
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
