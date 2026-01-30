import type { Book } from 'bkper-js';
import type { EventResult } from '@my-app/shared';
import { buildBookAnchor } from '@my-app/shared';

/**
 * Handles TRANSACTION_CHECKED events.
 * 
 * This event fires when a user marks a transaction as reconciled (checked).
 * Common use cases:
 * - Mirror the check to connected books
 * - Trigger downstream processing
 * - Update external systems
 */
export async function handleTransactionChecked(
  book: Book,
  event: bkper.Event
): Promise<EventResult> {
  if (!event.data) {
    return { result: false };
  }

  const operation = event.data.object as bkper.TransactionOperation;
  const transaction = operation.transaction;

  if (!transaction || !transaction.posted) {
    return { result: false };
  }

  // Prevent bot loops - don't process transactions created by this bot
  const agentId = event.agent?.id;
  if (agentId === 'my-app') {
    return { result: false };
  }

  // Your logic here
  console.log(`Transaction checked: ${transaction.id}`);
  console.log(`Date: ${transaction.date}`);
  console.log(`Amount: ${transaction.amount}`);
  console.log(`Description: ${transaction.description}`);

  const bookId = book.getId();
  const bookName = book.getName() ?? 'Unknown Book';
  
  if (!bookId) {
    return { result: false };
  }

  const bookAnchor = buildBookAnchor(bookId, bookName);
  
  return {
    result: `${bookAnchor}: CHECKED ${transaction.date} ${transaction.amount}`,
  };
}
