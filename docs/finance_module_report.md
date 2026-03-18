# Finance Module Report

## 1. Introduction & Overview
The Finance Module provides a comprehensive suite of tools for managing financial data, tracking transactions, managing tax profiles, and categorizing accounting codes. Its primary components include:
- **Finance Dashboard**: High-level overview of financial health and recent activities.
- **Chart of Accounts**: Management of financial buckets (Income, Expense, Asset, Liability, Equity).
- **General Ledger**: Immutable audit trail of financial transactions.
- **Tax Management**: Management of tax profiles and percentage rates.

## 2. Role Accessibilities
Access check within the frontend components is primarily handled through the `getUserRole()` utility from `auth.ts`.
- **`['admin', 'financialadmin']` roles**:
  - Full access to manage **Chart of Accounts** (Create, Edit, Delete).
  - Full access to manage **Tax Management** (Add Tax Profile, Toggle Active/Inactive Status).
- **Other roles (e.g., standard users, branch managers)**:
  - Can view the data on standard dashboards (tables of codes, ledgers, taxes) but lack the permissions to add, edit, or delete records. The action buttons (Add, Edit, Delete, Toggle) are dynamically hidden.

## 3. Detailed Component UI & Definitions

### 3.1. Finance Dashboard (`FinanceDashboard.tsx`)
**Purpose:** Provides a high-level overview of the monthly financial status and quick insights into recent ledger transactions.

**Key UI Elements:**
- **Summary Cards (Metrics)**:
  - **Monthly Income**: Sum of all credit entries minus debit entries mapped to `INCOME` codes over the recent transactions loaded. Displayed in Green with an `ArrowUpRight` icon.
  - **Monthly Expenses**: Sum of all debit entries minus credit entries mapped to `EXPENSE` codes over the recent transactions loaded. Displayed in Red with an `ArrowDownRight` icon.
  - **Net Profit**: difference between Monthly Income and Monthly Expenses. Displayed in Blue with an `Activity` metric icon.
- **Recent Transactions Table**:
  - Lists the latest 10 ledger entries.
  - **Columns:** Date, Description, Account (Code - Name), Amount (Debits are explicitly negated visually and shown in Red text; Credits shown in Green text).
- **Actions:**
  - **Refresh**: Re-fetches ledger data.
  - **View Full Ledger**: Quick navigation to the 'General Ledger' module.

### 3.2. Chart of Accounts (`ChartOfAccounts.tsx`)
**Purpose:** Define and manage the accounting codes (the buckets) used to categorize transactions within the system.

**Key UI Elements:**
- **Filters Tabs**: Quick filters for `ALL`, `INCOME`, `EXPENSE`, `ASSET`, `LIABILITY`, and `EQUITY`. Each filter shows an active badge count of relative codes.
- **Data Table**:
  - Displays: Code (e.g., 4000), Name (e.g., Rental Income), Category (styled badge), and Actions (Edit, Delete).
  - List empty state provided with intuitive icon (`BookMarked`) if no codes match filters.
- **Forms & Actions (restricted to `admin` / `financialadmin`)**:
  - **Add Accounting Code Form**: Triggers an inline block revealing fields for *Code* (Text input), *Name* (Text input), and *Category* (Dropdown: INCOME|EXPENSE|ASSET|LIABILITY|EQUITY). Submits as `CreateAccountingCodePayload`.
  - **Edit Form**: Prefilled form replacing the Add view to update existing codes.
  - **Delete Modal**: Safe confirmation dialog checking user intent before completely deleting an accounting code.

### 3.3. General Ledger (`GeneralLedger.tsx`)
**Purpose:** Acts as the immutable audit trail of all financial actions taken in the application.

**Key UI Elements:**
- **Filters Bar**:
  - Features dynamic dual inputs filtering entries by:
    - **Date Range**: `startDate` to `endDate`.
    - **Account**: Dropdown to select specific matching individual accounting codes (fetched dynamically).
  - Contains a discrete reset trigger once filters form state is active.
- **Statistics Summary**:
  - Calculates dynamic readouts given the current filter subset: Total Debit (Displayed in Red), Total Credit (Displayed in Green), Net Movement (Absolute diff coupled with suffix context for `(Credit Bal.)` or `(Debit Bal.)`).
- **Data Table**:
  - **Columns:**
    - Date (Includes full timestamp down to minutes).
    - Description & Reference Identity (if mapped).
    - Account (Code, Title, Category Badge).
    - Debit & Credit Split Amount Columns.
- **Actions**:
  - **Refresh**: Pulls the newest entries over the defined scope.
  - **Export CSV** (Placeholder visual): Intended flow to dump filtered ledgers.

### 3.4. Tax Management (`TaxManagement.tsx`)
**Purpose:** Manage global system taxes, ensuring standardized tax assignments against ledgers, purchases, or sales.

**Key UI Elements:**
- **Data Table**:
  - Displays: Name (e.g., VAT 15%), Rate (as a raw `%` value), Status Label (Active shown in Green / Inactive shown in Gray).
  - Actions column enables flipping Status profiles via a `Enable`/`Disable` button.
- **Add Tax Profile Form (restricted to `admin` / `financialadmin`)**:
  - Standard inline block requesting *Profile Name* (string input) and *Rate (%)* (number stepper input, expecting whole values like 15 for 15%). Submits using `CreateTaxPayload`. 

## 4. Accounting Codes & Handling Specifications
**Categories Engine (`accountingService.ts`)**:
Accounting codes fall strictly into five types natively defined in the codebase schema `AccountingCategory`:
1. **INCOME**: Revenue flows. Handled primarily as Credits. (Visual Base: Green)
2. **EXPENSE**: Costing flows. Handled primarily as Debits. (Visual Base: Red)
3. **ASSET**: Ownership elements. (Visual Base: Blue)
4. **LIABILITY**: Obligations elements. (Visual Base: Orange)
5. **EQUITY**: Ownership capitalization elements. (Visual Base: Purple)

**API Integration Structure:**
- Codes are defined primarily with `Code` (string schema for numerical ordering, e.g., '1020'), `Name` (human readable label), and `Category` (The strict classification subset).
- Associated endpoints:
  - `GET /api/accounting-code`: Pulled via `getAllAccountingCodes()`.
  - `POST /api/accounting-code`: Push payload `CreateAccountingCodePayload`.
  - `PUT /api/accounting-code/:id`: Standard upsert pattern.
  - `DELETE /api/accounting-code/:id`: Remove from bucket pool (carefully structured assuming API denies if attached to existing ledger transactions).
