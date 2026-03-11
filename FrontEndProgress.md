# Project Specification: Ola Cars Frontend

## Overview
Ola Cars Frontend is a comprehensive, role-based management dashboard for a car marketplace/operational system. It provides distinct interfaces and permissions for various organizational roles, from branch-level staff to global administrators.

## Core Technology Stack
- **Frontend Framework:** React 19
- **Build Tool:** Vite
- **Language:** TypeScript
- **Styling:** Tailwind CSS (Utility-first)
- **Routing:** React Router Dom v7
- **API Client:** Axios (Centralized instance with JWT interceptors)
- **Icons:** Lucide React

---

## Role & Permission System

### Role Hierarchy & Scope
The system employs a hierarchical permission model. Only users at a higher level than the creator can approve certain resources (like Purchase Orders).

| Level | Role Key | UI Display Name | Scope | Dashboard Route |
|-------|----------|-----------------|-------|-----------------|
| L1 | `branchopstaff` | Branch Op Staff | Own Branch | `/admin/branch-op-staff` |
| L1 | `branchfinstaff` | Branch Fin Staff | Own Branch | `/admin/branch-fin-staff` |
| L2 | `branchmanager` | Branch Manager | Own Branch | `/admin/branch-manager` |
| L3 | `countrymanager` | Country Manager | Own Country | `/admin/country-manager` |
| L4 | `operationaladmin`| Operational Admin | Global | `/admin/operational-admin` |
| L4 | `financialadmin` | Financial Admin | Global | `/admin/financial-admin` |
| L5 | `admin` | Executive / Admin | Global | `/admin/admin` |

### Authentication Flow
1. **Login:** Users log in via `/admin/login`. Each role has a specific backend endpoint (e.g., `api/branch-manager/login`).
2. **Session:** JWT tokens are stored in `localStorage`.
3. **Protection:** `ProtectedRoute` validates the token and role before rendering dashboard layouts.

---

## Main Modules

### 1. Purchase Order (PO) Management
The most complex module, handling the procurement lifecycle.
- **Features:** 
    - Create PO with multiple line items.
    - Hierarchical Approval (Approver level > Creator level).
    - Threshold-based Routing: POs > $1000 require L5 (Admin) approval.
    - Edit History: Tracking changes with status resets to `WAITING`.
- **Statuses:** `WAITING`, `APPROVED`, `REJECTED`.

### 2. Resource Management (CRUD)
- **Suppliers:** Manage car parts/service suppliers.
- **Branches:** Create and configure regional branches.
- **Staff Management:** Role-specific user management (e.g., Manage Branch Managers, Manage Finance Staff).

### 3. UI Components & Layouts
- **DashboardLayout:** Shared wrapper with dynamic `Sidebar`, `TopBar`, and `Content` areas.
- **Sidebars:** customized menus for each of the 7 roles.
- **TopBar:** Displays current user info, role, and a notification bell for pending tasks (e.g., PO approvals).
- **Theme:** Supported via `ThemeContext` (Dark/Light modes).

---

## Data Architecture

### API Integration
- **Base URL:** Configured via `VITE_API_BASE_URL`.
- **Interceptors:**
    - **Request:** Automatically attaches `Authorization: Bearer <token>` to all outgoing requests.
    - **Response:** Handles `401 Unauthorized` by clearing storage and redirecting to login.

---

## Current Status & Roadmap

### Completed Features
- [x] Multi-role Routing & Layouts
- [x] JWT Authentication & Protected Routes
- [x] Purchase Order CRUD (List, Create, Detail, Approval Modal)
- [x] Supplier Management
- [x] Role-specific Sidebars with Logout
- [x] TopBar dynamic user display
