import { prisma } from './prisma'

export type NotificationCategory =
  | 'info' | 'success' | 'warning' | 'error'
  | 'order' | 'stock' | 'payment' | 'system' | 'review'

export interface CreateNotificationInput {
  title: string
  body: string
  link?: string
  category?: NotificationCategory
  userId?: number | null  // null = tüm kullanıcılar
}

export async function createNotification(input: CreateNotificationInput) {
  return prisma.notification.create({
    data: {
      title: input.title,
      body: input.body,
      link: input.link,
      category: input.category || 'info',
      userId: input.userId ?? null,
    },
  })
}

// Webhook'larla otomatik bildirim üretmek için hazır şablonlar
export const NotificationTemplates = {
  newOrder(orderName: string, customerName: string, total: string) {
    return {
      title: `🛒 Yeni Sipariş Geldi! ${orderName}`,
      body: `${customerName} ${total} tutarında sipariş verdi.`,
      link: `/orders`,
      category: 'order' as const,
    }
  },
  lowStock(productTitle: string, stock: number) {
    return {
      title: '⚠️ Stok Uyarısı',
      body: `"${productTitle}" stoğunda son ${stock} ürün kaldı.`,
      link: `/products`,
      category: 'stock' as const,
    }
  },
  payment(orderName: string, amount: string) {
    return {
      title: '💰 Ödeme Başarılı',
      body: `${orderName} için ${amount} tahsil edildi.`,
      link: `/orders`,
      category: 'payment' as const,
    }
  },
  newReview(productTitle: string, rating: number) {
    return {
      title: '⭐ Yeni Yorum',
      body: `"${productTitle}" için ${rating} yıldızlı yorum geldi — onayını bekliyor.`,
      link: `/reviews`,
      category: 'review' as const,
    }
  },
  xmlSyncDone(productCount: number) {
    return {
      title: '🔄 XML Senkronizasyon Tamamlandı',
      body: `${productCount} ürün Shopify'a aktarıldı.`,
      link: `/xml-sync`,
      category: 'system' as const,
    }
  },
}
