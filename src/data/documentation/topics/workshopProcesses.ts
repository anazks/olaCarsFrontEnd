import type { DocTopic } from '../types';

export const workshopTopics: DocTopic[] = [
  {
    id: 'inventory-workshop-operations',
    categoryId: 'workshop',
    title: 'Spare Parts Inventory & Multi-Ledger Tracking',
    shortTitle: 'Inventory & Stock Management',
    description: 'Instructions for managing mechanical spare parts inventory, monitoring minimum reorder stock levels, recording stock movements, and tracking maintenance expense accounting.',
    iconName: 'Wrench',
    tags: ['workshop', 'inventory', 'spare parts', 'stock movement', 'reorder level', 'job card', 'scraps'],
    relatedRoutes: [
      { label: 'Inventory Stock', path: '/admin/admin/inventory' },
      { label: 'Scraps & Salvage', path: '/admin/admin/scraps' },
      { label: 'Write Offs', path: '/admin/admin/write-offs' }
    ],
    sections: [
      {
        id: 'inventory-detail-five-tabs',
        title: 'Spare Part Details: Specification & Tracking Tabs',
        content: 'The Inventory Item screen provides comprehensive tracking across five organized tabs:',
        steps: [
          {
            stepNumber: 1,
            title: 'Specifications & Stock Parameters',
            description: 'Displays core item metadata: Part Number, SKU code, Manufacturer, Component Category, Workshop Bin/Shelf Location, Minimum Stock Alert Level, Default Reorder Quantity, Unit Purchase Cost, and Current Quantity on Hand.',
            expectedOutcome: 'Part specification card rendered.'
          },
          {
            stepNumber: 2,
            title: 'Stock Movement Timeline',
            description: 'Chronological timeline of all historical physical stock changes: Goods Received from Suppliers, Workshop Consumption on Repair Job Cards, Manual Stock Adjustments, Returns to Vendors, and Decommissioned Scraps. Displays quantity changes, technician name, job card reference, and remaining on-hand balance.',
            expectedOutcome: 'Complete chronological history of physical stock movements.'
          },
          {
            stepNumber: 3,
            title: 'Inventory Asset Ledger',
            description: 'Displays real-time accounting entries for the Inventory Asset account. Increased when new parts are received from suppliers, and decreased when parts are consumed on vehicle repairs.',
            expectedOutcome: 'Inventory valuation verified against company balance sheet.'
          },
          {
            stepNumber: 4,
            title: 'Workshop Maintenance Expense Ledger',
            description: 'Tracks the operating maintenance expense incurred per vehicle repair job when replacement parts are fitted during servicing.',
            expectedOutcome: 'Fleet repair expenses reconciled with job cards.'
          },
          {
            stepNumber: 5,
            title: 'Payables & Clearing Ledger',
            description: 'Tracks balancing accounts payable entries for vendor billings and cash disbursements, ensuring double-entry accounting integrity.',
            expectedOutcome: 'Balanced financial records confirmed.'
          }
        ]
      }
    ]
  },
  {
    id: 'workshop-procurement-requests',
    categoryId: 'workshop',
    title: 'Workshop Procurement Requests & Approval Pipeline',
    shortTitle: 'Workshop Procurement Pipeline',
    description: 'Operational manual for requesting replacement parts, submitting cost estimates, routing finance approvals, and converting approved requests into supplier purchase orders.',
    iconName: 'ShoppingBag',
    tags: ['procurement request', 'workshop', 'parts requisition', 'finance approval', 'quotations', 'purchase order'],
    relatedRoutes: [
      { label: 'Procurement Requests', path: '/admin/admin/workshop-procurement-requests' }
    ],
    sections: [
      {
        id: 'procurement-request-status-pipeline',
        title: 'Requisition Lifecycle & Approval Stages',
        content: 'Workshop parts requisitions follow a structured lifecycle before orders are placed with suppliers:',
        steps: [
          {
            stepNumber: 1,
            title: 'Technician Requisition Submission',
            description: 'Technicians identify required replacement parts and submit a procurement request specifying needed quantities, vehicle or job details, and urgency.',
            expectedOutcome: 'Requisition submitted in Pending Workshop Manager Approval status.'
          },
          {
            stepNumber: 2,
            title: 'Workshop Manager Approval',
            description: 'The Workshop Manager reviews and approves the technician requisition, verifying mechanical necessity and quantities before it enters the purchasing queue.',
            expectedOutcome: 'Requisition approved and made available on the PO generation listing.'
          },
          {
            stepNumber: 3,
            title: 'PO Generation with Many-to-Many PR Allocation',
            description: 'Workshop Managers or Procurement Staff select approved requisitions to create connected Purchase Orders. PR units can be split across multiple POs or consolidated, tracking fulfilled vs remaining units.',
            expectedOutcome: 'Connected Purchase Order generated with tracked unit allocations.'
          },
          {
            stepNumber: 4,
            title: 'Merchandiser Review & Quotation Pipeline',
            description: 'The PO passes to the merchandiser module for unit audit, unit revisions if needed, supplier quotation collection, and quotation revision rounds with Admin/Finance.',
            expectedOutcome: 'Verified PO with authorized quotation ready for order fulfillment.'
          },
          {
            stepNumber: 5,
            title: 'Goods Received & Stock Replenishment',
            description: 'When parts arrive at the workshop, staff inspect the delivery and mark the order as Received. The system automatically increments on-hand inventory stock and closes the request.',
            expectedOutcome: 'Inventory stock replenished and ready for mechanic usage.'
          }
        ],
        tips: [
          'Requisitions track remaining unfulfilled quantities in real time. Requisitions transition from Approved to Partially Converted and Converted to PO as orders are placed.'
        ]
      }
    ]
  }
];
