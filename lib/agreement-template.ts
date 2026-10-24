import type { QuotationDraftContent } from '@/lib/quotation-types'

export type AgreementPaymentStage = { stage: string; percentage: string; amount: string }
export type AgreementClauseGroup = { title: string; clauses: string[] }
export type AgreementContent = {
  workOrderId: string
  subContractId: string
  reference: string
  agreementDate: string
  agreementValue: string
  projectName: string
  ownerName: string
  ownerAddress: string
  projectAddress: string
  srCrmName: string
  ceoName: string
  companyRepresentative: string
  companyRepresentativeTitle: string
  letterBody: string
  paymentSchedule: AgreementPaymentStage[]
  annexures: string[]
  clauseGroups: AgreementClauseGroup[]
  witnessNames: string[]
}

export function defaultAgreementContent(input: {
  leadId: string
  name: string
  location?: string | null
  srCrmName?: string | null
  agreementValue?: number | null
}): AgreementContent {
  const date = new Date().toISOString().slice(0, 10)
  const dateCode = date.replace(/-/g, '')
  const value = input.agreementValue ?? 0
  const stages = [
    ['Agreement signing money', '1.99%', 0.0199],
    ['Advance before ceiling work begins', '20%', 0.2],
    ['Before wall panel work begins', '30%', 0.3],
    ['Before cabinet production begins', '30%', 0.3],
    ['Before cabinet installation', '15%', 0.15],
    ['Project handover', '3.01%', 0.0301],
  ] as const
  return {
    workOrderId: `WRK-${input.name}-${dateCode}`,
    subContractId: `SUB-${input.leadId.slice(-8).toUpperCase()}`,
    reference: `AI/${dateCode}/${input.leadId.slice(-6).toUpperCase()}`,
    agreementDate: date,
    agreementValue: String(value || ''),
    projectName: input.location || '',
    ownerName: input.name || '',
    ownerAddress: input.location || '',
    projectAddress: input.location || '',
    srCrmName: input.srCrmName || '',
    ceoName: 'Md Jahirul Islam',
    companyRepresentative: 'Md. Nazrul Islam',
    companyRepresentativeTitle: 'General Manager',
    letterBody: `I, ${input.name}, hereby issue this Work Order to Aesthetic Interior for the execution and completion of the interior works of the above-mentioned project, based on the submitted quotation and the terms agreed by both parties.\n\nThe works shall be executed in accordance with the approved quotation, Schedule of Rates, terms and conditions, drawings, specifications and other agreed project documents, which shall form an integral part of this Work Order.\n\nPlease sign and return the duplicate copy of this Work Order as formal acknowledgment and acceptance.`,
    paymentSchedule: stages.map(([stage, percentage, fraction]) => ({
      stage,
      percentage,
      amount: String(Math.round(value * fraction)),
    })),
    annexures: [
      'Government charges: The above costing excludes applicable VAT, tax and other government charges.',
      'Completion period: The work shall be completed within 150 working days from the day following the Project Receiving Ceremony, subject to the agreed daily work window and project readiness.',
      'Additional work: Work, materials, services or changes outside the agreed scope will be charged separately at the applicable rate or a price agreed in writing by both parties.',
    ],
    clauseGroups: [
      { title: 'Working Procedure', clauses: [
        'Before work begins, Aesthetic Interior will conduct a project survey with the client or the client’s representative present.',
        'A Project Engineer and Senior Project Coordinator will be assigned. Senior management will provide guidance; their site attendance will be coordinated according to project needs.',
        'The client shall review and approve the 3D design or an agreed sketch before execution. Materials and specifications shall be approved before procurement or installation.',
        'After survey and approvals, the project will be formally received through a Project Receiving Ceremony. The client shall provide reasonable site access, utilities, security and working-hour arrangements.',
        'Third-party vendors whose work may affect the agreed scope shall coordinate with Aesthetic Interior before starting. Aesthetic Interior does not assume responsibility for work performed by third parties.',
        'The client may inspect progress in the presence of an authorized company representative and should report observations to that representative for review.',
        'Aesthetic Interior will provide progress updates after relevant payment milestones and will coordinate project handover with the assigned project team.',
      ] },
      { title: 'Financial Matters', clauses: [
        'The client shall follow the payment schedule in this agreement. Any requested change must be sent to the company in writing in advance.',
        'Delays or changes to scheduled payments may pause procurement, production, installation or other work and extend the completion timeline by the period reasonably required to resume work.',
        'For each calendar day a scheduled payment is delayed, the project completion date may be extended by three calendar days, subject to the actual project circumstances and applicable law.',
        'Approved additional work may require a revised completion date to account for design, selection, procurement, production, delivery and installation.',
        'If the client cancels before work begins, charges for completed design, survey, drawings, consultancy, procurement and other work performed shall be assessed and settled.',
        'Payments are applied to customized project services and work. Any verified excess payment after final measurement and adjustment of outstanding dues will be refunded after account settlement.',
      ] },
      { title: 'Other Terms and Conditions', clauses: [
        'This agreement remains effective through the applicable warranty and defect-liability period stated here and in its annexures.',
        'Project-specific prices apply only to this project unless both parties agree otherwise in writing.',
        'Aesthetic Interior provides a one-year service warranty from formal project completion for defects attributable to its workmanship or supplied materials. Misuse, unauthorized changes, normal wear, accidents and third-party work are excluded.',
        'Clerical or calculation errors shall be reported in writing and corrected in good faith. A correction alone does not change scope, price or obligations unless agreed in writing.',
        'Disputes shall first be addressed through at least three formal discussion meetings between the parties before arbitration or legal proceedings, subject to applicable law.',
        'Minor workmanship variations of 2% to 5% may occur from production, transport, installation or site conditions, provided they do not materially affect function, safety, durability or appearance.',
        'Custom-made or specially procured products cannot be returned after production or procurement begins, except where a defect attributable to the company is verified.',
        'Either party shall give written notice if project work is suspended or interrupted. The parties shall maintain professional conduct and document material project concerns.',
      ] },
      { title: 'Note and Acknowledgment', clauses: [
        'Aesthetic Interior will provide the tools, equipment and resources required for its contracted work and will follow the approved project schedule.',
        'Aesthetic Interior will maintain appropriate safety measures for its personnel and coordinate with other contractors where reasonably required.',
        'Items outside the agreed Schedule of Works are additional work. Scope and price must be agreed in writing before that work begins.',
        'Running bills will reflect actual progress and agreed milestones and may be reviewed with the authorized project representative.',
        'The parties confirm that they have read and understood this agreement, enter it voluntarily and agree to be bound by its terms upon signature, subject to the laws of Bangladesh.',
      ] },
    ],
    witnessNames: ['', '', ''],
  }
}

export function parseAgreementContent(value: unknown): AgreementContent | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const candidate = value as Partial<AgreementContent>
  if (typeof candidate.ownerName !== 'string' || !Array.isArray(candidate.clauseGroups)) return null
  return candidate as AgreementContent
}

export type AgreementQuotation = QuotationDraftContent
