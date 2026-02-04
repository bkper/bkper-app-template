import { Book, Transaction } from 'bkper-js';
import type { EventResult } from '@my-app/shared';

/**
 * Handles TRANSACTION_CHECKED events.
 *
 * This event fires when a user marks a transaction as reconciled (checked).
 * This example creates a draft transaction with 20% of the original amount.
 */
export async function handleTransactionChecked(
    book: Book,
    event: bkper.Event
): Promise<EventResult> {
    if (!event.data) {
        return { result: false };
    }

    const operation = event.data.object as bkper.TransactionOperation;
    const transactionPayload = operation.transaction;

    if (!transactionPayload || !transactionPayload.posted) {
        return { result: false };
    }

    // Prevent bot loops - don't process transactions created by this bot
    const agentId = event.agent?.id;
    if (agentId === 'my-app') {
        return { result: false };
    }

    // Get original transaction details
    const originalAmount = Number(transactionPayload.amount) || 0;
    const originalDescription = transactionPayload.description || 'transaction';
    const originalDate = transactionPayload.date;
    const creditAccountName = transactionPayload.creditAccount?.name;
    const debitAccountName = transactionPayload.debitAccount?.name;

    if (!creditAccountName || !debitAccountName || !originalDate) {
        return { result: false };
    }

    // Calculate 20% amount
    const newAmount = originalAmount * 0.2;

    // Create draft transaction
    const draft = new Transaction(book)
        .setDate(originalDate)
        .setAmount(newAmount)
        .setDescription(`20% of ${originalDescription}`)
        .setCreditAccount(transactionPayload.creditAccount)
        .setDebitAccount(transactionPayload.debitAccount);

    await draft.create();

    // Format amount for display
    const formattedAmount = newAmount.toFixed(book.getFractionDigits() ?? 2);

    return {
        result: `Created draft: 20% of ${originalDescription} - ${formattedAmount}`,
    };
}
