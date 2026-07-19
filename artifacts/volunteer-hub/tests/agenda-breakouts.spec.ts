import { test, expect, Page } from '@playwright/test';

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_TOKEN = 'test-jwt-token-abc123';

const MOCK_VOLUNTEER = {
  volunteerId: 'user-test-1',
  email: 'volunteer@example.com',
  name: 'Test Volunteer',
  workstreams: ['Support'],
  isAdmin: false,
  avatarUrl: null,
};

// All 13 agenda items matching the event-data canonical data
const MOCK_AGENDA = [
  { id: 'a1',  sort_order: 1,  start_time: '08:30', end_time: '09:20', label: '08:30 AM \u2013 09:20 AM', title: 'Registrations and Refreshments',                                    location: 'Outside BLR05 Audimax',                               is_breakout: false, created_at: '2024-01-01T00:00:00Z' },
  { id: 'a2',  sort_order: 2,  start_time: '09:30', end_time: '09:45', label: '09:30 AM \u2013 09:45 AM', title: 'Welcome Note by Stefan',                                             location: 'BLR05 Audimax',                                       is_breakout: false, created_at: '2024-01-01T00:00:00Z' },
  { id: 'a3',  sort_order: 3,  start_time: '09:45', end_time: '10:05', label: '09:45 AM \u2013 10:05 AM', title: 'Customer Success Story',                                             location: 'BLR05 Audimax',                                       is_breakout: false, created_at: '2024-01-01T00:00:00Z' },
  { id: 'a4',  sort_order: 4,  start_time: '10:05', end_time: '10:40', label: '10:05 AM \u2013 10:40 AM', title: 'Keynote: Rewiring Support for the Autonomous Enterprise',            location: 'BLR05 Audimax',                                       is_breakout: false, created_at: '2024-01-01T00:00:00Z' },
  { id: 'a5',  sort_order: 5,  start_time: '10:40', end_time: '10:50', label: '10:40 AM \u2013 10:50 AM', title: 'Support Accreditation Launch',                                       location: 'BLR05 Audimax',                                       is_breakout: false, created_at: '2024-01-01T00:00:00Z' },
  { id: 'a6',  sort_order: 6,  start_time: '10:50', end_time: '11:20', label: '10:50 AM \u2013 11:20 AM', title: 'Networking Break',                                                   location: 'Caf\u00e9 Lounge and Hive',                           is_breakout: false, created_at: '2024-01-01T00:00:00Z' },
  { id: 'a7',  sort_order: 7,  start_time: '11:20', end_time: '12:00', label: '11:20 AM \u2013 12:00 PM', title: 'Executive Panel Discussion: AI at the Center, Humans at the Core',  location: 'BLR05 Audimax',                                       is_breakout: false, created_at: '2024-01-01T00:00:00Z' },
  { id: 'a8',  sort_order: 8,  start_time: '12:00', end_time: '13:30', label: '12:00 PM \u2013 01:30 PM', title: 'Lunch',                                                              location: 'BLR02 Indoor Cafeteria and BLR05 Canopy',              is_breakout: false, created_at: '2024-01-01T00:00:00Z' },
  { id: 'a9',  sort_order: 9,  start_time: '13:30', end_time: '16:00', label: '01:30 PM \u2013 04:00 PM', title: 'Breakout Session',                                                   location: 'Various zones across BLR05 (and BLR03 for MCC Walkthrough)', is_breakout: true, created_at: '2024-01-01T00:00:00Z' },
  { id: 'a10', sort_order: 10, start_time: '16:00', end_time: '17:00', label: '04:00 PM \u2013 05:00 PM', title: 'Guest Speaker Session \u2013 Meet Kenny Sebastian!',                location: 'BLR05 Audimax',                                       is_breakout: false, created_at: '2024-01-01T00:00:00Z' },
  { id: 'a11', sort_order: 11, start_time: '17:00', end_time: '17:10', label: '05:00 PM \u2013 05:10 PM', title: 'Thank You Note',                                                     location: 'BLR05 Audimax',                                       is_breakout: false, created_at: '2024-01-01T00:00:00Z' },
  { id: 'a12', sort_order: 12, start_time: '17:10', end_time: '17:45', label: '05:10 PM \u2013 05:45 PM', title: 'High-Tea',                                                           location: 'BLR05 Canopy',                                        is_breakout: false, created_at: '2024-01-01T00:00:00Z' },
  { id: 'a13', sort_order: 13, start_time: '18:30', end_time: '21:30', label: '06:30 PM \u2013 09:30 PM', title: 'Dinner (exclusive, at Oasis Brewery)',                               location: 'Oasis Brewery',                                       is_breakout: false, created_at: '2024-01-01T00:00:00Z' },
];

