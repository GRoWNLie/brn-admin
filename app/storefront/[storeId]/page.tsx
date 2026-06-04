import { redirect } from 'next/navigation'

export default function StorefrontIndex({ params }: { params: { storeId: string } }) {
  redirect(`/storefront/${params.storeId}/login`)
}
