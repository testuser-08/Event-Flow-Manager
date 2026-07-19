// ─── Agenda ────────────────────────────────────────────────────────────────

export interface AgendaItem {
  id: string;
  startTime: string; // "HH:MM" 24-hr
  endTime: string;
  label: string;
  title: string;
  location: string;
  isBreakout?: boolean;
}

export const AGENDA: AgendaItem[] = [
  {
    id: 'a1',
    startTime: '08:30',
    endTime: '09:20',
    label: '08:30 AM – 09:20 AM',
    title: 'Registrations and Refreshments',
    location: 'Outside BLR05 Audimax',
  },
  {
    id: 'a2',
    startTime: '09:30',
    endTime: '09:45',
    label: '09:30 AM – 09:45 AM',
    title: 'Welcome Note by Stefan',
    location: 'BLR05 Audimax',
  },
  {
    id: 'a3',
    startTime: '09:45',
    endTime: '10:05',
    label: '09:45 AM – 10:05 AM',
    title: 'Customer Success Story',
    location: 'BLR05 Audimax',
  },
  {
    id: 'a4',
    startTime: '10:05',
    endTime: '10:40',
    label: '10:05 AM – 10:40 AM',
    title: 'Keynote: Rewiring Support for the Autonomous Enterprise',
    location: 'BLR05 Audimax',
  },
  {
    id: 'a5',
    startTime: '10:40',
    endTime: '10:50',
    label: '10:40 AM – 10:50 AM',
    title: 'Support Accreditation Launch',
    location: 'BLR05 Audimax',
  },
  {
    id: 'a6',
    startTime: '10:50',
    endTime: '11:20',
    label: '10:50 AM – 11:20 AM',
    title: 'Networking Break',
    location: 'Café Lounge and Hive',
  },
  {
    id: 'a7',
    startTime: '11:20',
    endTime: '12:00',
    label: '11:20 AM – 12:00 PM',
    title: 'Executive Panel Discussion: AI at the Center, Humans at the Core',
    location: 'BLR05 Audimax',
  },
  {
    id: 'a8',
    startTime: '12:00',
    endTime: '13:30',
    label: '12:00 PM – 01:30 PM',
    title: 'Lunch',
    location: 'BLR02 Indoor Cafeteria and BLR05 Canopy',
  },
  {
    id: 'a9',
    startTime: '13:30',
    endTime: '16:00',
    label: '01:30 PM – 04:00 PM',
    title: 'Breakout Session',
    location: 'Various zones across BLR05 (and BLR03 for MCC Walkthrough)',
    isBreakout: true,
  },
  {
    id: 'a10',
    startTime: '16:00',
    endTime: '17:00',
    label: '04:00 PM – 05:00 PM',
    title: 'Guest Speaker Session – Meet Kenny Sebastian!',
    location: 'BLR05 Audimax',
  },
  {
    id: 'a11',
    startTime: '17:00',
    endTime: '17:10',
    label: '05:00 PM – 05:10 PM',
    title: 'Thank You Note',
    location: 'BLR05 Audimax',
  },
  {
    id: 'a12',
    startTime: '17:10',
    endTime: '17:45',
    label: '05:10 PM – 05:45 PM',
    title: 'High-Tea',
    location: 'BLR05 Canopy',
  },
  {
    id: 'a13',
    startTime: '18:30',
    endTime: '21:30',
    label: '06:30 PM – 09:30 PM',
    title: 'Dinner (exclusive, at Oasis Brewery)',
    location: 'Oasis Brewery',
  },
];

// ─── Breakout Sessions ──────────────────────────────────────────────────────

export interface BreakoutSession {
  zone?: string;
  title: string;
  startTime: string; // "HH:MM"
  endTime: string;
  timeLabel: string;
}

export interface BreakoutTrack {
  id: string;
  name: string;
  location: string;
  color: string;       // Tailwind bg color class
  textColor: string;   // Tailwind text color class
  borderColor: string; // Tailwind border color class
  sessions: BreakoutSession[];
}

