import { MainLayout } from '@/components/layout/main-layout'

export default function PublishingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <MainLayout>{children}</MainLayout>
}
