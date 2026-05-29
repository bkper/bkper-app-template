import { Bkper, Book } from 'bkper-js';

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

export async function listBooks(): Promise<BookSummary[]> {
    const bkper = new Bkper();
    const books = await bkper.getBooks();

    return books.map(toBookSummary).filter((book): book is BookSummary => Boolean(book));
}

export async function getBookBalances(bookId: string): Promise<BookBalancesResult> {
    const bkper = new Bkper();
    const book = await bkper.getBook(bookId);
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
