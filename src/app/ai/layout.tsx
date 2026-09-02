import { MainLayout } from '@/components/layout/main-layout'

export default function AILayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <MainLayout>{children}</MainLayout>
}
