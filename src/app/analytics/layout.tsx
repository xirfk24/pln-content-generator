import { MainLayout } from '@/components/layout/main-layout'

export default function AnalyticsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <MainLayout>{children}</MainLayout>
}
