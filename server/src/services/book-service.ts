import type { AppContext } from '../app-context.js';
import { requireViewPermission } from '../api/authorization.js';

export interface BalanceSummary {
    name: string;
    cumulativeBalanceText: string;
}

export interface BookBalancesResult {
    book: bkper.Book;
    balances: BalanceSummary[];
}

const UNNAMED_BALANCE_CONTAINER = 'Unnamed account';

export async function getBookBalances(
    context: AppContext,
    bookId: string
): Promise<BookBalancesResult> {
    const book = await context.bkper.getBook(bookId);
    requireViewPermission(book);
    const report = await book.getBalancesReport('');

    return {
        book: book.json(),
        balances: report.getBalancesContainers().map(container => ({
            name: container.getName() ?? UNNAMED_BALANCE_CONTAINER,
            cumulativeBalanceText: container.getCumulativeBalanceText(),
        })),
    };
}
