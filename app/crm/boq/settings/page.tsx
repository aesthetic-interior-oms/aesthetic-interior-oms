import { AccessoriesAppliancesCatalogSettings } from '@/components/settings/accessories-appliances-catalog-settings'

export const metadata = {
  title: 'BOQ Settings - Accessories & Appliances Library',
}

export default function BoqSettingsPage() {
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          BOQ Settings
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage saved accessories, appliances, specifications, and lifetime product photos.
        </p>
      </div>

      <AccessoriesAppliancesCatalogSettings />
    </div>
  )
}
