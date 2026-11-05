import prisma from '@/lib/prisma'
import {
  ProcurementWalletTxType,
  ProcurementPaidFrom,
  ProcurementTxStatus,
  TransactionType,
} from '@/generated/prisma/client'

/**
 * Get or automatically create a wallet for a procurement user.
 */
export async function getOrCreateProcurementWallet(userId: string) {
  let wallet = await prisma.procurementWallet.findUnique({
    where: { userId },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
        },
      },
    },
  })

  if (!wallet) {
    wallet = await prisma.procurementWallet.create({
      data: {
        userId,
        advanceBalance: 0,
        pendingReimbursement: 0,
        totalSpent: 0,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
          },
        },
      },
    })
  }

  return wallet
}

export type RecordExpenseInput = {
  walletId?: string
  userId: string
  amount: number
  charge?: number
  paymentMethod: string
  paidFrom: ProcurementPaidFrom
  category: string
  particular: string
  voucherNo?: string
  receiptUrl?: string
  leadId?: string
  materialRequisitionId?: string
  submittedById: string
}

/**
 * Record a procurement expense.
 * User enters payment + charge together!
 * - If paid from COMPANY_ADVANCE: reduces user's advance balance and records total spent.
 * - If paid from PERSONAL_POCKET: increases user's pending reimbursement (Accounts owes employee).
 */
export async function recordProcurementExpense(input: RecordExpenseInput) {
  const amount = Number(input.amount)
  const charge = Number(input.charge || 0)
  if (isNaN(amount) || amount <= 0) {
    throw new Error('Expense amount must be a positive number')
  }
  if (isNaN(charge) || charge < 0) {
    throw new Error('Charge cannot be negative')
  }

  const totalAmount = amount + charge

  return await prisma.$transaction(async (tx) => {
    // 1. Ensure wallet exists
    let wallet = await tx.procurementWallet.findUnique({
      where: { userId: input.userId },
    })

    if (!wallet) {
      wallet = await tx.procurementWallet.create({
        data: {
          userId: input.userId,
          advanceBalance: 0,
          pendingReimbursement: 0,
          totalSpent: 0,
        },
      })
    }

    // 2. Adjust wallet balance based on paidFrom
    let updatedAdvanceBalance = wallet.advanceBalance
    let updatedPendingReimbursement = wallet.pendingReimbursement

    if (input.paidFrom === ProcurementPaidFrom.COMPANY_ADVANCE) {
      // Paid from company advance float
      updatedAdvanceBalance -= totalAmount
    } else {
      // Paid from personal out-of-pocket money: company owes employee
      updatedPendingReimbursement += totalAmount
    }

    const updatedTotalSpent = wallet.totalSpent + totalAmount

    await tx.procurementWallet.update({
      where: { id: wallet.id },
      data: {
        advanceBalance: updatedAdvanceBalance,
        pendingReimbursement: updatedPendingReimbursement,
        totalSpent: updatedTotalSpent,
      },
    })

    // 3. Create wallet transaction
    const transaction = await tx.procurementWalletTransaction.create({
      data: {
        walletId: wallet.id,
        type: ProcurementWalletTxType.EXPENSE,
        status: ProcurementTxStatus.PENDING,
        amount,
        charge,
        totalAmount,
        paymentMethod: input.paymentMethod || 'CASH',
        paidFrom: input.paidFrom,
        category: input.category || 'RAW_MATERIALS',
        particular: input.particular,
        voucherNo: input.voucherNo || null,
        receiptUrl: input.receiptUrl || null,
        leadId: input.leadId || null,
        materialRequisitionId: input.materialRequisitionId || null,
        submittedById: input.submittedById,
      },
      include: {
        lead: {
          select: { id: true, name: true, location: true },
        },
        materialRequisition: {
          select: { id: true, requisitionNo: true },
        },
        submittedBy: {
          select: { id: true, fullName: true },
        },
      },
    })

    return { transaction, wallet: { ...wallet, advanceBalance: updatedAdvanceBalance, pendingReimbursement: updatedPendingReimbursement, totalSpent: updatedTotalSpent } }
  })
}

export type DisburseAdvanceInput = {
  userId: string
  financeAccountId: string
  amount: number
  charge?: number
  paymentMethod: string
  particular?: string
  recordedById: string
}

