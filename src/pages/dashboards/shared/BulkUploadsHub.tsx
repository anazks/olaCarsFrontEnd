import { useState } from 'react';
import { Upload, Users, DatabaseZap, BookOpen, X, ShieldAlert, ArrowRight, Lock, FileText, UserCheck } from 'lucide-react';
import { getDecodedToken } from '../../../utils/auth';
import Breadcrumbs from '../../../components/dashboard/shared/Breadcrumbs';
import BulkDriverUpload from './BulkDriverUpload';

import DataMigrationUpload from './DataMigrationUpload';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import BulkUploadJournal from '../finance/BulkUploadJournal';
import BulkInvoiceUpload from './BulkInvoiceUpload';
import BulkSupplierUpload from './BulkSupplierUpload';
import BulkCustomerUpload from './BulkCustomerUpload';
import BulkInventoryUpload from './BulkInventoryUpload';
import BulkPaymentUpload from './BulkPaymentUpload';
import BulkCreditNoteUpload from './BulkCreditNoteUpload';
import BulkPurchaseOrderUpload from './BulkPurchaseOrderUpload';
import BulkBillUpload from './BulkBillUpload';
import BulkVendorPaymentUpload from './BulkVendorPaymentUpload';
import BulkExpenseUpload from './BulkExpenseUpload';
import BulkLedgerUpload from './BulkLedgerUpload';
import BulkRentUpdateUpload from './BulkRentUpdateUpload';

type ModalType = 'driver' | 'migration' | 'journal' | 'invoice' | 'supplier' | 'customer' | 'inventory' | 'payment' | 'credit-note' | 'purchase-order' | 'bill' | 'vendor-payment' | 'expense' | 'ledger' | 'vehicle-rent' | null;

