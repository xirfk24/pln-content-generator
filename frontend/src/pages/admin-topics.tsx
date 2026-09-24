import { MasterDataManager } from '@/components/admin/master-data-manager'

export default function AdminTopicsPage() {
  return (
    <MasterDataManager
      title="Topik Konten"
      description="Kelola daftar Topik Konten resmi (A-Z). Mengubah kode/nama topik otomatis memperbarui konten yang memakainya."
      apiPath="topics"
      hasCode
      hasDescription={false}
    />
  )
}
