'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

// Change this if your implementation has a different filename/path.
// Example:
// const { calculateMedicineCompliance } = require('../utils/calculateMedicineCompliance');
const {
  calculateMedicineCompliance,
} = require('./utils/calculateMedicineCompliance.js')

const TZ = 'Asia/Kolkata';

function medicine(overrides = {}) {
  return {
    id: 'med-1',
    name: 'Medicine A',
    startDate: '2026-08-10',
    endDate: '2026-08-20',
    isDeleted: false,
    deletedAt: null,
    ...overrides,
  };
}

function schedule(overrides = {}) {
  return {
    id: 'sch-1',
    medicineId: 'med-1',
    times: ['08:00', '20:00'],
    scheduleType: 'daily',
    daysOfWeek: [],
    effectiveFrom: '2026-08-10',
    effectiveUntil: null,
    version: 1,
    ...overrides,
  };
}

function log(overrides = {}) {
  return {
    medicineId: 'med-1',
    scheduleId: 'sch-1',
    scheduledDate: '2026-08-15',
    scheduledTime: '08:00',
    status: 'taken',
    ...overrides,
  };
}

function run({
  medicines = [medicine()],
  schedules = [schedule()],
  logs = [],
  periodStart = '2026-08-10',
  periodEnd = '2026-08-15',
  now = new Date('2026-08-15T12:00:00+05:30'),
  timezone = TZ,
} = {}) {
  return calculateMedicineCompliance({
    medicines,
    schedules,
    logs,
    periodStart,
    periodEnd,
    now,
    timezone,
  });
}

/**
 * 1. Input validation
 */
test('1. Input validation', () => {
  assert.throws(
    () =>
      calculateMedicineCompliance({
        medicines: [],
        schedules: [],
        logs: [],
        periodStart: '2026-08-10',
        periodEnd: '2026-08-15',
        now: new Date('2026-08-15T12:00:00+05:30'),
      }),
    /Timezone is required/
  );

  assert.throws(
    () =>
      calculateMedicineCompliance({
        medicines: [],
        schedules: [],
        logs: [],
        periodStart: '2026-08-10',
        periodEnd: '2026-08-15',
        timezone: TZ,
      }),
    /Now is required/
  );

  assert.throws(
    () =>
      calculateMedicineCompliance({
        medicines: [],
        schedules: [],
        logs: [],
        periodStart: 'not-a-date',
        periodEnd: '2026-08-15',
        now: new Date('2026-08-15T12:00:00+05:30'),
        timezone: TZ,
      }),
    /invalid date/i
  );
});

/**
 * 2. Daily schedule
 */
test('2. Daily schedule creates doses on every applicable day', () => {
  const result = run({
    periodStart: '2026-08-10',
    periodEnd: '2026-08-12',
    now: new Date('2026-08-12T21:00:00+05:30'),
    schedules: [
      schedule({
        times: ['08:00', '20:00'],
      }),
    ],
  });

  assert.equal(result.summary.expectedDoses, 6);
  assert.equal(result.summary.missedDoses, 6);

  assert.deepEqual(
    result.trend.map(x => [x.date, x.expected]),
    [
      ['2026-08-10', 2],
      ['2026-08-11', 2],
      ['2026-08-12', 2],
    ]
  );
});

/**
 * 3. Specific-day schedule
 */
test('3. Specific-day schedule only creates doses on selected weekdays', () => {
  // 2026-08-10 Monday
  // 2026-08-11 Tuesday
  // 2026-08-12 Wednesday
  // 2026-08-13 Thursday
  // 2026-08-14 Friday
  // 2026-08-15 Saturday
  // 2026-08-16 Sunday
  const result = run({
    periodStart: '2026-08-10',
    periodEnd: '2026-08-16',
    now: new Date('2026-08-16T23:00:00+05:30'),
    schedules: [
      schedule({
        times: ['09:00'],
        scheduleType: 'specific-days',
        daysOfWeek: ['monday', 'wednesday', 'friday'],
      }),
    ],
  });

  assert.equal(result.summary.expectedDoses, 3);

  assert.deepEqual(
    result.trend
      .filter(x => x.expected > 0)
      .map(x => x.date),
    ['2026-08-10', '2026-08-12', '2026-08-14']
  );
});

/**
 * 4. Medicine boundaries
 */
test('4. Medicine boundaries exclude dates before start and after end', () => {
  const result = run({
    medicines: [
      medicine({
        startDate: '2026-08-12',
        endDate: '2026-08-14',
      }),
    ],
    periodStart: '2026-08-10',
    periodEnd: '2026-08-16',
    now: new Date('2026-08-16T23:00:00+05:30'),
  });

  assert.equal(result.summary.expectedDoses, 6);

  assert.deepEqual(
    result.trend.map(x => [x.date, x.expected]),
    [
      ['2026-08-10', 0],
      ['2026-08-11', 0],
      ['2026-08-12', 2],
      ['2026-08-13', 2],
      ['2026-08-14', 2],
      ['2026-08-15', 0],
      ['2026-08-16', 0],
    ]
  );
});

