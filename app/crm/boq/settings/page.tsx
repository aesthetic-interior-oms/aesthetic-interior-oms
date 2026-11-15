import { BoqSettingsContainer } from '@/components/settings/boq-settings-container'

export const metadata = {
  title: 'BOQ Settings - Requisition Materials & Finish Catalog',
}

export default function BoqSettingsPage() {
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          BOQ Settings
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage core boards, prelaminate finishes, HPL codes, docu paint options, accessories, and appliances.
        </p>
      </div>

      <BoqSettingsContainer />
    </div>
  )
}