export const BREAKOUT_TRACKS: BreakoutTrack[] = [
  // ── 1. Demopods ──────────────────────────────────────────────────────────
  {
    id: 'demopods',
    name: 'Demopods',
    location: 'BLR05 Experience Center',
    color: 'bg-blue-600',
    textColor: 'text-blue-600 dark:text-blue-400',
    borderColor: 'border-blue-600 dark:border-blue-400',
    sessions: [
      // 1:30 – 2:00
      { zone: 'Zone 1 (AI)', title: 'Joule in SAP for Me', startTime: '13:30', endTime: '14:00', timeLabel: '1:30 PM – 2:00 PM' },
      { zone: 'Zone 2', title: 'Accenture: AI Agents Powering the Future of Customer Support', startTime: '13:30', endTime: '14:00', timeLabel: '1:30 PM – 2:00 PM' },
      { zone: 'Zone 3', title: 'NTT: Work Smarter with Joule AI', startTime: '13:30', endTime: '14:00', timeLabel: '1:30 PM – 2:00 PM' },
      { zone: 'Zone 4 (AI)', title: 'People Intelligence in Business Data Cloud (BDC)', startTime: '13:30', endTime: '14:00', timeLabel: '1:30 PM – 2:00 PM' },
      { zone: 'Zone 5', title: 'Unlocking the New People Profile Experience', startTime: '13:30', endTime: '14:00', timeLabel: '1:30 PM – 2:00 PM' },
      { zone: 'Zone 6', title: 'Cash Management in SAP S/4HANA Private Cloud: A Practical Migration Journey', startTime: '13:30', endTime: '14:00', timeLabel: '1:30 PM – 2:00 PM' },
      // 2:00 – 2:30
      { zone: 'Zone 1', title: 'Financial Consistency Analysis Agent', startTime: '14:00', endTime: '14:30', timeLabel: '2:00 PM – 2:30 PM' },
      { zone: 'Zone 2', title: 'Accenture: ARIA – Adaptive & Responsive Intelligence for Autonomous Supply Chain', startTime: '14:00', endTime: '14:30', timeLabel: '2:00 PM – 2:30 PM' },
      { zone: 'Zone 3', title: 'NTT: Work Smarter with Joule AI', startTime: '14:00', endTime: '14:30', timeLabel: '2:00 PM – 2:30 PM' },
      { zone: 'Zone 4', title: 'Unlocking AI in SAP for Me for Procurement Customers: Joule, Generative AI & Business Insights', startTime: '14:00', endTime: '14:30', timeLabel: '2:00 PM – 2:30 PM' },
      { zone: 'Zone 5', title: 'Getting started with Smartrecruiters', startTime: '14:00', endTime: '14:30', timeLabel: '2:00 PM – 2:30 PM' },
      { zone: 'Zone 6', title: 'Introducing MDCA: The New Standard in Master Data Consistency', startTime: '14:00', endTime: '14:30', timeLabel: '2:00 PM – 2:30 PM' },
      // 2:30 – 3:00
      { zone: 'Zone 1', title: 'Discovering SAP Joule for Consultants', startTime: '14:30', endTime: '15:00', timeLabel: '2:30 PM – 3:00 PM' },
      { zone: 'Zone 2', title: 'Centralizing SAP Business AI Feature Lifecycle Across SAP Cloud Solutions Using SAP CBC', startTime: '14:30', endTime: '15:00', timeLabel: '2:30 PM – 3:00 PM' },
      { zone: 'Zone 3', title: 'SAP Concur: New Control Center Dashboard & AI generated Travel Policy Rules', startTime: '14:30', endTime: '15:00', timeLabel: '2:30 PM – 3:00 PM' },
      { zone: 'Zone 4', title: "Autonomous Selling: A Preview of SAP Sales Cloud V2's AI Agents (H2 2026)", startTime: '14:30', endTime: '15:00', timeLabel: '2:30 PM – 3:00 PM' },
      { zone: 'Zone 5', title: 'Planning Collaboration in NextGen', startTime: '14:30', endTime: '15:00', timeLabel: '2:30 PM – 3:00 PM' },
      { zone: 'Zone 6', title: 'SAP Integration Suite: Common Design Pitfalls Leading to Out-of-Memory Issues and Failures', startTime: '14:30', endTime: '15:00', timeLabel: '2:30 PM – 3:00 PM' },
      // 3:00 – 3:30
      { zone: 'Zone 1', title: 'Joule In Procurement', startTime: '15:00', endTime: '15:30', timeLabel: '3:00 PM – 3:30 PM' },
      { zone: 'Zone 2', title: 'Invisible Support, Visible Outcomes', startTime: '15:00', endTime: '15:30', timeLabel: '3:00 PM – 3:30 PM' },
      { zone: 'Zone 3', title: 'E-Invoicing for Concur Expense', startTime: '15:00', endTime: '15:30', timeLabel: '3:00 PM – 3:30 PM' },
      { zone: 'Zone 4', title: 'Support Supercharged – Driving Excellence with Tosca Automation', startTime: '15:00', endTime: '15:30', timeLabel: '3:00 PM – 3:30 PM' },
      { zone: 'Zone 5', title: 'Data-Driven Advisory for RISE with SAP Customers', startTime: '15:00', endTime: '15:30', timeLabel: '3:00 PM – 3:30 PM' },
      { zone: 'Zone 6', title: 'SAP Cloud Connector: Bridging Onpremise to Cloud', startTime: '15:00', endTime: '15:30', timeLabel: '3:00 PM – 3:30 PM' },
      // 3:30 – 4:00
      { zone: 'Zone 1', title: 'GenAI-Driven Extensibility in SAP S/4HANA Public Cloud: Empowering Developers with Joule', startTime: '15:30', endTime: '16:00', timeLabel: '3:30 PM – 4:00 PM' },
      { zone: 'Zone 2', title: 'AI-Powered Intelligent Case Triaging – Accelerating Escalation Decisions', startTime: '15:30', endTime: '16:00', timeLabel: '3:30 PM – 4:00 PM' },
      { zone: 'Zone 3', title: 'SAP Concur: Lifecycle of an expense report', startTime: '15:30', endTime: '16:00', timeLabel: '3:30 PM – 4:00 PM' },
      { zone: 'Zone 4', title: 'SAP Intelligent Agriculture', startTime: '15:30', endTime: '16:00', timeLabel: '3:30 PM – 4:00 PM' },
      { zone: 'Zone 5', title: 'AI Driven SAP MCC Support Tools', startTime: '15:30', endTime: '16:00', timeLabel: '3:30 PM – 4:00 PM' },
      { zone: 'Zone 6', title: 'Impact of Client Authentication EKU Deprecation on SAP Integration Suite', startTime: '15:30', endTime: '16:00', timeLabel: '3:30 PM – 4:00 PM' },
    ],
  },

  // ── 2. Demo Pods (Experience Center) ─────────────────────────────────────
  {
    id: 'demo-pods-ec',
    name: 'Demo Pods (Experience Center)',
    location: 'BLR05 Experience Center',
    color: 'bg-cyan-600',
    textColor: 'text-cyan-600 dark:text-cyan-400',
    borderColor: 'border-cyan-600 dark:border-cyan-400',
    sessions: [
      { zone: 'Zone 1', title: 'Private Cloud', startTime: '13:30', endTime: '14:30', timeLabel: '1:30 PM – 2:30 PM' },
      { zone: 'Zone 2', title: 'SuccessFactors', startTime: '13:30', endTime: '14:30', timeLabel: '1:30 PM – 2:30 PM' },
      { zone: 'Zone 3', title: 'Ariba/Procurement', startTime: '13:30', endTime: '14:30', timeLabel: '1:30 PM – 2:30 PM' },
      { zone: 'Zone 1', title: 'Public Cloud', startTime: '14:30', endTime: '16:00', timeLabel: '2:30 PM – 4:00 PM' },
      { zone: 'Zone 2', title: 'BTP', startTime: '14:30', endTime: '16:00', timeLabel: '2:30 PM – 4:00 PM' },
      { zone: 'Zone 3', title: 'Concur', startTime: '14:30', endTime: '16:00', timeLabel: '2:30 PM – 4:00 PM' },
      { zone: 'Zone 4', title: 'I&CX', startTime: '14:30', endTime: '16:00', timeLabel: '2:30 PM – 4:00 PM' },
    ],
  },

  // ── 3. Tech Talk ─────────────────────────────────────────────────────────
  {
    id: 'tech-talk',
    name: 'Tech Talk',
    location: 'Hive Space / Experience Center Tech Talk Zone 1',
    color: 'bg-violet-600',
    textColor: 'text-violet-600 dark:text-violet-400',
    borderColor: 'border-violet-600 dark:border-violet-400',
    sessions: [
      { zone: 'Hive Space', title: 'Navigating Legal Change with SAP: RCM, Roadmaps & More', startTime: '13:30', endTime: '14:00', timeLabel: '1:30 PM – 2:00 PM' },
      { zone: 'Experience Center Zone 1', title: 'New Concur Travel', startTime: '13:30', endTime: '14:00', timeLabel: '1:30 PM – 2:00 PM' },
      { zone: 'Hive Space', title: 'The Intelligent Support Experience: Powered by Joule and Real-Time Expert Engagement', startTime: '14:00', endTime: '14:30', timeLabel: '2:00 PM – 2:30 PM' },
      { zone: 'Experience Center Zone 1', title: 'Business Network: Country/Region-Specific Tax Invoicing Process in NextGen', startTime: '14:00', endTime: '14:30', timeLabel: '2:00 PM – 2:30 PM' },
      { zone: 'Hive Space', title: 'Joule Agentic AI for SuccessFactors BizX', startTime: '14:30', endTime: '15:00', timeLabel: '2:30 PM – 3:00 PM' },
      { zone: 'Experience Center Zone 1', title: 'Forward Deployed Engineering (FDE)', startTime: '14:30', endTime: '15:00', timeLabel: '2:30 PM – 3:00 PM' },
      { zone: 'Hive Space', title: 'Understanding Joule: Architecture, Authorization Flow, and Interaction Patterns', startTime: '15:00', endTime: '15:30', timeLabel: '3:00 PM – 3:30 PM' },
      { zone: 'Experience Center Zone 1', title: 'From Reactive Support to Proactive Service with SAP', startTime: '15:00', endTime: '15:30', timeLabel: '3:00 PM – 3:30 PM' },
      { zone: 'Hive Space', title: 'Foundational Support Services in Enterprise Support and SAP Cloud ALM', startTime: '15:30', endTime: '16:00', timeLabel: '3:30 PM – 4:00 PM' },
      { zone: 'Experience Center Zone 1', title: 'SAP Business Suite – Case study with H2R', startTime: '15:30', endTime: '16:00', timeLabel: '3:30 PM – 4:00 PM' },
    ],
  },

  // ── 4. Design Thinking Zones ─────────────────────────────────────────────
  {
    id: 'design-thinking',
    name: 'Design Thinking Zones',
    location: 'BLR05 First Floor Flexi Rooms',
    color: 'bg-emerald-600',
    textColor: 'text-emerald-600 dark:text-emerald-400',
    borderColor: 'border-emerald-600 dark:border-emerald-400',
    sessions: [
      { zone: 'Zone 2', title: 'Future of Support Arena', startTime: '13:30', endTime: '14:30', timeLabel: '1:30 PM – 2:30 PM' },
      { zone: 'Zone 1', title: 'SAP for Me Arena Session 1', startTime: '14:30', endTime: '15:00', timeLabel: '2:30 PM – 3:00 PM' },
      { zone: 'Zone 1', title: 'SAP for Me Arena Session 2', startTime: '15:30', endTime: '16:00', timeLabel: '3:30 PM – 4:00 PM' },
    ],
  },

  // ── 5. MCC Walkthrough ───────────────────────────────────────────────────
  {
    id: 'mcc-walkthrough',
    name: 'MCC Walkthrough',
    location: 'BLR03 2B, 1st Floor MCC Room',
    color: 'bg-orange-500',
    textColor: 'text-orange-500 dark:text-orange-400',
    borderColor: 'border-orange-500 dark:border-orange-400',
    sessions: [
      { title: 'MCC Walkthrough', startTime: '13:30', endTime: '14:10', timeLabel: '1:30 PM – 2:10 PM' },
      { title: 'MCC Walkthrough', startTime: '14:20', endTime: '15:00', timeLabel: '2:20 PM – 3:00 PM' },
      { title: 'MCC Walkthrough', startTime: '15:00', endTime: '15:40', timeLabel: '3:00 PM – 3:40 PM' },
    ],
  },

  // ── 6. Ask an Expert Corner ──────────────────────────────────────────────
  {
    id: 'ask-expert',
    name: 'Ask an Expert Corner',
    location: 'BLR05 Experience Center',
    color: 'bg-rose-600',
    textColor: 'text-rose-600 dark:text-rose-400',
    borderColor: 'border-rose-600 dark:border-rose-400',
    sessions: [
      { zone: 'Zone 1', title: 'Public Cloud', startTime: '13:30', endTime: '14:30', timeLabel: '1:30 PM – 2:30 PM' },
      { zone: 'Zone 2', title: 'BTP', startTime: '13:30', endTime: '14:30', timeLabel: '1:30 PM – 2:30 PM' },
      { zone: 'Zone 3', title: 'Concur', startTime: '13:30', endTime: '14:30', timeLabel: '1:30 PM – 2:30 PM' },
      { zone: 'Zone 4', title: 'I&CX', startTime: '13:30', endTime: '14:30', timeLabel: '1:30 PM – 2:30 PM' },
      { zone: 'Zone 1', title: 'Private Cloud', startTime: '14:30', endTime: '15:30', timeLabel: '2:30 PM – 3:30 PM' },
      { zone: 'Zone 2', title: 'SuccessFactors', startTime: '14:30', endTime: '15:30', timeLabel: '2:30 PM – 3:30 PM' },
      { zone: 'Zone 3', title: 'Ariba/Procurement', startTime: '14:30', endTime: '15:30', timeLabel: '2:30 PM – 3:30 PM' },
    ],
  },

  // ── 7. Support Accreditation Zone ────────────────────────────────────────
  {
    id: 'support-accreditation',
    name: 'Support Accreditation Zone',
    location: 'BLR05 Audimax',
    color: 'bg-amber-500',
    textColor: 'text-amber-500 dark:text-amber-400',
    borderColor: 'border-amber-500 dark:border-amber-400',
    sessions: [
      { title: 'Give-away', startTime: '14:00', endTime: '14:30', timeLabel: '2:00 PM – 2:30 PM' },
      { title: 'Give-away', startTime: '15:00', endTime: '15:30', timeLabel: '3:00 PM – 3:30 PM' },
    ],
  },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Convert "HH:MM" to minutes since midnight */
export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/** Return "current" | "next" | "past" | "future" relative to now (minutes since midnight) */
export function getItemStatus(
  startTime: string,
  endTime: string,
  nowMinutes: number
): 'current' | 'next' | 'past' | 'future' {
  const start = toMinutes(startTime);
  const end = toMinutes(endTime);
  if (nowMinutes >= start && nowMinutes < end) return 'current';
  if (nowMinutes < start) return 'future';
  return 'past';
}
