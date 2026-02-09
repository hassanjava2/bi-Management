/**
 * Accounting helpers: system accounts, create & post journal entries.
 * Used by invoices, purchases, vouchers for automatic double-entry.
 */
import {
  db,
  type Tx,
  accounts as accountsTable,
  journalEntries,
  journalEntryLines,
  systemSettings,
} from "@bi-management/database";
import { eq, desc, and } from "drizzle-orm";

export type { Tx };

const ACCOUNTING_CATEGORY = "accounting";
const PERIOD_LOCK_KEY = "period_lock_before";

/** Get period lock date (YYYY-MM-DD). Entries with entryDate < this are rejected. */
export async function getPeriodLockBeforeDate(tx?: Tx): Promise<string | null> {
  const client = tx ?? db;
  const [row] = await client
    .select({ value: systemSettings.value })
    .from(systemSettings)
    .where(and(eq(systemSettings.category, ACCOUNTING_CATEGORY), eq(systemSettings.key, PERIOD_LOCK_KEY)))
    .limit(1);
  return row?.value ?? null;
}

/** Throws if entryDate is before the locked period. */
export async function assertPeriodNotLocked(entryDate: string, tx?: Tx): Promise<void> {
  const lockBefore = await getPeriodLockBeforeDate(tx);
  if (!lockBefore) return;
  if (entryDate < lockBefore) {
    throw new Error(`الفترة المحاسبية مقفلة حتى ${lockBefore} - لا يمكن ترحيل قيود قبل هذا التاريخ`);
  }
}

export const SYSTEM_ACCOUNT_CODES = {
  RECEIVABLE: "1101",
  SALES: "4101",
  CASH: "1110",
  BANK: "1120",
  PAYABLE: "2101",
  INVENTORY: "1201",
} as const;

const SYSTEM_ACCOUNTS_CONFIG: Array<{
  code: string;
  name: string;
  nameAr: string;
  type: string;
  nature: "debit" | "credit";
}> = [
  { code: SYSTEM_ACCOUNT_CODES.RECEIVABLE, name: "Accounts Receivable", nameAr: "ذمم مدينة", type: "asset", nature: "debit" },
  { code: SYSTEM_ACCOUNT_CODES.SALES, name: "Sales Revenue", nameAr: "إيرادات المبيعات", type: "revenue", nature: "credit" },
  { code: SYSTEM_ACCOUNT_CODES.CASH, name: "Cash", nameAr: "الصندوق", type: "asset", nature: "debit" },
  { code: SYSTEM_ACCOUNT_CODES.BANK, name: "Bank", nameAr: "البنك", type: "asset", nature: "debit" },
  { code: SYSTEM_ACCOUNT_CODES.PAYABLE, name: "Accounts Payable", nameAr: "ذمم دائنة", type: "liability", nature: "credit" },
  { code: SYSTEM_ACCOUNT_CODES.INVENTORY, name: "Inventory", nameAr: "المخزون", type: "asset", nature: "debit" },
];

/**
 * Get account id by code. Use within transaction.
 */
export async function getAccountIdByCode(
  tx: Tx,
  code: string
): Promise<string | null> {
  const [acc] = await tx.query.accounts.findMany({
    columns: { id: true },
    where: (a, { eq }) => eq(a.code, code),
    limit: 1,
  });
  return acc?.id ?? null;
}

/**
 * Ensure system accounts exist. Creates them if missing. Call within transaction.
 */
export async function ensureSystemAccounts(tx: Tx): Promise<void> {
  for (const config of SYSTEM_ACCOUNTS_CONFIG) {
    const existing = await getAccountIdByCode(tx, config.code);
    if (existing) continue;
    const id = `acc_${config.code}_${Date.now()}`;
    await tx.insert(accountsTable).values({
      id,
      code: config.code,
      name: config.name,
      nameAr: config.nameAr,
      type: config.type,
      nature: config.nature,
      balance: 0,
      isSystem: 1,
      isActive: 1,
    });
  }
}

export interface JournalLineInput {
  accountId: string;
  debit?: number;
  credit?: number;
  description?: string;
  costCenter?: string;
}

