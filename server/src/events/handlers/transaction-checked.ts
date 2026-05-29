import { Book } from 'bkper-js';
import { createPercentageDraft } from '../../services/transaction-draft-service.js';
import type { EventResult } from '../types.js';

const APP_AGENT_ID = 'my-app';

/**
 * Handles TRANSACTION_CHECKED events.
 *
 * This adapter reads the event payload and delegates the app behavior to the service layer.
 */
export async function handleTransactionChecked(
    book: Book,
    event: bkper.Event
): Promise<EventResult> {
    if (event.agent?.id === APP_AGENT_ID) {
        return { result: false };
    }

    const transactionPayload = getPostedTransaction(event);
    if (!transactionPayload) {
        return { result: false };
    }

    const originalAmount = Number(transactionPayload.amount) || 0;
    if (originalAmount === 0) {
        return { result: false };
    }

    const originalDescription = transactionPayload.description || 'transaction';
    const originalDate = transactionPayload.date;
    const fromAccount = transactionPayload.creditAccount;
    const toAccount = transactionPayload.debitAccount;

    if (!fromAccount || !toAccount || !originalDate) {
        return { result: false };
    }

    const draft = await createPercentageDraft({
        book,
        date: originalDate,
        amount: originalAmount,
        description: originalDescription,
        fromAccount,
        toAccount,
    });

    return {
        result: `Created draft: ${draft.description} - ${draft.formattedAmount}`,
    };
}

function getPostedTransaction(event: bkper.Event): bkper.Transaction | undefined {
    const operation = event.data?.object as bkper.TransactionOperation | undefined;
    const transactionPayload = operation?.transaction;

    if (!transactionPayload || !transactionPayload.posted) {
        return undefined;
    }

    return transactionPayload;
}