/**
 * Disburse float/advance from Accounts to a Procurement user's wallet.
 * Accounts enters amount + charge together (e.g. bKash fee)!
 * Connects directly to FinanceAccount & creates an Outflow in the main Accounts ledger.
 */
export async function disburseProcurementAdvance(input: DisburseAdvanceInput) {
  const amount = Number(input.amount)
  const charge = Number(input.charge || 0)
  if (isNaN(amount) || amount <= 0) {
    throw new Error('Disbursement amount must be a positive number')
  }
  if (isNaN(charge) || charge < 0) {
    throw new Error('Disbursement charge cannot be negative')
  }

  const totalAmount = amount + charge

  return await prisma.$transaction(async (tx) => {
    // 1. Verify Finance Account
    const financeAccount = await tx.financeAccount.findUnique({
      where: { id: input.financeAccountId },
    })
    if (!financeAccount) {
      throw new Error('Selected Finance Account does not exist')
    }

    // 2. Fetch User & Wallet
    const targetUser = await tx.user.findUnique({
      where: { id: input.userId },
      select: { id: true, fullName: true },
    })
    if (!targetUser) {
      throw new Error('Target user does not exist')
    }

    let wallet = await tx.procurementWallet.findUnique({
      where: { userId: input.userId },
    })

    if (!wallet) {
      wallet = await tx.procurementWallet.create({
        data: {
          userId: input.userId,
          advanceBalance: 0,
          pendingReimbursement: 0,
          totalSpent: 0,
        },
      })
    }

    // 3. Create OUTFLOW transaction in main Accounts ledger
    const particularText = input.particular?.trim()
      ? `Procurement Advance: ${targetUser.fullName} - ${input.particular.trim()} (Net: ৳${amount.toLocaleString()}, Fee: ৳${charge.toLocaleString()})`
      : `Procurement Advance to ${targetUser.fullName} (Net: ৳${amount.toLocaleString()}, Fee: ৳${charge.toLocaleString()})`

    const financeTx = await tx.transaction.create({
      data: {
        type: TransactionType.OUTFLOW,
        category: 'PROCUREMENT_ADVANCE',
        particular: particularText,
        amount: totalAmount, // Full cashout from company account
        financeAccountId: input.financeAccountId,
        recordedById: input.recordedById,
        date: new Date(),
      },
    })

    const generatedVoucherNo = `v-${String(financeTx.serialNo).padStart(6, '0')}`
    await tx.transaction.update({
      where: { id: financeTx.id },
      data: { voucherNo: generatedVoucherNo },
    })

    // 4. Update user's wallet: advanceBalance increases by the net spendable amount
    const updatedAdvanceBalance = wallet.advanceBalance + amount
    await tx.procurementWallet.update({
      where: { id: wallet.id },
      data: { advanceBalance: updatedAdvanceBalance },
    })

    // 5. Create wallet transaction
    const walletTx = await tx.procurementWalletTransaction.create({
      data: {
        walletId: wallet.id,
        type: ProcurementWalletTxType.DISBURSEMENT,
        status: ProcurementTxStatus.SETTLED,
        amount,
        charge,
        totalAmount,
        paymentMethod: input.paymentMethod || 'BKASH',
        paidFrom: ProcurementPaidFrom.COMPANY_ADVANCE,
        category: 'COMPANY_ADVANCE',
        particular: particularText,
        voucherNo: generatedVoucherNo,
        financeAccountId: input.financeAccountId,
        financeTransactionId: financeTx.id,
        submittedById: input.recordedById,
        reviewedById: input.recordedById,
        reviewedAt: new Date(),
      },
      include: {
        financeAccount: {
          select: { id: true, name: true },
        },
      },
    })

    return {
      walletTx,
      financeTx,
      newBalance: updatedAdvanceBalance,
    }
  })
}

export type ReimburseExpenseInput = {
  transactionId?: string
  userId: string
  financeAccountId: string
  amount: number
  charge?: number
  paymentMethod: string
  particular?: string
  recordedById: string
}

/**
 * Reimburses a procurement user for their personal out-of-pocket expenses.
 * Connects directly to Accounts (OUTFLOW) and clears user's pendingReimbursement.
 */
