import { MasterDataManager } from '@/components/admin/master-data-manager'

export default function AdminPillarsPage() {
  return (
    <MasterDataManager
      title="Tema"
      description="Kelola daftar topik/tema konten"
      apiPath="pillars"
    />
  )
}
