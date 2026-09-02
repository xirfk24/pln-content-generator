import { requireRolePage } from '@/lib/auth/guard'
import { MainLayout } from '@/components/layout/main-layout'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireRolePage(['ADMIN'])
  return <MainLayout>{children}</MainLayout>
}
