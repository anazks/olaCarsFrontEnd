import type { DocTopic } from '../types';

export const procurementTopics: DocTopic[] = [
  {
    id: 'vendor-management',
    categoryId: 'procurement',
    title: 'Vendor Onboarding, KYC & Accounts Payable Profiles',
    shortTitle: 'Vendors & Suppliers',
    description: 'Instructions for registering vehicle dealerships, spare parts vendors, fuel providers, and insurers with commercial licenses and bank payment instructions.',
    iconName: 'ShoppingBag',
    tags: ['vendor', 'supplier', 'procurement', 'bank details', 'trade license', 'vat trn', 'accounts payable'],
    relatedRoutes: [
      { label: 'Manage Vendors', path: '/admin/admin/vendors' }
    ],
    sections: [
      {
        id: 'vendor-verification',
        title: 'Supplier Onboarding & Banking Credentials',
        content: 'Registering certified vendors ensures timely procurement and accurate wire transfers:',
        steps: [
          {
            stepNumber: 1,
            title: 'Commercial Credentials Verification',
            description: 'Enter the supplier\'s registered company name, commercial trade license number, and corporate tax identification number for proper tax reporting.',
            expectedOutcome: 'Vendor legal identity registered.'
          },
          {
            stepNumber: 2,
            title: 'Bank Account & Wire Credentials',
            description: 'Enter the supplier\'s official banking details: Bank Name, Branch, Account Number, SWIFT code, and IBAN. The beneficiary name must match the commercial license name to avoid wire rejections.',
            expectedOutcome: 'Direct wire payment details saved.'
          },
          {
            stepNumber: 3,
            title: 'Outstanding Bills & Payables Summary',
            description: 'The vendor profile tracks all open purchase bills, payments issued, and unapplied supplier advances, displaying the current net accounts payable balance.',
            expectedOutcome: 'Up-to-date vendor balance maintained.'
          }
        ]
      }
    ]
  },
  {
    id: 'purchase-orders-thresholds',
    categoryId: 'procurement',
    title: 'Purchase Order Detail: Actions, Multi-Tier Thresholds & Bill Conversion',
    shortTitle: 'Purchase Orders & Thresholds',
    description: 'Operational manual for creating purchase orders, routing approvals through manager spending thresholds, converting approved orders into purchase bills, and tracking supplier deliveries.',
    iconName: 'FileText',
    tags: ['po', 'purchase order', 'procurement', 'thresholds', 'approval', 'convert to bill', 'bills', 'supplier invoice'],
    relatedRoutes: [
      { label: 'Purchase Orders', path: '/admin/admin/purchase-orders' },
      { label: 'Create PO', path: '/admin/admin/purchase-orders/create' },
      { label: 'PO Approval Thresholds', path: '/admin/admin/po-thresholds' }
    ],
    sections: [
      {
        id: 'po-detail-action-buttons',
        title: 'Purchase Order Actions & Multi-Tier Approvals',
        content: 'From the Purchase Order screen, managers can approve, reject, cancel, or convert purchase orders based on their authorized spending limits:',
        steps: [
          {
            stepNumber: 1,
            title: 'Approve Purchase Order',
            description: 'Click "Approve PO". The system verifies that the order total is within your role\'s authorized approval threshold. Orders exceeding branch spending limits are automatically escalated to the Country Manager or Financial Administrator.',
            expectedOutcome: 'Purchase order status shifts to Approved.'
          },
          {
            stepNumber: 2,
            title: 'Reject Purchase Order',
            description: 'Click "Reject PO" if pricing, quantities, or budget allocations are unacceptable. A rejection window opens requiring a mandatory reason note for the audit record.',
            expectedOutcome: 'Purchase order rejected and requester notified.'
          },
          {
            stepNumber: 3,
            title: 'Convert Approved PO to Vendor Bill',
            description: 'Once the goods or spare parts are delivered, click "Convert to Bill". The system copies all line items, quantities, and agreed prices directly into a new Accounts Payable Vendor Bill.',
            expectedOutcome: 'New Vendor Bill created and linked to the Purchase Order.'
          },
          {
            stepNumber: 4,
            title: 'View Associated Bill',
            description: 'Once a purchase order has been converted into a bill, a direct link appears on the order allowing you to open and inspect the resulting Accounts Payable bill.',
            expectedOutcome: 'Direct navigation to the payment and accounting bill.'
          },
          {
            stepNumber: 5,
            title: 'Cancel or Void Purchase Order',
            description: 'Click "Cancel PO" to void an unfulfilled draft or rejected order. This releases any reserved budget allocations and cleanly archives the order.',
            expectedOutcome: 'Purchase order cancelled safely.'
          },
          {
            stepNumber: 6,
            title: 'Print & Share Official PO',
            description: 'Click "Print / Share PO" to generate a formatted document complete with your company logo, billing address, supplier contact, itemized table, and authorized manager signature lines.',
            expectedOutcome: 'Official purchase order document ready for supplier dispatch.'
          }
        ]
      },
      {
        id: 'convert-po-to-bill-engine',
        title: 'Converting Orders to Bills & Accounts Payable Integration',
        content: 'Converting an approved purchase order into an Accounts Payable bill ensures smooth payment settlement without duplicate data entry:',
        steps: [
          {
            stepNumber: 1,
            title: 'Automatic Line Item Transfer',
            description: 'All items, part descriptions, quantities, unit prices, and tax rates from the purchase order transfer directly into the bill form.',
            expectedOutcome: 'Accurate billing without manual re-typing.'
          },
          {
            stepNumber: 2,
            title: 'Vendor Invoice & Due Date Setup',
            description: 'Enter the supplier\'s official tax invoice number, delivery note date, and payment due date (such as Net 30 days).',
            expectedOutcome: 'Accounts payable payment schedule established.'
          },
          {
            stepNumber: 3,
            title: 'Preventing Duplicate Billing',
            description: 'Once converted, the purchase order is marked as Billed, preventing staff from accidentally generating a duplicate bill for the same order.',
            expectedOutcome: 'Strict anti-duplicate billing control enforced.'
          }
        ]
      }
    ]
  }
];
