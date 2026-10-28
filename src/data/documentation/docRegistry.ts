import type { DocCategory, DocTopic } from './types';
import { overviewTopic } from './topics/overview';
import { fleetTopics } from './topics/fleetProcesses';
import { driverTopics } from './topics/driverProcesses';
import { salesInvoicingTopics } from './topics/salesInvoicingProcesses';
import { financeAccountingTopics } from './topics/financeAccountingProcesses';
import { procurementTopics } from './topics/procurementProcesses';
import { workshopTopics } from './topics/workshopProcesses';
import { staffRoleTopics } from './topics/staffRoleProcesses';
import { bulkHubTopics } from './topics/bulkHubProcesses';

export const docCategories: DocCategory[] = [
  {
    id: 'overview',
    title: 'Platform Overview',
    description: 'System architecture, navigation flow, and user role hierarchy.',
    iconName: 'LayoutGrid',
    topics: [overviewTopic]
  },
  {
    id: 'fleet',
    title: 'Vehicle & Fleet Operations',
    description: 'Vehicle onboarding, driver assignments, inspections, and policy management.',
    iconName: 'Car',
    topics: fleetTopics
  },
  {
    id: 'driver',
    title: 'Driver Lifecycle & Legal',
    description: 'Driver KYC vetting, digital agreement execution, performance, and incident handling.',
    iconName: 'Users',
    topics: driverTopics
  },
  {
    id: 'sales',
    title: 'Sales & Invoicing',
    description: 'Customer profiles, tax invoices, payment receipts, aging, and credit notes.',
    iconName: 'Receipt',
    topics: salesInvoicingTopics
  },
  {
    id: 'finance',
    title: 'Financial Accounting & Banking',
    description: 'Chart of Accounts, General Ledger, manual journals, vouchers, and bank reconciliation.',
    iconName: 'Calculator',
    topics: financeAccountingTopics
  },
  {
    id: 'procurement',
    title: 'Procurement & Vendors',
    description: 'Supplier directory, Purchase Orders, approval limits, and bills conversion.',
    iconName: 'ShoppingBag',
    topics: procurementTopics
  },
  {
    id: 'workshop',
    title: 'Workshop & Inventory',
    description: 'Spare parts stock, service job cards, scraps, and workshop requisitions.',
    iconName: 'Wrench',
    topics: workshopTopics
  },
  {
    id: 'administration',
    title: 'Staff, Roles & Permissions',
    description: 'User access levels, permission flags, branch scoping, and staff metrics.',
    iconName: 'ShieldCheck',
    topics: staffRoleTopics
  },
  {
    id: 'bulk',
    title: 'Bulk Hub & Data Tools',
    description: 'High-volume Excel/CSV data imports, template formats, and batch validation.',
    iconName: 'UploadCloud',
    topics: bulkHubTopics
  }
];

export const getAllCategories = (): DocCategory[] => docCategories;

export const getAllTopics = (): DocTopic[] => {
  return docCategories.flatMap(cat => cat.topics);
};

export const getTopicById = (topicId: string): DocTopic | undefined => {
  const all = getAllTopics();
  return all.find(t => t.id === topicId);
};

export const getCategoryById = (categoryId: string): DocCategory | undefined => {
  return docCategories.find(c => c.id === categoryId);
};

export const getAdjacentTopics = (currentTopicId: string): { prev?: DocTopic; next?: DocTopic } => {
  const all = getAllTopics();
  const currentIndex = all.findIndex(t => t.id === currentTopicId);
  if (currentIndex === -1) return {};

  return {
    prev: currentIndex > 0 ? all[currentIndex - 1] : undefined,
    next: currentIndex < all.length - 1 ? all[currentIndex + 1] : undefined
  };
};
