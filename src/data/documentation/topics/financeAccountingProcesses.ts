import type { DocTopic } from '../types';

export const financeAccountingTopics: DocTopic[] = [
  {
    id: 'chart-of-accounts',
    categoryId: 'finance',
    title: 'Chart of Accounts (COA) Structure & Account Codes',
    shortTitle: 'Chart of Accounts',
    description: 'Structure of primary asset, liability, equity, income, and expense accounts adhering to international financial reporting standards.',
    iconName: 'BookOpen',
    tags: ['coa', 'chart of accounts', 'ledger', 'accounting', 'assets', 'liabilities', 'equity', 'expense', 'revenue'],
    relatedRoutes: [
      { label: 'Chart of Accounts', path: '/admin/admin/chart-of-accounts' },
      { label: 'General Ledger', path: '/admin/admin/general-ledger' }
    ],
    sections: [
      {
        id: 'account-code-hierarchy',
        title: 'Account Code Structure',
        content: 'The OlaCars accounting system enforces a standard 5-digit numbering system:',
        steps: [
          {
            stepNumber: 1,
            title: '10000 - Assets',
            description: '11000 Current Assets (Cash, Bank Accounts, Accounts Receivable), 15000 Fixed Assets (Vehicles Fleet, Workshop Machinery, Office Furniture), 16000 Accumulated Depreciation.',
            expectedOutcome: 'Normal Balance: DEBIT.'
          },
          {
            stepNumber: 2,
            title: '20000 - Liabilities',
            description: '21000 Accounts Payable (Vendors), 22000 Driver Security Deposits, 23000 VAT Output / Input Tax Payable, 24000 Vehicle Bank Financing Loans.',
            expectedOutcome: 'Normal Balance: CREDIT.'
          },
          {
            stepNumber: 3,
            title: '30000 - Equity',
            description: '31000 Shareholder Capital, 32000 Retained Earnings, 33000 Current Year Earnings.',
            expectedOutcome: 'Normal Balance: CREDIT.'
          },
          {
            stepNumber: 4,
            title: '40000 - Operating Revenue',
            description: '41000 Vehicle Rental Income, 42000 Excess Mileage Income, 43000 Late Payment Fee Income, 44000 Scrap Sales.',
            expectedOutcome: 'Normal Balance: CREDIT.'
          },
          {
            stepNumber: 5,
            title: '50000 - Direct & Operating Expenses',
            description: '51000 Vehicle Depreciation, 52000 Fleet Insurance Expense, 53000 Workshop Spare Parts Cost, 54000 Fuel & Toll Fees, 55000 Staff Salaries & Admin Overhead.',
            expectedOutcome: 'Normal Balance: DEBIT.'
          }
        ],
        tips: [
          'Sub-accounts inherit currency and tax rules from their parent classification.',
          'Accounts with existing posted ledger transactions cannot be deleted to maintain audit integrity.'
        ]
      }
    ]
  },
  {
    id: 'bank-account-ledger-actions',
    categoryId: 'finance',
    title: 'Bank Account Ledger: Actions Menu & Operational Flows',
    shortTitle: 'Bank Ledger Actions',
    description: 'Comprehensive operational guide for the Bank Account Ledger three-dots action menu: Record Payment, Export PDF/Excel, Bulk Re-entry, Statement Import, and Balance Recalculation.',
    iconName: 'Building2',
    tags: [
      'bank ledger',
      'record payment',
      'bulk re-entry',
      'import statement',
      'recalculate balances',
      'export pdf',
      'export excel',
      'auto set-off',
      'customer advance'
    ],
    relatedRoutes: [
      { label: 'Manage Bank Accounts', path: '/admin/admin/bank-accounts' },
      { label: 'Bulk Bank Upload', path: '/admin/admin/bulk-bank-upload' }
    ],
    sections: [
      {
        id: 'actions-menu-overview',
        title: 'Actions Dropdown Menu Overview',
        content: 'When viewing any Bank Account or Cash Drawer Ledger, clicking the top-right three-dots button (⋮) displays 6 operational tools designed for day-to-day transaction processing, audit exports, and batch data synchronizations.',
        tips: [
          'All actions are scoped to the currently opened bank account and update its running balance upon completion.',
          'Transactions before the locked period (e.g. historical baseline) are protected against accidental modifications.'
        ]
      },
      {
        id: 'record-payment-flow',
        title: '1. Record Payment (Money In & Money Out Flow)',
        content: 'Clicking "+ Record Payment" opens the transaction recording modal. It supports two entry modes with automated settlement calculations:',
        steps: [
          {
            stepNumber: 1,
            title: 'Choose Entry Type: RECEIPT (Money In) vs PAYMENT (Money Out)',
            description: 'Select RECEIPT when receiving customer/driver rental fees or inter-bank deposits. Select PAYMENT when disbursing vendor bill settlements, staff expenses, or withdrawals.',
            expectedOutcome: 'Form dynamically adjusts contact selectors and offset accounts.'
          },
          {
            stepNumber: 2,
            title: 'Customer Auto Set-Off (Oldest Invoice First Allocation)',
            description: 'In RECEIPT mode, searching a Customer loads their open rental invoices sorted by oldest first. The system automatically calculates settlements. If the received sum exceeds total open invoice debt, the surplus is automatically classified into the Customer Advance Account as store credit for upcoming invoices.',
            expectedOutcome: 'Invoices marked PAID or PARTIAL; customer balance updated.'
          },
          {
            stepNumber: 3,
            title: 'Vendor Auto Set-Off Simulation',
            description: 'In PAYMENT mode, selecting a Supplier triggers a live bill allocation simulation across: 1) Overdue Bills (prioritized by oldest due date), 2) Partially Paid Bills, 3) Open Bills. Any remaining payment balance is held as unallocated vendor credit.',
            expectedOutcome: 'Bills updated to PAID or PARTIALLY_PAID.'
          },
          {
            stepNumber: 4,
            title: 'Specify Payment Details & Attach Proof',
            description: 'Enter Deposit Date, Payment Mode (Bank Transfer, Cash, Card, Cheque), Currency, and Description. Attach supporting receipts or bank slips directly to the transaction record.',
            expectedOutcome: 'Full audit record posted to the bank ledger.'
          }
        ],
        warnings: [
          'Either a valid Contact (Customer/Vendor) or a destination account from the Chart of Accounts must be selected before submitting.'
        ]
      },
      {
        id: 'export-statement-pdf-excel',
        title: '2 & 3. Export PDF & Export Excel',
        content: 'Provides branded formal reports and audit-grade raw data exports:',
        steps: [
          {
            stepNumber: 1,
            title: 'Export PDF (Official Statement)',
            description: 'Clicking "Export PDF" opens a date range modal. Choose custom From/To dates or leave default. The engine generates an official branded statement featuring header bank credentials, transaction narrations, reference numbers, debit/credit entries, and the running balance column.',
            expectedOutcome: 'Instant PDF download of your official branded bank statement.'
          },
          {
            stepNumber: 2,
            title: 'Export Excel (Spreadsheet)',
            description: 'Clicking "Export Excel" extracts up to 25,000 ledger transactions filtered by your current search query and date scope into a clean spreadsheet.',
            expectedOutcome: 'Spreadsheet includes: Date (DD/MM/YYYY), Description, Debit (Withdrawals), Credit (Deposits), and Running Balance.'
          }
        ]
      },
      {
        id: 'bulk-re-entry-engine',
        title: '4. Bulk Re-entry (Historical Catch-up & Batch Engine)',
        content: 'Clicking "Bulk Re-entry" navigates to the Bulk Bank Upload Engine, pre-filtered to the current bank account.',
        steps: [
          {
            stepNumber: 1,
            title: 'When to Use Bulk Re-entry',
            description: 'Used when catching up on back-dated months of bank statements, importing bulk historical transactions, or restructuring ledger records across multiple accounts.',
            expectedOutcome: 'Opens the high-volume spreadsheet importer interface.'
          },
          {
            stepNumber: 2,
            title: 'In-Grid Review & Inline Fixes',
            description: 'Once uploaded, transactions appear in a spreadsheet-like editor. You can click any cell to re-assign an accounting code, switch transaction type (Debit/Credit), or link customers/suppliers directly in the browser.',
            expectedOutcome: 'Errors can be resolved without re-exporting the Excel file.'
          },
          {
            stepNumber: 3,
            title: 'Batch Posting',
            description: 'Click "Save & Post All Entries". All validated rows post simultaneously and trigger automated sequential balance calculation.',
            expectedOutcome: 'Hundreds of bank ledger lines recorded within seconds.'
          }
        ]
      },
      {
        id: 'import-statement-reconciliation',
        title: '5. Import Statement & Automated Invoice / Bill Settlement',
        content: 'Clicking "Import Statement" launches the automated bank statement reconciliation tool to import electronic bank statements and automatically settle open customer invoices and vendor bills:',
        steps: [
          {
            stepNumber: 1,
            title: 'Accepted File Formats & Headers',
            description: 'Upload your electronic bank statement (in Excel or CSV format). The system automatically recognizes common header variations: Date, Withdrawals or Debits, Deposits or Credits, Payee, Description or Narration, Reference or Cheque Number, Driver Name, and Supplier Name.',
            expectedOutcome: 'Columns mapped automatically without manual template editing.'
          },
          {
            stepNumber: 2,
            title: 'Automated Customer & Driver Invoice Settlement',
            description: 'When an incoming deposit belongs to an identified Driver or Customer, the system automatically checks all their open invoices. It prioritizes overdue invoices first (from oldest due date to newest), followed by partially paid invoices, and finally pending current invoices.',
            expectedOutcome: 'Oldest overdue and partial invoices cleared first without manual matching.'
          },
          {
            stepNumber: 3,
            title: 'Invoice Balance Reduction & Official Receipt',
            description: 'As the deposit amount is applied across the invoices, each invoice balance is reduced. Invoices paid in full are marked as Paid, and an official Payment Receipt voucher is created to link all settled bills together.',
            expectedOutcome: 'Invoices updated to Paid or Partially Paid with payment history attached.'
          },
          {
            stepNumber: 4,
            title: 'Surplus Excess Routed to Customer Advance',
            description: 'If the statement deposit exceeds the customer\'s total unpaid invoice debt, the remaining surplus is not lost. It is automatically credited to the Customer Advance account, creating an account credit that can be applied to future invoices.',
            expectedOutcome: 'Full deposit reconciled with customer advance credit.'
          },
          {
            stepNumber: 5,
            title: 'Automated Vendor Bill Settlement',
            description: 'When an outgoing payment is matched to a known Supplier, the system automatically pays off open vendor purchase bills in order of oldest due date, reducing your accounts payable balance.',
            expectedOutcome: 'Vendor bills marked as paid.'
          },
          {
            stepNumber: 6,
            title: 'Clear Transaction Descriptions & Driver Toggle',
            description: 'The ledger entry description is automatically stamped with the exact invoice numbers that were settled. Additionally, you can turn off the driver auto-settlement toggle in the upload window if you prefer to record raw bank ledger entries without touching open rental invoices.',
            expectedOutcome: 'Clear audit trail stamped on every bank transaction.'
          }
        ],
        tips: [
          'The automated settlement engine ensures that every incoming dollar is accounted for, either paying off an active invoice or credited as an advance prepayment.'
        ],
        warnings: [
          'If your bank statement lists both money in and money out in a single "Amount" column with plus and minus signs, separate them into distinct Deposit and Withdrawal columns before uploading.'
        ]
      },
      {
        id: 'recalculate-balances-algorithm',
        title: '6. Recalculate Balances (Sequential Running Balance Engine)',
        content: 'Clicking "Recalculate Balances" initiates a balance integrity check across all transactions in the bank account:',
        steps: [
          {
            stepNumber: 1,
            title: 'Why Running Balances Require Recalculation',
            description: 'When users insert back-dated transactions, edit past entry amounts, or remove unlocked historical rows, subsequent transactions might show outdated running balances.',
            expectedOutcome: 'The system recalculates the timeline starting from the account opening balance.'
          },
          {
            stepNumber: 2,
            title: 'Chronological Sort & Walkthrough',
            description: 'The system organizes all transactions by date from oldest to newest. It computes: Running Balance = Previous Balance + Deposits (Money In) - Withdrawals (Money Out).',
            expectedOutcome: 'Every transaction row receives an exact, verified running balance.'
          },
          {
            stepNumber: 3,
            title: 'Live Confirmation',
            description: 'The button icon animates while recalculating. Once complete, a success notification appears stating "Running balances recalculated successfully!" and the ledger refreshes.',
            expectedOutcome: 'Ending ledger balance matches the verified bank header balance.'
          }
        ]
      }
    ]
  },
  {
    id: 'general-ledger-manual-journals',
    categoryId: 'finance',
    title: 'General Ledger & Manual Journal Entries',
    shortTitle: 'General Ledger & Journals',
    description: 'Recording multi-line double-entry adjustment journals, month-end depreciation, accruals, and ledger inspection.',
    iconName: 'Calculator',
    tags: ['journal', 'manual journal', 'general ledger', 'debit', 'credit', 'depreciation', 'accruals'],
    relatedRoutes: [
      { label: 'General Ledger', path: '/admin/admin/general-ledger' },
      { label: 'Manual Journals', path: '/admin/admin/manual-journals' },
      { label: 'Create Journal', path: '/admin/admin/manual-journals/create' }
    ],
    sections: [
      {
        id: 'manual-journal-process',
        title: 'Posting a Manual Journal Entry',
        content: 'Follow these steps when making accounting adjustments or month-end accruals:',
        steps: [
          {
            stepNumber: 1,
            title: 'Start Journal Entry',
            description: 'Navigate to Financial Accounting > Manual Journals and click "+ Create Journal".',
            expectedOutcome: 'Journal creation editor displays with balanced debit/credit lines.'
          },
          {
            stepNumber: 2,
            title: 'Enter Date & Reference Description',
            description: 'Provide an informative narration (e.g., "Month-End Vehicle Fleet Depreciation for October 2026").',
            expectedOutcome: 'Journal header recorded.'
          },
          {
            stepNumber: 3,
            title: 'Add Debit and Credit Accounts',
            description: 'Select accounts from the Chart of Accounts dropdown. Enter the exact Debit and Credit amounts. You can attach supporting invoices or schedules.',
            expectedOutcome: 'Total Debits must equal Total Credits (Difference = 0.00).'
          },
          {
            stepNumber: 4,
            title: 'Review & Post',
            description: 'Click "Post Journal". Unbalanced journals are strictly rejected by the client and API validators.',
            expectedOutcome: 'Permanent ledger transaction created; account running balances update instantaneously.'
          }
        ],
        warnings: [
          'Once posted, journals cannot be deleted. Any corrections must be posted as a reversing journal entry.'
        ]
      }
    ]
  },
  {
    id: 'banking-reconciliation-vouchers',
    categoryId: 'finance',
    title: 'Bank Accounts, Payment Vouchers & Reconciliation',
    shortTitle: 'Banking & Payment Vouchers',
    description: 'Managing corporate bank accounts, issuing verified payment vouchers, and reconciling statements against system records.',
    iconName: 'Building2',
    tags: ['banking', 'bank account', 'vouchers', 'payment voucher', 'reconciliation', 'cheque'],
    relatedRoutes: [
      { label: 'Bank Accounts', path: '/admin/admin/bank-accounts' },
      { label: 'Voucher Dashboard', path: '/admin/admin/vouchers' },
      { label: 'Create Voucher', path: '/admin/admin/vouchers/create' }
    ],
    sections: [
      {
        id: 'payment-voucher-workflow',
        title: 'Payment Voucher Lifecycle',
        content: 'All direct disbursements (supplier payments, office expenses, driver deposit refunds) require an authorized Payment Voucher.',
        steps: [
          {
            stepNumber: 1,
            title: 'Create Voucher Request',
            description: 'Select Payee (Vendor, Staff, or Driver), specify Disbursement Bank Account, and enter Amount.',
            expectedOutcome: 'Voucher drafted in "Pending Approval" state.'
          },
          {
            stepNumber: 2,
            title: 'Dual Approval Authorization',
            description: 'Financial Admin or Executive signs off the voucher verification after cross-checking original invoices.',
            expectedOutcome: 'Voucher marked "Approved".'
          },
          {
            stepNumber: 3,
            title: 'Disbursement & Clearance',
            description: 'Issue wire transfer or cheque. Mark as "Paid" with bank reference number to credit Bank Account and debit Accounts Payable.',
            expectedOutcome: 'Bank balance ledger updated.'
          }
        ]
      },
      {
        id: 'bank-reconciliation',
        title: 'Bank Statement Reconciliation',
        content: 'Navigate to Bank Accounts > Select Account > "Reconcile". Upload the electronic bank statement (.CSV or .OFX). Match bank lines against system transactions to clear discrepancies and detect unrecorded bank fees.'
      }
    ]
  }
];
