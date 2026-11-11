import assert from 'node:assert/strict';
import test from 'node:test';
import { buildPlan, dateShift, todayKey, trackingStats } from '../public/planner.mjs';

const profile = {
  name: 'آرش',
  primarySport: 'strength',
  secondarySports: ['running', 'cycling'],
  days: [1, 3, 6],
  startDate: '2026-06-01',
};

function activity(date, sport, duration = 45, effort = null) {
  return { id: `${date}-${sport}`, date, sport, duration, effort, source: 'manual' };
}

const enough = [
  activity('2026-06-02', 'strength'),
  activity('2026-06-09', 'strength'),
  activity('2026-06-16', 'running'),
  activity('2026-06-27', 'strength'),
];

test('counts local calendar days across months and leap years', () => {
  assert.equal(dateShift('2024-02-28', 1), '2024-02-29');
  assert.equal(dateShift('2026-01-01', -1), '2025-12-31');
  assert.equal(dateShift('2026-02-29', 1), '');
  const now = new Date();
  assert.equal(todayKey(), [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-'));
});

test('unlocks on the 30th day if there is recent evidence', () => {
  const before = trackingStats(profile, enough, '2026-06-29');
  assert.equal(before.elapsedDays, 29);
  assert.equal(before.daysRemaining, 1);
  assert.equal(before.ready, false);
  assert.equal(buildPlan(profile, enough, '2026-06-29').week.length, 0);

  const after = trackingStats(profile, enough, '2026-06-30');
  assert.equal(after.elapsedDays, 30);
  assert.equal(after.trackingEnd, '2026-06-30');
  assert.equal(after.daysRemaining, 0);
  assert.equal(after.ready, true);
  assert.equal(after.blockers.length, 0);
});

test('excludes sessions before tracking, outside the chart, or in the future', () => {
  const stats = trackingStats(profile, [
    activity('2026-05-30', 'strength'),
    activity('2026-06-05', 'strength'),
    activity('2026-06-07', 'strength'),
    activity('2026-06-07', 'cycling', 30),
    activity('2026-06-08', 'unknown'),
    activity('2026-06-12', 'swimming', 0),
    activity('2026-07-06', 'running', 15),
    activity('2026-07-07', 'running'),
  ], '2026-07-06');
  assert.equal(stats.sessionCount, 3);
  assert.equal(stats.activeDays, 2);
  assert.equal(stats.primaryCount, 1);
  assert.equal(stats.totalMinutes, 90);
  assert.equal(stats.ready, false);
  assert.equal(stats.recentDays.length, 30);
  assert.deepEqual(stats.recentDays[0], { date: '2026-06-07', count: 2, minutes: 75 });
  assert.deepEqual(stats.recentDays.at(-1), { date: '2026-07-06', count: 1, minutes: 15 });
  assert.equal(trackingStats(profile, [activity('2026-05-31', 'running')], '2026-06-05').sessionCount, 0);
});

test('checks for enough distinct days and sport-specific observations', () => {
  const fourSessions = [
    activity('2026-06-06', 'strength'),
    activity('2026-06-06', 'running'),
    activity('2026-06-06', 'cycling'),
    activity('2026-06-07', 'running'),
  ];
  const stats = trackingStats(profile, fourSessions, '2026-06-30');
  assert.equal(stats.sessionCount, 4);
  assert.equal(stats.activeDays, 2);
  assert.equal(stats.primaryCount, 1);
  assert.equal(stats.blockers.length, 2);
  assert.equal(stats.ready, false);
});

test('prioritizes the main sport and gives the supplement a purpose', () => {
  const history = Array.from({ length: 14 }, (_, index) => (
    activity(dateShift('2026-06-02', index * 2), index % 2 ? 'strength' : 'running', 50, 7)
  ));
  const plan = buildPlan(profile, history, '2026-06-30');
  const training = plan.week.filter(row => row.sport !== null);
  assert.equal(plan.ready, true);
  assert.equal(plan.week.length, 7);
  assert.equal(plan.week[0].date, '2026-07-01');
  assert.equal(plan.week.at(-1).date, '2026-07-07');
  assert.deepEqual(training.map(row => row.sport), ['strength', 'cycling', 'strength']);
  assert.ok(training.every(row => profile.days.includes(new Date(`${row.date}T00:00:00Z`).getUTCDay())));
  assert.ok(training.every(row => row.purpose && row.details.length && row.duration > 0));
  assert.ok(training[1].effort <= 4);
  assert.ok(training.reduce((sum, row) => sum + row.duration, 0) <= 700 * 7 / 30);
  assert.equal(plan.week.filter(row => row.sport === null && row.duration === 0).length, 4);
});

test('includes a supplement for a sparse routine when two slots fit', () => {
  const plan = buildPlan({ ...profile, days: [3, 4] }, enough, '2026-06-30');
  assert.deepEqual(plan.week.filter(row => row.sport).map(row => row.sport), ['strength', 'cycling']);
  assert.ok(plan.week[1].effort <= 4);
});

test('varies primary training focus and keeps time blocks within each session', () => {
  const history = Array.from({ length: 14 }, (_, index) => (
    activity(dateShift('2026-06-02', index * 2), 'crossfit', 40, 7)
  ));
  const { week } = buildPlan({ ...profile, primarySport: 'crossfit' }, history, '2026-06-30');
  const [first, complement, second] = week.filter(row => row.sport);
  assert.equal(first.sport, 'crossfit');
  assert.equal(second.sport, 'crossfit');
  assert.match(first.details[1], /اسکوات وزن بدن/);
  assert.match(second.details[1], /ددلیفت با کتل‌بل سبک/);
  assert.notEqual(first.purpose, second.purpose);
  assert.match(complement.details.at(-1), /همان مسیر و در شرایط و شدت مشابه/);

  for (const session of [first, complement, second]) {
    const blocks = session.details.slice(0, -1);
    assert.equal(blocks.length, 4);
    const total = blocks.reduce((sum, block) => {
      const [minutes] = block.split(' دقیقه.');
      return sum + Number(minutes.replace(/[۰-۹]/g, digit => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit))));
    }, 0);
    assert.equal(total, session.duration);
  }
});

test('requires at least one available weekday for a plan', () => {
  const plan = buildPlan({ ...profile, days: [] }, enough, '2026-06-30');
  assert.equal(plan.ready, false);
  assert.equal(plan.week.length, 0);
  assert.ok(plan.reason);
});