/**
 * 5. Schedule versioning
 */
test('5. Schedule versioning uses the schedule version effective on each date', () => {
  const result = run({
    periodStart: '2026-08-10',
    periodEnd: '2026-08-14',
    now: new Date('2026-08-14T23:00:00+05:30'),
    schedules: [
      schedule({
        id: 'sch-v1',
        times: ['08:00'],
        effectiveFrom: '2026-08-10',
        effectiveUntil: '2026-08-12',
        version: 1,
      }),
      schedule({
        id: 'sch-v2',
        times: ['20:00'],
        effectiveFrom: '2026-08-13',
        effectiveUntil: null,
        version: 2,
      }),
    ],
    logs: [
      log({
        scheduleId: 'sch-v1',
        scheduledDate: '2026-08-11',
        scheduledTime: '08:00',
        status: 'taken',
      }),
      log({
        scheduleId: 'sch-v2',
        scheduledDate: '2026-08-13',
        scheduledTime: '20:00',
        status: 'taken',
      }),
    ],
  });

  assert.equal(result.summary.expectedDoses, 5);
  assert.equal(result.summary.takenDoses, 2);
  assert.equal(result.summary.missedDoses, 3);
});

/**
 * 6. Schedule boundary transitions
 */
test('6. Schedule boundary transition does not apply old schedule after effectiveUntil', () => {
  const result = run({
    periodStart: '2026-08-12',
    periodEnd: '2026-08-14',
    now: new Date('2026-08-14T23:00:00+05:30'),
    schedules: [
      schedule({
        id: 'old',
        times: ['08:00'],
        effectiveFrom: '2026-08-10',
        effectiveUntil: '2026-08-13',
        version: 1,
      }),
      schedule({
        id: 'new',
        times: ['12:00', '18:00'],
        effectiveFrom: '2026-08-14',
        effectiveUntil: null,
        version: 2,
      }),
    ],
  });

  assert.equal(result.summary.expectedDoses, 4);

  assert.deepEqual(
    result.trend.map(x => x.expected),
    [1, 1, 2]
  );
});

/**
 * 7. Log matching
 */
test('7. Log matching requires medicine + schedule + date + time identity', () => {
  const result = run({
    periodStart: '2026-08-15',
    periodEnd: '2026-08-15',
    now: new Date('2026-08-15T21:00:00+05:30'),
    schedules: [
      schedule({
        times: ['08:00', '20:00'],
      }),
    ],
    logs: [
      log({
        scheduledTime: '08:00',
        status: 'taken',
      }),
      // Wrong scheduledTime: must not match 20:00.
      log({
        scheduledTime: '09:00',
        status: 'taken',
      }),
      // Wrong schedule ID: must not match either dose.
      log({
        scheduleId: 'wrong-schedule',
        scheduledTime: '20:00',
        status: 'taken',
      }),
    ],
  });

  assert.equal(result.summary.expectedDoses, 2);
  assert.equal(result.summary.takenDoses, 1);
  assert.equal(result.summary.missedDoses, 1);
});

/**
 * 8. Today classification
 */
test('8. Today classification separates taken, skipped and due-unlogged', () => {
  const result = run({
    periodStart: '2026-08-15',
    periodEnd: '2026-08-15',
    now: new Date('2026-08-15T12:00:00+05:30'),
    schedules: [
      schedule({
        times: ['08:00', '10:00', '20:00'],
      }),
    ],
    logs: [
      log({
        scheduledTime: '08:00',
        status: 'taken',
      }),
      log({
        scheduledTime: '10:00',
        status: 'skipped',
      }),
    ],
  });

  assert.equal(result.summary.expectedDoses, 2);
  assert.equal(result.summary.takenDoses, 1);
  assert.equal(result.summary.skippedDoses, 1);
  assert.equal(result.summary.dueUnloggedDoses, 0);
  assert.equal(result.summary.missedDoses, 0);

  // 20:00 is future and therefore excluded.
});

/**
 * 9. Future doses
 */
test('9. Future doses are excluded from expected doses', () => {
  const result = run({
    periodStart: '2026-08-15',
    periodEnd: '2026-08-17',
    now: new Date('2026-08-15T10:00:00+05:30'),
    schedules: [
      schedule({
        times: ['08:00', '12:00', '20:00'],
      }),
    ],
  });

  // 08:00 today is due.
  // 12:00 and 20:00 today are future.
  // All of tomorrow/tomorrow+1 are future.
  assert.equal(result.summary.expectedDoses, 1);
  assert.equal(result.summary.dueUnloggedDoses, 1);
});

