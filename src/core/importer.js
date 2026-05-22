import { createHash } from 'node:crypto';
import {
  createAccount, getAccountByNumber,
  createCategory, getCategoryByName,
  createTransaction, getTransactionByHash, updatePendingToCompleted,
  createPending, createUpload
} from './repository.js';

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

export function importStatement({ completed = [], pending = [], originalFilename = 'upload.csv' } = {}) {
  let imported = 0;
  let duplicatesSkipped = 0;
  let updatedFromPending = 0;

  const accountCache = {};
  const categoryCache = {};

  function getAccountCached(accountNumber) {
    if (!accountCache[accountNumber]) {
      accountCache[accountNumber] = resolveAccount(accountNumber);
    }
    return accountCache[accountNumber];
  }

  function getCategoryCached(bankCategoryName) {
    if (!bankCategoryName) return null;
    if (!categoryCache[bankCategoryName]) {
      categoryCache[bankCategoryName] = resolveCategory(bankCategoryName);
    }
    return categoryCache[bankCategoryName];
  }

  // Process completed transactions
  for (const tx of completed) {
    const account = getAccountCached(tx.accountNumber);
    const bankCategory = getCategoryCached(tx.bankCategory);
    const txHash = computeHash({
      txDate: tx.txDate,
      amount: tx.amount,
      currency: tx.currency,
      description: tx.description,
      accountId: account.id
    });

    const existing = getTransactionByHash(txHash);
    if (existing) {
      if (existing.is_pending) {
        // Convert pending to completed
        updatePendingToCompleted(txHash, {
          categoryId: bankCategory?.id || null,
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
      accountId: account.id,
      categoryId: bankCategory?.id || null,
      txDate: tx.txDate,
      description: tx.description,
      amount: tx.amount,
      amountByn: tx.amountByn,
      currency: tx.currency,
      txType: tx.txType,
      txHash,
      bankCategory: tx.bankCategory,
      isPending: 0
    });
    imported++;
  }

  // Process pending transactions
  for (const tx of pending) {
    const account = getAccountCached(tx.accountNumber);
    const bankCategory = getCategoryCached(tx.bankCategory);
    const txHash = computeHash({
      txDate: tx.txDate,
      amount: tx.amount,
      currency: tx.currency,
      description: tx.description,
      accountId: account.id
    });

    const existing = getTransactionByHash(txHash);
    if (existing) {
      duplicatesSkipped++;
      continue;
    }

    // Create as pending transaction
    createTransaction({
      accountId: account.id,
      categoryId: bankCategory?.id || null,
      txDate: tx.txDate,
      description: tx.description,
      amount: tx.amount,
      amountByn: tx.amountByn,
      currency: tx.currency,
      txType: tx.txType,
      txHash,
      bankCategory: tx.bankCategory,
      isPending: 1
    });

    // Also insert into pending_transactions table for reference
    createPending({
      accountId: account.id,
      txDate: tx.txDate,
      description: tx.description,
      amount: tx.amount,
      amountByn: tx.amountByn,
      currency: tx.currency,
      txHash,
      bankCategory: tx.bankCategory
    });
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
