import { MasterDataManager } from '@/components/admin/master-data-manager'

export default function AdminPillarsPage() {
  return (
    <MasterDataManager
      title="Pillars"
      description="Manage content pillars/themes"
      apiPath="pillars"
    />
  )
}
