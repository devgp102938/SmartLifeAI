/**
 * testDailyCheckIn.js
 *
 * Dependency-free test suite for calculateDailyCheckInAnalytics.js.
 * Run with:  node testDailyCheckIn.js
 *       or:  nodemon testDailyCheckIn.js
 *
 * Uses only Node's built-in `assert` module. Exits with code 1 on any
 * failure so nodemon/CI can detect it.
 */
 
const assert = require('assert/strict');
const {
  calculateDailyCheckInAnalytics,
  normalizeDate,
  getCalendarDatesInRange,
  getActiveCheckIns,
  buildNormalizedCheckIns,
  calculateAverages,
  calculateMoodDistribution,
  getCountableDays,
  calculateMissingDaysCount,
  calculateConsistencyRate,
  calculateReflectionMetrics,
} = require('./utils/calculateDailyCheckInAnalytics.js');
 
// ─────────────────────────────────────────────────────────────────────────
// Tiny test harness
// ─────────────────────────────────────────────────────────────────────────
 
let passed = 0;
let failed = 0;
 
function section(name) {
  console.log(`\n${name}`);
}
 
function test(name, fn) {
  try {
    fn();
    console.log(`  \x1b[32m✓\x1b[0m ${name}`);
    passed++;
  } catch (err) {
    console.log(`  \x1b[31m✗\x1b[0m ${name}`);
    console.log(`      ${err.message}`);
    failed++;
  }
}
 
// ─────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────
 
const TZ = 'UTC';
let idCounter = 0;
 
function makeCheckIn(overrides = {}) {
  idCounter += 1;
  return {
    _id: `checkin_${idCounter}`,
    date: '2026-07-10',
    moodScore: 3,
    mood: 'neutral',
    energy: 3,
    productivity: 3,
    reflection: '',
    isDeleted: false,
    deletedAt: null,
    ...overrides,
  };
}
 
const PERIOD = { start: '2026-07-01', end: '2026-07-31' };
const TODAY = '2026-07-15T09:00:00Z'; // "today" = 2026-07-15, day still in progress
 
// ═══════════════════════════════════════════════════════════════════════
// 1. Input validation
// ═══════════════════════════════════════════════════════════════════════
section('1. Input validation');
 
test('throws if checkIns is not an array', () => {
  assert.throws(() =>
    calculateDailyCheckInAnalytics({ checkIns: null, period: PERIOD, timezone: TZ, today: TODAY })
  );
});
 
test('throws if period is missing start/end', () => {
  assert.throws(() =>
    calculateDailyCheckInAnalytics({ checkIns: [], period: { start: '2026-07-01' }, timezone: TZ, today: TODAY })
  );
});
 
test('throws if timezone is missing', () => {
  assert.throws(() =>
    calculateDailyCheckInAnalytics({ checkIns: [], period: PERIOD, timezone: null, today: TODAY })
  );
});
 
test('throws if today is missing', () => {
  assert.throws(() =>
    calculateDailyCheckInAnalytics({ checkIns: [], period: PERIOD, timezone: TZ, today: null })
  );
});
 
test('throws if period.start is after period.end', () => {
  assert.throws(() =>
    calculateDailyCheckInAnalytics({
      checkIns: [], period: { start: '2026-07-31', end: '2026-07-01' }, timezone: TZ, today: TODAY,
    })
  );
});
 
test('normalizeDate throws on an invalid date string', () => {
  assert.throws(() => normalizeDate('not-a-date', TZ));
});
 
test('normalizeDate returns null for null/undefined', () => {
  assert.equal(normalizeDate(null, TZ), null);
  assert.equal(normalizeDate(undefined, TZ), null);
});
 
// ═══════════════════════════════════════════════════════════════════════
// 2. Active check-in population
// ═══════════════════════════════════════════════════════════════════════
section('2. Active check-in population');
 
test('includes a check-in dated inside the period', () => {
  const result = getActiveCheckIns([makeCheckIn({ date: '2026-07-15' })], PERIOD, TZ);
  assert.equal(result.length, 1);
});
 
test('excludes a check-in dated before the period', () => {
  const result = getActiveCheckIns([makeCheckIn({ date: '2026-06-30' })], PERIOD, TZ);
  assert.equal(result.length, 0);
});
 
test('excludes a check-in dated after the period', () => {
  const result = getActiveCheckIns([makeCheckIn({ date: '2026-08-01' })], PERIOD, TZ);
  assert.equal(result.length, 0);
});
 
