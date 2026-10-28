import type { DocTopic } from '../types';

export const staffRoleTopics: DocTopic[] = [
  {
    id: 'staff-roles-permissions',
    categoryId: 'administration',
    title: 'Staff Management: 8-Tier Hierarchy, Roles & Branch Isolation',
    shortTitle: 'Staff Roles & 8-Tier Hierarchy',
    description: 'Overview of the 8 specialized management tiers, role-based visibility protections, performance targets, and multi-branch data isolation.',
    iconName: 'ShieldCheck',
    tags: ['staff', 'roles', 'permissions', 'users', 'access control', 'branches', 'targets', 'hierarchy', 'super admin', 'managers'],
    relatedRoutes: [
      { label: 'Staff Management', path: '/admin/admin/staff-management' },
      { label: 'Manage Branches', path: '/admin/admin/branches' },
      { label: 'Staff Performance', path: '/admin/admin/staff-performance' },
      { label: 'Target Management', path: '/admin/admin/directives/targets' }
    ],
    sections: [
      {
        id: 'staff-management-tiers',
        title: '8 Specialized Staff Management Portals',
        content: 'The staff management system partitions user administration into eight dedicated management portals with strict role accessibility rules:',
        steps: [
          {
            stepNumber: 1,
            title: 'Tier 1: Financial Administrators',
            description: 'Accessible exclusively by Super Administrators and Operations Directors. Manages senior finance controllers responsible for general ledger audits and bank reconciliation approvals.',
            expectedOutcome: 'Financial admin portal accessible.'
          },
          {
            stepNumber: 2,
            title: 'Tier 2: Country Managers',
            description: 'Manages regional directors overseeing multiple branches within a national territory. Also restricted to Super Administrators and Operations Directors.',
            expectedOutcome: 'Country manager governance enabled.'
          },
          {
            stepNumber: 3,
            title: 'Tier 3: Branch Managers',
            description: 'Supervisors responsible for physical branch locations, vehicle allocations, driver onboardings, and local purchase order authorizations.',
            expectedOutcome: 'Branch management roster visible.'
          },
          {
            stepNumber: 4,
            title: 'Tier 4: Finance Staff',
            description: 'Cashiers and branch accountants handling daily payment receipts, invoice settlements, customer credit notes, and petty cash books.',
            expectedOutcome: 'Branch finance roster accessible.'
          },
          {
            stepNumber: 5,
            title: 'Tier 5: Ground Operations Staff',
            description: 'Field operators responsible for vehicle check-in/check-out mechanical inspections, damage logs, and driver handovers.',
            expectedOutcome: 'Operations personnel management rendered.'
          },
          {
            stepNumber: 6,
            title: 'Tier 6 & 7: Workshop Managers & Workshop Technicians',
            description: 'Technical leads and mechanics executing maintenance work orders, spare parts requisitions, and vehicle safety certifications.',
            expectedOutcome: 'Workshop roster accessible.'
          },
          {
            stepNumber: 7,
            title: 'Tier 8: Merchandisers',
            description: 'Procurement coordinators responsible for purchase orders, supplier quotations, and vendor catalog management (accessible by executive administrators, country managers, and branch managers).',
            expectedOutcome: 'Procurement staff governance rendered.'
          }
        ]
      },
      {
        id: 'performance-targets-and-kpis',
        title: 'Performance Monitoring & Directive Targets',
        content: 'The staff portal provides leadership with workforce performance tracking and objective monitoring:',
        steps: [
          {
            stepNumber: 1,
            title: 'Staff Performance Analytics',
            description: 'Aggregates key operational indicators: driver onboardings completed, average vehicle turnaround time in workshop, invoice collection rates, and task completion velocity.',
            expectedOutcome: 'Real-time performance dashboard rendered.'
          },
          {
            stepNumber: 2,
            title: 'Target Management & Directives',
            description: 'Allows leadership to set monthly operational directives (such as achieving a 95% fleet utilization rate or eliminating overdue invoices older than 60 days). Dynamically monitors branch progress against targets.',
            expectedOutcome: 'Target progress meters updated.'
          }
        ]
      },
      {
        id: 'branch-country-scoping',
        title: 'Multi-Tenant Branch & Country Isolation',
        content: 'Across the branch management portal and system architecture, multi-tenant isolation ensures data security:',
        steps: [
          {
            stepNumber: 1,
            title: 'Automatic Branch Scope Filter',
            description: 'All records viewed by branch managers or branch staff are automatically filtered to their assigned branch. Branch personnel cannot view or modify transactions belonging to other branches.',
            expectedOutcome: 'Strict operational data fencing.'
          },
          {
            stepNumber: 2,
            title: 'Multi-Branch Country Aggregation',
            description: 'Country Managers and Super Administrators can seamlessly toggle between individual branch views or an aggregated nationwide financial consolidation.',
            expectedOutcome: 'Executive visibility without security compromise.'
          }
        ]
      }
    ]
  }
];
