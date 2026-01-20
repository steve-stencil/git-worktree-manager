/**
 * Terminal output formatting with colors
 */

import chalk from 'chalk';

export const colors = {
  success: chalk.green,
  warning: chalk.yellow,
  error: chalk.red,
  info: chalk.blue,
  cyan: chalk.cyan,
  bold: chalk.bold,
  dim: chalk.dim,
};

/**
 * Print a formatted header
 */
export function printHeader(title: string): void {
  console.log('');
  console.log(colors.bold(colors.info('═'.repeat(60))));
  console.log(colors.bold(colors.info(`  ${title}`)));
  console.log(colors.bold(colors.info('═'.repeat(60))));
  console.log('');
}

/**
 * Print a section header
 */
export function printSection(title: string): void {
  console.log(`\n${colors.cyan(`── ${title} ──`)}\n`);
}

/**
 * Print success message
 */
export function printSuccess(message: string): void {
  console.log(colors.success(`✅ ${message}`));
}

/**
 * Print warning message
 */
export function printWarning(message: string): void {
  console.log(colors.warning(`⚠ ${message}`));
}

/**
 * Print error message
 */
export function printError(message: string): void {
  console.error(colors.error(`Error: ${message}`));
}

/**
 * Print a tip
 */
export function printTip(message: string): void {
  console.log(colors.cyan(`Tip: ${message}`));
}

/**
 * Format a table row
 */
export function formatRow(columns: string[], widths: number[]): string {
  return columns.map((col, i) => col.slice(0, widths[i]).padEnd(widths[i] ?? 10)).join(' ');
}

/**
 * Print a table
 */
export function printTable(headers: string[], rows: string[][], widths: number[]): void {
  console.log(formatRow(headers, widths));
  console.log(formatRow(headers.map((h) => '─'.repeat(h.length)), widths));
  for (const row of rows) {
    console.log(formatRow(row, widths));
  }
}