test('includes check-ins exactly on the period boundaries', () => {
  const result = getActiveCheckIns(
    [makeCheckIn({ date: '2026-07-01' }), makeCheckIn({ date: '2026-07-31' })],
    PERIOD, TZ
  );
  assert.equal(result.length, 2);
});
 
test('excludes a soft-deleted check-in even if in-period', () => {
  const result = getActiveCheckIns(
    [makeCheckIn({ date: '2026-07-15', isDeleted: true, deletedAt: '2026-07-16' })],
    PERIOD, TZ
  );
  assert.equal(result.length, 0);
});
 
test('excludes a check-in with no date field defensively', () => {
  const result = getActiveCheckIns([makeCheckIn({ date: undefined })], PERIOD, TZ);
  assert.equal(result.length, 0);
});
 
// ═══════════════════════════════════════════════════════════════════════
// 3. Restore/overwrite semantics (single active doc per day)
// ═══════════════════════════════════════════════════════════════════════
section('3. Restore/overwrite semantics');
 
test('a restored (previously-deleted, now active) check-in is treated like any normal active one', () => {
  // Simulates: originally created, deleted, then recreated same day -> the
  // Mongo layer overwrites the same doc, so the calculator only ever sees
  // ONE active record for that date with isDeleted:false.
  const restored = makeCheckIn({ date: '2026-07-12', isDeleted: false, deletedAt: null, mood: 'calm' });
  const result = calculateDailyCheckInAnalytics({ checkIns: [restored], period: PERIOD, timezone: TZ, today: TODAY });
  assert.equal(result.summary.totalCheckIns, 1);
  assert.equal(result.checkInBreakdown[0].mood, 'calm');
});
 
// ═══════════════════════════════════════════════════════════════════════
// 4. Averages
// ═══════════════════════════════════════════════════════════════════════
section('4. Averages');
 
test('averages are computed correctly across active check-ins', () => {
  const normalized = buildNormalizedCheckIns([
    makeCheckIn({ moodScore: 5, energy: 4, productivity: 3 }),
    makeCheckIn({ moodScore: 1, energy: 2, productivity: 3 }),
  ]);
  const { averageMood, averageEnergy, averageProductivity } = calculateAverages(normalized);
  assert.equal(averageMood, 3);
  assert.equal(averageEnergy, 3);
  assert.equal(averageProductivity, 3);
});
 
test('averages are null when there are no active check-ins', () => {
  const { averageMood, averageEnergy, averageProductivity } = calculateAverages([]);
  assert.equal(averageMood, null);
  assert.equal(averageEnergy, null);
  assert.equal(averageProductivity, null);
});
 
test('averages handle a single check-in (average = its own value)', () => {
  const normalized = buildNormalizedCheckIns([makeCheckIn({ moodScore: 4, energy: 5, productivity: 2 })]);
  const { averageMood } = calculateAverages(normalized);
  assert.equal(averageMood, 4);
});
 
// ═══════════════════════════════════════════════════════════════════════
// 5. Mood distribution
// ═══════════════════════════════════════════════════════════════════════
section('5. Mood distribution');
 
test('all 9 mood categories are always present, unused ones at 0', () => {
  const normalized = buildNormalizedCheckIns([makeCheckIn({ mood: 'happy' })]);
  const dist = calculateMoodDistribution(normalized);
  assert.equal(Object.keys(dist).length, 9);
  assert.equal(dist.happy, 1);
  assert.equal(dist.stressed, 0);
});
 
test('counts multiple check-ins with the same mood correctly', () => {
  const normalized = buildNormalizedCheckIns([
    makeCheckIn({ date: '2026-07-01', mood: 'sad' }),
    makeCheckIn({ date: '2026-07-02', mood: 'sad' }),
    makeCheckIn({ date: '2026-07-03', mood: 'excited' }),
  ]);
  const dist = calculateMoodDistribution(normalized);
  assert.equal(dist.sad, 2);
  assert.equal(dist.excited, 1);
});
 
test('empty check-in list still returns all 9 categories at 0', () => {
  const dist = calculateMoodDistribution([]);
  assert.deepEqual(Object.values(dist).every((v) => v === 0), true);
  assert.equal(Object.keys(dist).length, 9);
});
 
// ═══════════════════════════════════════════════════════════════════════
// 6. Consistency rate
// ═══════════════════════════════════════════════════════════════════════
section('6. Consistency rate');
 
