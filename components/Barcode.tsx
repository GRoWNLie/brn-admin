'use client'

import { barcodeSvg, BarcodeOpts } from '@/lib/barcode'

export default function Barcode({ value, ...opts }: { value: string } & BarcodeOpts) {
  return (
    <span
      style={{ display: 'inline-block', lineHeight: 0 }}
      dangerouslySetInnerHTML={{ __html: barcodeSvg(value, opts) }}
    />
  )
}