export interface CreateAndPostJournalEntryParams {
  entryDate: string;
  description?: string;
  referenceType?: string;
  referenceId?: string;
  lines: JournalLineInput[];
  createdBy?: string | null;
  postedBy?: string | null;
}

/**
 * Generate next journal entry number (e.g. JE-2025-00001). Call within transaction.
 */
export async function generateEntryNumber(tx: Tx): Promise<string> {
  const year = new Date().getFullYear();
  const [last] = await tx.query.journalEntries.findMany({
    columns: { entryNumber: true },
    orderBy: (e, { desc }) => [desc(e.createdAt)],
    limit: 1,
  });
  const next =
    last && last.entryNumber.startsWith(`JE-${year}-`)
      ? parseInt(last.entryNumber.split("-")[2] || "0", 10) + 1
      : 1;
  return `JE-${year}-${String(next).padStart(5, "0")}`;
}

/**
 * Create and post a journal entry using the given transaction (no nested transaction).
 * Returns the created journal entry id.
 */
export async function createAndPostJournalEntryWithTx(
  tx: Tx,
  params: CreateAndPostJournalEntryParams
): Promise<string> {
  await assertPeriodNotLocked(params.entryDate, tx);
  let totalDebit = 0;
  let totalCredit = 0;
  for (const line of params.lines) {
    totalDebit += line.debit ?? 0;
    totalCredit += line.credit ?? 0;
  }
  if (Math.abs(totalDebit - totalCredit) > 0.001) {
    throw new Error("القيد غير متوازن - مجموع المدين يجب أن يساوي مجموع الدائن");
  }

  await ensureSystemAccounts(tx);
  const entryNumber = await generateEntryNumber(tx);
  const entryId = `je_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;

  await tx.insert(journalEntries).values({
    id: entryId,
    entryNumber,
    entryDate: params.entryDate,
    description: params.description?.trim() || null,
    referenceType: params.referenceType || null,
    referenceId: params.referenceId || null,
    totalDebit,
    totalCredit,
    status: "posted",
    postedBy: params.postedBy ?? params.createdBy ?? null,
    postedAt: new Date(),
    createdBy: params.createdBy ?? null,
  });

  for (const line of params.lines) {
    const lineId = `jel_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
    await tx.insert(journalEntryLines).values({
      id: lineId,
      journalEntryId: entryId,
      accountId: line.accountId,
      debit: line.debit ?? 0,
      credit: line.credit ?? 0,
      description: line.description?.trim() || null,
      costCenter: line.costCenter?.trim() || null,
    });
  }

  for (const line of params.lines) {
    const [account] = await tx.query.accounts.findMany({
      where: (a, { eq }) => eq(a.id, line.accountId),
      limit: 1,
    });
    if (account && account.nature) {
      const currentBalance = account.balance ?? 0;
      const newBalance =
        account.nature === "debit"
          ? currentBalance + (line.debit ?? 0) - (line.credit ?? 0)
          : currentBalance + (line.credit ?? 0) - (line.debit ?? 0);
      await tx
        .update(accountsTable)
        .set({ balance: newBalance })
        .where(eq(accountsTable.id, line.accountId));
    }
  }

  return entryId;
}

/**
 * Create a journal entry and post it (update account balances) in one transaction.
 * Returns the created journal entry id.
 */
export async function createAndPostJournalEntry(
  params: CreateAndPostJournalEntryParams
): Promise<string> {
  return db.transaction(async (tx) => createAndPostJournalEntryWithTx(tx, params));
}

/**
 * Get system account id by code. Ensures system accounts exist then returns id.
 * Use when building journal lines (e.g. for invoice: receivable + sales).
 */
export async function getOrEnsureAccountIdByCode(code: string): Promise<string> {
  return db.transaction(async (tx) => {
    await ensureSystemAccounts(tx);
    const id = await getAccountIdByCode(tx, code);
    if (!id) throw new Error(`الحساب بكود ${code} غير موجود بعد الإنشاء`);
    return id;
  });
}
