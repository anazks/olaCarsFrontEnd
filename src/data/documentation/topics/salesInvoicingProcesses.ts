import type { DocTopic } from '../types';

export const salesInvoicingTopics: DocTopic[] = [
  {
    id: 'customer-management',
    categoryId: 'sales',
    title: 'Customer Onboarding, Corporate Accounts & Fleet Allocations',
    shortTitle: 'Customers & Corporate Accounts',
    description: 'Comprehensive operational guide for onboarding individual and corporate clients, managing credit limits, assigning fleet vehicles, adjusting rental plans, and terminating contracts.',
    iconName: 'Users',
    tags: ['customer', 'client', 'corporate', 'credit limit', 'sales', 'billing', 'prepayment', 'unapplied credit', 'assign vehicle', 'cancel contract', 'edit rent', 'contract weeks', 'rent history'],
    relatedRoutes: [
      { label: 'Manage Customers', path: '/admin/admin/customers' }
    ],
    sections: [
      {
        id: 'customer-types-and-billing',
        title: 'Individual vs Corporate Accounts & Credit Limits',
        content: 'The system supports both individual rental drivers and corporate enterprise clients with customized billing arrangements:',
        steps: [
          {
            stepNumber: 1,
            title: 'Customer Profile Setup',
            description: 'Maintains registered company name, corporate tax registration number (TRN), designated contact person, billing email, physical office address, and primary operating branch.',
            expectedOutcome: 'Unique customer profile registered in the directory.'
          },
          {
            stepNumber: 2,
            title: 'Credit Limit & Payment Terms',
            description: 'Sets authorized credit ceilings and settlement windows (such as Immediate, Net 15, Net 30, or Net 60 days). Invoices created when a customer exceeds their credit threshold trigger approval warnings.',
            expectedOutcome: 'Overdue risk controls and aging alerts activated.'
          },
          {
            stepNumber: 3,
            title: 'Multi-Vehicle Fleet Allocations',
            description: 'Corporate accounts can have multiple fleet vehicles linked simultaneously. Each assigned vehicle displays its active driver, license plate, vehicle identification number, and billing rate.',
            expectedOutcome: 'Consolidated commercial fleet invoicing enabled.'
          },
          {
            stepNumber: 4,
            title: 'Customer Balance & Advance Prepayments',
            description: 'Maintains a running balance of all posted invoices, credit notes, and customer payments. Unapplied overpayments are credited directly to the Customer Advance account for future invoice settlements.',
            expectedOutcome: 'Accurate, real-time customer account balance.'
          }
        ]
      },
      {
        id: 'create-customer-driver-vehicle-flow',
        title: 'Add Customer: Details Needed, Driver Profile Toggle & Direct Vehicle Assignment',
        content: 'When adding a new customer, staff can choose to create a standard commercial client or simultaneously register a driver and assign a vehicle in one streamlined workflow:',
        steps: [
          {
            stepNumber: 1,
            title: 'Customer Information Required',
            description: 'Fill in the customer details: Full Name (mandatory), Operational Branch (mandatory), Email Address, Primary Phone Number, WhatsApp Number, Full Physical Address (Street, City, State, Country), Account Status (Active or Inactive), and any identity or commercial registration documents (up to 20 MB per file).',
            expectedOutcome: 'Customer contact profile fully populated.'
          },
          {
            stepNumber: 2,
            title: 'The "Is a Driver?" Toggle Switch',
            description: 'Activate the "Is a Driver?" switch if this customer is a rental driver. Toggling this option on dynamically opens the Vehicle Assignment section below the form.',
            expectedOutcome: 'Vehicle assignment form revealed immediately.'
          },
          {
            stepNumber: 3,
            title: 'Select Available Fleet Vehicle',
            description: 'Choose an available car from the dropdown list filtered to the customer\'s branch. The list shows the vehicle make, model, license plate number, and fleet code. Once selected, the system automatically fills in the vehicle\'s standard weekly rental rate.',
            expectedOutcome: 'Vehicle selected with pre-filled default rental price.'
          },
          {
            stepNumber: 4,
            title: 'Set Lease Start Date & Contract Duration',
            description: 'Enter the contract start date (defaults to today) and choose the contract duration in weeks (presets include 4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 48, 52, 60, 72, or 104 weeks). You can adjust the weekly rent amount if a special rate has been agreed upon.',
            expectedOutcome: 'Agreed contract timeline and pricing established.'
          },
          {
            stepNumber: 5,
            title: 'Form Validation Checks',
            description: 'Before submission, the system ensures that: Customer Name is filled, an Operational Branch is selected, and if a vehicle was picked, the Start Date is specified.',
            expectedOutcome: 'Clean data submission without missing fields.'
          },
          {
            stepNumber: 6,
            title: 'Automatic Multi-Record Creation',
            description: 'Click "Create Customer". The system creates the Customer account, generates a connected Driver profile, assigns the vehicle with current odometer reading, and starts the weekly rental billing schedule.',
            expectedOutcome: 'Success alert: "Customer & Driver profile created with assigned vehicle!".'
          }
        ],
        tips: [
          'If the customer is strictly a corporate client or car purchaser without a personal rental car, leave "Is a Driver?" switched off.'
        ]
      },
      {
        id: 'customer-vehicle-contract-actions',
        title: 'Customer Detail: Assign Vehicle, Cancel Contract, Edit Rent & Edit Contract Plan',
        content: 'From the Customer Details screen, managers have full operational controls over the customer\'s active rental vehicle, pricing, and contract duration:',
        steps: [
          {
            stepNumber: 1,
            title: 'Assigning a Vehicle to an Existing Customer',
            description: 'Click the "Assign Vehicle" button on any customer with a driver profile. A window opens listing available vehicles in the customer\'s branch. Select the vehicle, verify the start date, select the contract duration in weeks, and confirm the agreed weekly rent. Click "Assign Vehicle" to finalize.',
            expectedOutcome: 'Vehicle is attached to the customer and weekly rent invoicing begins.'
          },
          {
            stepNumber: 2,
            title: 'Cancelling a Rental Contract',
            description: 'Click "Cancel Contract" (or set the customer/driver status to Inactive while a vehicle is assigned). A confirmation window appears. Enter the Contract End Date (must be today or an earlier date; future dates are not allowed) and write an audit reason for the cancellation. Click "Confirm Cancellation".',
            expectedOutcome: 'Vehicle returns to the available branch fleet, and recurring rental billing is stopped.'
          },
          {
            stepNumber: 3,
            title: 'Editing the Weekly Rent Amount',
            description: 'Click the pencil icon next to the Weekly Rent badge. In the popup window, enter the new weekly rent amount, the effective date for the price change, and a mandatory explanation remark (such as "Promotional discount" or "Vehicle rate revision"). Click "Save".',
            expectedOutcome: 'Rental fee is updated, future invoices reflect the new rate, and the adjustment is saved in the rent change history.'
          },
          {
            stepNumber: 4,
            title: 'Editing Contract Plan & Duration (Weeks)',
            description: 'Click the pencil icon next to the Contract Duration badge. Select a new duration from the preset dropdown or enter a custom number of weeks, and provide a mandatory remark. Important Business Rule: The system checks how many weeks the driver has already paid for. You cannot reduce a contract below weeks that are already paid or partially settled.',
            expectedOutcome: 'Contract maturity date and remaining payment schedule updated.'
          }
        ],
        warnings: [
          'Contract duration cannot be shortened below weeks that the customer has already paid for.'
        ]
      }
    ]
  },
  {
    id: 'invoice-creation-lifecycle',
    categoryId: 'sales',
    title: 'Invoice Detail: Action Buttons, Payment Recording & Credit Notes',
    shortTitle: 'Invoicing & Action Modals',
    description: 'Detailed instructions for creating tax invoices, recording partial and full customer payments, applying driver prepayments, issuing credit notes, and reviewing the double-entry accounting trail.',
    iconName: 'Receipt',
    tags: ['invoice', 'payments', 'credit note', 'prepayment', 'general ledger', 'tax invoice', 'export pdf'],
    relatedRoutes: [
      { label: 'Invoices Hub', path: '/admin/admin/invoices' },
      { label: 'Create Invoice', path: '/admin/admin/invoices/create' },
      { label: 'Invoice Aging', path: '/admin/admin/invoices/aging' }
    ],
    sections: [
      {
        id: 'invoice-detail-action-buttons',
        title: 'Invoice Detail: Operational Action Controls',
        content: 'The Invoice Details screen provides direct action buttons to manage the lifecycle of an issued bill:',
        steps: [
          {
            stepNumber: 1,
            title: 'Recording a Payment',
            description: 'Click "Record Payment" to open the settlement window. The unpaid balance is automatically filled into the payment amount box. Select your payment method: Cash, Bank Transfer, Credit Card, or Prepayment.',
            expectedOutcome: 'Payment settlement dialog displayed.'
          },
          {
            stepNumber: 2,
            title: 'Using Existing Customer Prepayments',
            description: 'If the customer has previously overpaid or deposited funds in advance, the window displays their available prepayment balance. Check "Use Prepayment" to settle the invoice directly from their credit balance without receiving new cash.',
            expectedOutcome: 'Prepayment credit applied to offset the outstanding invoice balance.'
          },
          {
            stepNumber: 3,
            title: 'Issuing a Credit Note',
            description: 'Click "Issue Credit Note" to apply a billing reduction or refund. Enter the credit amount (which cannot exceed the active unpaid balance of the invoice) and select a reason: Vehicle Downtime Adjustment, Overcharge Correction, Billing Discrepancy, Goodwill Waiver, or Custom.',
            expectedOutcome: 'Credit note registered and linked directly to the invoice.'
          },
          {
            stepNumber: 4,
            title: 'Applying an Open Credit Note',
            description: 'In the Linked Credit Notes table on the invoice, click "Apply" on any open credit note to write off that amount against the invoice balance.',
            expectedOutcome: 'Invoice status updates to Partially Paid or Fully Paid.'
          },
          {
            stepNumber: 5,
            title: 'Editing an Invoice',
            description: 'Click "Edit Invoice" to modify line items, quantities, descriptions, or tax percentages. Note: Invoices that have already received customer payments cannot be edited.',
            expectedOutcome: 'Invoice totals recalculated.'
          },
          {
            stepNumber: 6,
            title: 'Deleting or Voiding an Invoice',
            description: 'Click "Delete Invoice" to cancel an erroneous bill. The system verifies that no payments or credit adjustments have been recorded against the invoice before allowing deletion.',
            expectedOutcome: 'Invoice safely archived and removed from customer receivables.'
          },
          {
            stepNumber: 7,
            title: 'Printing and Exporting Invoices',
            description: 'Click "Print / Download PDF" to generate the official tax invoice document formatted with company logo, tax identification number, customer billing address, itemized breakdown, tax breakdown, and bank payment instructions.',
            expectedOutcome: 'Official PDF document downloaded or sent to printer.'
          }
        ],
        tips: [
          'Invoices that are fully paid are locked from further editing to ensure compliance with financial accounting standards.'
        ]
      },
      {
        id: 'invoice-double-entry-ledger-trail',
        title: 'Accounting Ledger Audit Trail',
        content: 'Every invoice automatically posts standard double-entry bookkeeping transactions to your Chart of Accounts:',
        steps: [
          {
            stepNumber: 1,
            title: 'Debit: Accounts Receivable (Asset)',
            description: 'Debited with the full invoice gross total upon invoice issuance, reflecting the legal amount owed by the customer.',
            expectedOutcome: 'Accounts receivable balance increases.'
          },
          {
            stepNumber: 2,
            title: 'Credit: Rental Revenue (Income)',
            description: 'Credited with the net service fee, recording earned business income in the current fiscal period.',
            expectedOutcome: 'Operating revenue recognized.'
          },
          {
            stepNumber: 3,
            title: 'Credit: Output VAT / Sales Tax (Liability)',
            description: 'Credited with the calculated tax amount (e.g. 5%), recording the tax liability owed to the government authority.',
            expectedOutcome: 'Tax liability recorded for periodic tax filing.'
          }
        ]
      }
    ]
  },
  {
    id: 'payments-received-credit-notes',
    categoryId: 'sales',
    title: 'Payments Received, Bank Allocation & In-Grid Reconciliations',
    shortTitle: 'Receipts & Reconciliation',
    description: 'Instructions for recording customer receipts, distributing payments across outstanding invoices using oldest-first allocation, and managing surplus advances.',
    iconName: 'CreditCard',
    tags: ['payments', 'collections', 'credit note', 'debit note', 'reconciliation', 'cashier', 'oldest first', 'bank allocation'],
    relatedRoutes: [
      { label: 'Payments Received', path: '/admin/admin/payments-received' },
      { label: 'Credit Notes', path: '/admin/admin/credit-notes' },
      { label: 'Debit Notes', path: '/admin/admin/debit-notes' }
    ],
    sections: [
      {
        id: 'payment-received-workflow',
        title: 'Payment Receipt Creation & Invoice Allocation',
        content: 'When receiving customer funds through bank transfer, card machine, or branch cash desk:',
        steps: [
          {
            stepNumber: 1,
            title: 'Select Payer & Receiving Account',
            description: 'Choose the customer or driver. Select the receiving account (Operating Bank Account, Cash Drawer, or POS Terminal). Enter the payment reference number and date.',
            expectedOutcome: 'All outstanding invoices for the customer populate automatically.'
          },
          {
            stepNumber: 2,
            title: 'Oldest-First Automatic Invoice Allocation',
            description: 'The system automatically distributes the entered payment amount across open invoices, paying off the oldest due dates first. Cashiers can also manually adjust the allocation amounts on each invoice row.',
            expectedOutcome: 'Invoices update to Paid or Partially Paid.'
          },
          {
            stepNumber: 3,
            title: 'Excess Funds Saved as Customer Advance',
            description: 'Any payment amount exceeding the customer\'s total unpaid invoices is automatically saved as an unapplied Customer Advance (Account 2.1.02), ready to be applied against future invoices.',
            expectedOutcome: 'Complete cashier reconciliation with zero uncounted funds.'
          }
        ]
      }
    ]
  }
];
