import { createHash } from 'node:crypto';
import {
  createAccount, getAccountByNumber,
  createCategory, getCategoryByName,
  createTransaction, getTransactionByHash, updatePendingToCompleted,
  createPending, createUpload,
  getActiveCategoryRules
} from './repository.js';
import { applyRules } from './rule-engine.js';

function computeHash({ txDate, amount, currency, description, accountId }) {
  const payload = `${txDate}|${amount}|${currency}|${description}|${accountId}`;
  return createHash('sha256').update(payload).digest('hex');
}

function resolveAccount(accountNumber) {
  let account = getAccountByNumber(accountNumber);
  if (!account) {
    account = createAccount({ accountNumber, name: `Account ${accountNumber}` });
  }
  return account;
}

function resolveCategory(bankCategoryName) {
  if (!bankCategoryName) return null;
  let category = getCategoryByName(bankCategoryName);
  if (!category) {
    category = createCategory({ name: bankCategoryName, color: null });
  }
  return category;
}

function getAccountCached(accountNumber, cache) {
  if (!cache[accountNumber]) {
    cache[accountNumber] = resolveAccount(accountNumber);
  }
  return cache[accountNumber];
}

function getCategoryCached(bankCategoryName, cache) {
  if (!bankCategoryName) return null;
  if (!cache[bankCategoryName]) {
    cache[bankCategoryName] = resolveCategory(bankCategoryName);
  }
  return cache[bankCategoryName];
}

function buildPreviewTransaction(tx, isPending, accountCache, categoryCache, rules) {
  const account = getAccountCached(tx.accountNumber, accountCache);
  const bankCategory = getCategoryCached(tx.bankCategory, categoryCache);
  const txHash = computeHash({
    txDate: tx.txDate,
    amount: tx.amount,
    currency: tx.currency,
    description: tx.description,
    accountId: account.id
  });

  const existing = getTransactionByHash(txHash);

  const originalCategoryId = bankCategory?.id || null;

  const ruleMatch = applyRules({
    description: tx.description,
    amount: tx.amount,
    accountId: account.id,
    currency: tx.currency
  }, rules);

  const finalCategoryId = ruleMatch ? ruleMatch.categoryId : originalCategoryId;

  return {
    txDate: tx.txDate,
    description: tx.description,
    amount: tx.amount,
    amountByn: tx.amountByn,
    currency: tx.currency,
    txType: tx.txType,
    accountNumber: tx.accountNumber,
    accountId: account.id,
    originalCategoryId,
    appliedRuleId: ruleMatch ? ruleMatch.id : null,
    finalCategoryId,
    txHash,
    isDuplicate: !!existing,
    isPending: isPending ? 1 : 0,
    bankCategory: tx.bankCategory
  };
}

/* ---------- Preview Import (no DB writes for transactions) ---------- */

export function previewImport({ completed = [], pending = [], originalFilename = 'upload.csv' } = {}) {
  const rules = getActiveCategoryRules();
  const accountCache = {};
  const categoryCache = {};

  const transactions = [];
  let duplicateCount = 0;

  for (const tx of completed) {
    const previewTx = buildPreviewTransaction(tx, false, accountCache, categoryCache, rules);
    if (previewTx) {
      transactions.push(previewTx);
    }
    if (previewTx?.isDuplicate) {
      duplicateCount++;
    }
  }

  for (const tx of pending) {
    const previewTx = buildPreviewTransaction(tx, true, accountCache, categoryCache, rules);
    if (previewTx) {
      transactions.push(previewTx);
    }
    if (previewTx?.isDuplicate) {
      duplicateCount++;
    }
  }

  return {
    transactions,
    stats: {
      newCount: transactions.length,
      duplicateCount,
      completedCount: completed.length,
      pendingCount: pending.length
    },
    originalFilename
  };
}

/* ---------- Confirm Import (writes to DB) ---------- */

export function confirmImport({ transactions, originalFilename }) {
  let imported = 0;
  let duplicatesSkipped = 0;
  let updatedFromPending = 0;

  for (const tx of transactions) {
    if (tx.isDuplicate) {
      duplicatesSkipped++;
      continue;
    }

    const existing = getTransactionByHash(tx.txHash);
    if (existing) {
      if (existing.is_pending && !tx.isPending) {
        updatePendingToCompleted(tx.txHash, {
          categoryId: tx.finalCategoryId,
          amount: tx.amount,
          amountByn: tx.amountByn,
          bankCategory: tx.bankCategory
        });
        updatedFromPending++;
      } else {
        duplicatesSkipped++;
      }
      continue;
    }

    createTransaction({
      accountId: tx.accountId,
      categoryId: tx.finalCategoryId,
      txDate: tx.txDate,
      description: tx.description,
      amount: tx.amount,
      amountByn: tx.amountByn,
      currency: tx.currency,
      txType: tx.txType,
      txHash: tx.txHash,
      bankCategory: tx.bankCategory,
      isPending: tx.isPending
    });

    if (tx.isPending) {
      createPending({
        accountId: tx.accountId,
        txDate: tx.txDate,
        description: tx.description,
        amount: tx.amount,
        amountByn: tx.amountByn,
        currency: tx.currency,
        txHash: tx.txHash,
        bankCategory: tx.bankCategory
      });
    }

    imported++;
  }

  const upload = createUpload({
    filename: originalFilename,
    importedCount: imported,
    duplicatesSkipped,
    updatedFromPending
  });

  return {
    imported,
    duplicatesSkipped,
    updatedFromPending,
    uploadId: upload.id
  };
}

/* ---------- Legacy direct import (used by CLI) ---------- */

export function importStatement({ completed = [], pending = [], originalFilename = 'upload.csv' } = {}) {
  const preview = previewImport({ completed, pending, originalFilename });
  return confirmImport({ transactions: preview.transactions, originalFilename });
}