// 7 breakout tracks. demopods and tech-talk both contain "Joule" sessions
// so a keyword search for "Joule" returns results across multiple tracks.
const MOCK_BREAKOUTS = [
  {
    id: 'demopods', slug: 'demopods', sort_order: 1,
    name: 'Demopods', location: 'BLR05 Experience Center',
    color: 'bg-blue-600', text_color: 'text-blue-600', border_color: 'border-blue-600',
    created_at: '2024-01-01T00:00:00Z',
    sessions: [
      { id: 's1', track_id: 'demopods', sort_order: 1, zone: 'Zone 1 (AI)', title: 'Joule in SAP for Me',              start_time: '13:30', end_time: '14:00', time_label: '1:30 PM \u2013 2:00 PM', created_at: '2024-01-01T00:00:00Z' },
      { id: 's2', track_id: 'demopods', sort_order: 2, zone: 'Zone 2',      title: 'SAP Ariba Guided Buying',           start_time: '13:30', end_time: '14:00', time_label: '1:30 PM \u2013 2:00 PM', created_at: '2024-01-01T00:00:00Z' },
      { id: 's3', track_id: 'demopods', sort_order: 3, zone: 'Zone 1',      title: 'Discovering SAP Joule for Consultants', start_time: '14:30', end_time: '15:00', time_label: '2:30 PM \u2013 3:00 PM', created_at: '2024-01-01T00:00:00Z' },
      { id: 's4', track_id: 'demopods', sort_order: 4, zone: 'Zone 1',      title: 'Joule In Procurement',              start_time: '15:00', end_time: '15:30', time_label: '3:00 PM \u2013 3:30 PM', created_at: '2024-01-01T00:00:00Z' },
    ],
  },
  {
    id: 'demo-pods-ec', slug: 'demo-pods-ec', sort_order: 2,
    name: 'Demo Pods (Experience Center)', location: 'BLR05 Experience Center',
    color: 'bg-cyan-600', text_color: 'text-cyan-600', border_color: 'border-cyan-600',
    created_at: '2024-01-01T00:00:00Z',
    sessions: [
      { id: 's5', track_id: 'demo-pods-ec', sort_order: 1, zone: 'Zone 1', title: 'SAP Build \u2013 Low Code Overview', start_time: '13:30', end_time: '14:30', time_label: '1:30 PM \u2013 2:30 PM', created_at: '2024-01-01T00:00:00Z' },
      { id: 's6', track_id: 'demo-pods-ec', sort_order: 2, zone: 'Zone 2', title: 'SAP Integration Suite',              start_time: '14:30', end_time: '15:30', time_label: '2:30 PM \u2013 3:30 PM', created_at: '2024-01-01T00:00:00Z' },
    ],
  },
  {
    id: 'tech-talk', slug: 'tech-talk', sort_order: 3,
    name: 'Tech Talk', location: 'Hive Space / Experience Center Tech Talk Zone 1',
    color: 'bg-violet-600', text_color: 'text-violet-600', border_color: 'border-violet-600',
    created_at: '2024-01-01T00:00:00Z',
    sessions: [
      { id: 's7', track_id: 'tech-talk', sort_order: 1, zone: 'Hive Space', title: 'The Intelligent Support Experience: Powered by Joule and Real-Time Expert Engagement', start_time: '14:00', end_time: '14:30', time_label: '2:00 PM \u2013 2:30 PM', created_at: '2024-01-01T00:00:00Z' },
      { id: 's8', track_id: 'tech-talk', sort_order: 2, zone: 'Hive Space', title: 'Joule Agentic AI for SuccessFactors BizX',                                             start_time: '14:30', end_time: '15:00', time_label: '2:30 PM \u2013 3:00 PM', created_at: '2024-01-01T00:00:00Z' },
      { id: 's9', track_id: 'tech-talk', sort_order: 3, zone: 'Hive Space', title: 'Understanding Joule: Architecture, Authorization Flow, and Interaction Patterns',      start_time: '15:00', end_time: '15:30', time_label: '3:00 PM \u2013 3:30 PM', created_at: '2024-01-01T00:00:00Z' },
    ],
  },
  {
    id: 'design-thinking', slug: 'design-thinking', sort_order: 4,
    name: 'Design Thinking Zones', location: 'BLR05 First Floor Flexi Rooms',
    color: 'bg-emerald-600', text_color: 'text-emerald-600', border_color: 'border-emerald-600',
    created_at: '2024-01-01T00:00:00Z',
    sessions: [
      { id: 's10', track_id: 'design-thinking', sort_order: 1, zone: null, title: 'Design Sprint: AI-Assisted Support Flows', start_time: '13:30', end_time: '16:00', time_label: '1:30 PM \u2013 4:00 PM', created_at: '2024-01-01T00:00:00Z' },
    ],
  },
  {
    id: 'mcc-walkthrough', slug: 'mcc-walkthrough', sort_order: 5,
    name: 'MCC Walkthrough', location: 'BLR03 2B, 1st Floor MCC Room',
    color: 'bg-orange-500', text_color: 'text-orange-500', border_color: 'border-orange-500',
    created_at: '2024-01-01T00:00:00Z',
    sessions: [
      { id: 's11', track_id: 'mcc-walkthrough', sort_order: 1, zone: null, title: 'MCC Operations Walkthrough \u2013 Batch 1', start_time: '13:30', end_time: '14:30', time_label: '1:30 PM \u2013 2:30 PM', created_at: '2024-01-01T00:00:00Z' },
      { id: 's12', track_id: 'mcc-walkthrough', sort_order: 2, zone: null, title: 'MCC Operations Walkthrough \u2013 Batch 2', start_time: '15:00', end_time: '16:00', time_label: '3:00 PM \u2013 4:00 PM', created_at: '2024-01-01T00:00:00Z' },
    ],
  },
  {
    id: 'ask-expert', slug: 'ask-expert', sort_order: 6,
    name: 'Ask an Expert Corner', location: 'BLR05 Experience Center',
    color: 'bg-rose-600', text_color: 'text-rose-600', border_color: 'border-rose-600',
    created_at: '2024-01-01T00:00:00Z',
    sessions: [
      { id: 's13', track_id: 'ask-expert', sort_order: 1, zone: 'Zone 1', title: 'Public Cloud',  start_time: '13:30', end_time: '14:30', time_label: '1:30 PM \u2013 2:30 PM', created_at: '2024-01-01T00:00:00Z' },
      { id: 's14', track_id: 'ask-expert', sort_order: 2, zone: 'Zone 2', title: 'BTP',            start_time: '13:30', end_time: '14:30', time_label: '1:30 PM \u2013 2:30 PM', created_at: '2024-01-01T00:00:00Z' },
      { id: 's15', track_id: 'ask-expert', sort_order: 3, zone: 'Zone 1', title: 'Private Cloud',  start_time: '14:30', end_time: '15:30', time_label: '2:30 PM \u2013 3:30 PM', created_at: '2024-01-01T00:00:00Z' },
    ],
  },
  {
    id: 'support-accreditation', slug: 'support-accreditation', sort_order: 7,
    name: 'Support Accreditation Zone', location: 'BLR05 Audimax',
    color: 'bg-amber-500', text_color: 'text-amber-500', border_color: 'border-amber-500',
    created_at: '2024-01-01T00:00:00Z',
    sessions: [
      { id: 's16', track_id: 'support-accreditation', sort_order: 1, zone: null, title: 'Give-away', start_time: '14:00', end_time: '14:30', time_label: '2:00 PM \u2013 2:30 PM', created_at: '2024-01-01T00:00:00Z' },
      { id: 's17', track_id: 'support-accreditation', sort_order: 2, zone: null, title: 'Give-away', start_time: '15:00', end_time: '15:30', time_label: '3:00 PM \u2013 3:30 PM', created_at: '2024-01-01T00:00:00Z' },
    ],
  },
];