const BulkUploadsHub = () => {
    const [activeModal, setActiveModal] = useState<ModalType>(null);
    const decoded = getDecodedToken();
    const userRole = (decoded?.role ?? '').toLowerCase();

    const allRoles = ['admin', 'operationadmin', 'financialadmin', 'financeadmin', 'countrymanager', 'branchmanager', 'operationstaff', 'financestaff', 'workshopmanager', 'workshopstaff'];
    const hasDriverAccess = allRoles.includes(userRole);
    const hasMigrationAccess = allRoles.includes(userRole);
    const hasJournalAccess = allRoles.includes(userRole);

    const handleDownloadTemplate = (type: 'driver' | 'migration' | 'journal' | 'invoice' | 'supplier' | 'customer' | 'inventory' | 'payment' | 'credit-note' | 'ledger' | 'purchase-order' | 'bill' | 'vendor-payment' | 'expense' | 'vehicle-rent', format: 'csv' | 'xlsx' = 'xlsx') => {
        // Direct download helper or prompt depending on complexity
        let fileName = '';
        let headers: string[] = [];
        let rows: string[][] = [];

        if (type === 'driver') {
            fileName = 'driver_bulk_template.csv';
            headers = ['fullName', 'email', 'phone', 'whatsappNumber', 'dateOfBirth', 'nationality', 'idType', 'idNumber', 'licenseNumber', 'licenseCountry', 'licenseExpiry', 'emergencyName', 'emergencyRelationship', 'emergencyPhone'];
            rows = [['John Smith', 'john.smith@example.com', '+254700000001', '+254700000001', '1995-05-15', 'Kenyan', 'National ID', 'ID-12345678', 'DL-123456', 'Kenya', '2028-12-31', 'Jane Smith', 'Spouse', '+254700000002'], ['Maria Garcia', 'maria.garcia@example.com', '+254711223344', '+254711223344', '1990-08-22', 'Kenyan', 'Passport', 'PP-88552211', 'DL-789012', 'Kenya', '2029-06-30', 'Carlos Garcia', 'Brother', '+254711223355']];
        } else if (type === 'migration') {
            fileName = 'data_migration_template.csv';
            headers = ['fullName','email','phone','whatsappNumber','dateOfBirth','nationality','idType','idNumber','licenseNumber','licenseCountry','licenseExpiry','emergencyName','emergencyRelationship','emergencyPhone','vehicleNumber','vehicleMake','vehicleModel','vehicleYear','vehicleCategory','vehicleFuelType','vehicleColour','vehicleVin','activationDate','deactivationDate','weeklyRent','durationWeeks','remarks'];
            rows = [['John Smith', 'john@example.com', '+254700000001', '+254700000001', '1995-05-15', 'Kenyan', 'National ID', 'ID-12345', 'DL-123', 'Kenya', '2028-12-31', 'Jane Smith', 'Spouse', '+254700000002', 'KAA 123A', 'Toyota', 'Corolla', '2022', 'Sedan', 'GASOLINE', 'White', '', '15/01/24', '', '1500', '60', 'Migrated from old system']];
        } else if (type === 'journal') {
            fileName = 'journal_entries_template.csv';
            headers = ['Date', 'Reference', 'Branch', 'Account Code', 'Debit', 'Credit', 'Line Description', 'Tax Name'];
            rows = [
                ['2026-05-20', 'INV-001', 'BR01', '1010', '200', '0', 'Rent payment received', ''],
                ['2026-05-20', 'INV-001', 'BR01', '4010', '0', '200', 'Rent revenue earned', '']
            ];
        } else if (type === 'invoice') {
            fileName = 'invoice_bulk_template.csv';
            headers = [
                'Invoice Date', 'Invoice ID', 'Invoice Number', 'Invoice Status', 'Customer ID',
                'Customer Name', 'Customer Number', 'Company ID', 'Is Inclusive Tax', 'Due Date',
                'Discount Type', 'SubTotal', 'Total', 'TotalRetentionAmountFCY', 'TotalRetentionAmountBCY',
                'Balance', 'Adjustment', 'Notes', 'Entity Discount Amount', 'Location ID',
                'Item Name', 'Item Desc', 'Quantity', 'Discount', 'Discount Amount',
                'Item Total', 'Item Price', 'Account', 'Account Code', 'Line Item Location Name',
                'Invoice Shipment Status', 'Manually Shipped Quantity', 'Tax ID', 'Item Tax',
                'Item Tax %', 'Item Tax Amount', 'Item Tax Type'
            ];
            rows = [
                [
                    '2026-06-01', 'INV-ZOHO-001', 'INV-0000101', 'Closed', 'DRV001',
                    'John Smith', '+254700000001', 'COMP01', 'FALSE', '2026-06-15',
                    'Percentage', '180', '208.8', '', '',
                    '0', '', 'Weekly lease payment', '0', '',
                    'Weekly Rent', 'Vehicle Rent charge for week 23', '1', '0', '0',
                    '180', '180', 'Bank Transfer', '1010', '',
                    '', '', 'TAX16', 'VAT 16%', '16', '28.8', 'Taxable'
                ],
                [
                    '2026-06-02', 'INV-ZOHO-002', 'INV-0000102', 'Pending', 'DRV002',
                    'Maria Garcia', '+254711223344', 'COMP01', 'FALSE', '2026-06-20',
                    'Percentage', '100', '116.0', '', '',
                    '116.0', '', 'Scheduled oil change maintenance', '0', '',
                    'Oil Change Service', 'Service & Filter replacement', '1', '0', '0',
                    '100', '100', 'Cash', '1020', '',
                    '', '', 'TAX16', 'VAT 16%', '16', '16.0', 'Taxable'
                ]
            ];
        } else if (type === 'supplier') {
            fileName = 'vendor_bulk_template.csv';
            headers = [
                'Created Time', 'Last Modified Time', 'Contact ID', 'Contact Name', 'Vendor Number',
                'Company Name', 'Display Name', 'Salutation', 'First Name', 'Last Name', 'EmailID',
                'Phone', 'MobilePhone', 'Currency Code', 'Notes', 'Website', 'Status', 'Created By',
                'Opening Balance', 'Location ID', 'Location Name', 'Accounts Payable', 'Payment Terms Label',
                'Payment Terms', 'Taxable', 'Tax Name', 'Tax Percentage', 'Tax Type', 'Contact Address ID',
                'Billing Attention', 'Billing Address', 'Billing Street2', 'Billing City', 'Billing State',
                'Billing Country', 'Billing Code', 'Billing Phone', 'Billing Fax', 'Shipping Attention',
                'Shipping Address', 'Shipping Street2', 'Shipping City', 'Shipping State', 'Shipping Country',
                'Shipping Code', 'Shipping Phone', 'Shipping Fax', 'Source', 'Primary Contact ID', 'Company ID',
                'CF.FLEET NO', 'CF.ACTIVE DATE', 'CF.RUC', 'CF.DV'
            ];
            rows = [
                [
                    '2026-06-09 18:00:00', '2026-06-09 18:05:00', 'CON-9901', 'Panama Fleet Supplies S.A.', 'VEND-2026-01',
                    'Panama Fleet Supplies S.A.', 'Panama Fleet Supplies', 'Mr.', 'Carlos', 'Mendoza', 'sales@panamafleet.com',
                    '+50766001122', '+50766001123', 'USD', 'Primary supplier for workshop consumables and parts', 'https://www.panamafleet.com', 'Active', 'Admin',
                    '1500.00', 'LOC-PAN-01', 'Panama Depot Warehouse', '2.1.01', 'Net 30',
                    '30 Days', 'Yes', 'ITBMS 7%', '7', 'Taxable', 'CADDR-8801',
                    'Accounts Payable Dept', 'Avenida Balboa, Torre Las Americas', 'Suite 14B', 'Panama City', 'Panama', 'Panama', '0801', '+50766001122', '+50766001125', 'Receiving Dock',
                    'Calle 50 y Via Brasil', 'Warehouse Section B', 'Panama City', 'Panama', 'Panama', '0801', '+50766001122', '+50766001125', 'Direct Partner', 'CON-9901', 'COMP-OLA-01',
                    'FLEET-5501', '2026-01-15', '8-765-4321', '99'
                ]
            ];
        } else if (type === 'customer') {
            fileName = 'customer_bulk_template.csv';
            headers = [
                'Created Time', 'Last Modified Time', 'Display Name', 'Customer Number', 'Company Name',
                'Salutation', 'First Name', 'Last Name', 'Phone', 'Currency Code', 'Notes', 'Website',
                'Status', 'Created By', 'Accounts Receivable', 'Opening Balance', 'Opening Balance Exchange Rate',
                'Location ID', 'Location Name', 'Bank Account Payment', 'Portal Enabled', 'Credit Limit',
                'Customer Sub Type', 'Billing Attention', 'Billing Address', 'Billing Street2', 'Billing City',
                'Billing State', 'Billing Country', 'Billing County', 'Billing Code', 'Billing Phone',
                'Billing Fax', 'Billing Latitude', 'Billing Longitude', 'Shipping Attention', 'Shipping Address',
                'Shipping Street2', 'Shipping City', 'Shipping State', 'Shipping Country', 'Shipping County',
                'Shipping Code', 'Shipping Phone', 'Shipping Fax', 'Shipping Latitude', 'Shipping Longitude',
                'Skype Identity', 'Facebook', 'Twitter', 'Department', 'Designation', 'Price List',
                'Payment Terms', 'Payment Terms Label', 'Tax Type', 'Last Sync Time', 'Owner Name',
                'Primary Contact ID', 'EmailID', 'MobilePhone', 'Contact ID', 'Contact Name', 'Contact Type',
                'Taxable', 'Tax Name', 'Tax Percentage', 'Contact Address ID', 'Company ID',
                'CF.FLEET NO', 'CF.ACTIVE DATE', 'CF.VEHICLE NO :', 'CF.END DATE', 'CF.SECTION'
            ];
            rows = [
                [
                    '2026-06-01 10:00:00', '2026-06-01 10:05:00', 'Carlos Rodriguez', 'CUST-001', 'Rodriguez Transport S.A.',
                    'Mr.', 'Carlos', 'Rodriguez', '+50766001122', 'USD', 'Fleet driver', '',
                    'Active', 'Admin', '', '0', '1',
                    '', '', '', 'FALSE', '',
                    'Individual', 'Carlos Rodriguez', 'Calle 50', 'Apt 12B', 'Panama City',
                    'Panama', 'Panama', '', '0801', '+50766001122',
                    '', '', '', '', '',
                    '', '', '', '', '',
                    '', '', '', '', '',
                    '', '', '', 'Operations', 'Driver', '',
                    '7', 'Net 7', '', '', 'Admin',
                    '', 'carlos@example.com', '+50766001123', '', 'Carlos Rodriguez', 'Customer',
                    'No', '', '', '', 'COMP-OLA-01',
                    'FLEET-001', '2026-01-15', 'KAA 123A', '', 'A'
                ]
            ];
        } else if (type === 'inventory') {
            fileName = 'inventory_bulk_template.csv';
            headers = [
                'Item ID', 'Item Name', 'SKU', 'Description', 'Rate', 'Account Code', 
                'Purchase Account Code', 'Inventory Account Code', 'Tax Name', 'Unit Name', 
                'Reorder Point', 'Vendor', 'Location Name', 'Opening Stock'
            ];
            rows = [
                ['PART-001', 'Premium Front Brake Pads', 'BRK-PAD-F-001', 'Ceramic brake pads for front axle disc brakes', '45.00', 'IN0008', 'CGS0001', 'AST0001', 'ITBMS 7%', 'piece', '5', 'Panama Fleet Supplies', 'Panama Depot Warehouse', '20']
            ];
        } else if (type === 'payment') {
            fileName = 'payments_received_bulk_template.csv';
            headers = [
                'Payment Number', 'CustomerPayment ID', 'Mode', 'CustomerID', 'Description', 'Exchange Rate',
                'Amount', 'Unused Amount', 'Bank Charges', 'Reference Number', 'Currency Code', 'Branch ID',
                'Payment Number Prefix', 'Payment Number Suffix', 'Customer Name', 'Customer Number',
                'Payment Type', 'Location Name', 'Date', 'Created Time', 'Deposit To', 'Deposit To Account Code',
                'Tax Account', 'Payment Status', 'InvoicePayment ID', 'Amount Applied to Invoice',
                'Invoice Payment Applied Date', 'Early Payment Discount', 'Withholding Tax Amount',
                'Invoice Number', 'Invoice Date'
            ];
            rows = [
                [
                    'PR-000101', 'PM-ZOHO-001', 'Cash', 'DRV001', 'Weekly lease payment received', '1',
                    '180', '0', '0', 'REF-12345', 'USD', '', '', '', 'John Smith', '+254700000001',
                    'Cash', 'Panama Branch', '2026-06-02', '2026-06-02 10:00:00', 'Cash Account', '1020',
                    '', 'Completed', 'IP-001', '180', '2026-06-02', '0', '0', 'INV-000101', '2026-06-01'
                ],
                [
                    'PR-000102', 'PM-ZOHO-002', 'Bank Transfer', 'DRV002', 'Maintenance recovery payment', '1',
                    '100', '0', '0', 'REF-98765', 'USD', '', '', '', 'Maria Garcia', '+254711223344',
                    'Bank Transfer', 'Panama Branch', '2026-06-03', '2026-06-03 11:30:00', 'Bank Account', '1010',
                    '', 'Completed', 'IP-002', '100', '2026-06-03', '0', '0', 'INV-000102', '2026-06-02'
                ]
            ];
        } else if (type === 'credit-note') {
            fileName = 'credit_notes_bulk_template.csv';
            headers = [
                'Credit Note Date', 'Issued Date', 'Transaction Posting Date', 'Product ID', 'CreditNotes ID',
                'Credit Note Number', 'Credit Note Status', 'Accounts Receivable', 'Customer Name', 'Customer Number',
                'Billing Attention', 'Billing Address', 'Billing Street 2', 'Billing City', 'Billing State',
                'Billing Country', 'Billing Code', 'Billing Phone', 'Billing Fax', 'Shipping Attention',
                'Shipping Address', 'Shipping Street 2', 'Shipping City', 'Shipping State', 'Shipping Country',
                'Shipping Phone', 'Shipping Code', 'Shipping Fax', 'Customer ID', 'Currency Code', 'Exchange Rate',
                'Is Inclusive Tax', 'Total', 'Balance', 'Entity Discount Percent', 'Notes', 'Terms & Conditions',
                'Reference#', 'Shipping Charge', 'Shipping Charge Tax ID', 'Shipping Charge Tax Amount',
                'Shipping Charge Tax Name', 'Shipping Charge Tax %', 'Shipping Charge Tax Type',
                'Shipping Charge Account', 'Adjustment', 'Adjustment Account', 'Branch ID', 'Is Discount Before Tax',
                'Item Name', 'Discount', 'Discount Amount', 'Quantity', 'Item Desc', 'Item Tax Amount',
                'Item Total', 'Applied Invoice Number', 'Location Name', 'Project ID', 'Project Name',
                'Tax1 ID', 'Item Tax', 'Item Tax %', 'Item Tax Type', 'Sales person', 'Discount Type',
                'SubTotal', 'Round Off', 'Adjustment Description', 'Subject', 'Template Name', 'Usage unit',
                'Item Price', 'Account', 'Account Code', 'SKU', 'UPC', 'MPN', 'EAN', 'ISBN', 'p',
                'Entity Discount Amount', 'Line Item Location Name', 'Kit Combo Item Name',
                'CF.STAFF NAME', 'CF.CUFE', 'CF.Protocolo de autorización', 'CF.Fecha de autorización'
            ];
            rows = [
                [
                    '2026-06-02', '2026-06-02', '', '', '', 'CN-000101', '', '', 'John Smith', '+254700000001',
                    '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'USD', '1',
                    'FALSE', '150.00', '150.00', '', 'Vehicle downtime credit adjustment', '', 'REF-12345', '', '', '', '',
                    '', '', '', '', '', '', '', 'Weekly Rent', '0', '0', '1', 'Downtime Adjustment', '10.50',
                    '150.00', 'INV-000101, INV-000102', 'Panama Branch', '', '', '', 'ITBMS 7%', '7', 'Taxable', '', '',
                    '150.00', '0.00', '', 'Vehicle Downtime Adjustment', '', '', '150.00', '', '', '', '', '', '', '', '', '',
                    '', '', '', 'Alice Vance', 'CUFE-12345-OLA', 'PROT-OLA-99', '2026-06-02'
                ]
            ];
        } else if (type === 'purchase-order') {
            fileName = 'purchase_orders_bulk_template.csv';
            headers = [
                'Purchase Order ID', 'Purchase Order Date', 'Location ID', 'Location Name', 'Delivery Date',
                'Purchase Order Number', 'Reference#', 'Purchase Order Status', 'Vendor Name', 'Vendor Number',
                'Is Inclusive Tax', 'Currency Code', 'Exchange Rate', 'Template Name', 'Reference No',
                'Account', 'Account Code', 'Item Price', 'Item Name', 'Product ID', 'Item Desc',
                'QuantityOrdered', 'QuantityCancelled', 'QuantityReceived', 'QuantityBilled', 'Usage unit',
                'Line Item Location Name', 'Discount Type', 'Is Discount Before Tax', 'Discount', 'Discount Amount',
                'Tax ID', 'Item Tax', 'Item Tax %', 'Item Tax Amount', 'Item Tax Type', 'Item Total', 'Total',
                'Adjustment', 'Adjustment Description', 'Entity Discount Percent', 'Entity Discount Amount',
                'Payment Terms', 'Payment Terms Label', 'Attention', 'Country'
            ];
            rows = [
                [
                    'PO-ZOHO-001', '2026-06-12', '', 'Downtown Branch', '',
                    'PO-000101', 'REF-12345', 'Approved', 'Acme Car Parts', 'VEND-001',
                    'FALSE', 'USD', '1', 'Standard Template', '',
                    'Cost of Goods Sold', '5000', '45.00', 'Synthetic Engine Oil 5W-30', 'PROD-001', 'High performance synthetic oil',
                    '10', '0', '0', '0', 'liters',
                    'Downtown Branch', '', 'FALSE', '0', '0',
                    '', '', '0', '0', 'Taxable', '450.00', '450.00',
                    '0', '', '0', '0',
                    'Net 30', '30 Days', 'Accounts Payable', 'Panama'
                ],
                [
                    'PO-ZOHO-001', '2026-06-12', '', 'Downtown Branch', '',
                    'PO-000101', 'REF-12345', 'Approved', 'Acme Car Parts', 'VEND-001',
                    'FALSE', 'USD', '1', 'Standard Template', '',
                    'Cost of Goods Sold', '5000', '12.50', 'Premium Oil Filter', 'PROD-002', 'OEM specification oil filter',
                    '10', '0', '0', '0', 'pieces',
                    'Downtown Branch', '', 'FALSE', '0', '0',
                    '', '', '0', '0', 'Taxable', '125.00', '125.00',
                    '0', '', '0', '0',
                    'Net 30', '30 Days', 'Accounts Payable', 'Panama'
                ]
            ];
        } else if (type === 'bill') {
            fileName = 'bills_bulk_template.csv';
            headers = [
                'Bill Date', 'Due Date', 'Bill ID', 'Accounts Payable', 'Vendor Name', 'Vendor Number',
                'Entity Discount Percent', 'Payment Terms', 'Payment Terms Label', 'Bill Number', 'PurchaseOrder',
                'Currency Code', 'Exchange Rate', 'SubTotal', 'Total', 'Balance', 'TotalRetentionAmountFCY',
                'TotalRetentionAmountBCY', 'Adjustment', 'Adjustment Description', 'Adjustment Account', 'Bill Type',
                'Branch ID', 'Branch Name', 'Location Name', 'Is Inclusive Tax', 'Bill Status', 'Created By',
                'Account', 'Account Code', 'Description', 'Quantity', 'Usage unit', 'Tax Amount', 'Item Total',
                'Is Billable', 'Line Item Location Name', 'Rate', 'Discount Type', 'Is Discount Before Tax',
                'Discount', 'Discount Amount', 'Bill Receive Status', 'Manually Received Quantity', 'Tax ID',
                'Tax Name', 'Tax Percentage', 'Tax Type', 'Entity Discount Amount', 'Discount Account', 'Is Landed Cost'
            ];
            rows = [
                [
                    '2026-06-12', '2026-07-12', 'BILL-ZOHO-001', '', 'Acme Car Parts', 'VEND-001',
                    '', 'Net 30', '30 Days', 'BILL-000101', '',
                    'USD', '1', '450.00', '450.00', '450.00', '',
                    '', '', '', '', 'Standard',
                    '', 'Downtown Branch', 'Downtown Branch', 'FALSE', 'Open', 'Admin',
                    'Cost of Goods Sold', '5000', 'Synthetic Engine Oil 5W-30', '10', 'liters', '', '450.00',
                    'TRUE', 'Downtown Branch', '45.00', '', 'FALSE',
                    '', '', '', '', '',
                    '', '0', '', '', '', '', ''
                ]
            ];
        } else if (type === 'vendor-payment') {
            fileName = 'vendor_payments_bulk_template.csv';
            headers = [
                'Payment Number', 'Payment Number Prefix', 'Payment Number Suffix', 'VendorPayment ID',
                'Mode', 'Description', 'Exchange Rate', 'Amount', 'Unused Amount', 'Reference Number',
                'Currency Code', 'Branch ID', 'Bank Charges', 'Payment Status', 'Date', 'Location Name',
                'Vendor Name', 'Vendor Number', 'EmailID', 'Paid Through', 'Paid Through Account Code',
                'Tax Account', 'Bank Reference Number', 'PIPayment ID', 'Bill ID', 'Bill Amount',
                'Bill Payment Applied Date', 'Bill Date', 'Bill Number', 'Withholding Tax Amount',
                'Withholding Tax Amount (BCY)'
            ];
            rows = [
                [
                    'PMT-00001', '', '', '', 'Bank Transfer', 'Monthly supplier payment', '1', '1500.00', '0',
                    'REF-VP-001', 'USD', '', '0', 'Completed', '2026-06-10', 'Panama Branch',
                    'Acme Car Parts', 'VEND-001', '', 'Cash Account', '1020',
                    '', '', '', '', '1500.00', '', '', 'BILL-000101', '', ''
                ]
            ];
        } else if (type === 'expense') {
            fileName = 'expenses_bulk_template.csv';
            headers = [
                'Expense Date', 'Expense Description', 'Expense Account', 'Expense Account Code',
                'Paid Through', 'Paid Through Account Code', 'Vendor', 'Vendor Number',
                'Location Name', 'Project Name', 'Entry Number', 'Currency Code',
                'Exchange Rate', 'Is Inclusive Tax', 'Mileage Rate', 'Mileage Type',
                'Tax Type', 'Tax Amount', 'Expense Amount', 'Total', 'Is Billable',
                'Expense Reference ID', 'Is Reimbursable'
            ];
            rows = [
                [
                    '2026-06-12', 'Office Stationery and Supplies', 'Office Expenses', '6010',
                    'Petty Cash', '1030', 'Stationery Depot', 'VEND-003', 'Downtown Branch',
                    'Q2 Office Rebranding', 'EXP-REF-001', 'USD', '1.0', 'FALSE', '', '',
                    'Standard Tax', '0.00', '150.00', '150.00', 'FALSE', 'REF-EXP-9901', 'FALSE'
                ]
            ];
        } else if (type === 'ledger') {
            fileName = 'bank_transactions_template.csv';
            headers = [
                'Date', 'Description', 'Transaction Details', 'Debit', 'Credit', 'Running Balance', 'Transaction Type', 'Amount'
            ];
            rows = [
                ['2026-06-01', 'Opening Balance', 'System migration opening balance', '50000.00', '0.00', '50000.00', 'DEBIT', '50000.00'],
                ['2026-06-02', 'Invoice Payment Received', 'INV-002305 from Client Alpha', '1500.00', '0.00', '51500.00', 'DEBIT', '1500.00'],
                ['2026-06-03', 'Office Utilities Paid', 'Electricity bill payment - SB-88772', '0.00', '320.00', '51180.00', 'CREDIT', '320.00']
            ];
        } else if (type === 'vehicle-rent') {
            fileName = 'vehicle_weekly_rent_template.csv';
            headers = ['Vehicle No', 'Vehicle Model', 'Weekly Rent', 'VIN Number'];
            rows = [
                ['KCC 123A', 'Toyota Corolla', '150', '1NXBR32E6NZ000001'],
                ['KCD 456B', 'Nissan X-Trail', '180', 'JN1TA0CP8LX000002']
            ];
        }

        if (format === 'xlsx') {
            const downloadName = fileName.replace('.csv', '.xlsx');
            const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Template");
            XLSX.writeFile(workbook, downloadName);
            toast.success(`${downloadName} downloaded!`);
            return;
        }

        const csvContent = "data:text/csv;charset=utf-8," 
            + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success(`${fileName} downloaded!`);
    };

    return (
        <div className="flex-1 min-h-screen p-2 space-y-2" style={{ background: 'var(--bg-main)' }}>
            <Breadcrumbs items={[{ label: 'System Preferences', path: '/admin/dashboard-settings' }, { label: 'Bulk Operations Center', active: true }]} />

            {/* Header section with premium styling */}
            <div className="relative rounded-xl p-4 overflow-hidden flex flex-col justify-between gap-3 md:flex-row md:items-center"
                 style={{ 
                     background: 'var(--bg-card)'
                 }}>
                <div className="space-y-0.5 max-w-2xl">
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider" 
                         style={{ background: 'rgba(200, 230, 0, 0.1)', color: 'var(--brand-lime)' }}>
                        <Upload size={10} /> Data Imports & Sync
                    </div>
                    <h1 className="text-base md:text-lg font-black tracking-tight" style={{ color: 'var(--text-main)' }}>
                        Bulk Operations Center
                    </h1>
                    <p className="text-[11px] font-medium leading-relaxed" style={{ color: 'var(--text-dim)' }}>
                        Onboard users, migrate legacy operations, sync general ledger sheets, and deploy batch fleets with validation logging. Select a model importer below to begin.
                    </p>
                </div>
                <div className="flex gap-2">
                    <div className="px-3 py-1.5 rounded-lg border text-center min-w-24" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}>
                        <p className="text-base font-black text-main">10</p>
                        <p className="text-[8px] font-black uppercase tracking-widest text-dim">Total Modules</p>
                    </div>
                    <div className="px-3 py-1.5 rounded-lg border text-center min-w-24" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}>
                        <p className="text-base font-black" style={{ color: 'var(--brand-lime)' }}>Active</p>
                        <p className="text-[8px] font-black uppercase tracking-widest text-dim">System Status</p>
                    </div>
                </div>
            </div>

            {/* Bento Grid layout */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                
                {/* CARD 1: DRIVERS */}
                <div className="group relative rounded-2xl p-4 border shadow-md flex flex-col justify-between transition-all hover:scale-[1.01] hover:shadow-lg"
                     style={{ 
                         background: 'var(--bg-card)', 
                         borderColor: 'var(--border-main)' 
                     }}>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:rotate-6" 
                                 style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
                                <Users size={20} className="text-blue-500" />
                            </div>
                            {hasDriverAccess ? (
                                <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-green-500/10 text-green-500 border border-green-500/20">
                                    Authorized
                                </span>
                            ) : (
                                <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 border border-red-500/20 flex items-center gap-1">
                                    <Lock size={10} /> Locked
                                </span>
                            )}
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-base font-bold text-main">Driver Bulk Upload</h3>
                            <p className="text-xs text-dim leading-relaxed">
                                Onboard multiple driver applicants. Parsed fields include full name, contact, license credentials, and emergency relations. Auto-associates branches based on user authorization.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-1.5 text-[9px] font-black uppercase tracking-widest text-dim pt-1">
                            <span className="px-1.5 py-0.5 rounded bg-input border" style={{ borderColor: 'var(--border-main)' }}>.csv</span>
                            <span className="px-1.5 py-0.5 rounded bg-input border" style={{ borderColor: 'var(--border-main)' }}>.xlsx</span>
                            <span className="px-1.5 py-0.5 rounded bg-input border" style={{ borderColor: 'var(--border-main)' }}>.txt</span>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2 mt-5 pt-3 border-t" style={{ borderColor: 'var(--border-main)' }}>
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-dim">Templates:</span>
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => handleDownloadTemplate('driver', 'xlsx')}
                                    className="text-[11px] font-bold text-dim hover:text-main transition-colors"
                                >
                                    Excel
                                </button>
                                <span className="text-dim/30">|</span>
                                <button 
                                    onClick={() => handleDownloadTemplate('driver', 'csv')}
                                    className="text-[11px] font-bold text-dim hover:text-main transition-colors"
                                >
                                    CSV
                                </button>
                            </div>
                        </div>
                        <button
                            disabled={!hasDriverAccess}
                            onClick={() => setActiveModal('driver')}
                            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border-none hover:scale-[1.02] active:scale-95 disabled:opacity-40 disabled:pointer-events-none shadow-sm"
                            style={{ backgroundColor: 'var(--brand-lime)', color: 'var(--brand-black)' }}
                        >
                            Launch Importer <ArrowRight size={14} />
                        </button>
                    </div>
                </div>


                {/* CARD 2: CUSTOMERS */}
                <div className="group relative rounded-2xl p-4 border shadow-md flex flex-col justify-between transition-all hover:scale-[1.01] hover:shadow-lg"
                     style={{ 
                         background: 'var(--bg-card)', 
                         borderColor: 'var(--border-main)' 
                     }}>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:rotate-6" 
                                 style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)' }}>
                                <UserCheck size={20} style={{ color: '#10b981' }} />
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-green-500/10 text-green-500 border border-green-500/20">
                                Authorized
                            </span>
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-base font-bold text-main">Customer Bulk Upload</h3>
                            <p className="text-xs text-dim leading-relaxed">
                                Import Zoho-format customer contacts. Rows with Vehicle No. auto-create linked Driver records and associate vehicles by plate number.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-1.5 text-[9px] font-black uppercase tracking-widest text-dim pt-1">
                            <span className="px-1.5 py-0.5 rounded bg-input border" style={{ borderColor: 'var(--border-main)' }}>.csv</span>
                            <span className="px-1.5 py-0.5 rounded bg-input border" style={{ borderColor: 'var(--border-main)' }}>.xlsx</span>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2 mt-5 pt-3 border-t" style={{ borderColor: 'var(--border-main)' }}>
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-dim">Templates:</span>
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => handleDownloadTemplate('customer', 'xlsx')}
                                    className="text-[11px] font-bold text-dim hover:text-main transition-colors"
                                >
                                    Excel
                                </button>
                                <span className="text-dim/30">|</span>
                                <button 
                                    onClick={() => handleDownloadTemplate('customer', 'csv')}
                                    className="text-[11px] font-bold text-dim hover:text-main transition-colors"
                                >
                                    CSV
                                </button>
                            </div>
                        </div>
                        <button
                            onClick={() => setActiveModal('customer')}
                            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border-none hover:scale-[1.02] active:scale-95 shadow-sm"
                            style={{ backgroundColor: 'var(--brand-lime)', color: 'var(--brand-black)' }}
                        >
                            Launch Importer <ArrowRight size={14} />
                        </button>
                    </div>
                </div>

                {/* CARD 3: DATA MIGRATION */}
                <div className="group relative rounded-2xl p-4 border shadow-md flex flex-col justify-between transition-all hover:scale-[1.01] hover:shadow-lg"
                     style={{ 
                          background: 'var(--bg-card)', 
                          borderColor: 'var(--border-main)' 
                      }}>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:rotate-6" 
                                 style={{ backgroundColor: 'rgba(168, 85, 247, 0.1)' }}>
                                <DatabaseZap size={20} style={{ color: '#a855f7' }} />
                            </div>
                            {hasMigrationAccess ? (
                                <span className="text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-green-500/10 text-green-500 border border-green-500/20">
                                    Authorized
                                </span>
                            ) : (
                                <span className="text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-500 border border-red-500/20 flex items-center gap-1">
                                    <Lock size={10} /> Locked
                                </span>
                            )}
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-base font-bold text-main">Data Migration Options</h3>
                            <p className="text-xs text-dim leading-relaxed">
                                Import pre-linked active relationships between drivers, vehicles, and billing details from legacy operations. Bypasses typical onboarding flows directly to verification.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-1.5 text-[9px] font-black uppercase tracking-widest text-dim pt-1">
                            <span className="px-1.5 py-0.5 rounded bg-input border" style={{ borderColor: 'var(--border-main)' }}>.csv</span>
                            <span className="px-1.5 py-0.5 rounded bg-input border" style={{ borderColor: 'var(--border-main)' }}>.xlsx</span>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2 mt-5 pt-3 border-t" style={{ borderColor: 'var(--border-main)' }}>
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-dim">Templates:</span>
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => handleDownloadTemplate('migration', 'xlsx')}
                                    className="text-[11px] font-bold text-dim hover:text-main transition-colors"
                                >
                                    Excel
                                </button>
                                <span className="text-dim/30">|</span>
                                <button 
                                    onClick={() => handleDownloadTemplate('migration', 'csv')}
                                    className="text-[11px] font-bold text-dim hover:text-main transition-colors"
                                >
                                    CSV
                                </button>
                            </div>
                        </div>
                        <button
                            disabled={!hasMigrationAccess}
                            onClick={() => setActiveModal('migration')}
                            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border-none hover:scale-[1.02] active:scale-95 disabled:opacity-40 disabled:pointer-events-none shadow-sm"
                            style={{ backgroundColor: 'var(--brand-lime)', color: 'var(--brand-black)' }}
                        >
                            Launch Importer <ArrowRight size={14} />
                        </button>
                    </div>
                </div>

                {/* CARD 4: JOURNAL ENTRIES */}
                <div className="group relative rounded-2xl p-4 border shadow-md flex flex-col justify-between transition-all hover:scale-[1.01] hover:shadow-lg"
                     style={{ 
                          background: 'var(--bg-card)', 
                          borderColor: 'var(--border-main)' 
                      }}>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:rotate-6" 
                                 style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
                                <BookOpen size={20} style={{ color: '#ef4444' }} />
                            </div>
                            {hasJournalAccess ? (
                                <span className="text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-green-500/10 text-green-500 border border-green-500/20">
                                    Authorized
                                </span>
                            ) : (
                                <span className="text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-500 border border-red-500/20 flex items-center gap-1">
                                    <Lock size={10} /> Locked
                                </span>
                            )}
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-base font-bold text-main">Bulk Upload Journal Entries</h3>
                            <p className="text-xs text-dim leading-relaxed">
                                Sync accounting entries directly into the general ledger. Useful for mass rent reconciliations, external payment gateway mappings, and monthly depreciation journals.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-1.5 text-[9px] font-black uppercase tracking-widest text-dim pt-1">
                            <span className="px-1.5 py-0.5 rounded bg-input border" style={{ borderColor: 'var(--border-main)' }}>.csv</span>
                            <span className="px-1.5 py-0.5 rounded bg-input border" style={{ borderColor: 'var(--border-main)' }}>.xlsx</span>
                            <span className="px-1.5 py-0.5 rounded bg-input border" style={{ borderColor: 'var(--border-main)' }}>.xls</span>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2 mt-5 pt-3 border-t" style={{ borderColor: 'var(--border-main)' }}>
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-dim">Templates:</span>
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => handleDownloadTemplate('journal', 'xlsx')}
                                    className="text-[11px] font-bold text-dim hover:text-main transition-colors"
                                >
                                    Excel
                                </button>
                                <span className="text-dim/30">|</span>
                                <button 
                                    onClick={() => handleDownloadTemplate('journal', 'csv')}
                                    className="text-[11px] font-bold text-dim hover:text-main transition-colors"
                                >
                                    CSV
                                </button>
                            </div>
                        </div>
                        <button
                            disabled={!hasJournalAccess}
                            onClick={() => setActiveModal('journal')}
                            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border-none hover:scale-[1.02] active:scale-95 disabled:opacity-40 disabled:pointer-events-none shadow-sm"
                            style={{ backgroundColor: 'var(--brand-lime)', color: 'var(--brand-black)' }}
                        >
                            Launch Importer <ArrowRight size={14} />
                        </button>
                    </div>
                </div>
                {/* CARD 5: INVOICES */}
                <div className="group relative rounded-2xl p-4 border shadow-md flex flex-col justify-between transition-all hover:scale-[1.01] hover:shadow-lg"
                     style={{ 
                          background: 'var(--bg-card)', 
                          borderColor: 'var(--border-main)' 
                      }}>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:rotate-6" 
                                 style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
                                <FileText size={20} className="text-blue-500" />
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-green-500/10 text-green-500 border border-green-500/20">
                                Authorized
                            </span>
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-base font-bold text-main">Invoice Bulk Upload</h3>
                            <p className="text-xs text-dim leading-relaxed">
                                Upload multiple invoices for Rent, Workshop, or Deposits. Auto-calculates payment status based on amounts and dynamically generates prefix codes.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-1.5 text-[9px] font-black uppercase tracking-widest text-dim pt-1">
                            <span className="px-1.5 py-0.5 rounded bg-input border" style={{ borderColor: 'var(--border-main)' }}>.csv</span>
                            <span className="px-1.5 py-0.5 rounded bg-input border" style={{ borderColor: 'var(--border-main)' }}>.xlsx</span>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2 mt-5 pt-3 border-t" style={{ borderColor: 'var(--border-main)' }}>
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-dim">Templates:</span>
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => handleDownloadTemplate('invoice', 'xlsx')}
                                    className="text-[11px] font-bold text-dim hover:text-main transition-colors"
                                >
                                    Excel
                                </button>
                                <span className="text-dim/30">|</span>
                                <button 
                                    onClick={() => handleDownloadTemplate('invoice', 'csv')}
                                    className="text-[11px] font-bold text-dim hover:text-main transition-colors"
                                >
                                    CSV
                                </button>
                            </div>
                        </div>
                        <button
                            onClick={() => setActiveModal('invoice')}
                            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border-none hover:scale-[1.02] active:scale-95 shadow-sm"
                            style={{ backgroundColor: 'var(--brand-lime)', color: 'var(--brand-black)' }}
                        >
                            Launch Importer <ArrowRight size={14} />
                        </button>
                    </div>
                </div>

                {/* CARD 6: SUPPLIERS */}
                <div className="group relative rounded-2xl p-4 border shadow-md flex flex-col justify-between transition-all hover:scale-[1.01] hover:shadow-lg"
                     style={{ 
                          background: 'var(--bg-card)', 
                          borderColor: 'var(--border-main)' 
                      }}>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:rotate-6" 
                                 style={{ backgroundColor: 'rgba(200, 230, 0, 0.1)' }}>
                                <Upload size={20} style={{ color: 'var(--brand-lime)' }} />
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-green-500/10 text-green-500 border border-green-500/20">
                                Authorized
                            </span>
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-base font-bold text-main">Vendor Bulk Upload</h3>
                            <p className="text-xs text-dim leading-relaxed">
                                Import active vendors/suppliers directory. Matches accounts payable to your chart of accounts (e.g. Code 2.1.01), parses fleet assignments, and supports tax, location, and address details.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-1.5 text-[9px] font-black uppercase tracking-widest text-dim pt-1">
                            <span className="px-1.5 py-0.5 rounded bg-input border" style={{ borderColor: 'var(--border-main)' }}>.csv</span>
                            <span className="px-1.5 py-0.5 rounded bg-input border" style={{ borderColor: 'var(--border-main)' }}>.xlsx</span>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2 mt-5 pt-3 border-t" style={{ borderColor: 'var(--border-main)' }}>
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-dim">Templates:</span>
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => handleDownloadTemplate('supplier', 'xlsx')}
                                    className="text-[11px] font-bold text-dim hover:text-main transition-colors bg-transparent border-none cursor-pointer"
                                >
                                    Excel
                                </button>
                                <span className="text-dim/30">|</span>
                                <button 
                                    onClick={() => handleDownloadTemplate('supplier', 'csv')}
                                    className="text-[11px] font-bold text-dim hover:text-main transition-colors bg-transparent border-none cursor-pointer"
                                >
                                    CSV
                                </button>
                            </div>
                        </div>
                        <button
                            onClick={() => setActiveModal('supplier')}
                            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border-none hover:scale-[1.02] active:scale-95 shadow-sm cursor-pointer"
                            style={{ backgroundColor: 'var(--brand-lime)', color: 'var(--brand-black)' }}
                        >
                            Launch Importer <ArrowRight size={14} />
                        </button>
                    </div>
                </div>

                {/* CARD 7: INVENTORY */}
                <div className="group relative rounded-2xl p-4 border shadow-md flex flex-col justify-between transition-all hover:scale-[1.01] hover:shadow-lg"
                     style={{ 
                          background: 'var(--bg-card)', 
                          borderColor: 'var(--border-main)' 
                      }}>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:rotate-6" 
                                 style={{ backgroundColor: 'rgba(212, 241, 46, 0.1)' }}>
                                <Upload size={20} className="text-[#D4F12E]" />
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-green-500/10 text-green-500 border border-green-500/20">
                                Authorized
                            </span>
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-base font-bold text-main">Inventory Bulk Upload</h3>
                            <p className="text-xs text-dim leading-relaxed">
                                Sync warehouse parts. Links with accounting codes, taxes, location names, and vendors dynamically. Rate matches the selling price.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-1.5 text-[9px] font-black uppercase tracking-widest text-dim pt-1">
                            <span className="px-1.5 py-0.5 rounded bg-input border" style={{ borderColor: 'var(--border-main)' }}>.csv</span>
                            <span className="px-1.5 py-0.5 rounded bg-input border" style={{ borderColor: 'var(--border-main)' }}>.xlsx</span>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2 mt-5 pt-3 border-t" style={{ borderColor: 'var(--border-main)' }}>
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-dim">Templates:</span>
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => handleDownloadTemplate('inventory', 'xlsx')}
                                    className="text-[11px] font-bold text-dim hover:text-main transition-colors bg-transparent border-none cursor-pointer"
                                >
                                    Excel
                                </button>
                                <span className="text-dim/30">|</span>
                                <button 
                                    onClick={() => handleDownloadTemplate('inventory', 'csv')}
                                    className="text-[11px] font-bold text-dim hover:text-main transition-colors bg-transparent border-none cursor-pointer"
                                >
                                    CSV
                                </button>
                            </div>
                        </div>
                        <button
                            onClick={() => setActiveModal('inventory')}
                            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border-none hover:scale-[1.02] active:scale-95 shadow-sm cursor-pointer"
                            style={{ backgroundColor: 'var(--brand-lime)', color: 'var(--brand-black)' }}
                        >
                            Launch Importer <ArrowRight size={14} />
                        </button>
                    </div>
                </div>

                {/* CARD 8: PAYMENTS RECEIVED */}
                <div className="group relative rounded-2xl p-4 border shadow-md flex flex-col justify-between transition-all hover:scale-[1.01] hover:shadow-lg"
                     style={{ 
                          background: 'var(--bg-card)', 
                          borderColor: 'var(--border-main)' 
                      }}>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:rotate-6" 
                                 style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }}>
                                <DatabaseZap size={20} className="text-green-500" />
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-green-500/10 text-green-500 border border-green-500/20">
                                Authorized
                            </span>
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-base font-bold text-main">Payment Bulk Upload</h3>
                            <p className="text-xs text-dim leading-relaxed">
                                Upload batch payment receipts. Links with customer accounts, matches outstanding invoice balances, and generates double-entry ledger entries.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-1.5 text-[9px] font-black uppercase tracking-widest text-dim pt-1">
                            <span className="px-1.5 py-0.5 rounded bg-input border" style={{ borderColor: 'var(--border-main)' }}>.csv</span>
                            <span className="px-1.5 py-0.5 rounded bg-input border" style={{ borderColor: 'var(--border-main)' }}>.xlsx</span>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2 mt-5 pt-3 border-t" style={{ borderColor: 'var(--border-main)' }}>
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-dim">Templates:</span>
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => handleDownloadTemplate('payment', 'xlsx')}
                                    className="text-[11px] font-bold text-dim hover:text-main transition-colors bg-transparent border-none cursor-pointer"
                                >
                                    Excel
                                </button>
                                <span className="text-dim/30">|</span>
                                <button 
                                    onClick={() => handleDownloadTemplate('payment', 'csv')}
                                    className="text-[11px] font-bold text-dim hover:text-main transition-colors bg-transparent border-none cursor-pointer"
                                >
                                    CSV
                                </button>
                            </div>
                        </div>
                        <button
                            onClick={() => setActiveModal('payment')}
                            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border-none hover:scale-[1.02] active:scale-95 shadow-sm cursor-pointer"
                            style={{ backgroundColor: 'var(--brand-lime)', color: 'var(--brand-black)' }}
                        >
                            Launch Importer <ArrowRight size={14} />
                        </button>
                    </div>
                </div>

                {/* CARD 9: CREDIT NOTES */}
                <div className="group relative rounded-2xl p-4 border shadow-md flex flex-col justify-between transition-all hover:scale-[1.01] hover:shadow-lg"
                     style={{ 
                          background: 'var(--bg-card)', 
                          borderColor: 'var(--border-main)' 
                      }}>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:rotate-6" 
                                 style={{ backgroundColor: 'rgba(99, 102, 241, 0.1)' }}>
                                <FileText size={20} className="text-indigo-400" />
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-green-500/10 text-green-500 border border-green-500/20">
                                Authorized
                            </span>
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-base font-bold text-main">Credit Note Bulk Upload</h3>
                            <p className="text-xs text-dim leading-relaxed">
                                Upload bulk Credit Note adjustments. Links customers by name, matches outstanding invoices, distributes credit sequentially, and registers double-entry ledger entries.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-1.5 text-[9px] font-black uppercase tracking-widest text-dim pt-1">
                            <span className="px-1.5 py-0.5 rounded bg-input border" style={{ borderColor: 'var(--border-main)' }}>.csv</span>
                            <span className="px-1.5 py-0.5 rounded bg-input border" style={{ borderColor: 'var(--border-main)' }}>.xlsx</span>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2 mt-5 pt-3 border-t" style={{ borderColor: 'var(--border-main)' }}>
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-dim">Templates:</span>
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => handleDownloadTemplate('credit-note', 'xlsx')}
                                    className="text-[11px] font-bold text-dim hover:text-main transition-colors bg-transparent border-none cursor-pointer"
                                >
                                    Excel
                                </button>
                                <span className="text-dim/30">|</span>
                                <button 
                                    onClick={() => handleDownloadTemplate('credit-note', 'csv')}
                                    className="text-[11px] font-bold text-dim hover:text-main transition-colors bg-transparent border-none cursor-pointer"
                                >
                                    CSV
                                </button>
                            </div>
                        </div>
                        <button
                            onClick={() => setActiveModal('credit-note')}
                            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border-none hover:scale-[1.02] active:scale-95 shadow-sm cursor-pointer"
                            style={{ backgroundColor: 'var(--brand-lime)', color: 'var(--brand-black)' }}
                        >
                            Launch Importer <ArrowRight size={14} />
                        </button>
                    </div>
                </div>

                {/* CARD 10: PURCHASE ORDERS */}
                <div className="group relative rounded-2xl p-4 border shadow-md flex flex-col justify-between transition-all hover:scale-[1.01] hover:shadow-lg"
                     style={{ 
                          background: 'var(--bg-card)', 
                          borderColor: 'var(--border-main)' 
                      }}>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:rotate-6" 
                                 style={{ backgroundColor: 'rgba(200, 230, 0, 0.1)' }}>
                                <FileText size={20} className="text-lime-500" style={{ color: 'var(--brand-lime)' }} />
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-green-500/10 text-green-500 border border-green-500/20">
                                Authorized
                            </span>
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-base font-bold text-main">Purchase Order Bulk Upload</h3>
                            <p className="text-xs text-dim leading-relaxed">
                                Upload bulk Purchase Orders. Links vendor profiles, maps accounts and branches, groups multi-row items by PO number, and wraps unmapped fields in descriptions.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-1.5 text-[9px] font-black uppercase tracking-widest text-dim pt-1">
                            <span className="px-1.5 py-0.5 rounded bg-input border" style={{ borderColor: 'var(--border-main)' }}>.csv</span>
                            <span className="px-1.5 py-0.5 rounded bg-input border" style={{ borderColor: 'var(--border-main)' }}>.xlsx</span>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2 mt-5 pt-3 border-t" style={{ borderColor: 'var(--border-main)' }}>
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-dim">Templates:</span>
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => handleDownloadTemplate('purchase-order', 'xlsx')}
                                    className="text-[11px] font-bold text-dim hover:text-main transition-colors bg-transparent border-none cursor-pointer"
                                >
                                    Excel
                                </button>
                                <span className="text-dim/30">|</span>
                                <button 
                                    onClick={() => handleDownloadTemplate('purchase-order', 'csv')}
                                    className="text-[11px] font-bold text-dim hover:text-main transition-colors bg-transparent border-none cursor-pointer"
                                >
                                    CSV
                                </button>
                            </div>
                        </div>
                        <button
                            onClick={() => setActiveModal('purchase-order')}
                            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border-none hover:scale-[1.02] active:scale-95 shadow-sm cursor-pointer"
                            style={{ backgroundColor: 'var(--brand-lime)', color: 'var(--brand-black)' }}
                        >
                            Launch Importer <ArrowRight size={14} />
                        </button>
                    </div>
                </div>

                {/* CARD 11: BILLS */}
                <div className="group relative rounded-2xl p-4 border shadow-md flex flex-col justify-between transition-all hover:scale-[1.01] hover:shadow-lg"
                     style={{ 
                          background: 'var(--bg-card)', 
                          borderColor: 'var(--border-main)' 
                      }}>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:rotate-6" 
                                 style={{ backgroundColor: 'rgba(249, 115, 22, 0.1)' }}>
                                <FileText size={20} className="text-orange-500" />
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-green-500/10 text-green-500 border border-green-500/20">
                                Authorized
                            </span>
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-base font-bold text-main">Bill Bulk Upload</h3>
                            <p className="text-xs text-dim leading-relaxed">
                                Upload bulk Bills. Matches supplier profiles, maps accounts and branches, groups multi-row items by bill number, and wraps unmapped fields in bill notes.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-1.5 text-[9px] font-black uppercase tracking-widest text-dim pt-1">
                            <span className="px-1.5 py-0.5 rounded bg-input border" style={{ borderColor: 'var(--border-main)' }}>.csv</span>
                            <span className="px-1.5 py-0.5 rounded bg-input border" style={{ borderColor: 'var(--border-main)' }}>.xlsx</span>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2 mt-5 pt-3 border-t" style={{ borderColor: 'var(--border-main)' }}>
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-dim">Templates:</span>
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => handleDownloadTemplate('bill', 'xlsx')}
                                    className="text-[11px] font-bold text-dim hover:text-main transition-colors bg-transparent border-none cursor-pointer"
                                >
                                    Excel
                                </button>
                                <span className="text-dim/30">|</span>
                                <button 
                                    onClick={() => handleDownloadTemplate('bill', 'csv')}
                                    className="text-[11px] font-bold text-dim hover:text-main transition-colors bg-transparent border-none cursor-pointer"
                                >
                                    CSV
                                </button>
                            </div>
                        </div>
                        <button
                            onClick={() => setActiveModal('bill')}
                            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border-none hover:scale-[1.02] active:scale-95 shadow-sm cursor-pointer"
                            style={{ backgroundColor: 'var(--brand-lime)', color: 'var(--brand-black)' }}
                        >
                            Launch Importer <ArrowRight size={14} />
                        </button>
                    </div>
                </div>

                {/* CARD 12: VENDOR PAYMENTS */}
                <div className="group relative rounded-2xl p-4 border shadow-md flex flex-col justify-between transition-all hover:scale-[1.01] hover:shadow-lg"
                     style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:rotate-6" style={{ backgroundColor: 'rgba(234, 179, 8, 0.1)' }}>
                                <Upload size={20} className="text-yellow-500" />
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-green-500/10 text-green-500 border border-green-500/20">Authorized</span>
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-base font-bold text-main">Vendor Payment Bulk Upload</h3>
                            <p className="text-xs text-dim leading-relaxed">Upload batch vendor payments (payments made to suppliers). Matches vendor profiles, resolves bills by number, maps paid-through accounts, and wraps unmapped fields into notes.</p>
                        </div>
                        <div className="flex flex-wrap gap-1.5 text-[9px] font-black uppercase tracking-widest text-dim pt-1">
                            <span className="px-1.5 py-0.5 rounded bg-input border" style={{ borderColor: 'var(--border-main)' }}>.csv</span>
                            <span className="px-1.5 py-0.5 rounded bg-input border" style={{ borderColor: 'var(--border-main)' }}>.xlsx</span>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2 mt-5 pt-3 border-t" style={{ borderColor: 'var(--border-main)' }}>
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-dim">Templates:</span>
                            <div className="flex items-center gap-2">
                                <button onClick={() => handleDownloadTemplate('vendor-payment', 'xlsx')} className="text-[11px] font-bold text-dim hover:text-main transition-colors bg-transparent border-none cursor-pointer">Excel</button>
                                <span className="text-dim/30">|</span>
                                <button onClick={() => handleDownloadTemplate('vendor-payment', 'csv')} className="text-[11px] font-bold text-dim hover:text-main transition-colors bg-transparent border-none cursor-pointer">CSV</button>
                            </div>
                        </div>
                        <button onClick={() => setActiveModal('vendor-payment')} className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border-none hover:scale-[1.02] active:scale-95 shadow-sm cursor-pointer" style={{ backgroundColor: 'var(--brand-lime)', color: 'var(--brand-black)' }}>Launch Importer <ArrowRight size={14} /></button>
                    </div>
                </div>

                {/* CARD 13: EXPENSES */}
                <div className="group relative rounded-2xl p-4 border shadow-md flex flex-col justify-between transition-all hover:scale-[1.01] hover:shadow-lg"
                     style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:rotate-6" style={{ backgroundColor: 'rgba(234, 179, 8, 0.1)' }}>
                                <Upload size={20} className="text-yellow-500" />
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-green-500/10 text-green-500 border border-green-500/20">Authorized</span>
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-base font-bold text-main">Expense Bulk Upload</h3>
                            <p className="text-xs text-dim leading-relaxed">Upload batch business expenses. Resolves expense and payment accounts by code/name, references supplier, and automatically dumps unmapped fields into Notes.</p>
                        </div>
                        <div className="flex flex-wrap gap-1.5 text-[9px] font-black uppercase tracking-widest text-dim pt-1">
                            <span className="px-1.5 py-0.5 rounded bg-input border" style={{ borderColor: 'var(--border-main)' }}>.csv</span>
                            <span className="px-1.5 py-0.5 rounded bg-input border" style={{ borderColor: 'var(--border-main)' }}>.xlsx</span>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2 mt-5 pt-3 border-t" style={{ borderColor: 'var(--border-main)' }}>
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-dim">Templates:</span>
                            <div className="flex items-center gap-2">
                                <button onClick={() => handleDownloadTemplate('expense', 'xlsx')} className="text-[11px] font-bold text-dim hover:text-main transition-colors bg-transparent border-none cursor-pointer">Excel</button>
                                <span className="text-dim/30">|</span>
                                <button onClick={() => handleDownloadTemplate('expense', 'csv')} className="text-[11px] font-bold text-dim hover:text-main transition-colors bg-transparent border-none cursor-pointer">CSV</button>
                            </div>
                        </div>
                        <button onClick={() => setActiveModal('expense')} className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border-none hover:scale-[1.02] active:scale-95 shadow-sm cursor-pointer" style={{ backgroundColor: 'var(--brand-lime)', color: 'var(--brand-black)' }}>Launch Importer <ArrowRight size={14} /></button>
                    </div>
                </div>

                {/* CARD 14: BANK TRANSACTIONS RE-ENTRY */}
                <div className="group relative rounded-2xl p-4 border shadow-md flex flex-col justify-between transition-all hover:scale-[1.01] hover:shadow-lg"
                     style={{ 
                          background: 'var(--bg-card)', 
                          borderColor: 'var(--border-main)' 
                      }}>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:rotate-6" style={{ backgroundColor: 'rgba(200, 230, 0, 0.1)' }}>
                                <Upload size={20} style={{ color: 'var(--brand-lime)' }} />
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-green-500/10 text-green-500 border border-green-500/20">Authorized</span>
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-base font-bold text-main">Bank Ledger Transactions</h3>
                            <p className="text-xs text-dim leading-relaxed">Reset and re-import historical transactions via Excel/CSV for specific bank accounts like Banco General AH 1601.</p>
                        </div>
                        <div className="flex flex-wrap gap-1.5 text-[9px] font-black uppercase tracking-widest text-dim pt-1">
                            <span className="px-1.5 py-0.5 rounded bg-input border" style={{ borderColor: 'var(--border-main)' }}>.csv</span>
                            <span className="px-1.5 py-0.5 rounded bg-input border" style={{ borderColor: 'var(--border-main)' }}>.xlsx</span>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2 mt-5 pt-3 border-t" style={{ borderColor: 'var(--border-main)' }}>
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-dim">Templates:</span>
                            <div className="flex items-center gap-2">
                                <button onClick={() => handleDownloadTemplate('ledger', 'xlsx')} className="text-[11px] font-bold text-dim hover:text-main transition-colors bg-transparent border-none cursor-pointer">Excel</button>
                                <span className="text-dim/30">|</span>
                                <button onClick={() => handleDownloadTemplate('ledger', 'csv')} className="text-[11px] font-bold text-dim hover:text-main transition-colors bg-transparent border-none cursor-pointer">CSV</button>
                            </div>
                        </div>
                        <button onClick={() => setActiveModal('ledger')} className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border-none hover:scale-[1.02] active:scale-95 shadow-sm cursor-pointer" style={{ backgroundColor: 'var(--brand-lime)', color: 'var(--brand-black)' }}>Launch Importer <ArrowRight size={14} /></button>
                    </div>
                </div>

                {/* CARD 15: VEHICLE RENT UPDATE */}
                <div className="group relative rounded-2xl p-4 border shadow-md flex flex-col justify-between transition-all hover:scale-[1.01] hover:shadow-lg"
                     style={{ 
                          background: 'var(--bg-card)', 
                          borderColor: 'var(--border-main)' 
                      }}>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:rotate-6" style={{ backgroundColor: 'rgba(200, 230, 0, 0.1)' }}>
                                <Upload size={20} style={{ color: 'var(--brand-lime)' }} />
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-green-500/10 text-green-500 border border-green-500/20">Authorized</span>
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-base font-bold text-main">Vehicle Rent Bulk Update</h3>
                            <p className="text-xs text-dim leading-relaxed">Bulk update weekly rent for vehicles. Auto-recalculates active driver rent plans, future unpaid invoices, carryover balances, and ledger double-entries.</p>
                        </div>
                        <div className="flex flex-wrap gap-1.5 text-[9px] font-black uppercase tracking-widest text-dim pt-1">
                            <span className="px-1.5 py-0.5 rounded bg-input border" style={{ borderColor: 'var(--border-main)' }}>.csv</span>
                            <span className="px-1.5 py-0.5 rounded bg-input border" style={{ borderColor: 'var(--border-main)' }}>.xlsx</span>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2 mt-5 pt-3 border-t" style={{ borderColor: 'var(--border-main)' }}>
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-dim">Templates:</span>
                            <div className="flex items-center gap-2">
                                <button onClick={() => handleDownloadTemplate('vehicle-rent', 'xlsx')} className="text-[11px] font-bold text-dim hover:text-main transition-colors bg-transparent border-none cursor-pointer">Excel</button>
                                <span className="text-dim/30">|</span>
                                <button onClick={() => handleDownloadTemplate('vehicle-rent', 'csv')} className="text-[11px] font-bold text-dim hover:text-main transition-colors bg-transparent border-none cursor-pointer">CSV</button>
                            </div>
                        </div>
                        <button onClick={() => setActiveModal('vehicle-rent')} className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border-none hover:scale-[1.02] active:scale-95 shadow-sm cursor-pointer" style={{ backgroundColor: 'var(--brand-lime)', color: 'var(--brand-black)' }}>Launch Importer <ArrowRight size={14} /></button>
                    </div>
                </div>

            </div>

            {/* Safety informational callout */}
            <div className="flex items-start gap-3 p-4 rounded-xl border" 
                 style={{ 
                     background: 'rgba(239, 68, 68, 0.02)', 
                     borderColor: 'rgba(239, 68, 68, 0.15)' 
                 }}>
                <ShieldAlert className="mt-0.5 flex-shrink-0" size={18} style={{ color: '#ef4444' }} />
                <div className="space-y-1">
                    <p className="text-xs font-black uppercase tracking-wider" style={{ color: '#ef4444' }}>Important System Notice</p>
                    <p className="text-xs font-medium leading-relaxed" style={{ color: 'var(--text-dim)' }}>
                        All bulk data changes are logged and linked to your user session. Please ensure your files conform strictly to the downloaded template headers. Row validation errors must be addressed inside the importer interface before committing records to the database.
                    </p>
                </div>
            </div>

            {/* Active Importer Modals */}
            <BulkDriverUpload 
                isOpen={activeModal === 'driver'} 
                onClose={() => setActiveModal(null)} 
                onSuccess={() => { setActiveModal(null); }} 
            />


            <DataMigrationUpload 
                isOpen={activeModal === 'migration'} 
                onClose={() => setActiveModal(null)} 
                onSuccess={() => { setActiveModal(null); }} 
            />

            {activeModal === 'journal' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
                    <div className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden border shadow-2xl"
                         style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border-main)' }}>
                            <div className="flex items-center gap-3">
                                <BookOpen size={20} style={{ color: 'var(--brand-lime)' }} />
                                <h2 className="text-lg font-bold text-main">Journal Bulk Importer</h2>
                            </div>
                            <button onClick={() => setActiveModal(null)} className="p-2 rounded-lg transition-all hover:scale-110 text-dim">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4">
                            <BulkUploadJournal 
                                onClose={() => setActiveModal(null)} 
                                onSuccess={() => { setActiveModal(null); toast.success('Journal entries uploaded successfully!'); }} 
                            />
                        </div>
                    </div>
                </div>
            )}

            <BulkInvoiceUpload 
                isOpen={activeModal === 'invoice'} 
                onClose={() => setActiveModal(null)} 
                onSuccess={() => setActiveModal(null)} 
            />

            <BulkSupplierUpload
                isOpen={activeModal === 'supplier'}
                onClose={() => setActiveModal(null)}
                onSuccess={() => setActiveModal(null)}
            />

            <BulkCustomerUpload
                isOpen={activeModal === 'customer'}
                onClose={() => setActiveModal(null)}
                onSuccess={() => setActiveModal(null)}
            />

            <BulkInventoryUpload
                isOpen={activeModal === 'inventory'}
                onClose={() => setActiveModal(null)}
                onSuccess={() => setActiveModal(null)}
            />

            <BulkPaymentUpload
                isOpen={activeModal === 'payment'}
                onClose={() => setActiveModal(null)}
                onSuccess={() => setActiveModal(null)}
            />

            <BulkCreditNoteUpload
                isOpen={activeModal === 'credit-note'}
                onClose={() => setActiveModal(null)}
                onSuccess={() => setActiveModal(null)}
            />

            <BulkPurchaseOrderUpload
                isOpen={activeModal === 'purchase-order'}
                onClose={() => setActiveModal(null)}
                onSuccess={() => setActiveModal(null)}
            />

            <BulkBillUpload
                isOpen={activeModal === 'bill'}
                onClose={() => setActiveModal(null)}
                onSuccess={() => setActiveModal(null)}
            />

            <BulkVendorPaymentUpload
                isOpen={activeModal === 'vendor-payment'}
                onClose={() => setActiveModal(null)}
                onSuccess={() => setActiveModal(null)}
            />

            <BulkExpenseUpload
                isOpen={activeModal === 'expense'}
                onClose={() => setActiveModal(null)}
                onSuccess={() => { setActiveModal(null); }}
            />

            <BulkLedgerUpload
                isOpen={activeModal === 'ledger'}
                onClose={() => setActiveModal(null)}
                onSuccess={() => setActiveModal(null)}
            />

            <BulkRentUpdateUpload
                isOpen={activeModal === 'vehicle-rent'}
                onClose={() => setActiveModal(null)}
                onSuccess={() => setActiveModal(null)}
            />
        </div>
    );
};

export default BulkUploadsHub;
