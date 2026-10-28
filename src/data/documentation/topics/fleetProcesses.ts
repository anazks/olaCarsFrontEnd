import type { DocTopic } from '../types';

export const fleetTopics: DocTopic[] = [
  {
    id: 'vehicle-onboarding',
    categoryId: 'fleet',
    title: 'Vehicle Onboarding & 7-Stage Pipeline Registry',
    shortTitle: 'Vehicle Onboarding',
    description: 'Operational guide for commissioning new fleet vehicles through the 7-stage verification pipeline, 23-point mechanical inspection checklist, and legal document verification.',
    iconName: 'Car',
    tags: [
      'vehicle',
      'fleet',
      'onboarding',
      'create vehicle',
      'purchase order',
      'fleet number',
      'pipeline',
      'vin',
      'chassis',
      'inspection',
      'registration',
      'documents',
      'pending vehicles'
    ],
    relatedRoutes: [
      { label: 'Manage Vehicles', path: '/admin/admin/vehicles' },
      { label: 'Pending Entry Vehicles', path: '/admin/admin/pending-vehicles' },
      { label: 'Create New Vehicle', path: '/admin/admin/create-vehicle' }
    ],
    sections: [
      {
        id: 'create-vehicle-purchase-order-flow',
        title: 'Initial Vehicle Registration from an Approved Purchase Order',
        content: 'Before a new car enters the commissioning pipeline, it must be officially registered in the system using an authorized procurement record:',
        steps: [
          {
            stepNumber: 1,
            title: 'Navigate to Create New Vehicle',
            description: 'From Fleet Management or Pending Entry Vehicles, click "Create New Vehicle" (or "+ Add Vehicle").',
            expectedOutcome: 'Vehicle procurement registration form opens.'
          },
          {
            stepNumber: 2,
            title: 'Select Operational Branch',
            description: 'Select the operational branch location where the vehicle will be stationed. This filters the available purchase orders and staff members for that branch.',
            expectedOutcome: 'Branch set and branch-specific purchase orders loaded.'
          },
          {
            stepNumber: 3,
            title: 'Link an Approved Purchase Order',
            description: 'Select an authorized Purchase Order from the dropdown. Once chosen, the system automatically pulls in the Supplier Name, Purchase Date, Purchase Price, and Currency directly from the procurement record.',
            expectedOutcome: 'Purchase details auto-populated without manual data re-entry.'
          },
          {
            stepNumber: 4,
            title: 'Assign Handling Finance Staff',
            description: 'Select the finance team member responsible for overseeing the financial lifecycle of this asset.',
            expectedOutcome: 'Responsible staff member linked to the vehicle.'
          },
          {
            stepNumber: 5,
            title: 'Allocate Fleet Number',
            description: 'Assign a unique fleet number. You can select an existing fleet sequence allocated to the handling staff member or click "Add New Fleet Number" to automatically fetch the next available sequential number. The system performs a live verification to guarantee the fleet number is not already in use.',
            expectedOutcome: 'Unique, verified fleet number assigned.'
          },
          {
            stepNumber: 6,
            title: 'Choose Payment Method & Vehicle Condition',
            description: 'Select the procurement payment method (Cash, Bank Transfer, or Finance) and specify whether the car is "New" or "Used".',
            expectedOutcome: 'Payment and baseline condition recorded.'
          },
          {
            stepNumber: 7,
            title: 'Submit & Route to Pending Entry',
            description: 'Click "Create Vehicle". The vehicle is saved in "Pending Entry" status and appears in the Pending Vehicles list, ready to begin the 7-stage commissioning pipeline.',
            expectedOutcome: 'Vehicle registered and routed to Stage 1 of the onboarding pipeline.'
          }
        ],
        tips: [
          'Vehicles can only be created from approved purchase orders, ensuring complete alignment between procurement and fleet assets.'
        ]
      },
      {
        id: 'seven-stage-pipeline',
        title: 'The 7-Stage Vehicle Commissioning Pipeline',
        content: 'Every newly acquired vehicle must advance through a strict verification process before it can be leased to drivers:',
        steps: [
          {
            stepNumber: 1,
            title: 'Stage 1: Pending Entry (Basic Specification)',
            description: 'Open the vehicle record from Pending Vehicles. Enter the Make, Model, Manufacturing Year, Body Type, Category (Sedan, SUV, Pickup, Van, Luxury, Commercial), Fuel Type, Transmission, Exterior Color, License Plate Number, Vehicle Identification Number (VIN / Chassis), Engine Number, and Initial Odometer Reading.',
            expectedOutcome: 'Full mechanical identity recorded.'
          },
          {
            stepNumber: 2,
            title: 'Stage 2: Documents Review',
            description: 'Upload the 7 required vehicle legal documents: 1) Purchase Invoice or Receipt, 2) Official Registration Certificate (RC / Mulkiya), 3) Road Tax Disc, 4) Front License Plate Photo, 5) Rear License Plate Photo, 6) Technical Roadworthiness Certificate, and 7) Transfer of Ownership Document. Staff reviews and validates document clarity and expiry dates.',
            expectedOutcome: 'Legal documentation verified and digitally archived.'
          },
          {
            stepNumber: 3,
            title: 'Stage 3: Inspection Required (23-Point Checklist)',
            description: 'A certified workshop technician performs a comprehensive physical inspection covering all 23 checkpoints across engine fluids, powertrain, electrical systems, tires, safety lights, and suspension. Each item is marked as Pass, Attention Needed, or Fail.',
            expectedOutcome: 'Digital roadworthiness certificate approved.'
          },
          {
            stepNumber: 4,
            title: 'Stage 4: Accounting Setup',
            description: 'Finance controllers configure the asset on the company balance sheet. The purchase cost is recognized under Fixed Assets, and the depreciation method, useful lifespan, and estimated salvage value are configured.',
            expectedOutcome: 'Vehicle asset recognized in the General Ledger.'
          },
          {
            stepNumber: 5,
            title: 'Stage 5: GPS Activation',
            description: 'The vehicle is paired with its onboard GPS tracking unit. The system verifies live satellite communication, odometer synchronization, ignition telemetry, and security camera streams.',
            expectedOutcome: 'Live tracking active on the fleet map.'
          },
          {
            stepNumber: 6,
            title: 'Stage 6: Branch Manager Approval',
            description: 'The Branch Manager conducts a final review of the inspection report, insurance policy, and registration documents before providing final authorization.',
            expectedOutcome: 'Vehicle authorized for commercial leasing.'
          },
          {
            stepNumber: 7,
            title: 'Stage 7: Active — Available',
            description: 'The vehicle is officially commissioned into the branch fleet and appears in the dispatch pool, ready to be assigned to vetted drivers.',
            expectedOutcome: 'Vehicle ready for driver assignment.'
          }
        ]
      },
      {
        id: 'mechanical-inspection-checklist',
        title: '23-Point Workshop Inspection Verification',
        content: 'During the workshop inspection stage, technicians examine the following items:',
        tips: [
          'Fluids: Engine Oil Level, Engine Coolant, Brake Fluid, Power Steering Fluid, and Windshield Washer Fluid.',
          'Powertrain & Electrical: Battery Health, Air Filter, Air Conditioning Cooling, Exhaust System, and Suspension Shock Absorbers.',
          'Tires: Front Left, Front Right, Rear Left, Rear Right, and the Emergency Spare Tire.',
          'Safety & Lighting: Headlights, Tail Lights, Brake Lights, Turn Signal Indicators, Wipers, Horn, Seat Belts, and Rearview Mirrors.'
        ],
        warnings: [
          'A "Fail" grade on any critical safety component (such as Brake Fluid, Tires, or Suspension) halts onboarding until workshop repairs are completed.'
        ]
      }
    ]
  },
  {
    id: 'vehicle-assignment',
    categoryId: 'fleet',
    title: 'Driver Vehicle Assignment, Temporary Swaps & Contract Termination',
    shortTitle: 'Vehicle Assignment & Handover',
    description: 'Instructions for handing over vehicles to vetted drivers, recording departure condition sheets, providing temporary replacement vehicles, and processing vehicle returns.',
    iconName: 'Key',
    tags: ['assignment', 'handover', 'driver', 'temp vehicle', 'contract termination', 'odometer', 'fuel'],
    relatedRoutes: [
      { label: 'Manage Vehicles', path: '/admin/admin/vehicles' },
      { label: 'Temp Assignment', path: '/admin/admin/temp-assignment' }
    ],
    sections: [
      {
        id: 'assignment-code-flow',
        title: 'Vehicle-to-Driver Assignment Flow',
        content: 'Follow these steps when handing over a car to a driver:',
        steps: [
          {
            stepNumber: 1,
            title: 'Driver Eligibility Check',
            description: 'Verify that the driver has an Approved KYC status, a valid driving license, and no unreturned vehicles. Choose an available vehicle from the driver\'s branch.',
            expectedOutcome: 'Driver and vehicle cleared for assignment.'
          },
          {
            stepNumber: 2,
            title: 'Digital Handover Inspection Sheet',
            description: 'Record the departure odometer reading, fuel tank level (percentage or fraction), accessories checklist (spare key, jack, warning triangle), and any pre-existing exterior scratches.',
            expectedOutcome: 'Handover inspection record signed and archived.'
          },
          {
            stepNumber: 3,
            title: 'Contract Activation & Rent Billing',
            description: 'The vehicle status automatically switches to "Active — Rented". The car is linked to the driver profile, and weekly rental invoicing begins on schedule.',
            expectedOutcome: 'Vehicle marked as Rented in the fleet directory.'
          }
        ]
      },
      {
        id: 'temporary-replacement-flow',
        title: 'Temporary Vehicle Replacement Flow',
        content: 'When an assigned vehicle requires routine workshop maintenance or accident repair:',
        tips: [
          'Use "Temporary Vehicle Assignment" to provide a loaner vehicle while the driver\'s primary car is in the workshop.',
          'Rent billing continues without interruption under the existing contract; no new agreement needs to be created.',
          'Once workshop repairs are certified complete, the temporary car is returned to the available fleet pool and the driver resumes driving their primary vehicle.'
        ]
      },
      {
        id: 'contract-cancel-modal',
        title: 'Vehicle Return & Contract Cancellation Flow',
        content: 'When a driver returns a vehicle at the conclusion or termination of their lease:',
        steps: [
          {
            stepNumber: 1,
            title: 'Return Vehicle Inspection',
            description: 'Staff inspects the returned car, records the final odometer reading, checks the fuel level, and logs any new damage. Excess mileage fees or fuel shortages are calculated automatically.',
            expectedOutcome: 'Final return condition report generated.'
          },
          {
            stepNumber: 2,
            title: 'Deposit Settlement & Vehicle Return to Pool',
            description: 'Any outstanding unpaid rent, traffic fines, or repair charges are settled against the driver\'s security deposit. The vehicle status resets to "Active — Available" for the next driver.',
            expectedOutcome: 'Vehicle ready for immediate re-assignment.'
          }
        ]
      }
    ]
  },
  {
    id: 'vehicle-maintenance-policies',
    categoryId: 'fleet',
    title: 'Vehicle Insurance Policies, Claims & GPS Telemetry',
    shortTitle: 'Insurance & GPS Telemetry',
    description: 'Instructions for binding comprehensive and third-party insurance policies, managing renewal alerts, tracking live GPS locations, and monitoring security camera feeds.',
    iconName: 'Shield',
    tags: ['insurance', 'claims', 'gps', 'telemetry', 'camera streaming', 'workshop history'],
    relatedRoutes: [
      { label: 'Vehicle Policies', path: '/admin/admin/vehicle-policies' },
      { label: 'Connected GPS Vehicles', path: '/admin/admin/gps-vehicles' }
    ],
    sections: [
      {
        id: 'insurance-binding-modal',
        title: 'Insurance Policy Selection & Renewal',
        content: 'Every fleet vehicle must maintain active commercial insurance coverage:',
        steps: [
          {
            stepNumber: 1,
            title: 'Select Insurance Provider & Coverage Type',
            description: 'Choose the approved insurance company and select the coverage category (Comprehensive or Third Party Liability).',
            expectedOutcome: 'Insurance policy attached to vehicle chassis.'
          },
          {
            stepNumber: 2,
            title: 'Record Policy Dates & Premium',
            description: 'Enter the policy number, coverage start date, expiry date, deductible excess amount, and annual premium. The premium records an accounts payable bill to the insurance company.',
            expectedOutcome: 'Policy active; renewal alert reminders scheduled.'
          }
        ]
      },
      {
        id: 'gps-telemetry-monitoring',
        title: 'Live GPS Tracking & Telemetry Dashboard',
        content: 'Vehicles equipped with GPS tracking provide real-time operational visibility:',
        steps: [
          {
            stepNumber: 1,
            title: 'Live Geographic Map',
            description: 'View the live locations of all active vehicles on an interactive map. Tracks current speed, ignition status (Engine Running vs Parked), and direction of travel.',
            expectedOutcome: 'Real-time fleet tracking view rendered.'
          },
          {
            stepNumber: 2,
            title: 'Security Alerts & Camera Streaming',
            description: 'The system triggers automated alerts for over-speeding, boundary geo-fence breaches, and emergency SOS button presses. For equipped models, staff can stream forward-facing and cabin security cameras.',
            expectedOutcome: 'Fleet safety and security monitoring active.'
          }
        ]
      }
    ]
  }
];