/**
 * 10. Historical missed doses
 */
test('10. Historical unlogged doses are classified as missed', () => {
  const result = run({
    periodStart: '2026-08-13',
    periodEnd: '2026-08-15',
    now: new Date('2026-08-15T12:00:00+05:30'),
    schedules: [
      schedule({
        times: ['08:00'],
      }),
    ],
    logs: [],
  });

  // Aug 13 + Aug 14 = missed.
  // Aug 15 08:00 = dueUnlogged.
  assert.equal(result.summary.expectedDoses, 3);
  assert.equal(result.summary.missedDoses, 2);
  assert.equal(result.summary.dueUnloggedDoses, 1);
});

/**
 * 11. Timezones
 */
test('11. Timezone uses the IANA timezone for both calendar day and clock time', () => {
  // UTC date = Aug 15.
  // India date = Aug 16 at 05:00.
  const now = new Date('2026-08-15T23:30:00Z');

  const result = run({
    periodStart: '2026-08-15',
    periodEnd: '2026-08-16',
    now,
    schedules: [
      schedule({
        times: ['04:00', '08:00'],
      }),
    ],
  });

  assert.equal(result.period.startDate, '2026-08-15');
  assert.equal(result.period.endDate, '2026-08-16');

  // In Asia/Kolkata:
  // today = 2026-08-16
  // 04:00 has already happened
  // 08:00 is future
  assert.equal(result.summary.expectedDoses, 1);
  assert.equal(result.summary.dueUnloggedDoses, 1);

  assert.equal(
    result.trend[result.trend.length - 1].date,
    '2026-08-16'
  );
});

/**
 * 12. Adherence
 */
test('12. Adherence is taken / expected * 100', () => {
  const result = run({
    periodStart: '2026-08-15',
    periodEnd: '2026-08-15',
    now: new Date('2026-08-15T23:00:00+05:30'),
    schedules: [
      schedule({
        times: ['08:00', '12:00', '20:00', '22:00'],
      }),
    ],
    logs: [
      log({
        scheduledTime: '08:00',
        status: 'taken',
      }),
      log({
        scheduledTime: '12:00',
        status: 'taken',
      }),
      log({
        scheduledTime: '20:00',
        status: 'skipped',
      }),
    ],
  });

  assert.equal(result.summary.expectedDoses, 4);
  assert.equal(result.summary.takenDoses, 2);
  assert.equal(result.summary.skippedDoses, 1);
  assert.equal(result.summary.missedDoses, 1);
  assert.equal(result.summary.adherenceRate, 50);
});

/**
 * 13. Daily trend
 */
test('13. Daily trend includes zero-dose days and stops at today', () => {
  const result = run({
    periodStart: '2026-08-12',
    periodEnd: '2026-08-20',
    now: new Date('2026-08-15T23:00:00+05:30'),
    schedules: [
      schedule({
        times: ['08:00'],
        scheduleType: 'specific-days',
        daysOfWeek: ['monday'],
      }),
    ],
  });

  // Trend must stop at today, not periodEnd.
  assert.deepEqual(
    result.trend.map(x => x.date),
    [
      '2026-08-12',
      '2026-08-13',
      '2026-08-14',
      '2026-08-15',
    ]
  );

  // None of those dates is Monday.
  assert.deepEqual(
    result.trend.map(x => x.expected),
    [0, 0, 0, 0]
  );

  assert.equal(result.trend[0].adherenceRate, null);
});

/**
 * 14. Medicine breakdown
 */
test('14. Medicine breakdown contains every medicine, including zero-dose medicines', () => {
  const result = run({
    medicines: [
      medicine({
        id: 'med-1',
        name: 'Medicine A',
      }),
      medicine({
        id: 'med-2',
        name: 'Upcoming Medicine',
        startDate: '2026-09-01',
        endDate: '2026-09-10',
      }),
    ],
    schedules: [
      schedule({
        id: 'sch-1',
        medicineId: 'med-1',
        times: ['08:00'],
      }),
      schedule({
        id: 'sch-2',
        medicineId: 'med-2',
        times: ['08:00'],
        effectiveFrom: '2026-09-01',
      }),
    ],
    periodStart: '2026-08-15',
    periodEnd: '2026-08-15',
    now: new Date('2026-08-15T23:00:00+05:30'),
    logs: [
      log({
        medicineId: 'med-1',
        scheduleId: 'sch-1',
        scheduledTime: '08:00',
        status: 'taken',
      }),
    ],
  });

  assert.equal(result.medicineBreakdown.length, 2);

  const med1 = result.medicineBreakdown.find(
    x => x.medicineId === 'med-1'
  );
  const med2 = result.medicineBreakdown.find(
    x => x.medicineId === 'med-2'
  );

  assert.equal(med1.name, 'Medicine A');
  assert.equal(med1.expectedDoses, 1);
  assert.equal(med1.takenDoses, 1);
  assert.equal(med1.adherenceRate, 100);
  assert.equal(med1.status, 'active');

  assert.equal(med2.expectedDoses, 0);
  assert.equal(med2.takenDoses, 0);
  assert.equal(med2.adherenceRate, null);
  assert.equal(med2.status, 'upcoming');
});

