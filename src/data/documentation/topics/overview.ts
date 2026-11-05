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
    },
    {
      id: 'ola-process-video-recordings',
      title: 'Ola Process Steps — Video Recordings & Walkthroughs',
      content: 'Official screen recordings and video walkthroughs have been published to Google Drive to assist staff and administrators with mastering all Ola ERP processes. These recordings demonstrate each user journey step-by-step.',
      actionLink: {
        label: 'Open Video Recordings Folder (Google Drive)',
        url: 'https://drive.google.com/drive/folders/1CzrC0X34JnoxZ4wuWFuMNWCmTHKeO8w4?usp=sharing',
        external: true
      },
      tips: [
        'Folder contains practical video demonstrations of vehicle onboarding, KYC vetting, contract signing, and invoicing.',
        'Use these recordings for team onboarding, process refresher training, and standard operating procedure (SOP) compliance.'
      ]
    }
  ]
};

export const processVideosTopic: DocTopic = {
  id: 'process-videos',
  categoryId: 'overview',
  title: 'Ola Process Steps Video Recordings',
  shortTitle: 'Process Video Recordings',
  description: 'Direct video recordings and visual walkthroughs demonstrating Ola platform operational procedures and step-by-step system workflows.',
  iconName: 'Video',
  tags: ['video', 'recordings', 'drive', 'tutorials', 'process steps', 'walkthrough', 'sop', 'training'],
  sections: [
    {
      id: 'video-drive-overview',
      title: 'Google Drive Video Repository',
      content: 'All video recordings demonstrating the core Ola system processes are centralized in a shared Google Drive folder for easy access by managers, operations staff, and finance personnel.',
      actionLink: {
        label: 'Open Video Recordings Folder in Google Drive',
        url: 'https://drive.google.com/drive/folders/1CzrC0X34JnoxZ4wuWFuMNWCmTHKeO8w4?usp=sharing',
        external: true
      },
      tips: [
        'Bookmark the Google Drive folder for quick reference during day-to-day operations.',
        'Videos are organized by functional area to help you quickly find the specific procedure you need.'
      ]
    },
    {
      id: 'recorded-process-modules',
      title: 'Recorded Process Modules & Topics',
      content: 'The video recordings in the Drive folder cover the end-to-end operational lifecycle:',
      steps: [
        {
          stepNumber: 1,
          title: 'Fleet & Vehicle Onboarding',
          description: 'Step-by-step guide to registering new vehicles, uploading chassis/engine documents, setting insurance policies, and tracking GPS status.',
          expectedOutcome: 'Vehicle profile active and available in fleet inventory.'
        },
        {
          stepNumber: 2,
          title: 'Driver KYC & Digital Agreement Signing',
          description: 'Document verification, vetting requirements, assigning agreement templates, and driver digital signature capture.',
          expectedOutcome: 'Fully executed digital rental agreement with audit trail.'
        },
        {
          stepNumber: 3,
          title: 'Vehicle Handover & Rental Assignment',
          description: 'Pairing approved drivers with ready vehicles, mileage check, security deposit handling, and handover inspection recording.',
          expectedOutcome: 'Vehicle status updated to On-Rent with automated billing schedule.'
        },
        {
          stepNumber: 4,
          title: 'Billing, Invoicing & Payment Processing',
          description: 'Generating rental invoices, recording bank transfers/cash receipts, issuing credit/debit notes, and ledger reconciliation.',
          expectedOutcome: 'Accurate General Ledger entries and updated customer balances.'
        },
        {
          stepNumber: 5,
          title: 'Workshop Maintenance & Part Requisitions',
          description: 'Creating work orders, requesting spare parts from inventory, assigning mechanics, and closing maintenance logs.',
          expectedOutcome: 'Resolved maintenance issue with updated inventory levels.'
        }
      ]
    },
    {
      id: 'video-viewing-guidelines',
      title: 'Training & Best Practices',
      content: 'To maximize the benefit of these process recordings:',
      tips: [
        'Follow along in a test or sandbox environment when watching complex multi-step workflows like digital contracting or journal entries.',
        'Ensure proper branch and role permissions are selected to match what you see in the recording.',
        'Reach out to operational or financial admins if you encounter discrepancy between current screens and earlier recording versions.'
      ]
    }
  ]
};
