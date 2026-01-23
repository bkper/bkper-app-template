# Bkper App Development

Core knowledge for building Bkper apps using `bkper-js` SDK and Workers for Platforms.

## Bkper Core Concepts

### Data Model

- **Book**: A ledger that tracks resources (money, inventory, etc.) with accounts and transactions
- **Account**: A place where resources accumulate (e.g., Bank, Revenue, Inventory)
- **Transaction**: A movement of resources between two accounts (always debit + credit)
- **Group**: A way to organize accounts (e.g., "Operating Expenses")

### Account Types

| Type | Nature | Balance Behavior |
|------|--------|------------------|
| `ASSET` | Permanent | Increases with debits |
| `LIABILITY` | Permanent | Increases with credits |
| `INCOMING` | Temporary | Increases with credits |
| `OUTGOING` | Temporary | Increases with debits |

### The Zero-Sum Invariant

Every transaction moves an amount FROM one account TO another. The sum of all account balances in a book always equals zero. This is fundamental - never break this invariant.

## bkper-js SDK

### Installation

```bash
bun add bkper-js
```

### Initialization (Cloudflare Workers)

```typescript
import { Bkper, Book } from 'bkper-js';

// Per-request Bkper instance (recommended for Workers)
function createBkper(env: Env, oauthToken?: string): Bkper {
  return new Bkper({
    apiKeyProvider: async () => env.BKPER_API_KEY,
    oauthTokenProvider: async () => oauthToken,
    agentIdProvider: async () => env.BKPER_AGENT_ID,
  });
}
```

### Book Operations

```typescript
// Get a book
const book = await bkper.getBook(bookId);

// With accounts pre-loaded
const book = await bkper.getBook(bookId, true);

// Book properties
book.getName();
book.getDatePattern();      // dd/MM/yyyy | MM/dd/yyyy | yyyy/MM/dd
book.getFractionDigits();   // decimal places (0-8)
book.formatDate(new Date());
book.parseDate("25/01/2024");
book.formatValue(1234.56);
book.round(amount);

// Get accounts
const accounts = await book.getAccounts();
const account = await book.getAccount("Account Name");
```

### Transaction Operations

```typescript
import { Transaction } from 'bkper-js';

// Create and post a transaction
const tx = new Transaction(book)
  .setDate("2024-01-25")
  .setAmount(100.50)
  .from(creditAccount)
  .to(debitAccount)
  .setDescription("Payment #invoice123")
  .setProperty("external_id", "123")
  .addRemoteId("external-system-id");

await tx.create();  // Create as draft
await tx.post();    // Post (affects balances)

// Transaction lifecycle
await tx.check();    // Mark as reconciled
await tx.uncheck();  // Unmark
await tx.trash();    // Move to trash
await tx.update();   // Update

// Query transactions
const txList = await book.listTransactions("account:'Bank' after:2024-01-01");
const transactions = txList.getItems();
```

### Custom Properties

All resources support custom properties for bot integration:

```typescript
// Set/get properties
tx.setProperty("exchange_rate", "1.25");
tx.getProperty("exchange_rate");
account.setProperty("bank_code", "001");
book.getProperty("base_currency");
```

## Event Handling

### Event Types

```typescript
// Transaction events
TRANSACTION_CREATED   // Draft created
TRANSACTION_POSTED    // Posted to accounts
TRANSACTION_CHECKED   // Marked as reconciled
TRANSACTION_UNCHECKED // Unmarked
TRANSACTION_UPDATED   // Modified
TRANSACTION_DELETED   // Trashed
TRANSACTION_RESTORED  // Restored from trash

// Account events
ACCOUNT_CREATED | ACCOUNT_UPDATED | ACCOUNT_DELETED

// Other events
GROUP_CREATED | GROUP_UPDATED | GROUP_DELETED
FILE_CREATED | FILE_UPDATED
BOOK_UPDATED | BOOK_DELETED
```

### Event Handler Pattern

```typescript
import { Hono } from 'hono';
import { Bkper, Book } from 'bkper-js';

const app = new Hono<{ Bindings: Env }>();

app.post('/events', async (c) => {
  const event: bkper.Event = await c.req.json();
  
  const bkper = new Bkper({
    oauthTokenProvider: async () => c.req.header('bkper-oauth-token'),
    agentIdProvider: async () => c.req.header('bkper-agent-id'),
  });
  
  const book = new Book(event.book, bkper.getConfig());
  
  switch (event.type) {
    case 'TRANSACTION_CHECKED':
      return c.json(await handleTransactionChecked(book, event));
    default:
      return c.json({ result: false });
  }
});
```

### TRANSACTION_CHECKED Handler Example

```typescript
async function handleTransactionChecked(
  book: Book, 
  event: bkper.Event
): Promise<Result> {
  const operation = event.data.object as bkper.TransactionOperation;
  const transaction = operation.transaction;

  if (!transaction?.posted) {
    return { result: false };
  }

  // Prevent bot loops
  if (transaction.agentId === 'my-bot-id') {
    return { result: false };
  }

  // Your logic here
  console.log(`Transaction checked: ${transaction.id}`);
  
  return { 
    result: `CHECKED: ${transaction.date} ${transaction.amount}` 
  };
}
```

### Response Format

```typescript
type Result = {
  result?: string | string[] | boolean;  // Success message(s)
  error?: string;                         // Error (red in UI)
  warning?: string;                       // Warning (yellow in UI)
};

// Examples
{ result: false }                              // No action
{ result: "CHECKED: 2024-01-15 100.00" }       // Success
{ result: ["Book A: OK", "Book B: OK"] }       // Multiple
{ error: "Rate not found" }                    // Error
```

## App Configuration (bkperapp.yaml)

```yaml
id: my-app
name: My App
description: Does something useful

logoUrl: https://example.com/logo.svg
website: https://example.com

ownerName: Your Name
ownerWebsite: https://yoursite.com

developers: your-username

# Menu integration
menuUrl: https://${id}.bkper.app?bookId=${book.id}
menuUrlDev: http://localhost:8787?bookId=${book.id}

# Event handling
webhookUrl: https://${id}.bkper.app/events
webhookUrlDev: http://localhost:8788/events
apiVersion: v5
events:
  - TRANSACTION_CHECKED

# Developer tooling
skills:
  autoUpdate: true
  installed:
    - bkper-app-dev
    - bkper-web-dev
```

### Menu URL Variables

| Variable | Description |
|----------|-------------|
| `${book.id}` | Current book ID |
| `${book.properties.xxx}` | Book property value |
| `${account.id}` | Current account ID |
| `${transactions.ids}` | Selected transaction IDs |
| `${transactions.query}` | Current query |

## Common Patterns

### Linking Transactions (remoteId)

```typescript
// Create linked transaction
const mirrorTx = new Transaction(connectedBook)
  .setDate(originalTx.date)
  .setAmount(originalTx.amount)
  .addRemoteId(originalTx.id)  // Link to original
  .post();

// Find linked transaction
const linked = await book
  .listTransactions(`remoteId:${originalTx.id}`)
  .then(list => list.getFirst());
```

### Bot Loop Prevention

```typescript
// Always check agentId to avoid infinite loops
if (transaction.agentId === MY_AGENT_ID) {
  return { result: false };
}
```

### Connected Books

```typescript
// Find related books in a collection
const collection = await book.getCollection();
const connectedBooks = collection?.getBooks() ?? [];

for (const connectedBook of connectedBooks) {
  if (connectedBook.getId() !== book.getId()) {
    // Process connected book
  }
}
```
