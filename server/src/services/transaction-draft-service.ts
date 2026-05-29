import { Book, Transaction } from 'bkper-js';

const DEFAULT_PERCENTAGE = 0.2;

export interface PercentageDraftInput {
    book: Book;
    date: string;
    amount: number;
    description: string;
    fromAccount: bkper.Account;
    toAccount: bkper.Account;
    percentage?: number;
}

export interface PercentageDraftResult {
    description: string;
    amount: number;
    formattedAmount: string;
}

/**
 * Creates a draft that moves a percentage of the original resources
 * between the same origin and destination accounts.
 */
export async function createPercentageDraft(
    input: PercentageDraftInput
): Promise<PercentageDraftResult> {
    const percentage = input.percentage ?? DEFAULT_PERCENTAGE;
    const amount = input.amount * percentage;
    const description = `${formatPercentage(percentage)} of ${input.description}`;

    const draft = new Transaction(input.book)
        .setDate(input.date)
        .setAmount(amount)
        .setDescription(description)
        .from(input.fromAccount)
        .to(input.toAccount);

    await draft.create();

    return {
        description,
        amount,
        formattedAmount: amount.toFixed(input.book.getFractionDigits() ?? 2),
    };
}

function formatPercentage(percentage: number): string {
    const value = percentage * 100;
    if (Number.isInteger(value)) {
        return `${value}%`;
    }

    return `${value.toFixed(2).replace(/\.?0+$/, '')}%`;
}
