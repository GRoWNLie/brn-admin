/**
 * DB-tabanlı fatura iş kuyruğu (BullMQ yerine — Vercel/serverless uyumlu).
 * API job ekler, cron worker (/api/cron/invoices) işler. Retry + backoff destekli.
 */
import { prisma } from '@/lib/prisma'
import { issueInvoice, cancelInvoice, logInvoice } from './service'

export type InvoiceJobType = 'create' | 'cancel'

export async function enqueueInvoiceJob(type: InvoiceJobType, payload: Record<string, unknown>) {
  return prisma.invoiceJob.create({ data: { type, payload: JSON.stringify(payload) } })
}

/** Bekleyen job'ları işler (cron her çalıştığında). */
export async function processInvoiceQueue(limit = 25): Promise<{ processed: number; ok: number; failed: number }> {
  const now = new Date()
  const jobs = await prisma.invoiceJob.findMany({
    where: { status: 'PENDING', scheduledAt: { lte: now } },
    orderBy: { scheduledAt: 'asc' },
    take: limit,
  })

  let ok = 0, failed = 0
  for (const job of jobs) {
    await prisma.invoiceJob.update({ where: { id: job.id }, data: { status: 'PROCESSING', attempts: { increment: 1 } } })
    let payload: any = {}
    try { payload = JSON.parse(job.payload) } catch {}

    try {
      const r = job.type === 'cancel'
        ? await cancelInvoice(Number(payload.invoiceId), payload.reason)
        : await issueInvoice(Number(payload.invoiceId))

      if (r.ok) {
        await prisma.invoiceJob.update({ where: { id: job.id }, data: { status: 'DONE', processedAt: new Date(), lastError: null } })
        ok++
      } else {
        await failOrRetry(job.id, job.attempts + 1, job.maxAttempts, r.message)
        failed++
      }
    } catch (e: any) {
      await failOrRetry(job.id, job.attempts + 1, job.maxAttempts, e?.message || 'hata')
      await logInvoice('error', 'job', e?.message || 'job hatası')
      failed++
    }
  }
  return { processed: jobs.length, ok, failed }
}

async function failOrRetry(jobId: number, attempts: number, maxAttempts: number, error: string) {
  if (attempts >= maxAttempts) {
    await prisma.invoiceJob.update({ where: { id: jobId }, data: { status: 'FAILED', lastError: error, processedAt: new Date() } })
  } else {
    // exponential backoff: 2^attempts dakika sonra tekrar dene
    const next = new Date(Date.now() + Math.pow(2, attempts) * 60 * 1000)
    await prisma.invoiceJob.update({ where: { id: jobId }, data: { status: 'PENDING', lastError: error, scheduledAt: next } })
  }
}
