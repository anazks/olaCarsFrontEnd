export const permissionCategories = [
    {
      category: "Vehicle Management",
      permissions: [
        "VEHICLE_VIEW", "VEHICLE_CREATE", "VEHICLE_EDIT", "VEHICLE_DELETE", "VEHICLE_TRANSFER", "VEHICLE_STATUS_CHANGE", "VEHICLE_APPROVE"
      ]
    },
    {
      category: "Driver Management",
      permissions: [
        "DRIVER_VIEW", "DRIVER_CREATE", "DRIVER_EDIT", "DRIVER_DELETE", "DRIVER_ONBOARD", "DRIVER_ASSIGN_VEHICLE"
      ]
    },
    {
      category: "Branch Management",
      permissions: [
        "BRANCH_VIEW", "BRANCH_CREATE", "BRANCH_EDIT", "BRANCH_DELETE"
      ]
    },
    {
      category: "Staff & User Management",
      permissions: [
        "STAFF_VIEW", "STAFF_CREATE", "STAFF_EDIT", "STAFF_DELETE", "STAFF_MANAGE_PERMISSIONS", 
        "USER_VIEW", "USER_CREATE", "USER_EDIT", "USER_DELETE"
      ]
    },
    {
      category: "Purchase Order & Supplier",
      permissions: [
        "PURCHASE_ORDER_VIEW", "PURCHASE_ORDER_CREATE", "PURCHASE_ORDER_EDIT", "PURCHASE_ORDER_DELETE", "PURCHASE_ORDER_APPROVE",
        "SUPPLIER_VIEW", "SUPPLIER_CREATE", "SUPPLIER_EDIT", "SUPPLIER_DELETE"
      ]
    },
    {
      category: "Payment & Finance",
      permissions: [
        "PAYMENT_VIEW", "PAYMENT_CREATE", "PAYMENT_EDIT", "PAYMENT_DELETE", "PAYMENT_APPROVE",
        "LEDGER_VIEW", "LEDGER_CREATE", "LEDGER_EDIT", "LEDGER_DELETE",
        "JOURNAL_VIEW", "JOURNAL_CREATE",
        "FINANCIAL_REPORT_VIEW",
        "TAX_VIEW", "TAX_CREATE", "TAX_EDIT", "TAX_DELETE",
        "ACCOUNTING_CODE_VIEW", "ACCOUNTING_CODE_CREATE", "ACCOUNTING_CODE_EDIT", "ACCOUNTING_CODE_DELETE"
      ]
    },
    {
      category: "Insurance & Claims",
      permissions: [
        "INSURANCE_VIEW", "INSURANCE_CREATE", "INSURANCE_EDIT", "INSURANCE_DELETE",
        "INSURANCE_CLAIM_VIEW", "INSURANCE_CLAIM_CREATE", "INSURANCE_CLAIM_EDIT", "INSURANCE_CLAIM_DELETE"
      ]
    },
    {
      category: "Work Order & Service Bills",
      permissions: [
        "WORK_ORDER_VIEW", "WORK_ORDER_CREATE", "WORK_ORDER_EDIT", "WORK_ORDER_DELETE", "WORK_ORDER_APPROVE",
        "SERVICE_BILL_VIEW", "SERVICE_BILL_CREATE", "SERVICE_BILL_EDIT", "SERVICE_BILL_DELETE"
      ]
    },
    {
      category: "Inventory",
      permissions: [
        "INVENTORY_VIEW", "INVENTORY_CREATE", "INVENTORY_EDIT", "INVENTORY_DELETE"
      ]
    },
    {
      category: "Agreements & Leases",
      permissions: [
        "AGREEMENT_VIEW", "AGREEMENT_CREATE", "AGREEMENT_EDIT", "AGREEMENT_DELETE",
        "LEASE_VIEW", "LEASE_CREATE", "LEASE_EDIT", "LEASE_DELETE"
      ]
    },
    {
      category: "System & Reports",
      permissions: [
        "SYSTEM_SETTINGS_VIEW", "SYSTEM_SETTINGS_EDIT",
        "STAFF_PERFORMANCE_VIEW", "STAFF_PERFORMANCE_EDIT",
        "REPORTS_VIEW", "DASHBOARD_VIEW",
        "ACCESS_CONTROL_MANAGE", "ROLE_TEMPLATE_VIEW", "ROLE_TEMPLATE_EDIT"
      ]
    },
    {
        category: "AI Service",
        permissions: [
            "AI_SERVICE_ACCESS"
        ]
    }
  ];
  