test('consistencyRate = totalCheckIns / expectedDays * 100', () => {
  assert.equal(calculateConsistencyRate(3, 4), 75);
});
 
test('consistencyRate is null when expectedDays is 0', () => {
  assert.equal(calculateConsistencyRate(0, 0), null);
});
 
test('consistencyRate can exceed 100% if today already has a check-in (documented edge case)', () => {
  // today (07-15) is excluded from expectedDays, but a check-in dated today
  // still counts toward totalCheckIns -> can push rate over 100%.
  const checkIns = [];
  for (let d = 1; d <= 14; d++) {
    checkIns.push(makeCheckIn({ date: `2026-07-${String(d).padStart(2, '0')}` }));
  }
  checkIns.push(makeCheckIn({ date: '2026-07-15' })); // today, already checked in
  const result = calculateDailyCheckInAnalytics({
    checkIns, period: { start: '2026-07-01', end: '2026-07-15' }, timezone: TZ, today: TODAY,
  });
  // expectedDays = 14 (07-01..07-14, today excluded), totalCheckIns = 15
  assert.equal(result.summary.totalCheckIns, 15);
  assert.ok(result.summary.consistencyRate > 100);
});
 
// ═══════════════════════════════════════════════════════════════════════
// 7. Missing days
// ═══════════════════════════════════════════════════════════════════════
section('7. Missing days');
 
test('a countable day with no check-in counts as missing', () => {
  const countableDays = getCountableDays(PERIOD, TODAY, TZ);
  const missing = calculateMissingDaysCount([], countableDays);
  assert.equal(missing, countableDays.length);
});
 
test('today is never counted as missing, even with no check-in yet', () => {
  const countableDays = getCountableDays({ start: '2026-07-15', end: '2026-07-15' }, TODAY, TZ);
  assert.equal(countableDays.length, 0); // today itself never becomes "countable"
});
 
test('future dates within the period are never counted as missing', () => {
  const countableDays = getCountableDays({ start: '2026-07-16', end: '2026-07-20' }, TODAY, TZ);
  assert.equal(countableDays.length, 0);
});
 
test('a fully checked-in countable range has 0 missing days', () => {
  const checkIns = [];
  for (let d = 1; d <= 14; d++) {
    checkIns.push(makeCheckIn({ date: `2026-07-${String(d).padStart(2, '0')}` }));
  }
  const result = calculateDailyCheckInAnalytics({
    checkIns, period: { start: '2026-07-01', end: '2026-07-14' }, timezone: TZ, today: TODAY,
  });
  assert.equal(result.summary.missingDays, 0);
});
 
// ═══════════════════════════════════════════════════════════════════════
// 8. Trend
// ═══════════════════════════════════════════════════════════════════════
section('8. Trend');
 
test('trend is sorted chronologically regardless of input order', () => {
  const result = calculateDailyCheckInAnalytics({
    checkIns: [
      makeCheckIn({ date: '2026-07-20' }),
      makeCheckIn({ date: '2026-07-03' }),
      makeCheckIn({ date: '2026-07-10' }),
    ],
    period: PERIOD, timezone: TZ, today: TODAY,
  });
  assert.deepEqual(result.trend.map((t) => t.date), ['2026-07-03', '2026-07-10', '2026-07-20']);
});
 
test('trend entries have exactly date, mood, moodScore, energy, productivity', () => {
  const result = calculateDailyCheckInAnalytics({
    checkIns: [makeCheckIn({ date: '2026-07-05' })], period: PERIOD, timezone: TZ, today: TODAY,
  });
  assert.deepEqual(
    Object.keys(result.trend[0]).sort(),
    ['date', 'energy', 'mood', 'moodScore', 'productivity']
  );
});
 
test('empty check-ins produces an empty trend', () => {
  const result = calculateDailyCheckInAnalytics({ checkIns: [], period: PERIOD, timezone: TZ, today: TODAY });
  assert.deepEqual(result.trend, []);
});
 
// ═══════════════════════════════════════════════════════════════════════
// 9. Reflection metrics  (previously-buggy area — extra scrutiny here)
// ═══════════════════════════════════════════════════════════════════════
section('9. Reflection metrics');
 
test('reflectionRate is 0 (not null) when check-ins exist but none have reflections', () => {
  const result = calculateDailyCheckInAnalytics({
    checkIns: [makeCheckIn({ date: '2026-07-05', reflection: '' }), makeCheckIn({ date: '2026-07-06', reflection: '   ' })],
    period: PERIOD, timezone: TZ, today: TODAY,
  });
  assert.equal(result.reflectionMetrics.totalReflections, 0);
  assert.equal(result.reflectionMetrics.reflectionRate, 0);
});
 
