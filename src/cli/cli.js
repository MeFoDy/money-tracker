#!/usr/bin/env node
import { Command } from 'commander';
import fs from 'node:fs';
import { parseStatement } from '../core/parser.js';
import { importStatement } from '../core/importer.js';
import {
  getSpendingByCategory,
  getMonthlySummary,
  getTopCounterparties,
  getSummaryStats
} from '../core/analytics.js';
import { getTransactions, bulkUpdateCategory } from '../core/repository.js';
import { closeDb } from '../core/db.js';

const program = new Command();

program
  .name('money-tracker')
  .description('Money Tracker CLI')
  .version('1.0.0');

program
  .command('import <file>')
  .description('Импортировать банковскую выписку CSV')
  .action((filePath) => {
    if (!fs.existsSync(filePath)) {
      console.error(JSON.stringify({ error: 'File not found', file: filePath }));
      process.exit(1);
    }
    try {
      const parsed = parseStatement(filePath);
      const result = importStatement({ ...parsed, originalFilename: filePath });
      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      console.error(JSON.stringify({ error: error.message }));
      process.exit(1);
    } finally {
      closeDb();
    }
  });

program
  .command('stats')
  .description('Краткая аналитика в JSON')
  .option('--from <date>', 'Начальная дата YYYY-MM-DD')
  .option('--to <date>', 'Конечная дата YYYY-MM-DD')
  .option('--account <id>', 'ID счета')
  .action((opts) => {
    try {
      const summary = getSummaryStats();
      const monthly = getMonthlySummary({ from: opts.from, to: opts.to, accountId: opts.account });
      const spending = getSpendingByCategory({ from: opts.from, to: opts.to, accountId: opts.account, type: 'expense' });
      const top = getTopCounterparties({ from: opts.from, to: opts.to, accountId: opts.account, type: 'expense', limit: 10 });
      console.log(JSON.stringify({ summary, monthly, spending, top }, null, 2));
    } catch (error) {
      console.error(JSON.stringify({ error: error.message }));
      process.exit(1);
    } finally {
      closeDb();
    }
  });

program
  .command('categorize <id> <categoryId>')
  .description('Назначить категорию транзакции по ID')
  .action((id, categoryId) => {
    try {
      bulkUpdateCategory([Number(id)], Number(categoryId));
      console.log(JSON.stringify({ success: true, transactionId: Number(id), categoryId: Number(categoryId) }));
    } catch (error) {
      console.error(JSON.stringify({ error: error.message }));
      process.exit(1);
    } finally {
      closeDb();
    }
  });

program
  .command('bulk-categorize <query> <categoryId>')
  .description('Назначить категорию по паттерну описания')
  .action((query, categoryId) => {
    try {
      const txs = getTransactions({ search: query, limit: 10_000 });
      const ids = txs.rows.map(r => r.id);
      bulkUpdateCategory(ids, Number(categoryId));
      console.log(JSON.stringify({ success: true, matched: ids.length, categoryId: Number(categoryId) }));
    } catch (error) {
      console.error(JSON.stringify({ error: error.message }));
      process.exit(1);
    } finally {
      closeDb();
    }
  });

program.parse();
