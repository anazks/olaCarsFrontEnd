# OlaCars Project Roles and Responsibilities

This report outlines the various user roles defined within the OlaCars platform, detailing their specific responsibilities, accessible features, and the corresponding authentication API endpoints used. It includes a deep dive into **Vehicle Onboarding** and **Financial Operations** for each staff level.

---

## 1. Executive (Admin)
The highest level of access across the platform, managing all top-level operations, global financial metrics, and all staff levels.
- **Login Endpoint:** `/api/admin/login`
- **Key Responsibilities:**
  - **Staff Management:** Top-level management of Operational Admins, Financial Admins, Country Managers, Branch Managers, Finance Staff, Ground Ops Staff, Suppliers, and Drivers.
  - **Vehicle Onboarding (Global):** Monitors the onboarding pipeline globally. Acts as the final escalation point for blocked vehicles.
  - **Financial Operations & Ledgers (Global):** 
    - Full access to the Finance dashboard consisting of real-time Net Profit, Monthly Income, and Expenses.
    - Full control over the Chart of Accounts and General Ledger (Debit/Credit tracking).
    - Approves large Purchase Orders (POs > $1000 mandate Admin approval).
    - Reviews global Tax Management settings.
  - **Monitoring & Alerts:** Views Collections dashboards, GPS & Risk dashboards, and critical system alerts.

## 2. Operational Admin
Responsible for overseeing the operational aspects of the business at a high level, including fleet management, tracking, and ground operations staff.
- **Login Endpoint:** `/api/operational-admin/login`
- **Key Responsibilities:**
  - **Staff Management:** Manages Country/Branch Managers, Ops/Finance Staff, Suppliers, and Drivers.
  - **Vehicle Onboarding Operations:** 
    - Manages the entire fleet inventory and ensures vehicles move seamlessly through onboarding states like `DOCUMENTS REVIEW`, `INSPECTION REQUIRED`, and `GPS ACTIVATION`.
    - Handles the Maintenance Hub for vehicles in `REPAIR IN PROGRESS` status.
  - **Tracking:** Oversees live GPS tracking, driver rosters, and shift assignments.

## 3. Financial Admin
Responsible for overseeing the financial operations of the entire business, including ledgers, taxes, revenue, and payroll.
- **Login Endpoint:** `/api/financial-admin/login`
- **Key Responsibilities:**
  - **Staff Management:** Manages branch managers and local finance staff.
  - **Vehicle Onboarding Finances:** Oversees the `INSURANCE VERIFICATION` and `ACCOUNTING SETUP` statuses for newly onboarded vehicles entering the fleet.
  - **Financial Operations (Advanced):**
    - Full access to regional and global Finance Dashboards.
    - Manages the Chart of Accounts, General Ledger, and Tax Compliance.
    - Analyzes Revenue Streams, Profit Analysis, Billing & Invoices.
    - Audits payout registries and manages financial risk audits across all branches.

## 4. Country Manager
Oversees operations, performance, and compliance at a national or regional level.
- **Login Endpoint:** `/api/country-manager/login`
- **Key Responsibilities:**
  - **Staff & Operations Management:** Manages Branch Managers and oversees all local operations within the region.
  - **Vehicle Onboarding:** Reviews compliance reports for regional fleets and handles escalations if vehicles get stuck during the onboarding pipeline.
  - **Financial Monitoring:** Monitors regional revenue and growth metrics. Can initiate and review regional Purchase Orders.

## 5. Branch Manager
Manages a specific branch, handling local team management, daily operations, and branch-level finances.
- **Login Endpoint:** `/api/branch-manager/login`
- **Key Responsibilities:**
  - **Staff Management:** Manages the branch's Finance Staff, Ground Ops Staff, Suppliers, and Drivers.
  - **Vehicle Onboarding (Branch Level):** Responsible for the final approval step (`BRANCH MANAGER APPROVAL`) in the vehicle onboarding flow before a vehicle becomes `ACTIVE — AVAILABLE`.
  - **Financial Operations:** 
    - Tracks branch-level revenue.
    - Initiates Purchase Orders for branch needs (e.g., spare parts).
    - Oversees local team shift schedules and tasks.

## 6. Branch Operation Staff (Ground Ops Staff)
Handles the daily physical ground operations at the branch level.
- **Login Endpoint:** `/api/operation-staff/login`
- **Key Responsibilities:**
  - **Vehicle Onboarding (Field Work):** 
    - Performs physical tasks for vehicles in the `PENDING ENTRY` and `INSPECTION REQUIRED` statuses.
    - Handles physical `GPS ACTIVATION` installations and checks.
    - Coordinates vehicles when they transition to `REPAIR IN PROGRESS` or `ACTIVE — MAINTENANCE`.
  - **Daily Operations:** Executes daily cleaning schedules, driver handovers, and logs vehicle damages. 
  - **Purchase Orders:** Raises local PO requests for maintenance and operational supplies.

## 7. Branch Finance Staff
Handles daily financial transactions, collections, and localized financial reporting at the branch level.
- **Login Endpoint:** `/api/finance-staff/login`
- **Key Responsibilities:**
  - **Vehicle Onboarding (Account Setup):** Completes the `ACCOUNTING SETUP` onboarding step for assigned fleet vehicles ensuring they are in the ledger.
  - **Financial Ledger & Collections:**
    - Accesses the local branch's Finance Dashboard and General Ledger.
    - Responsible for Daily Collections (income tracking). 
    - Processes invoices and logs incoming payments (Credit/Debit entries).
    - Reviews localized transaction history and handles branch-level Tax Management tasks.
    - Processes the financial execution and approvals for branch Purchase Orders.

---

## Vehicle Onboarding Pipeline
The platform utilizes a structured, multi-step pipeline for onboarding new vehicles to the fleet. Each step requires sign-off from designated staff roles before the vehicle becomes operational. 

Here are the specific stages of the onboarding process:

1. **PENDING ENTRY:** The vehicle profile is newly created in the system by a manager or operations staff member, awaiting initial processing.
2. **DOCUMENTS REVIEW:** Administrative or operational staff review the basic vehicle documentation (registration, ownership, VIN validation) for compliance.
3. **INSURANCE VERIFICATION:** Financial or administrative staff verify the vehicle's insurance policy validity and log the policy details into the system.
4. **INSPECTION REQUIRED:** The vehicle is scheduled for a physical review. Ground Operations Staff physically inspect the vehicle for damages, safety standard compliance, and overall condition.
5. **INSPECTION FAILED:** If a vehicle fails the physical inspection, it is moved to this temporary state until the issues are addressed.
6. **REPAIR IN PROGRESS:** If the vehicle requires fixes post-inspection, it is held in this state while ground ops or third-party suppliers perform the necessary repairs.
7. **ACCOUNTING SETUP:** The Branch Finance Staff processes the vehicle into the local financial system, establishing its entry on the General Ledger and tracking it as a branch asset.
8. **GPS ACTIVATION:** Ground Operations Staff install and software-activate the required GPS and telematics tracking hardware inside the vehicle.
9. **BRANCH MANAGER APPROVAL:** The final gate check. The Branch Manager reviews the vehicle's entire onboarding history (documents, inspection, accounting, GPS) and gives the final sign-off.
10. **ACTIVE — AVAILABLE:** The vehicle completes its onboarding journey and is placed into active circulation, ready to be driven or rented.
*(Post-onboarding active states include `ACTIVE — RENTED`, `ACTIVE — MAINTENANCE`, `SUSPENDED`, and `TRANSFER PENDING` depending on its operational lifecycle).*
