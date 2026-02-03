/**
 * Formats an amount with the specified number of decimal places.
 */
export function formatAmount(amount: number, decimals: number = 2): string {
    return amount.toFixed(decimals);
}

/**
 * Builds an HTML anchor link to a Bkper book.
 */
export function buildBookAnchor(bookId: string, bookName: string): string {
    return `<a href='https://app.bkper.com/b/#transactions:bookId=${bookId}'>${bookName}</a>`;
}