// ── Helper: wire up all API mocks and inject the auth token ───────────────────

async function setupAuth(page: Page) {
  // Inject the JWT token before any JS runs so AuthContext finds it immediately
  await page.addInitScript((token: string) => {
    localStorage.setItem('vhub_token', token);
  }, MOCK_TOKEN);

  // Auth validation
  await page.route('**/api/auth/me', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_VOLUNTEER) })
  );
  // SetupTrigger on every page mount
  await page.route('**/api/setup-database', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, message: 'ok' }) })
  );
  // Agenda data
  await page.route('**/api/agenda', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_AGENDA) })
  );
  // Breakouts data
  await page.route('**/api/breakouts', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_BREAKOUTS) })
  );
}

// Escape special regex metacharacters so track names like
// "Demo Pods (Experience Center)" work in Playwright name matchers.
function escapeRegex(s: string): RegExp {
  return new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
}

// ── Tests: Agenda page ────────────────────────────────────────────────────────

test.describe('Agenda page', () => {
  test('logged-in user can navigate to /agenda from the header Agenda icon', async ({ page }) => {
    await setupAuth(page);
    // Start on /breakouts (loads without extra mocks) so the header is visible
    await page.goto('/breakouts');
    await expect(page.getByRole('heading', { name: /Breakout Sessions/i })).toBeVisible();
    // Click the CalendarDays icon (title="Agenda") in the header
    await page.getByTitle('Agenda').click();
    await expect(page).toHaveURL(/\/agenda/);
    await expect(page.getByRole('heading', { name: /Agenda/i })).toBeVisible();
  });

  test('all 13 agenda rows render', async ({ page }) => {
    await setupAuth(page);
    await page.goto('/agenda');
    // Each card renders the session title inside an <h3>
    const cards = page.locator('h3');
    await expect(cards).toHaveCount(13);
  });

  test('agenda rows have correct time labels', async ({ page }) => {
    await setupAuth(page);
    await page.goto('/agenda');
    // Spot-check four distinct time labels across the day
    await expect(page.getByText('08:30 AM').first()).toBeVisible();
    await expect(page.getByText('09:30 AM').first()).toBeVisible();
    await expect(page.getByText('01:30 PM').first()).toBeVisible();
    await expect(page.getByText('06:30 PM').first()).toBeVisible();
  });

  test('agenda rows show correct locations', async ({ page }) => {
    await setupAuth(page);
    await page.goto('/agenda');
    await expect(page.getByText('Outside BLR05 Audimax').first()).toBeVisible();
    await expect(page.getByText('Oasis Brewery').first()).toBeVisible();
    await expect(page.getByText(/Various zones across BLR05/).first()).toBeVisible();
  });

  test('clicking the Breakout Session row navigates to /breakouts', async ({ page }) => {
    await setupAuth(page);
    await page.goto('/agenda');
    // The breakout row has a "Tap to see all breakout tracks" link label
    await page.getByText('Tap to see all breakout tracks').click();
    await expect(page).toHaveURL(/\/breakouts/);
    await expect(page.getByRole('heading', { name: /Breakout Sessions/i })).toBeVisible();
  });
});

