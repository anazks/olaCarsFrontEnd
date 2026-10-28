import type { DocTopic } from '../types';

export const overviewTopic: DocTopic = {
  id: 'system-overview',
  categoryId: 'overview',
  title: 'OlaCars Enterprise Portal Overview',
  shortTitle: 'System Overview',
  description: 'High-level architecture, user roles, security hierarchy, and navigation flow across the OlaCars fleet and finance system.',
  iconName: 'LayoutGrid',
  tags: ['overview', 'roles', 'permissions', 'architecture', 'login', 'workflow'],
  relatedRoutes: [
    { label: 'Executive Dashboard', path: '/admin/admin/executive-dashboard' },
    { label: 'Dashboard Hub', path: '/admin/admin' }
  ],
  sections: [
    {
      id: 'platform-purpose',
      title: 'Platform Purpose & Scope',
      content: 'The OlaCars Portal is an end-to-end Enterprise Resource Planning (ERP) and Fleet Management system. It seamlessly unifies vehicle lifecycle management, driver contracting & digital onboarding, rental revenue tracking, full-ledger financial accounting, procurement approvals, and workshop inventory into one secure cloud application.',
      tips: [
        'All critical actions are tracked with user audit logs and strict role-based access control (RBAC).',
        'Financial entries comply with double-entry accounting standards with automated journal generation.'
      ]
    },
    {
      id: 'user-roles',
      title: 'User Roles & Permission Hierarchy',
      content: 'The system governs access via specialized role dashboards. Each user is assigned a specific role and branch/country scope:',
      steps: [
        {
          stepNumber: 1,
          title: 'Executive / Super Admin',
          description: 'Full unconstrained platform visibility across all countries, branches, financials, and company-wide KPI dashboards.',
          expectedOutcome: 'Access to the Executive Super Administrator portal and nationwide analytics.'
        },
        {
          stepNumber: 2,
          title: 'Operational Admin',
          description: 'Manages nationwide fleets, driver onboarding pipelines, agreement templates, fleet assignments, and cross-branch logistics.',
          expectedOutcome: 'Access to the Operational Administrator portal.'
        },
        {
          stepNumber: 3,
          title: 'Financial Admin',
          description: 'Controls Chart of Accounts, General Ledger postings, bank accounts, invoicing, tax configurations, and purchase approvals.',
          expectedOutcome: 'Access to the Financial Administrator portal.'
        },
        {
          stepNumber: 4,
          title: 'Country & Branch Managers',
          description: 'Oversees daily branch targets, local driver assignments, staff tasks, and branch-level inventory/cash balances.',
          expectedOutcome: 'Access to Regional and Branch Management dashboards.'
        },
        {
          stepNumber: 5,
          title: 'Branch Operational & Financial Staff',
          description: 'Carries out day-to-day vehicle check-ins/outs, customer inquiries, expense voucher filings, and invoice generation.',
          expectedOutcome: 'Access to Branch Frontline Operations and Finance workspaces.'
        }
      ]
    },
    {
      id: 'core-workflow-principles',
      title: 'Core Workflow Lifecycle',
      content: 'Every vehicle and driver progresses through a linked lifecycle: 1) Procurement & Vehicle Registry -> 2) Driver KYC & Agreement Signing -> 3) Vehicle Assignment & Active Rent Billing -> 4) Scheduled Maintenance & Workshop Service -> 5) Final Settlement & Vehicle Return.',
      warnings: [
        'Vehicles cannot be assigned to drivers without an active, verified driver profile and an approved rental plan.',
        'Invoices generated automatically sync with the General Ledger and Customer Accounts Receivable.'
      ]
    }
  ]
};
