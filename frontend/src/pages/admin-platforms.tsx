import { MasterDataManager } from '@/components/admin/master-data-manager'

export default function AdminPlatformsPage() {
  return (
    <MasterDataManager
      title="Platforms"
      description="Manage publishing platforms"
      apiPath="platforms"
      hasDescription={false}
    />
  )
}