export async function reimburseProcurementExpense(input: ReimburseExpenseInput) {
  const amount = Number(input.amount)
  const charge = Number(input.charge || 0)
  if (isNaN(amount) || amount <= 0) {
    throw new Error('Reimbursement amount must be a positive number')
  }
  if (isNaN(charge) || charge < 0) {
    throw new Error('Reimbursement charge cannot be negative')
  }

  const totalAmount = amount + charge

  return await prisma.$transaction(async (tx) => {
    const targetUser = await tx.user.findUnique({
      where: { id: input.userId },
      select: { id: true, fullName: true },
    })
    if (!targetUser) throw new Error('Target user does not exist')

    const wallet = await tx.procurementWallet.findUnique({
      where: { userId: input.userId },
    })
    if (!wallet) throw new Error('Wallet not found for this user')

    const particularText = input.particular?.trim()
      ? `Procurement Reimbursement: ${targetUser.fullName} - ${input.particular.trim()}`
      : `Procurement Out-of-Pocket Reimbursement to ${targetUser.fullName}`

    // 1. Create OUTFLOW in Accounts ledger
    const financeTx = await tx.transaction.create({
      data: {
        type: TransactionType.OUTFLOW,
        category: 'PROCUREMENT_REIMBURSEMENT',
        particular: `${particularText} (Amount: ৳${amount.toLocaleString()}, Fee: ৳${charge.toLocaleString()})`,
        amount: totalAmount,
        financeAccountId: input.financeAccountId,
        recordedById: input.recordedById,
        date: new Date(),
      },
    })

    const generatedVoucherNo = `v-${String(financeTx.serialNo).padStart(6, '0')}`
    await tx.transaction.update({
      where: { id: financeTx.id },
      data: { voucherNo: generatedVoucherNo },
    })

    // 2. Reduce pending reimbursement in user wallet
    const updatedPendingReimbursement = Math.max(0, wallet.pendingReimbursement - amount)
    await tx.procurementWallet.update({
      where: { id: wallet.id },
      data: { pendingReimbursement: updatedPendingReimbursement },
    })

    // 3. If a specific transaction was being reimbursed, mark it SETTLED
    if (input.transactionId) {
      await tx.procurementWalletTransaction.update({
        where: { id: input.transactionId },
        data: {
          status: ProcurementTxStatus.SETTLED,
          reviewedById: input.recordedById,
          reviewedAt: new Date(),
          accountsNote: `Reimbursed via ${financeTx.voucherNo}`,
        },
      })
    }

    // 4. Create a REIMBURSEMENT ledger entry in the wallet
    const walletTx = await tx.procurementWalletTransaction.create({
      data: {
        walletId: wallet.id,
        type: ProcurementWalletTxType.REIMBURSEMENT,
        status: ProcurementTxStatus.SETTLED,
        amount,
        charge,
        totalAmount,
        paymentMethod: input.paymentMethod || 'BKASH',
        paidFrom: ProcurementPaidFrom.COMPANY_ADVANCE,
        category: 'REIMBURSEMENT',
        particular: particularText,
        voucherNo: generatedVoucherNo,
        financeAccountId: input.financeAccountId,
        financeTransactionId: financeTx.id,
        submittedById: input.recordedById,
        reviewedById: input.recordedById,
        reviewedAt: new Date(),
      },
    })

    return {
      walletTx,
      financeTx,
      newPendingReimbursement: updatedPendingReimbursement,
    }
  })
}

export type ReturnFloatInput = {
  userId: string
  financeAccountId: string
  amount: number
  paymentMethod: string
  particular?: string
  recordedById: string
}

/**
 * Return unspent advance float back from user to Accounts.
 * Connects directly to Accounts (INFLOW) and reduces user's advance balance.
 */