test('reflectionRate is null only when there are zero check-ins at all', () => {
  const { reflectionRate } = calculateReflectionMetrics([], 0);
  assert.equal(reflectionRate, null);
});
 
test('whitespace-only reflection does not count as a real reflection', () => {
  const normalized = buildNormalizedCheckIns([makeCheckIn({ reflection: '   ' })]);
  assert.equal(normalized[0].hasReflection, false);
});
 
test('reflectionRate = totalReflections / totalCheckIns * 100', () => {
  const result = calculateDailyCheckInAnalytics({
    checkIns: [
      makeCheckIn({ date: '2026-07-05', reflection: 'good day' }),
      makeCheckIn({ date: '2026-07-06', reflection: '' }),
      makeCheckIn({ date: '2026-07-07', reflection: '' }),
      makeCheckIn({ date: '2026-07-08', reflection: '' }),
    ],
    period: PERIOD, timezone: TZ, today: TODAY,
  });
  assert.equal(result.reflectionMetrics.totalReflections, 1);
  assert.equal(result.reflectionMetrics.reflectionRate, 25);
});
 
// ═══════════════════════════════════════════════════════════════════════
// 10. Check-in breakdown  (previously-buggy area — extra scrutiny here)
// ═══════════════════════════════════════════════════════════════════════
section('10. Check-in breakdown');
 
test('breakdown entries have exactly date, mood, moodScore, energy, productivity, hasReflection', () => {
  const result = calculateDailyCheckInAnalytics({
    checkIns: [makeCheckIn({ date: '2026-07-05', reflection: 'x' })], period: PERIOD, timezone: TZ, today: TODAY,
  });
  assert.deepEqual(
    Object.keys(result.checkInBreakdown[0]).sort(),
    ['date', 'energy', 'hasReflection', 'mood', 'moodScore', 'productivity']
  );
});
 
test('hasReflection is a real boolean, true when reflection has content', () => {
  const result = calculateDailyCheckInAnalytics({
    checkIns: [makeCheckIn({ date: '2026-07-05', reflection: 'had a good day' })], period: PERIOD, timezone: TZ, today: TODAY,
  });
  assert.equal(result.checkInBreakdown[0].hasReflection, true);
});
 
test('hasReflection is false when reflection is empty', () => {
  const result = calculateDailyCheckInAnalytics({
    checkIns: [makeCheckIn({ date: '2026-07-05', reflection: '' })], period: PERIOD, timezone: TZ, today: TODAY,
  });
  assert.equal(result.checkInBreakdown[0].hasReflection, false);
});
 
// ═══════════════════════════════════════════════════════════════════════
// 11. Timezone
// ═══════════════════════════════════════════════════════════════════════
section('11. Timezone');
 
test('normalizeDate is deterministic: same input + same timezone always yields the same calendar date', () => {
  const a = normalizeDate('2026-07-01T12:00:00Z', 'America/New_York');
  const b = normalizeDate('2026-07-01T12:00:00Z', 'America/New_York');
  assert.equal(a, b);
});
 
test('a midday-UTC timestamp normalizes to the same calendar date across timezones close to UTC', () => {
  // Noon UTC is far enough from midnight that most timezones agree on the
  // calendar date -- unlike a UTC-midnight timestamp, which by definition
  // sits on the timezone boundary and WILL disagree (see the known edge
  // case test below).
  const utc = normalizeDate('2026-07-01T12:00:00Z', 'UTC');
  const ny = normalizeDate('2026-07-01T12:00:00Z', 'America/New_York'); // 08:00 local, still July 1
  assert.equal(utc, '2026-07-01');
  assert.equal(ny, '2026-07-01');
});
 
test('KNOWN EDGE CASE: a bare "YYYY-MM-DD" period boundary shifts backward a day in negative-UTC-offset timezones', () => {
  // new Date('2026-07-01') is parsed as UTC midnight. Converting that instant
  // into America/New_York (UTC-4 in July) lands on the PREVIOUS calendar day.
  // This means bare date-only period/today inputs are NOT timezone-safe --
  // always pass full ISO timestamps (or a UTC offset) for period.start,
  // period.end, and today when timezone is not UTC.
  const bareDateUtc = normalizeDate('2026-07-01', 'UTC');
  const bareDateNy = normalizeDate('2026-07-01', 'America/New_York');
  assert.equal(bareDateUtc, '2026-07-01');
  assert.equal(bareDateNy, '2026-06-30'); // documented current behavior, not a bug fix target
});
 
