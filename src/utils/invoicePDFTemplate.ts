export const generateInvoiceHTML = (invoice: any, driver: any, vehicle: any) => {
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const dueDate = new Date(invoice.dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const isPaid = invoice.status === 'PAID';
    
    let paymentsHtml = '';
    if (invoice.payments && invoice.payments.length > 0) {
        paymentsHtml = `
            <div style="margin-top: 30pt;">
                <h3 style="font-family: sans-serif; font-size: 14pt; color: #111; margin-bottom: 10pt; border-bottom: 1px solid #eee; padding-bottom: 5pt;">Payment History</h3>
                <table style="width: 100%; border-collapse: collapse; font-size: 11pt; color: #333;">
                    <thead>
                        <tr style="background-color: #f9fafb; text-align: left;">
                            <th style="padding: 10pt; border-bottom: 1px solid #eee;">Date</th>
                            <th style="padding: 10pt; border-bottom: 1px solid #eee;">Method</th>
                            <th style="padding: 10pt; border-bottom: 1px solid #eee; text-align: right;">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${invoice.payments.map((p: any) => `
                            <tr>
                                <td style="padding: 10pt; border-bottom: 1px solid #eee;">${new Date(p.paidAt).toLocaleDateString()}</td>
                                <td style="padding: 10pt; border-bottom: 1px solid #eee;">${p.paymentMethod || 'Cash'}</td>
                                <td style="padding: 10pt; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">$${(p.amount || 0).toLocaleString()}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    return `
        <div style="width: 550pt; padding: 40pt; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; line-height: 1.6;">
            <!-- Header -->
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40pt; border-bottom: 2pt solid #111; padding-bottom: 20pt;">
                <div>
                    <h1 style="font-size: 28pt; font-weight: 900; margin: 0; color: #111; letter-spacing: -1px;">INVOICE</h1>
                    <p style="margin: 5pt 0 0 0; color: #666; font-size: 10pt; text-transform: uppercase; font-weight: bold; letter-spacing: 1px;">
                        ${invoice.invoiceNumber || 'INV-00000'}
                    </p>
                </div>
                <div style="text-align: right;">
                    <h2 style="font-size: 18pt; font-weight: 800; margin: 0; color: #111;">OlaCars</h2>
                    <p style="margin: 5pt 0 0 0; color: #666; font-size: 10pt;">
                        123 Fleet Street, Suite 400<br/>
                        Automotive District, NY 10001<br/>
                        support@olacars.com
                    </p>
                </div>
            </div>

            <!-- Meta Information -->
            <div style="display: flex; justify-content: space-between; margin-bottom: 40pt;">
                <!-- Bill To -->
                <div style="width: 45%;">
                    <h3 style="font-size: 10pt; text-transform: uppercase; color: #888; font-weight: 800; margin: 0 0 10pt 0; letter-spacing: 1px;">Billed To:</h3>
                    <p style="margin: 0; font-size: 12pt; font-weight: 700; color: #111;">${driver?.personalInfo?.fullName || 'Driver Name'}</p>
                    <p style="margin: 3pt 0 0 0; color: #555; font-size: 11pt;">${driver?.personalInfo?.email || 'driver@example.com'}</p>
                    <p style="margin: 3pt 0 0 0; color: #555; font-size: 11pt;">Ph: ${driver?.personalInfo?.phone || 'N/A'}</p>
                    
                    ${vehicle ? `
                    <div style="margin-top: 15pt; padding: 10pt; background: #f9fafb; border-radius: 5pt; border: 1px solid #eee;">
                        <span style="font-size: 9pt; font-weight: bold; color: #888; text-transform: uppercase;">Assigned Vehicle</span><br/>
                        <span style="font-size: 11pt; font-weight: 600; color: #111;">${vehicle.basicDetails?.make} ${vehicle.basicDetails?.model}</span><br/>
                        <span style="font-size: 10pt; color: #555;">Reg: ${vehicle.legalDocs?.registrationNumber || 'N/A'}</span>
                    </div>
                    ` : ''}
                </div>

                <!-- Invoice Details -->
                <div style="width: 45%; text-align: right;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding-bottom: 8pt; color: #888; font-size: 10pt; font-weight: bold; text-transform: uppercase;">Issue Date</td>
                            <td style="padding-bottom: 8pt; font-size: 11pt; font-weight: 600; color: #111;">${today}</td>
                        </tr>
                        <tr>
                            <td style="padding-bottom: 8pt; color: #888; font-size: 10pt; font-weight: bold; text-transform: uppercase;">Due Date</td>
                            <td style="padding-bottom: 8pt; font-size: 11pt; font-weight: 600; color: #111;">${dueDate}</td>
                        </tr>
                        <tr>
                            <td style="padding-bottom: 8pt; color: #888; font-size: 10pt; font-weight: bold; text-transform: uppercase;">Billing Period</td>
                            <td style="padding-bottom: 8pt; font-size: 11pt; font-weight: 600; color: #111;">${invoice.weekLabel || `Week ${invoice.weekNumber}`}</td>
                        </tr>
                        <tr>
                            <td style="padding-bottom: 8pt; color: #888; font-size: 10pt; font-weight: bold; text-transform: uppercase;">Status</td>
                            <td style="padding-bottom: 8pt; font-size: 11pt; font-weight: 800; color: ${isPaid ? '#22c55e' : invoice.status === 'OVERDUE' ? '#ef4444' : '#eab308'}; uppercase;">
                                ${invoice.status}
                            </td>
                        </tr>
                    </table>
                </div>
            </div>

            <!-- Line Items Table -->
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 30pt;">
                <thead>
                    <tr style="border-bottom: 2px solid #111;">
                        <th style="padding: 12pt 5pt; text-align: left; font-size: 10pt; font-weight: 800; color: #888; text-transform: uppercase;">Description</th>
                        <th style="padding: 12pt 5pt; text-align: right; font-size: 10pt; font-weight: 800; color: #888; text-transform: uppercase;">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td style="padding: 15pt 5pt; border-bottom: 1px solid #eee; font-size: 12pt; font-weight: 500; color: #111;">Weekly Vehicle Rent</td>
                        <td style="padding: 15pt 5pt; border-bottom: 1px solid #eee; font-size: 12pt; font-weight: 600; text-align: right; color: #111;">$${(invoice.baseAmount || 0).toLocaleString()}</td>
                    </tr>
                    ${(invoice.carryOverAmount || 0) > 0 ? `
                    <tr>
                        <td style="padding: 15pt 5pt; border-bottom: 1px solid #eee; font-size: 12pt; font-weight: 500; color: #111;">
                            Overdue Balance <span style="font-size: 9pt; color: #ef4444; font-weight: bold; padding-left: 5pt;">(Carried Over)</span>
                        </td>
                        <td style="padding: 15pt 5pt; border-bottom: 1px solid #eee; font-size: 12pt; font-weight: 600; text-align: right; color: #ef4444;">$${(invoice.carryOverAmount || 0).toLocaleString()}</td>
                    </tr>
                    ` : ''}
                </tbody>
            </table>

            <!-- Totals Section -->
            <div style="width: 50%; float: right; margin-bottom: 40pt;">
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 8pt 5pt; font-size: 11pt; color: #555;">Subtotal</td>
                        <td style="padding: 8pt 5pt; font-size: 11pt; font-weight: 600; text-align: right;">$${(invoice.totalAmountDue || invoice.baseAmount || 0).toLocaleString()}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8pt 5pt; font-size: 11pt; color: #555;">Amount Paid</td>
                        <td style="padding: 8pt 5pt; font-size: 11pt; font-weight: 600; text-align: right; color: #22c55e;">-$${(invoice.amountPaid || 0).toLocaleString()}</td>
                    </tr>
                    <tr style="border-top: 2px solid #111;">
                        <td style="padding: 15pt 5pt 5pt; font-size: 14pt; font-weight: 800; color: #111;">Total Due</td>
                        <td style="padding: 15pt 5pt 5pt; font-size: 16pt; font-weight: 900; text-align: right; color: #111;">$${(invoice.balance || 0).toLocaleString()}</td>
                    </tr>
                </table>
            </div>
            
            <div style="clear: both;"></div>

            ${paymentsHtml}

            <!-- Footer / Watermark -->
            <div style="margin-top: 60pt; text-align: center; color: #999; font-size: 9pt; border-top: 1px solid #eee; padding-top: 20pt;">
                <p style="margin: 0 0 5pt 0;">Thank you for driving with OlaCars.</p>
                <p style="margin: 0;">This is a computer-generated document. No signature is required.</p>
            </div>
            
            ${isPaid ? `
            <div style="position: absolute; top: 300pt; left: 100pt; border: 8pt solid rgba(34, 197, 94, 0.1); color: rgba(34, 197, 94, 0.15); font-size: 80pt; font-weight: 900; text-transform: uppercase; transform: rotate(-30deg); user-select: none; z-index: -1;">
                PAID
            </div>
            ` : ''}
        </div>
    `;
};
