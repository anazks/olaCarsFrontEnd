import type { DocTopic } from '../types';

export const driverTopics: DocTopic[] = [
  {
    id: 'driver-registration-kyc',
    categoryId: 'driver',
    title: 'Driver Registration, KYC & Profile Lifecycle Actions',
    shortTitle: 'Driver Onboarding & KYC',
    description: 'Comprehensive operational manual for driver applicant vetting, identity document verification, approval progression, profile updates, emergency contacts, and lease contract cancellations.',
    iconName: 'UserCheck',
    tags: ['driver', 'kyc', 'onboarding', 'license', 'id', 'deposit', 'verification', 'cancel contract', 'emergency contact', 'add customer', 'vehicle assignment'],
    relatedRoutes: [
      { label: 'Manage Drivers', path: '/admin/admin/drivers' },
      { label: 'Create Driver', path: '/admin/admin/create-driver' }
    ],
    sections: [
      {
        id: 'driver-creation-form-validations',
        title: 'Driver Registration Form & Field Requirements',
        content: 'When registering a new driver through the onboarding portal, the system enforces standard regulatory checks before creating the profile:',
        steps: [
          {
            stepNumber: 1,
            title: 'Driver Full Name',
            description: 'Enter the driver\'s legal full name as shown on their official identification. Must be between 2 and 50 alphabetic characters.',
            expectedOutcome: 'Driver name verified.'
          },
          {
            stepNumber: 2,
            title: 'International Phone Number Validation',
            description: 'Select the applicant\'s country dialing code (supporting 17 international countries including India, Kenya, Uganda, Tanzania, Ethiopia, Nigeria, UAE, UK, USA, etc.) and enter their mobile number. The system verifies expected digit lengths and blocks invalid repetitive digits.',
            expectedOutcome: 'Clean, verified international mobile contact.'
          },
          {
            stepNumber: 3,
            title: 'Date of Birth & Minimum Age Verification',
            description: 'Select the applicant\'s date of birth. The system requires drivers to meet the minimum legal driving age (at least 18 years old) and rejects invalid future dates.',
            expectedOutcome: 'Age eligibility confirmed.'
          },
          {
            stepNumber: 4,
            title: 'Emergency Contact & Relationship Details',
            description: 'Record an emergency contact\'s name, verified phone number, and relationship (such as Spouse, Parent, Sibling, Child, Friend, or Colleague).',
            expectedOutcome: 'Emergency contact registered for risk and safety management.'
          },
          {
            stepNumber: 5,
            title: 'Branch Assignment & Location Control',
            description: 'Branch supervisors will find their branch automatically locked to their assigned station. Super Administrators and Country Managers can assign the driver to any operating facility.',
            expectedOutcome: 'Branch location recorded.'
          }
        ],
        tips: [
          'Driving License Expiry: The system prevents entering expired driver licenses by requiring an expiry date in the future.',
          'Fast-Track Combined Onboarding: Drivers can also be created directly from Sales > Customers > "+ Add Customer" by activating the "Is a Driver?" toggle, allowing instant vehicle assignment and weekly rent setup in a single step.'
        ]
      },
      {
        id: 'driver-detail-action-buttons',
        title: 'Driver Details: Action Buttons & Approval Pipeline',
        content: 'From the Driver Details screen, supervisors and managers move the applicant through an auditable vetting workflow using action buttons:',
        steps: [
          {
            stepNumber: 1,
            title: 'Submit for Review',
            description: 'Click "Submit for Review" once basic personal information and initial identity documents have been uploaded. This moves the applicant from Draft status into the management review queue.',
            expectedOutcome: 'Driver queued for operational and finance review.'
          },
          {
            stepNumber: 2,
            title: 'Approve Document Verification',
            description: 'Click "Approve Document Verification" after reviewing the clarity and authenticity of the driver\'s uploaded license and ID cards. This marks the documents as verified.',
            expectedOutcome: 'Documentation approved.'
          },
          {
            stepNumber: 3,
            title: 'Send for Credit Check',
            description: 'Click "Send for Credit Check" to evaluate the driver\'s financial risk profile. Enter assessment review notes regarding security deposits or credit reliability.',
            expectedOutcome: 'Applicant flagged as undergoing credit check.'
          },
          {
            stepNumber: 4,
            title: 'Approve Driver',
            description: 'Click "Approve Driver" once all background, driving license, and credit checks pass. This unlocks the driver for vehicle allocation.',
            expectedOutcome: 'Driver status becomes Approved; vehicle allocation enabled.'
          },
          {
            stepNumber: 5,
            title: 'Reject Driver',
            description: 'Click "Reject Driver" if the applicant fails vetting criteria. Select a mandatory rejection reason (Failed Credit Check, Invalid Documents, Criminal Record, or Other) and enter detailed explanation notes.',
            expectedOutcome: 'Application rejected and archived with permanent audit remarks.'
          },
          {
            stepNumber: 6,
            title: 'Activate Driver',
            description: 'Click "Activate Driver" once the rental contract is signed and security deposit received. This sets the driver to Active status for immediate fleet dispatch.',
            expectedOutcome: 'Driver active and ready to hit the road.'
          },
          {
            stepNumber: 7,
            title: 'Cancel Contract',
            description: 'Click "Cancel Contract" to terminate an active lease agreement. In the popup window, select the contract end date (today or an earlier date) and enter a cancellation explanation. The system unassigns the vehicle, logs the return odometer reading, and halts future rent invoicing.',
            expectedOutcome: 'Vehicle returned to branch fleet pool; contract successfully closed.'
          }
        ],
        warnings: [
          'Rejection reasons are permanently saved in the driver history to prevent duplicate or unauthorized re-applications across branches.'
        ]
      },
      {
        id: 'kyc-documents-upload-engine',
        title: 'Driver Document Management & Profile Tools',
        content: 'The Driver Details screen provides dedicated file upload slots for required legal and operational documentation:',
        steps: [
          {
            stepNumber: 1,
            title: 'National Identity Card (Front & Back)',
            description: 'Upload high-resolution scans or photos of the driver\'s government identification card or residency visa.',
            expectedOutcome: 'ID preview rendered with click-to-zoom inspection.'
          },
          {
            stepNumber: 2,
            title: 'Driving License (Front & Back)',
            description: 'Upload front and reverse images of the official driving license. The system monitors the expiration date and flags upcoming renewals.',
            expectedOutcome: 'License registered with real-time validity status.'
          },
          {
            stepNumber: 3,
            title: 'Driver Portrait Photograph',
            description: 'Upload a clear passport-style portrait photo used for security identification badges and the mobile driver application.',
            expectedOutcome: 'Driver profile picture updated.'
          },
          {
            stepNumber: 4,
            title: 'Proof of Address & Residential Utility Bill',
            description: 'Upload a recent utility bill, tenancy agreement, or bank statement dated within the last 90 days confirming local residence.',
            expectedOutcome: 'Residential verification badge activated.'
          },
          {
            stepNumber: 5,
            title: 'Medical Fitness & Data Consent Forms',
            description: 'Attach certified medical fitness reports and the signed background check consent agreement.',
            expectedOutcome: 'Compliance checklist marked complete.'
          },
          {
            stepNumber: 6,
            title: 'Inline Name Editing & Emergency Contact Updates',
            description: 'Click the pencil icon next to the driver\'s name or emergency contacts to make immediate corrections without leaving the page.',
            expectedOutcome: 'Driver profile details updated in place.'
          }
        ]
      }
    ]
  },
  {
    id: 'legal-agreements-esign',
    categoryId: 'driver',
    title: 'Legal Contracts, Rental Plans & Document Generation',
    shortTitle: 'Legal Agreements & PDF Engine',
    description: 'Instructions for generating binding rental contracts, printing official agreement documents, downloading PDF contracts, and navigating multi-vehicle lease plan histories.',
    iconName: 'FileCheck',
    tags: ['agreement', 'contract', 'signature', 'print', 'rent plan', 'weekly rent', 'download pdf'],
    relatedRoutes: [
      { label: 'Legal Agreements', path: '/admin/admin/agreements' },
      { label: 'Driver Rent Plan', path: '/admin/admin/drivers' }
    ],
    sections: [
      {
        id: 'contract-pdf-generation-print',
        title: 'Contract Generation, Printing & PDF Downloads',
        content: 'The system automates the creation and printing of legally binding rental contracts from the Driver Details screen:',
        steps: [
          {
            stepNumber: 1,
            title: 'Generate Legal Contract',
            description: 'Click "Generate Contract" to build the agreement document. The system automatically incorporates the driver\'s details, assigned vehicle plate number, weekly rent rate, security deposit terms, and contract duration.',
            expectedOutcome: 'Official agreement preview rendered on screen.'
          },
          {
            stepNumber: 2,
            title: 'Save & Advance Status',
            description: 'Confirm the agreement preview. The system uploads the finalized contract directly into the driver\'s document vault and advances their status to "Contract Pending" or "Active".',
            expectedOutcome: 'Contract permanently attached to driver file.'
          },
          {
            stepNumber: 3,
            title: 'Print Agreement Document',
            description: 'Click "Print Contract" to open the browser\'s print dialog directly without leaving or reloading the screen.',
            expectedOutcome: 'Clean agreement document sent to office printer.'
          },
          {
            stepNumber: 4,
            title: 'Download Contract PDF',
            description: 'Click "Download Contract" to save the official PDF copy directly to your computer with the driver\'s name in the filename.',
            expectedOutcome: 'Official agreement PDF saved locally.'
          }
        ]
      },
      {
        id: 'driver-rent-plan-matching-algorithm',
        title: 'Driver Rent Plan: Assignment History & Invoices',
        content: 'The Rent Plan view partitions the driver\'s historical vehicle leases into dedicated tabs:',
        steps: [
          {
            stepNumber: 1,
            title: 'Vehicle Assignment Tabs',
            description: 'Each vehicle the driver has rented (past or present) has its own dedicated timeline tab showing the car model, license plate number, lease start date, and end date.',
            expectedOutcome: 'Clear chronological view of every car leased by the driver.'
          },
          {
            stepNumber: 2,
            title: 'Installment Matching by Contract Cycle',
            description: 'Weekly rental invoices and payment records are automatically matched to the specific vehicle assignment period during which they occurred.',
            expectedOutcome: 'Rent payments and outstanding balances accurately segmented.'
          },
          {
            stepNumber: 3,
            title: 'Download Itemized Tax Invoices',
            description: 'Click the view or download icons next to any weekly rent row to export a full tax invoice displaying tax rates, amounts due, and payment receipts.',
            expectedOutcome: 'Itemized rental tax invoice downloaded.'
          }
        ]
      }
    ]
  },
  {
    id: 'driver-accidents-complaints',
    categoryId: 'driver',
    title: 'Accident Reports, Damage Audits & Resolution Pipeline',
    shortTitle: 'Accidents & Damage Audits',
    description: 'Protocol for logging vehicle collisions, inspecting damage photos, assigning liability, and coordinating with insurance adjusters and workshops.',
    iconName: 'AlertTriangle',
    tags: ['accident', 'police report', 'insurance claim', 'damage', 'photos', 'resolution'],
    relatedRoutes: [
      { label: 'Accident Reports', path: '/admin/admin/accident-reports' },
      { label: 'Complaints Hub', path: '/admin/admin/complaints' }
    ],
    sections: [
      {
        id: 'accident-report-status-lifecycle',
        title: 'Accident Incident Investigation Pipeline',
        content: 'Accident reports follow a structured four-stage investigation lifecycle:',
        steps: [
          {
            stepNumber: 1,
            title: 'Submitted Status',
            description: 'When an accident is first reported, the ticket enters "Submitted" status with incident date, time, vehicle license plate, driver details, police report reference, and site photos.',
            expectedOutcome: 'Incident registered in the urgent review queue.'
          },
          {
            stepNumber: 2,
            title: 'Mark Under Review',
            description: 'Click "Mark Under Review" when an operations manager takes ownership of the incident, reviews police slips, and initiates insurance coordination.',
            expectedOutcome: 'Status updates to Under Review; review notes logged.'
          },
          {
            stepNumber: 3,
            title: 'Resolve Accident',
            description: 'Click "Resolve Accident" once liability has been established (Driver at Fault vs. Third Party), insurance claim settled, and repair authorizations issued.',
            expectedOutcome: 'Incident marked Resolved; workshop repair authorized.'
          },
          {
            stepNumber: 4,
            title: 'Close Ticket',
            description: 'Click "Close Ticket" after vehicle repairs are finished, quality checks passed, and the car is returned to active service.',
            expectedOutcome: 'Incident closed and safely archived.'
          }
        ]
      },
      {
        id: 'accident-image-resolution-s3',
        title: 'Damage Inspection & Photo Evidence Gallery',
        content: 'The accident ticket includes an interactive photographic inspection gallery:',
        steps: [
          {
            stepNumber: 1,
            title: 'High-Resolution Photographic Storage',
            description: 'Collision site photographs, police sketches, and vehicle damage pictures are securely hosted and rendered in high definition.',
            expectedOutcome: 'Photos load reliably without broken images.'
          },
          {
            stepNumber: 2,
            title: 'Full-Screen Zoom & Damage Inspection',
            description: 'Click on any photo thumbnail to open a full-screen zoom preview to examine body damage, scratches, mechanical impacts, and airbag deployment.',
            expectedOutcome: 'Clear photographic evidence available for claims adjusters.'
          }
        ]
      }
    ]
  }
];
