import { MasterDataManager } from '@/components/admin/master-data-manager'

export default function AdminCategoriesPage() {
  return (
    <MasterDataManager
      title="Categories"
      description="Manage content categories"
      apiPath="categories"
    />
  )
}
