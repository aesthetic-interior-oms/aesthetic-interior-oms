import { CrmPageHeader } from '@/components/crm/shared/page-header'
import { QuotationPlayground } from '@/components/crm/quotation/quotation-playground'

export default function QuotationPlaygroundPage() {
  return (
    <div className="min-h-screen bg-background">
      <CrmPageHeader
        title="Quotation Playground"
        subtitle="Practice short and detail quotations without touching real leads."
      />

      <main className="mx-auto max-w-[1440px] px-6 py-6">
        <QuotationPlayground />
      </main>
    </div>
  )
}