/**
 * 15. Active medicines
 */
test('15. Active medicines counts only non-deleted medicines within date range', () => {
  const result = run({
    medicines: [
      medicine({
        id: 'active',
        name: 'Active',
        startDate: '2026-08-01',
        endDate: '2026-08-30',
      }),
      medicine({
        id: 'upcoming',
        name: 'Upcoming',
        startDate: '2026-09-01',
        endDate: '2026-09-30',
      }),
      medicine({
        id: 'finished',
        name: 'Finished',
        startDate: '2026-07-01',
        endDate: '2026-08-14',
      }),
      medicine({
        id: 'deleted',
        name: 'Deleted',
        startDate: '2026-08-01',
        endDate: '2026-08-30',
        isDeleted: true,
        deletedAt: '2026-08-15',
      }),
    ],
    schedules: [
      schedule({
        medicineId: 'active',
        id: 's-active',
      }),
      schedule({
        medicineId: 'upcoming',
        id: 's-upcoming',
        effectiveFrom: '2026-09-01',
      }),
      schedule({
        medicineId: 'finished',
        id: 's-finished',
        effectiveFrom: '2026-07-01',
      }),
      schedule({
        medicineId: 'deleted',
        id: 's-deleted',
        effectiveFrom: '2026-08-01',
      }),
    ],
    periodStart: '2026-08-15',
    periodEnd: '2026-08-15',
    now: new Date('2026-08-15T23:00:00+05:30'),
  });

  assert.equal(result.summary.activeMedicines, 1);

  const statuses = Object.fromEntries(
    result.medicineBreakdown.map(x => [x.medicineId, x.status])
  );

  assert.equal(statuses.active, 'active');
  assert.equal(statuses.upcoming, 'upcoming');
  assert.equal(statuses.finished, 'finished');
  assert.equal(statuses.deleted, 'deleted');
});

/**
 * 16. V1 exclusions
 */
test('16. V1 exclusions: future doses, deleted medicines, and post-deletion dates do not count', () => {
  const result = run({
    medicines: [
      medicine({
        id: 'normal',
        name: 'Normal',
      }),
      medicine({
        id: 'deleted',
        name: 'Deleted',
        isDeleted: true,
        deletedAt: '2026-08-14',
      }),
    ],
    schedules: [
      schedule({
        id: 'normal-schedule',
        medicineId: 'normal',
        times: ['08:00', '20:00'],
      }),
      schedule({
        id: 'deleted-schedule',
        medicineId: 'deleted',
        times: ['08:00', '20:00'],
      }),
    ],
    periodStart: '2026-08-10',
    periodEnd: '2026-08-17',
    now: new Date('2026-08-15T12:00:00+05:30'),
    logs: [
      // This belongs to the deleted medicine and should not affect
      // the calculated result.
      log({
        medicineId: 'deleted',
        scheduleId: 'deleted-schedule',
        scheduledDate: '2026-08-15',
        scheduledTime: '08:00',
        status: 'taken',
      }),

      // Wrong medicine ID: must not match normal medicine.
      log({
        medicineId: 'some-other-medicine',
        scheduleId: 'normal-schedule',
        scheduledDate: '2026-08-15',
        scheduledTime: '08:00',
        status: 'taken',
      }),
    ],
  });

  // Normal medicine:
  // Aug 10-14 = 5 days * 2 = 10 historical doses
  // Aug 15 08:00 = due
  // Aug 15 20:00 = future
  // Aug 16-17 = future
  //
  // Therefore only 11 expected/currently due doses are included.
  assert.equal(result.summary.expectedDoses, 11);

  // The fake logs must not make the 08:00 normal dose taken.
  assert.equal(result.summary.takenDoses, 0);

  assert.equal(result.summary.missedDoses, 10);
  assert.equal(result.summary.dueUnloggedDoses, 1);

  const deleted = result.medicineBreakdown.find(
    x => x.medicineId === 'deleted'
  );

  assert.equal(deleted.expectedDoses, 0);
  assert.equal(deleted.takenDoses, 0);
  assert.equal(deleted.status, 'deleted');
});