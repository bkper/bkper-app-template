import type { Book } from 'bkper-js';
import type { AppContext } from '../app-context.js';

export interface BookSummary {
    id: string;
    name: string;
}

export interface BalanceContainerSummary {
    name: string;
    cumulativeBalanceText: string;
}

export interface BookBalancesResult {
    book: BookSummary;
    balances: BalanceContainerSummary[];
}

const UNTITLED_BOOK_NAME = 'Untitled book';
const UNNAMED_BALANCE_CONTAINER = 'Unnamed account';

export async function listBooks(context: AppContext): Promise<BookSummary[]> {
    const books = await context.bkper.getBooks();

    return books.map(toBookSummary).filter((book): book is BookSummary => Boolean(book));
}

export async function getBookBalances(
    context: AppContext,
    bookId: string
): Promise<BookBalancesResult> {
    const book = await context.bkper.getBook(bookId);
    const report = await book.getBalancesReport('');

    return {
        book: toBookSummary(book) ?? { id: bookId, name: UNTITLED_BOOK_NAME },
        balances: report.getBalancesContainers().map(container => ({
            name: container.getName() ?? UNNAMED_BALANCE_CONTAINER,
            cumulativeBalanceText: container.getCumulativeBalanceText(),
        })),
    };
}

function toBookSummary(book: Book): BookSummary | undefined {
    const id = book.getId();
    if (!id) {
        return undefined;
    }

    return {
        id,
        name: book.getName() ?? UNTITLED_BOOK_NAME,
    };
}