test('"today" near a timezone day-boundary resolves to different calendar dates in different zones', () => {
  const instant = '2026-07-11T02:30:00Z'; // still 07-10 evening in America/New_York (UTC-4 in July)
  const utcToday = normalizeDate(instant, 'UTC');
  const nyToday = normalizeDate(instant, 'America/New_York');
  assert.equal(utcToday, '2026-07-11');
  assert.equal(nyToday, '2026-07-10');
});
 
test('checkIn.date itself is NOT re-interpreted by timezone (used as plain string)', () => {
  // Even in a very different timezone, a check-in dated '2026-07-15' should
  // still land in the period as 2026-07-15 -- no shifting.
  const result = calculateDailyCheckInAnalytics({
    checkIns: [makeCheckIn({ date: '2026-07-15' })],
    period: PERIOD, timezone: 'Pacific/Kiritimati', today: TODAY, // UTC+14, extreme zone
  });
  assert.equal(result.checkInBreakdown[0].date, '2026-07-15');
});
 
// ═══════════════════════════════════════════════════════════════════════
// 12. Zero / null cases
// ═══════════════════════════════════════════════════════════════════════
section('12. Zero / null cases');
 
test('empty checkIns array produces totalCheckIns 0 and null averages', () => {
  const result = calculateDailyCheckInAnalytics({ checkIns: [], period: PERIOD, timezone: TZ, today: TODAY });
  assert.equal(result.summary.totalCheckIns, 0);
  assert.equal(result.summary.averageMood, null);
});
 
test('period entirely in the future produces consistencyRate null and missingDays 0', () => {
  const result = calculateDailyCheckInAnalytics({
    checkIns: [], period: { start: '2026-08-01', end: '2026-08-05' }, timezone: TZ, today: TODAY,
  });
  assert.equal(result.summary.consistencyRate, null);
  assert.equal(result.summary.missingDays, 0);
});
 
test('a single-day period that IS today produces expectedDays 0 (not yet ended)', () => {
  const result = calculateDailyCheckInAnalytics({
    checkIns: [], period: { start: '2026-07-15', end: '2026-07-15' }, timezone: TZ, today: TODAY,
  });
  assert.equal(result.summary.consistencyRate, null);
  assert.equal(result.summary.missingDays, 0);
});
 
// ═══════════════════════════════════════════════════════════════════════
// 13. Output contract
// ═══════════════════════════════════════════════════════════════════════
section('13. Output contract');
 
test('top-level result has exactly period, summary, moodDistribution, trend, reflectionMetrics, checkInBreakdown', () => {
  const result = calculateDailyCheckInAnalytics({ checkIns: [], period: PERIOD, timezone: TZ, today: TODAY });
  assert.deepEqual(
    Object.keys(result).sort(),
    ['checkInBreakdown', 'moodDistribution', 'period', 'reflectionMetrics', 'summary', 'trend']
  );
});
 
test('summary has exactly the locked field set', () => {
  const result = calculateDailyCheckInAnalytics({ checkIns: [], period: PERIOD, timezone: TZ, today: TODAY });
  assert.deepEqual(
    Object.keys(result.summary).sort(),
    ['averageEnergy', 'averageMood', 'averageProductivity', 'consistencyRate', 'missingDays', 'totalCheckIns'].sort()
  );
});
 
test('reflectionMetrics has exactly totalReflections and reflectionRate', () => {
  const result = calculateDailyCheckInAnalytics({ checkIns: [], period: PERIOD, timezone: TZ, today: TODAY });
  assert.deepEqual(Object.keys(result.reflectionMetrics).sort(), ['reflectionRate', 'totalReflections']);
});
 
test('period.start/end are calendar-date strings (YYYY-MM-DD)', () => {
  const result = calculateDailyCheckInAnalytics({ checkIns: [], period: PERIOD, timezone: TZ, today: TODAY });
  assert.match(result.period.start, /^\d{4}-\d{2}-\d{2}$/);
  assert.match(result.period.end, /^\d{4}-\d{2}-\d{2}$/);
});
 
// ─────────────────────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────────────────────
 
console.log(`\n${'─'.repeat(50)}`);
console.log(`${passed} passed, ${failed} failed`);
console.log('─'.repeat(50));
 
process.exitCode = failed > 0 ? 1 : 0;
 
