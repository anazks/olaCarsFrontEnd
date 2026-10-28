import type { DocTopic } from '../types';

export const bulkHubTopics: DocTopic[] = [
  {
    id: 'bulk-upload-hub',
    categoryId: 'bulk',
    title: 'Bulk Upload Hub, File Specifications & Architecture',
    shortTitle: 'Bulk Hub Overview',
    description: 'Instructions for bulk importing Vehicles, Drivers, Invoices, Bills, Ledgers, and Customer records using verified Excel and CSV templates.',
    iconName: 'UploadCloud',
    tags: ['bulk', 'upload', 'import', 'excel', 'csv', 'templates', 'migration', 'batch'],
    relatedRoutes: [
      { label: 'Bulk Uploads Hub', path: '/admin/admin/bulk-uploads' }
    ],
    sections: [
      {
        id: 'supported-bulk-modules',
        title: 'Supported Bulk Upload Modules',
        content: 'The Bulk Hub provides dedicated upload pipelines for high-volume operational and historical data:',
        steps: [
          {
            stepNumber: 1,
            title: 'Bulk Vehicle Upload',
            description: 'Import multiple fleet vehicles with License Plate, VIN, Make, Model, Year, Color, and Branch assignment.',
            expectedOutcome: 'Validates unique vehicle VINs before adding cars to the fleet.'
          },
          {
            stepNumber: 2,
            title: 'Bulk Driver Upload',
            description: 'Batch upload driver personal details, contact information, national IDs, and initial statuses.',
            expectedOutcome: 'Generates driver profiles ready for document attachment.'
          },
          {
            stepNumber: 3,
            title: 'Bulk Ledger & Journal Upload',
            description: 'Import opening general ledger balances or bulk monthly transaction batches.',
            expectedOutcome: 'Verifies that total debits equal total credits across the batch.'
          },
          {
            stepNumber: 4,
            title: 'Bulk Invoice & Payment Upload',
            description: 'Batch process recurring lease invoices or bank remittance payment allocations.',
            expectedOutcome: 'Invoices created and posted directly to Accounts Receivable.'
          }
        ]
      },
      {
        id: 'template-standards',
        title: 'File Preparation & Formatting Guidelines',
        content: 'Follow these guidelines to avoid file processing failures:',
        tips: [
          'Always click "Download Sample Template" on each upload card before compiling data.',
          'Do not rename, delete, or rearrange column header names in the template.',
          'Dates must adhere to YYYY-MM-DD or DD/MM/YYYY format consistently throughout the sheet.',
          'Currency and numerical values must not include currency symbols ($ or AED) or comma thousand separators.'
        ],
        warnings: [
          'If any row contains a critical validation failure (such as an unassigned branch or duplicate VIN), the system reports line numbers with detailed error descriptions for correction.'
        ]
      }
    ]
  },
  {
    id: 'bulk-bank-ledger-upload',
    categoryId: 'bulk',
    title: 'Bulk Bank Ledger Importer & Re-entry Engine',
    shortTitle: 'Bank Ledger Importer Guide',
    description: 'Detailed operational manual for uploading bank statements: file formatting, column headers, real-time validation checks, inline grid edits, and automatic invoice set-off.',
    iconName: 'FileSpreadsheet',
    tags: [
      'bulk bank upload',
      'bulk re-entry',
      'import statement',
      'validation errors',
      'template headers',
      'auto set-off',
      'excel upload',
      'reconciliation'
    ],
    relatedRoutes: [
      { label: 'Bulk Bank Importer', path: '/admin/admin/bulk-bank-upload' },
      { label: 'Bank Accounts', path: '/admin/admin/bank-accounts' }
    ],
    sections: [
      {
        id: 'file-upload-specifications',
        title: 'Template Columns & Header Specifications',
        content: 'The Bulk Bank Importer processes files containing 13 standardized columns. Download the official sample template from the page header before compiling batches:',
        steps: [
          {
            stepNumber: 1,
            title: 'DATE (Mandatory)',
            description: 'Transaction execution date in DD-MM-YYYY or YYYY-MM-DD format (for example, 01-06-2026).',
            expectedOutcome: 'Valid transaction date recognized.'
          },
          {
            stepNumber: 2,
            title: 'PREFIX & NUMBER (Optional / Auto-generated)',
            description: 'Accounting voucher sequence or cheque number (for example, Prefix: 2026, Number: 0000001).',
            expectedOutcome: 'Voucher reference code established.'
          },
          {
            stepNumber: 3,
            title: 'BANK NAME (Mandatory)',
            description: 'The registered Bank Account Name or Number. Must match an active Bank Account in your system.',
            expectedOutcome: 'Target bank account matched automatically.'
          },
          {
            stepNumber: 4,
            title: 'ACCOUNTS NAME (Mandatory)',
            description: 'Destination Chart of Accounts code or category (such as Accounts Receivable, Accounts Payable, or the name of a second bank for internal fund transfers).',
            expectedOutcome: 'Balancing ledger account resolved.'
          },
          {
            stepNumber: 5,
            title: 'RECEIPT vs PAYMENT (Amounts)',
            description: 'RECEIPT = Money In (Deposits); PAYMENT = Money Out (Withdrawals). Enter positive decimal numbers (e.g. 250.00). Exactly ONE of Receipt or Payment must be filled per row.',
            expectedOutcome: 'Transaction direction and amount validated.'
          },
          {
            stepNumber: 6,
            title: 'DESCRIPTION & REMARKS',
            description: 'Transaction narration, bank transfer memo, customer reference, or internal remark.',
            expectedOutcome: 'Audit description saved to the ledger.'
          },
          {
            stepNumber: 7,
            title: 'BRANCH, DRIVER NAME, SUPPLIER NAME, CUSTOMER NAME',
            description: 'Used for automatic counterparty matching. Specify the branch name, or enter the Driver, Vendor, or Customer name to enable automatic invoice and bill settlement.',
            expectedOutcome: 'Counterparty recognized with appropriate classification badge.'
          }
        ]
      },
      {
        id: 'automatic-classification-engine',
        title: 'Transaction Type Auto-Classification',
        content: 'The system reviews each uploaded row and applies an interactive classification badge in the review grid:',
        steps: [
          {
            stepNumber: 1,
            title: 'Internal Bank Transfer (Blue Badge)',
            description: 'Triggered when the account name matches another bank account in your system. Automatically posts a transfer between the two bank accounts.',
            expectedOutcome: 'Dual-sided inter-bank transfer recorded.'
          },
          {
            stepNumber: 2,
            title: 'Vendor / Supplier Disbursement (Amber Badge)',
            description: 'Triggered when a supplier name is present or matches a registered vendor. Triggers automatic settlement of open vendor bills.',
            expectedOutcome: 'Vendor payment allocated.'
          },
          {
            stepNumber: 3,
            title: 'Driver Rental Receipt (Purple Badge)',
            description: 'Triggered when the driver name matches an active driver in the registry. Automatically links the payment to the driver\'s weekly rental invoices.',
            expectedOutcome: 'Driver lease payment reconciled.'
          },
          {
            stepNumber: 4,
            title: 'Corporate Customer Receipt (Emerald Badge)',
            description: 'Triggered when the customer name matches a corporate account. Triggers automatic customer invoice matching, with any excess credited to advance deposit.',
            expectedOutcome: 'Accounts receivable balance reduced.'
          }
        ]
      },
      {
        id: 'auto-set-off-invoices-bills-engine',
        title: 'Automated Invoice & Bill Settlement Engine',
        content: 'During bulk statement upload, transactions tagged with a Driver, Customer, or Supplier automatically trigger the invoice and bill settlement engine:',
        steps: [
          {
            stepNumber: 1,
            title: 'Prioritized Invoice Queue',
            description: 'When an incoming deposit is received for a driver or customer, the system reviews all their open unpaid invoices and organizes them into priority order: overdue invoices are settled first (oldest due date to newest), followed by partially paid invoices, and finally pending current invoices.',
            expectedOutcome: 'Oldest debts and overdue invoices cleared first.'
          },
          {
            stepNumber: 2,
            title: 'Sequential Invoice Settlement',
            description: 'The payment amount is applied down the list of invoices. As each invoice balance reaches zero, it is marked as Fully Paid with the settlement date and linked to the payment voucher.',
            expectedOutcome: 'Invoices transition to Paid or Partially Paid status.'
          },
          {
            stepNumber: 3,
            title: 'Payment Receipt Voucher Creation',
            description: 'The system generates an official Payment Receipt voucher that lists every invoice number settled by the deposit, providing a clear audit trail.',
            expectedOutcome: 'Official receipt voucher saved under the customer profile.'
          },
          {
            stepNumber: 4,
            title: 'Surplus Excess Routed to Customer Advance',
            description: 'If the uploaded deposit is greater than the customer\'s total unpaid invoices, the remaining surplus is not lost. It is automatically deposited into the Customer Advance account, ready to pay off future rental weeks.',
            expectedOutcome: 'Excess funds safely stored as customer credit balance.'
          },
          {
            stepNumber: 5,
            title: 'Automated Vendor Bill Settlement',
            description: 'For outgoing supplier payments, the system finds open purchase bills for that vendor and settles them from oldest to newest, debiting Accounts Payable and crediting the Bank Account.',
            expectedOutcome: 'Vendor bills marked paid without manual reconciliation.'
          },
          {
            stepNumber: 6,
            title: 'Driver Auto Set-Off Toggle',
            description: 'In the upload window, you can turn the Driver Auto Set-Off toggle on or off. If turned off, driver deposits are booked directly into the bank ledger without modifying open rental invoice balances.',
            expectedOutcome: 'Full flexibility between automatic invoice settlement and manual bookkeeping.'
          }
        ],
        tips: [
          'The bank transaction description is automatically stamped with the exact invoice numbers that were settled, for example: "Set off: INV-00101, INV-00102".'
        ]
      },
      {
        id: 'error-validation-troubleshooting',
        title: 'Error Validation Matrix & In-Grid Correction',
        content: 'If an uploaded file contains formatting issues, the system highlights problematic rows in red with clear error messages:',
        steps: [
          {
            stepNumber: 1,
            title: 'Unmatched Account Name',
            description: 'Cause: The text in the account column does not match any code or name in your Chart of Accounts. Solution: Click directly on the table cell to open a dropdown list and pick the correct account.',
            expectedOutcome: 'Error clears immediately in the table.'
          },
          {
            stepNumber: 2,
            title: 'Conflicting or Missing Amounts',
            description: 'Cause: Both the Receipt and Payment columns contain numbers, or both are blank. Solution: Click the cell to adjust the value so that only one column has a positive amount.',
            expectedOutcome: 'Amount validated successfully.'
          },
          {
            stepNumber: 3,
            title: 'Invalid Date Format',
            description: 'Cause: The date is blank or written in an unrecognized format. Solution: Enter a standard date (such as 01-06-2026 or 2026-06-01) directly in the table cell.',
            expectedOutcome: 'Date corrected and saved.'
          },
          {
            stepNumber: 4,
            title: 'Excluding Problematic Rows',
            description: 'If a specific row cannot be verified immediately, uncheck its box on the left. Only checked, error-free rows will be imported, allowing you to proceed without delay.',
            expectedOutcome: 'Valid rows imported smoothly without waiting.'
          }
        ],
        tips: [
          'Use the search box above the review table to filter rows by error status, counterparty name, or account.',
          'Always check the total Debits and Credits summary in the top banner before clicking "Commit & Post All".'
        ]
      }
    ]
  }
];
