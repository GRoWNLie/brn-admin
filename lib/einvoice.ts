/**
 * e-Fatura / e-Arşiv yardımcıları
 *
 * Türkiye'de:
 *  - VKN (10 hane) → kurumsal müşteri → e-FATURA
 *  - TCKN (11 hane) → bireysel müşteri → e-ARŞIV
 *
 * Gerçek GİB entegrasyonu için Foriba/EDM/Logo gibi entegratör gerekir.
 * Bu modül o entegrasyon hazır olduğunda kullanılacak iskeleti sunar.
 */

import { prisma } from './prisma'

export type InvoiceType = 'EFATURA' | 'EARSIV'

export function detectInvoiceType(taxId: string | null | undefined): InvoiceType {
  if (!taxId) return 'EARSIV'
  const clean = taxId.replace(/\D/g, '')
  if (clean.length === 10) return 'EFATURA'   // VKN
  if (clean.length === 11) return 'EARSIV'    // TCKN
  return 'EARSIV'
}

export function isValidTaxId(taxId: string): boolean {
  const clean = taxId.replace(/\D/g, '')
  return clean.length === 10 || clean.length === 11
}

/** Faturayı yıl-numara olarak formatla (örn: BRN2026000123) */
export function formatInvoiceNumber(year: number, sequence: number): string {
  return `BRN${year}${String(sequence).padStart(6, '0')}`
}

export async function nextInvoiceSequence(year: number): Promise<number> {
  const prefix = `BRN${year}`
  const last = await prisma.eInvoice.findFirst({
    where: { invoiceNumber: { startsWith: prefix } },
    orderBy: { id: 'desc' },
  })
  if (!last?.invoiceNumber) return 1
  return parseInt(last.invoiceNumber.slice(prefix.length), 10) + 1
}

/**
 * Basit XML iskeleti üretir (UBL-TR formatı placeholder).
 * Gerçek entegrasyonda Foriba/EDM bu XML'i alıp GİB'e gönderir.
 */
export function buildInvoiceXml(input: {
  invoiceNumber: string
  invoiceType: InvoiceType
  date: Date
  customerName: string
  taxId: string | null
  taxOffice: string | null
  address: string
  totalAmount: number
  taxAmount: number
}): string {
  const baseAmount = input.totalAmount - input.taxAmount
  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2">
  <cbc:ProfileID>${input.invoiceType === 'EFATURA' ? 'TICARIFATURA' : 'EARSIVFATURA'}</cbc:ProfileID>
  <cbc:ID>${input.invoiceNumber}</cbc:ID>
  <cbc:IssueDate>${input.date.toISOString().slice(0, 10)}</cbc:IssueDate>
  <cbc:InvoiceTypeCode>SATIS</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>TRY</cbc:DocumentCurrencyCode>
  <cac:AccountingCustomerParty>
    <cac:Party>
      ${input.taxId ? `<cac:PartyIdentification><cbc:ID schemeID="${input.invoiceType === 'EFATURA' ? 'VKN' : 'TCKN'}">${input.taxId}</cbc:ID></cac:PartyIdentification>` : ''}
      <cac:PartyName><cbc:Name>${escapeXml(input.customerName)}</cbc:Name></cac:PartyName>
      <cac:PostalAddress><cbc:StreetName>${escapeXml(input.address)}</cbc:StreetName></cac:PostalAddress>
      ${input.taxOffice ? `<cac:PartyTaxScheme><cac:TaxScheme><cbc:Name>${escapeXml(input.taxOffice)}</cbc:Name></cac:TaxScheme></cac:PartyTaxScheme>` : ''}
    </cac:Party>
  </cac:AccountingCustomerParty>
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="TRY">${input.taxAmount.toFixed(2)}</cbc:TaxAmount>
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="TRY">${baseAmount.toFixed(2)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="TRY">${baseAmount.toFixed(2)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="TRY">${input.totalAmount.toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="TRY">${input.totalAmount.toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
</Invoice>`
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}