// ── Tests: Breakout Sessions page ────────────────────────────────────────────

test.describe('Breakout Sessions page', () => {
  test('logged-in user can navigate to /breakouts from the header icon', async ({ page }) => {
    await setupAuth(page);
    // Start on /agenda (loads without extra mocks) so the header is visible
    await page.goto('/agenda');
    await expect(page.getByRole('heading', { name: /Agenda/i })).toBeVisible();
    // Click the LayoutGrid icon (title="Breakout Sessions") in the header
    await page.getByTitle('Breakout Sessions').click();
    await expect(page).toHaveURL(/\/breakouts/);
    await expect(page.getByRole('heading', { name: /Breakout Sessions/i })).toBeVisible();
  });

  test('all 7 track tabs appear', async ({ page }) => {
    await setupAuth(page);
    await page.goto('/breakouts');

    const expectedTracks = [
      'Demopods',
      'Demo Pods (Experience Center)',
      'Tech Talk',
      'Design Thinking Zones',
      'MCC Walkthrough',
      'Ask an Expert Corner',
      'Support Accreditation Zone',
    ];

    for (const name of expectedTracks) {
      // toBeAttached (rather than toBeVisible) because the tabs live in a
      // horizontal-scroll container and some may sit outside the viewport.
      await expect(
        page.getByRole('button', { name: escapeRegex(name) })
      ).toBeAttached();
    }
  });

  test('keyword search for "Joule" returns results across multiple tracks', async ({ page }) => {
    await setupAuth(page);
    await page.goto('/breakouts');

    await page.getByPlaceholder('Search sessions\u2026').fill('Joule');

    // The results count banner is shown when searching
    const summary = page.locator('[class*="font-mono"][class*="uppercase"]').filter({ hasText: /results? for/i });
    await expect(summary).toBeVisible();

    // Both Demopods and Tech Talk have Joule sessions — both track labels appear
    await expect(page.getByText('Demopods').first()).toBeVisible();
    await expect(page.getByText('Tech Talk').first()).toBeVisible();
  });

  test('"Now" filter button toggles on and off', async ({ page }) => {
    await setupAuth(page);
    await page.goto('/breakouts');

    // The filter button says "Now" and is rendered as a <button>
    const nowBtn = page.getByRole('button', { name: /^Now$/i });

    // Initial state — not activated (no bg-primary class)
    await expect(nowBtn).not.toHaveClass(/bg-primary/);

    // First click — activates
    await nowBtn.click();
    await expect(nowBtn).toHaveClass(/bg-primary/);

    // Second click — deactivates
    await nowBtn.click();
    await expect(nowBtn).not.toHaveClass(/bg-primary/);
  });
});