export async function returnProcurementFloat(input: ReturnFloatInput) {
  const amount = Number(input.amount)
  if (isNaN(amount) || amount <= 0) {
    throw new Error('Return amount must be a positive number')
  }

  return await prisma.$transaction(async (tx) => {
    const targetUser = await tx.user.findUnique({
      where: { id: input.userId },
      select: { id: true, fullName: true },
    })
    if (!targetUser) throw new Error('Target user does not exist')

    const wallet = await tx.procurementWallet.findUnique({
      where: { userId: input.userId },
    })
    if (!wallet) throw new Error('Wallet not found for this user')

    const particularText = input.particular?.trim()
      ? `Procurement Advance Return: ${targetUser.fullName} - ${input.particular.trim()}`
      : `Unspent Procurement Advance Return from ${targetUser.fullName}`

    // 1. Create INFLOW in Accounts ledger
    const financeTx = await tx.transaction.create({
      data: {
        type: TransactionType.INFLOW,
        category: 'PROCUREMENT_ADVANCE_RETURN',
        particular: particularText,
        amount,
        financeAccountId: input.financeAccountId,
        recordedById: input.recordedById,
        date: new Date(),
      },
    })

    const generatedVoucherNo = `v-${String(financeTx.serialNo).padStart(6, '0')}`
    await tx.transaction.update({
      where: { id: financeTx.id },
      data: { voucherNo: generatedVoucherNo },
    })

    // 2. Reduce advance balance in user wallet
    const updatedAdvanceBalance = Math.max(0, wallet.advanceBalance - amount)
    await tx.procurementWallet.update({
      where: { id: wallet.id },
      data: { advanceBalance: updatedAdvanceBalance },
    })

    // 3. Create wallet transaction
    const walletTx = await tx.procurementWalletTransaction.create({
      data: {
        walletId: wallet.id,
        type: ProcurementWalletTxType.RETURN_TO_ACCOUNTS,
        status: ProcurementTxStatus.SETTLED,
        amount,
        charge: 0,
        totalAmount: amount,
        paymentMethod: input.paymentMethod || 'CASH',
        paidFrom: ProcurementPaidFrom.COMPANY_ADVANCE,
        category: 'ADVANCE_RETURN',
        particular: particularText,
        voucherNo: generatedVoucherNo,
        financeAccountId: input.financeAccountId,
        financeTransactionId: financeTx.id,
        submittedById: input.recordedById,
        reviewedById: input.recordedById,
        reviewedAt: new Date(),
      },
    })

    return {
      walletTx,
      financeTx,
      newAdvanceBalance: updatedAdvanceBalance,
    }
  })
}

/**
 * Approve or Reject an individual expense transaction.
 */
export async function reviewProcurementExpense(
  transactionId: string,
  reviewerId: string,
  decision: 'APPROVED' | 'REJECTED',
  notes?: string,
) {
  return await prisma.$transaction(async (tx) => {
    const transaction = await tx.procurementWalletTransaction.findUnique({
      where: { id: transactionId },
      include: { wallet: true },
    })
    if (!transaction) throw new Error('Transaction not found')

    if (transaction.status === ProcurementTxStatus.SETTLED) {
      throw new Error('Cannot change status of a settled transaction')
    }

    if (decision === 'REJECTED') {
      // If was previously pending, we reverse the balance impact
      if (transaction.paidFrom === ProcurementPaidFrom.COMPANY_ADVANCE) {
        // Reimburse advance balance back since expense was rejected
        await tx.procurementWallet.update({
          where: { id: transaction.walletId },
          data: {
            advanceBalance: transaction.wallet.advanceBalance + transaction.totalAmount,
            totalSpent: Math.max(0, transaction.wallet.totalSpent - transaction.totalAmount),
          },
        })
      } else {
        // Remove from pending reimbursement
        await tx.procurementWallet.update({
          where: { id: transaction.walletId },
          data: {
            pendingReimbursement: Math.max(0, transaction.wallet.pendingReimbursement - transaction.totalAmount),
            totalSpent: Math.max(0, transaction.wallet.totalSpent - transaction.totalAmount),
          },
        })
      }

      return await tx.procurementWalletTransaction.update({
        where: { id: transactionId },
        data: {
          status: ProcurementTxStatus.REJECTED,
          reviewedById: reviewerId,
          reviewedAt: new Date(),
          rejectionReason: notes || 'Rejected by Accounts',
        },
      })
    } else {
      // APPROVED
      return await tx.procurementWalletTransaction.update({
        where: { id: transactionId },
        data: {
          status: ProcurementTxStatus.APPROVED,
          reviewedById: reviewerId,
          reviewedAt: new Date(),
          accountsNote: notes || null,
        },
      })
    }
  })
}
