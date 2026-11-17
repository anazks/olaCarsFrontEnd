import React from 'react';
import InvoiceAgingSummary from '../finance/InvoiceAgingSummary';

const CollectionsDashboard: React.FC = () => {
    return (
        <InvoiceAgingSummary
            title="Accounts Receivable (AR) Summary"
            subtitle="Categorize unpaid invoice balances by days past due as of selected cutoff date."
            breadcrumbs={[
                { label: 'Collections', path: '#' },
                { label: 'AR Summary', active: true }
            ]}
            backButton={null}
        />
    );
};

export default CollectionsDashboard;
