import { Book, Transaction } from 'bkper-js';
import type { EventResult } from '../types.js';

/**
 * Handles TRANSACTION_CHECKED events.
 *
 * This example creates a draft transaction with 20% of the original amount,
 * moving resources between the same two accounts as the checked transaction.
 */
export async function handleTransactionChecked(
    book: Book,
    event: bkper.Event
): Promise<EventResult> {
    if (!event.data) {
        return { result: false };
    }

    const operation = event.data.object as bkper.TransactionOperation | undefined;
    const transactionPayload = operation?.transaction;

    if (!transactionPayload || !transactionPayload.posted) {
        return { result: false };
    }

    if (event.agent?.id === 'my-app') {
        return { result: false };
    }

    const originalAmount = Number(transactionPayload.amount) || 0;
    const originalDescription = transactionPayload.description || 'transaction';
    const originalDate = transactionPayload.date;

    if (!transactionPayload.creditAccount || !transactionPayload.debitAccount || !originalDate) {
        return { result: false };
    }

    if (originalAmount === 0) {
        return { result: false };
    }

    const newAmount = originalAmount * 0.2;

    const draft = new Transaction(book)
        .setDate(originalDate)
        .setAmount(newAmount)
        .setDescription(`20% of ${originalDescription}`)
        .setCreditAccount(transactionPayload.creditAccount)
        .setDebitAccount(transactionPayload.debitAccount);

    await draft.create();

    const formattedAmount = newAmount.toFixed(book.getFractionDigits() ?? 2);

    return {
        result: `Created draft: 20% of ${originalDescription} - ${formattedAmount}`,
    };
}
