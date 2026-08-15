'use strict';

const assert = require('node:assert/strict');

const {
    calculateMedicineCompliance,
} = require('./utils/calculateMedicineCompliance.js');

let passed = 0;
let failed = 0;
const failures = [];

// ============================================================
// TEST RUNNER
// ============================================================

function test(name, fn) {
    try {
        fn();
        console.log(`✓ ${name}`);
        passed++;
    } catch (error) {
        console.error(`✗ ${name}`);
        console.error(`  ${error.message}`);

        failures.push({
            name,
            error,
        });

        failed++;
    }
}

function assertThrows(fn, messageContains) {
    assert.throws(fn, (error) => {
        if (messageContains) {
            assert.match(
                error.message,
                new RegExp(escapeRegExp(messageContains), 'i')
            );
        }

        return true;
    });
}

function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ============================================================
// TEST FIXTURES
// ============================================================

function makeMedicine(overrides = {}) {
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

function makeSchedule(overrides = {}) {
    return {
        id: 'schedule-1',
        medicineId: 'med-1',
        times: ['08:00'],
        scheduleType: 'daily',
        daysOfWeek: [],
        effectiveFrom: '2026-08-10',
        effectiveUntil: null,
        version: 1,
        ...overrides,
    };
}

function makeLog(overrides = {}) {
    return {
        medicineId: 'med-1',
        scheduleId: 'schedule-1',
        scheduledDate: '2026-08-14',
        scheduledTime: '08:00',
        status: 'taken',
        ...overrides,
    };
}

function makeInput(overrides = {}) {
    return {
        medicines: [makeMedicine()],
        schedules: [makeSchedule()],
        logs: [],
        periodStart: '2026-08-10',
        periodEnd: '2026-08-15',
        now: new Date('2026-08-15T12:00:00Z'),
        timezone: 'UTC',
        ...overrides,
    };
}

/**
 * Always use this name for executing the calculator.
 *
 * This intentionally avoids naming the helper "result", because one of
 * the old tests declared `const result = ...`, which makes debugging
 * unnecessarily confusing.
 */
function calculate(overrides = {}) {
    return calculateMedicineCompliance(makeInput(overrides));
}

function getMedicineBreakdown(output, medicineId) {
    return output.medicineBreakdown.find(
        (row) => row.medicineId === medicineId
    );
}

function getTrendDay(output, date) {
    return output.trend.find((row) => row.date === date);
}

function trendDates(output) {
    return output.trend.map((row) => row.date);
}

// ============================================================
// 1. INPUT VALIDATION
// ============================================================

console.log('\n1. Input validation');

test('1 - timezone is required', () => {
    assertThrows(
        () => calculate({ timezone: undefined }),
        'Timezone is required'
    );
});

test('1 - now is required', () => {
    assertThrows(
        () => calculate({ now: undefined }),
        'Now is required'
    );
});

test('1 - periodStart is required', () => {
    assertThrows(
        () => calculate({ periodStart: undefined }),
        'periodStart and periodEnd are required'
    );
});

test('1 - periodEnd is required', () => {
    assertThrows(
        () => calculate({ periodEnd: undefined }),
        'periodStart and periodEnd are required'
    );
});

test('1 - invalid periodStart throws', () => {
    assertThrows(
        () => calculate({ periodStart: 'not-a-date' }),
        'invalid date'
    );
});

test('1 - invalid now throws', () => {
    assertThrows(
        () =>
            calculate({
                now: new Date('invalid'),
            }),
        'invalid date'
    );
});

test('1 - invalid plain calendar date 2026-02-31 throws', () => {
    assertThrows(
        () => calculate({ periodStart: '2026-02-31' }),
        'invalid date'
    );
});

test('1 - invalid plain calendar date 2026-04-31 throws', () => {
    assertThrows(
        () => calculate({ periodStart: '2026-04-31' }),
        'invalid date'
    );
});

test('1 - invalid plain calendar date 2026-13-01 throws', () => {
    assertThrows(
        () => calculate({ periodStart: '2026-13-01' }),
        'invalid date'
    );
});

test('1 - invalid plain calendar date 2026-00-10 throws', () => {
    assertThrows(
        () => calculate({ periodStart: '2026-00-10' }),
        'invalid date'
    );
});

test('1 - valid leap-day 2028-02-29 is accepted', () => {
    const output = calculate({
        periodStart: '2028-02-29',
        periodEnd: '2028-02-29',
        now: new Date('2028-02-29T12:00:00Z'),
        medicines: [
            makeMedicine({
                startDate: '2028-02-29',
                endDate: '2028-02-29',
            }),
        ],
        schedules: [
            makeSchedule({
                effectiveFrom: '2028-02-29',
            }),
        ],
    });

    assert.strictEqual(output.period.startDate, '2028-02-29');
    assert.strictEqual(output.period.endDate, '2028-02-29');
});

test('1 - reversed period range is rejected', () => {
    assertThrows(
        () =>
            calculate({
                periodStart: '2026-08-20',
                periodEnd: '2026-08-10',
            }),
        'periodStart must be on or before periodEnd'
    );
});

// ============================================================
// 2. DAILY SCHEDULES
// ============================================================

console.log('\n2. Daily schedules');

test('2 - daily schedule creates one dose per scheduled time per applicable day', () => {
    const output = calculate({
        periodStart: '2026-08-10',
        periodEnd: '2026-08-12',
        now: new Date('2026-08-12T23:00:00Z'),
        schedules: [
            makeSchedule({
                times: ['08:00', '13:00'],
            }),
        ],
    });

    assert.strictEqual(output.summary.expectedDoses, 6);
});

test('2 - daily schedule respects all scheduled times', () => {
    const output = calculate({
        periodStart: '2026-08-10',
        periodEnd: '2026-08-12',
        now: new Date('2026-08-12T23:00:00Z'),
        schedules: [
            makeSchedule({
                times: ['08:00', '13:00', '20:00'],
            }),
        ],
    });

    assert.strictEqual(output.summary.expectedDoses, 9);
});

test('2 - daily schedule excludes future time on today', () => {
    const output = calculate({
        periodStart: '2026-08-15',
        periodEnd: '2026-08-15',
        now: new Date('2026-08-15T14:00:00Z'),
        schedules: [
            makeSchedule({
                times: ['08:00', '13:00', '20:00'],
            }),
        ],
    });

    assert.strictEqual(output.summary.expectedDoses, 2);
});

test('2 - daily schedule supports one scheduled time', () => {
    const output = calculate({
        periodStart: '2026-08-10',
        periodEnd: '2026-08-12',
        now: new Date('2026-08-12T23:00:00Z'),
        schedules: [
            makeSchedule({
                times: ['08:00'],
            }),
        ],
    });

    assert.strictEqual(output.summary.expectedDoses, 3);
});

test('2 - daily schedule with no applicable schedule produces zero doses', () => {
    const output = calculate({
        schedules: [],
        periodStart: '2026-08-10',
        periodEnd: '2026-08-12',
        now: new Date('2026-08-12T23:00:00Z'),
    });

    assert.strictEqual(output.summary.expectedDoses, 0);
});

// ============================================================
// 3. SPECIFIC-DAY SCHEDULES
// ============================================================

console.log('\n3. Specific-day schedules');

test('3 - specific-day schedule only generates doses on configured weekdays', () => {
    // 2026-08-10 Monday
    // 2026-08-11 Tuesday
    // 2026-08-12 Wednesday
    // 2026-08-13 Thursday
    // 2026-08-14 Friday
    // 2026-08-15 Saturday
    //
    // Monday + Wednesday + Friday = 3 doses.
    const output = calculate({
        periodStart: '2026-08-10',
        periodEnd: '2026-08-15',
        now: new Date('2026-08-15T23:00:00Z'),
        schedules: [
            makeSchedule({
                scheduleType: 'specific-days',
                daysOfWeek: ['monday', 'wednesday', 'friday'],
            }),
        ],
    });

    assert.strictEqual(output.summary.expectedDoses, 3);
});

test('3 - specific-day schedule handles uppercase day names', () => {
    const output = calculate({
        periodStart: '2026-08-10',
        periodEnd: '2026-08-15',
        now: new Date('2026-08-15T23:00:00Z'),
        schedules: [
            makeSchedule({
                scheduleType: 'specific-days',
                daysOfWeek: ['MONDAY', 'WEDNESDAY', 'FRIDAY'],
            }),
        ],
    });

    assert.strictEqual(output.summary.expectedDoses, 3);
});

test('3 - specific-day schedule produces zero doses on non-configured days', () => {
    // Tuesday + Wednesday.
    // Configured only Monday + Friday.
    const output = calculate({
        periodStart: '2026-08-11',
        periodEnd: '2026-08-12',
        now: new Date('2026-08-12T23:00:00Z'),
        schedules: [
            makeSchedule({
                scheduleType: 'specific-days',
                daysOfWeek: ['monday', 'friday'],
            }),
        ],
    });

    assert.strictEqual(output.summary.expectedDoses, 0);
});

test('3 - specific-day schedule can generate multiple times on matching days', () => {
    const output = calculate({
        periodStart: '2026-08-10',
        periodEnd: '2026-08-12',
        now: new Date('2026-08-12T23:00:00Z'),
        schedules: [
            makeSchedule({
                scheduleType: 'specific-days',
                daysOfWeek: ['monday', 'wednesday'],
                times: ['08:00', '20:00'],
            }),
        ],
    });

    // Monday = 2, Tuesday = 0, Wednesday = 2.
    assert.strictEqual(output.summary.expectedDoses, 4);
});

// ============================================================
// 4. MEDICINE BOUNDARIES
// ============================================================

console.log('\n4. Medicine boundaries');

test('4 - medicine startDate prevents doses before medicine starts', () => {
    const output = calculate({
        periodStart: '2026-08-08',
        periodEnd: '2026-08-12',
        now: new Date('2026-08-12T23:00:00Z'),
        medicines: [
            makeMedicine({
                startDate: '2026-08-10',
            }),
        ],
    });

    assert.strictEqual(output.summary.expectedDoses, 3);
});

test('4 - medicine endDate prevents doses after medicine ends', () => {
    const output = calculate({
        periodStart: '2026-08-10',
        periodEnd: '2026-08-15',
        now: new Date('2026-08-15T23:00:00Z'),
        medicines: [
            makeMedicine({
                endDate: '2026-08-12',
            }),
        ],
    });

    assert.strictEqual(output.summary.expectedDoses, 3);
});

test('4 - medicine start and end boundary dates are included', () => {
    const output = calculate({
        periodStart: '2026-08-10',
        periodEnd: '2026-08-12',
        now: new Date('2026-08-12T23:00:00Z'),
        medicines: [
            makeMedicine({
                startDate: '2026-08-10',
                endDate: '2026-08-12',
            }),
        ],
    });

    assert.strictEqual(output.summary.expectedDoses, 3);
});

test('4 - medicine starting after the requested period produces zero doses', () => {
    const output = calculate({
        periodStart: '2026-08-10',
        periodEnd: '2026-08-12',
        now: new Date('2026-08-12T23:00:00Z'),
        medicines: [
            makeMedicine({
                startDate: '2026-08-20',
                endDate: '2026-08-30',
            }),
        ],
    });

    assert.strictEqual(output.summary.expectedDoses, 0);
});

test('4 - medicine ending before the requested period produces zero doses', () => {
    const output = calculate({
        periodStart: '2026-08-15',
        periodEnd: '2026-08-20',
        now: new Date('2026-08-20T23:00:00Z'),
        medicines: [
            makeMedicine({
                startDate: '2026-08-01',
                endDate: '2026-08-10',
            }),
        ],
    });

    assert.strictEqual(output.summary.expectedDoses, 0);
});

test('4 - deletedAt cuts off doses after deletion boundary', () => {
    const output = calculate({
        periodStart: '2026-08-10',
        periodEnd: '2026-08-15',
        now: new Date('2026-08-15T23:00:00Z'),
        medicines: [
            makeMedicine({
                isDeleted: true,
                deletedAt: '2026-08-12',
            }),
        ],
    });

    // Aug 10, 11, 12 are included.
    assert.strictEqual(output.summary.expectedDoses, 3);
});

test('4 - deletion boundary date itself is included', () => {
    const output = calculate({
        periodStart: '2026-08-12',
        periodEnd: '2026-08-15',
        now: new Date('2026-08-15T23:00:00Z'),
        medicines: [
            makeMedicine({
                isDeleted: true,
                deletedAt: '2026-08-12',
            }),
        ],
    });

    assert.strictEqual(output.summary.expectedDoses, 1);
});

// ============================================================
// 5. SCHEDULE VERSIONING
// ============================================================

console.log('\n5. Schedule versioning');

test('5 - historical dates use the schedule version effective on that date', () => {
    const output = calculate({
        periodStart: '2026-08-10',
        periodEnd: '2026-08-12',
        now: new Date('2026-08-12T23:00:00Z'),
        schedules: [
            makeSchedule({
                id: 'schedule-v1',
                times: ['08:00'],
                effectiveFrom: '2026-08-10',
                effectiveUntil: '2026-08-11',
                version: 1,
            }),
            makeSchedule({
                id: 'schedule-v2',
                times: ['20:00'],
                effectiveFrom: '2026-08-12',
                effectiveUntil: null,
                version: 2,
            }),
        ],
    });

    assert.strictEqual(output.summary.expectedDoses, 3);
});

test('5 - schedule version change switches scheduled time and log identity', () => {
    const output = calculate({
        periodStart: '2026-08-10',
        periodEnd: '2026-08-12',
        now: new Date('2026-08-12T23:00:00Z'),
        schedules: [
            makeSchedule({
                id: 'schedule-v1',
                times: ['08:00'],
                effectiveFrom: '2026-08-10',
                effectiveUntil: '2026-08-11',
                version: 1,
            }),
            makeSchedule({
                id: 'schedule-v2',
                times: ['20:00'],
                effectiveFrom: '2026-08-12',
                effectiveUntil: null,
                version: 2,
            }),
        ],
        logs: [
            {
                medicineId: 'med-1',
                scheduleId: 'schedule-v2',
                scheduledDate: '2026-08-12',
                scheduledTime: '20:00',
                status: 'taken',
            },
        ],
    });

    assert.strictEqual(output.summary.expectedDoses, 3);
    assert.strictEqual(output.summary.takenDoses, 1);
    assert.strictEqual(output.summary.missedDoses, 2);
});

test('5 - old schedule log does not match a dose generated by new schedule', () => {
    const output = calculate({
        periodStart: '2026-08-12',
        periodEnd: '2026-08-12',
        now: new Date('2026-08-13T12:00:00Z'),

        schedules: [
            makeSchedule({
                id: 'schedule-v1',
                times: ['08:00'],
                effectiveFrom: '2026-08-10',
                effectiveUntil: '2026-08-11',
                version: 1,
            }),
            makeSchedule({
                id: 'schedule-v2',
                times: ['20:00'],
                effectiveFrom: '2026-08-12',
                effectiveUntil: null,
                version: 2,
            }),
        ],

        logs: [
            {
                medicineId: 'med-1',
                scheduleId: 'schedule-v1',
                scheduledDate: '2026-08-12',
                scheduledTime: '20:00',
                status: 'taken',
            },
        ],
    });

    assert.equal(output.summary.expectedDoses, 1);
    assert.equal(output.summary.takenDoses, 0);
    assert.equal(output.summary.skippedDoses, 0);
    assert.equal(output.summary.missedDoses, 1);
});

// ============================================================
// 6. SCHEDULE BOUNDARY TRANSITIONS
// ============================================================

console.log('\n6. Schedule boundary transitions');

test('6 - old schedule is inclusive through effectiveUntil', () => {
    const output = calculate({
        periodStart: '2026-08-10',
        periodEnd: '2026-08-12',
        now: new Date('2026-08-12T23:00:00Z'),
        schedules: [
            makeSchedule({
                id: 'old',
                times: ['08:00'],
                effectiveFrom: '2026-08-10',
                effectiveUntil: '2026-08-11',
                version: 1,
            }),
            makeSchedule({
                id: 'new',
                times: ['20:00'],
                effectiveFrom: '2026-08-12',
                effectiveUntil: null,
                version: 2,
            }),
        ],
    });

    assert.strictEqual(output.summary.expectedDoses, 3);
});

test('6 - new schedule begins on its effectiveFrom date', () => {
    const output = calculate({
        periodStart: '2026-08-12',
        periodEnd: '2026-08-12',
        now: new Date('2026-08-12T23:00:00Z'),
        schedules: [
            makeSchedule({
                id: 'old',
                times: ['08:00'],
                effectiveFrom: '2026-08-10',
                effectiveUntil: '2026-08-11',
                version: 1,
            }),
            makeSchedule({
                id: 'new',
                times: ['20:00'],
                effectiveFrom: '2026-08-12',
                effectiveUntil: null,
                version: 2,
            }),
        ],
    });

    assert.strictEqual(output.summary.expectedDoses, 1);
});

test('6 - latest effectiveFrom schedule wins when versions overlap', () => {
    const output = calculate({
        periodStart: '2026-08-12',
        periodEnd: '2026-08-12',
        now: new Date('2026-08-12T23:00:00Z'),
        schedules: [
            makeSchedule({
                id: 'old',
                times: ['08:00'],
                effectiveFrom: '2026-08-10',
                effectiveUntil: null,
                version: 1,
            }),
            makeSchedule({
                id: 'new',
                times: ['20:00'],
                effectiveFrom: '2026-08-12',
                effectiveUntil: null,
                version: 2,
            }),
        ],
    });

    assert.strictEqual(output.summary.expectedDoses, 1);
});

test('6 - overlapping latest schedule log is the matching log', () => {
    const output = calculate({
        periodStart: '2026-08-12',
        periodEnd: '2026-08-12',
        now: new Date('2026-08-12T23:00:00Z'),
        schedules: [
            makeSchedule({
                id: 'old',
                times: ['08:00'],
                effectiveFrom: '2026-08-10',
                effectiveUntil: null,
                version: 1,
            }),
            makeSchedule({
                id: 'new',
                times: ['20:00'],
                effectiveFrom: '2026-08-12',
                effectiveUntil: null,
                version: 2,
            }),
        ],
        logs: [
            {
                medicineId: 'med-1',
                scheduleId: 'new',
                scheduledDate: '2026-08-12',
                scheduledTime: '20:00',
                status: 'taken',
            },
        ],
    });

    assert.strictEqual(output.summary.expectedDoses, 1);
    assert.strictEqual(output.summary.takenDoses, 1);
});

// ============================================================
// 7. LOG MATCHING
// ============================================================

console.log('\n7. Log matching');

test('7 - exact medicine, schedule, date and time log matches a dose', () => {
    const output = calculate({
        periodStart: '2026-08-14',
        periodEnd: '2026-08-14',
        now: new Date('2026-08-14T23:00:00Z'),
        schedules: [
            makeSchedule({
                id: 'schedule-1',
                times: ['08:00'],
            }),
        ],
        logs: [
            makeLog({
                medicineId: 'med-1',
                scheduleId: 'schedule-1',
                scheduledDate: '2026-08-14',
                scheduledTime: '08:00',
                status: 'taken',
            }),
        ],
    });

    assert.strictEqual(output.summary.expectedDoses, 1);
    assert.strictEqual(output.summary.takenDoses, 1);
    assert.strictEqual(output.summary.missedDoses, 0);
});

test('7 - wrong scheduleId does not match a dose', () => {
    const output = calculate({
        periodStart: '2026-08-14',
        periodEnd: '2026-08-14',
        now: new Date('2026-08-15T12:00:00Z'),

        logs: [
            makeLog({
                scheduleId: 'wrong-schedule',
                status: 'taken',
            }),
        ],
    });

    assert.equal(output.summary.expectedDoses, 1);
    assert.equal(output.summary.takenDoses, 0);
    assert.equal(output.summary.skippedDoses, 0);
    assert.equal(output.summary.missedDoses, 1);
});
test('7 - wrong scheduledTime does not match a dose', () => {
    const output = calculate({
        periodStart: '2026-08-14',
        periodEnd: '2026-08-14',
        now: new Date('2026-08-15T12:00:00Z'),

        logs: [
            makeLog({
                scheduledTime: '09:00',
                status: 'taken',
            }),
        ],
    });

    assert.equal(output.summary.expectedDoses, 1);
    assert.equal(output.summary.takenDoses, 0);
    assert.equal(output.summary.skippedDoses, 0);
    assert.equal(output.summary.missedDoses, 1);
});

test('7 - wrong medicineId does not match a dose', () => {
    const output = calculate({
        periodStart: '2026-08-14',
        periodEnd: '2026-08-14',
        now: new Date('2026-08-15T12:00:00Z'),

        logs: [
            makeLog({
                medicineId: 'wrong-medicine',
                status: 'taken',
            }),
        ],
    });

    assert.equal(output.summary.expectedDoses, 1);
    assert.equal(output.summary.takenDoses, 0);
    assert.equal(output.summary.skippedDoses, 0);
    assert.equal(output.summary.missedDoses, 1);
});

test('7 - wrong scheduledDate does not match a dose', () => {
    const output = calculate({
        periodStart: '2026-08-14',
        periodEnd: '2026-08-14',
        now: new Date('2026-08-15T12:00:00Z'),

        logs: [
            makeLog({
                scheduledDate: '2026-08-13',
                status: 'taken',
            }),
        ],
    });

    assert.equal(output.summary.expectedDoses, 1);
    assert.equal(output.summary.takenDoses, 0);
    assert.equal(output.summary.skippedDoses, 0);
    assert.equal(output.summary.missedDoses, 1);
});

test('7 - skipped log matches exact dose identity', () => {
    const output = calculate({
        periodStart: '2026-08-14',
        periodEnd: '2026-08-14',
        now: new Date('2026-08-14T23:00:00Z'),
        logs: [
            makeLog({
                status: 'skipped',
            }),
        ],
    });

    assert.strictEqual(output.summary.expectedDoses, 1);
    assert.strictEqual(output.summary.skippedDoses, 1);
    assert.strictEqual(output.summary.missedDoses, 0);
});

test('7 - multiple logs only affect their exact matching doses', () => {
    const output = calculate({
        periodStart: '2026-08-14',
        periodEnd: '2026-08-14',
        now: new Date('2026-08-14T23:00:00Z'),
        schedules: [
            makeSchedule({
                times: ['08:00', '20:00'],
            }),
        ],
        logs: [
            {
                medicineId: 'med-1',
                scheduleId: 'schedule-1',
                scheduledDate: '2026-08-14',
                scheduledTime: '08:00',
                status: 'taken',
            },
            {
                medicineId: 'med-1',
                scheduleId: 'schedule-1',
                scheduledDate: '2026-08-14',
                scheduledTime: '20:00',
                status: 'skipped',
            },
        ],
    });

    assert.strictEqual(output.summary.expectedDoses, 2);
    assert.strictEqual(output.summary.takenDoses, 1);
    assert.strictEqual(output.summary.skippedDoses, 1);
    assert.strictEqual(output.summary.missedDoses, 0);
});

// ============================================================
// 8. TODAY CLASSIFICATION
// ============================================================

console.log('\n8. Today classification');

test('8 - past unlogged dose today is dueUnlogged', () => {
    const output = calculate({
        periodStart: '2026-08-15',
        periodEnd: '2026-08-15',
        now: new Date('2026-08-15T12:00:00Z'),
        schedules: [
            makeSchedule({
                times: ['08:00'],
            }),
        ],
    });

    assert.strictEqual(output.summary.expectedDoses, 1);
    assert.strictEqual(output.summary.dueUnloggedDoses, 1);
    assert.strictEqual(output.summary.missedDoses, 0);
});

test('8 - future dose today is excluded from expected doses', () => {
    const output = calculate({
        periodStart: '2026-08-15',
        periodEnd: '2026-08-15',
        now: new Date('2026-08-15T12:00:00Z'),
        schedules: [
            makeSchedule({
                times: ['20:00'],
            }),
        ],
    });

    assert.strictEqual(output.summary.expectedDoses, 0);
    assert.strictEqual(output.summary.dueUnloggedDoses, 0);
});

test('8 - taken log today is classified as taken', () => {
    const output = calculate({
        periodStart: '2026-08-15',
        periodEnd: '2026-08-15',
        now: new Date('2026-08-15T12:00:00Z'),
        schedules: [
            makeSchedule({
                times: ['08:00'],
            }),
        ],
        logs: [
            makeLog({
                scheduledDate: '2026-08-15',
                scheduledTime: '08:00',
                status: 'taken',
            }),
        ],
    });

    assert.strictEqual(output.summary.expectedDoses, 1);
    assert.strictEqual(output.summary.takenDoses, 1);
    assert.strictEqual(output.summary.dueUnloggedDoses, 0);
});

test('8 - skipped log today is classified as skipped', () => {
    const output = calculate({
        periodStart: '2026-08-15',
        periodEnd: '2026-08-15',
        now: new Date('2026-08-15T12:00:00Z'),
        schedules: [
            makeSchedule({
                times: ['08:00'],
            }),
        ],
        logs: [
            makeLog({
                scheduledDate: '2026-08-15',
                scheduledTime: '08:00',
                status: 'skipped',
            }),
        ],
    });

    assert.strictEqual(output.summary.expectedDoses, 1);
    assert.strictEqual(output.summary.skippedDoses, 1);
    assert.strictEqual(output.summary.dueUnloggedDoses, 0);
});

test('8 - dose exactly at now local time is due', () => {
    const output = calculate({
        periodStart: '2026-08-15',
        periodEnd: '2026-08-15',
        now: new Date('2026-08-15T10:00:00Z'),
        schedules: [
            makeSchedule({
                times: ['10:00'],
            }),
        ],
    });

    assert.strictEqual(output.summary.expectedDoses, 1);
    assert.strictEqual(output.summary.dueUnloggedDoses, 1);
});

// ============================================================
// 9. FUTURE DOSES
// ============================================================

console.log('\n9. Future doses');

test('9 - future calendar days are excluded', () => {
    const output = calculate({
        periodStart: '2026-08-15',
        periodEnd: '2026-08-20',
        now: new Date('2026-08-15T23:00:00Z'),
        schedules: [
            makeSchedule({
                times: ['08:00'],
            }),
        ],
    });

    assert.strictEqual(output.summary.expectedDoses, 1);
});

test('9 - future times on today are excluded', () => {
    const output = calculate({
        periodStart: '2026-08-15',
        periodEnd: '2026-08-15',
        now: new Date('2026-08-15T10:00:00Z'),
        schedules: [
            makeSchedule({
                times: ['08:00', '12:00', '20:00'],
            }),
        ],
    });

    assert.strictEqual(output.summary.expectedDoses, 1);
});

test('9 - dose exactly at now local time is not future', () => {
    const output = calculate({
        periodStart: '2026-08-15',
        periodEnd: '2026-08-15',
        now: new Date('2026-08-15T10:00:00Z'),
        schedules: [
            makeSchedule({
                times: ['10:00'],
            }),
        ],
    });

    assert.strictEqual(output.summary.expectedDoses, 1);
    assert.strictEqual(output.summary.dueUnloggedDoses, 1);
});

test('9 - past and future times today are separated correctly', () => {
    const output = calculate({
        periodStart: '2026-08-15',
        periodEnd: '2026-08-15',
        now: new Date('2026-08-15T12:00:00Z'),
        schedules: [
            makeSchedule({
                times: ['08:00', '12:00', '20:00'],
            }),
        ],
    });

    assert.strictEqual(output.summary.expectedDoses, 2);
    assert.strictEqual(output.summary.dueUnloggedDoses, 2);
});

// ============================================================
// 10. HISTORICAL MISSED DOSES
// ============================================================

console.log('\n10. Historical missed doses');

test('10 - past unlogged doses are missed', () => {
    const output = calculate({
        periodStart: '2026-08-14',
        periodEnd: '2026-08-14',
        now: new Date('2026-08-15T12:00:00Z'),
        schedules: [
            makeSchedule({
                times: ['08:00'],
            }),
        ],
    });

    assert.strictEqual(output.summary.expectedDoses, 1);
    assert.strictEqual(output.summary.missedDoses, 1);
    assert.strictEqual(output.summary.dueUnloggedDoses, 0);
});

test('10 - historical taken dose is not missed', () => {
    const output = calculate({
        periodStart: '2026-08-14',
        periodEnd: '2026-08-14',
        now: new Date('2026-08-15T12:00:00Z'),
        logs: [
            makeLog({
                scheduledDate: '2026-08-14',
                scheduledTime: '08:00',
                status: 'taken',
            }),
        ],
    });

    assert.strictEqual(output.summary.expectedDoses, 1);
    assert.strictEqual(output.summary.takenDoses, 1);
    assert.strictEqual(output.summary.missedDoses, 0);
});

test('10 - historical skipped dose is not missed', () => {
    const output = calculate({
        periodStart: '2026-08-14',
        periodEnd: '2026-08-14',
        now: new Date('2026-08-15T12:00:00Z'),
        logs: [
            makeLog({
                scheduledDate: '2026-08-14',
                scheduledTime: '08:00',
                status: 'skipped',
            }),
        ],
    });

    assert.strictEqual(output.summary.expectedDoses, 1);
    assert.strictEqual(output.summary.skippedDoses, 1);
    assert.strictEqual(output.summary.missedDoses, 0);
});

test('10 - historical taken and skipped doses are counted independently', () => {
    const output = calculate({
        periodStart: '2026-08-13',
        periodEnd: '2026-08-14',
        now: new Date('2026-08-15T12:00:00Z'),
        logs: [
            {
                medicineId: 'med-1',
                scheduleId: 'schedule-1',
                scheduledDate: '2026-08-13',
                scheduledTime: '08:00',
                status: 'taken',
            },
            {
                medicineId: 'med-1',
                scheduleId: 'schedule-1',
                scheduledDate: '2026-08-14',
                scheduledTime: '08:00',
                status: 'skipped',
            },
        ],
    });

    assert.strictEqual(output.summary.expectedDoses, 2);
    assert.strictEqual(output.summary.takenDoses, 1);
    assert.strictEqual(output.summary.skippedDoses, 1);
    assert.strictEqual(output.summary.missedDoses, 0);
});

// ============================================================
// 11. TIMEZONES
// ============================================================

console.log('\n11. Timezones');

test('11 - Asia/Kolkata resolves UTC instant to correct local calendar date', () => {
    const output = calculate({
        timezone: 'Asia/Kolkata',
        periodStart: '2026-08-15',
        periodEnd: '2026-08-15',
        now: new Date('2026-08-14T20:00:00Z'),
        medicines: [
            makeMedicine({
                startDate: '2026-08-15',
                endDate: '2026-08-15',
            }),
        ],
        schedules: [
            makeSchedule({
                effectiveFrom: '2026-08-15',
                times: ['01:00'],
            }),
        ],
    });

    assert.strictEqual(output.period.startDate, '2026-08-15');
    assert.strictEqual(output.summary.expectedDoses, 1);
});

test('11 - Asia/Kolkata recognizes dose after its local time', () => {
    const output = calculate({
        timezone: 'Asia/Kolkata',
        periodStart: '2026-08-15',
        periodEnd: '2026-08-15',
        // 12:00 UTC = 17:30 IST
        now: new Date('2026-08-15T12:00:00Z'),
        schedules: [
            makeSchedule({
                times: ['17:00'],
            }),
        ],
    });

    assert.strictEqual(output.summary.expectedDoses, 1);
    assert.strictEqual(output.summary.dueUnloggedDoses, 1);
});

test('11 - timezone changes local calendar date correctly', () => {
    const output = calculate({
        timezone: 'America/New_York',
        periodStart: '2026-08-14',
        periodEnd: '2026-08-14',
        // 00:30 UTC is still Aug 13 in New York.
        now: new Date('2026-08-14T00:30:00Z'),
        medicines: [
            makeMedicine({
                startDate: '2026-08-13',
                endDate: '2026-08-13',
            }),
        ],
        schedules: [
            makeSchedule({
                effectiveFrom: '2026-08-13',
                times: ['20:00'],
            }),
        ],
    });

    assert.strictEqual(output.summary.expectedDoses, 0);
});

test('11 - timezone is consistently applied to logs', () => {
    const output = calculate({
        timezone: 'Asia/Kolkata',
        periodStart: '2026-08-15',
        periodEnd: '2026-08-15',
        now: new Date('2026-08-15T12:00:00Z'),
        schedules: [
            makeSchedule({
                times: ['17:00'],
            }),
        ],
        logs: [
            {
                medicineId: 'med-1',
                scheduleId: 'schedule-1',
                scheduledDate: '2026-08-15T00:00:00Z',
                scheduledTime: '17:00',
                status: 'taken',
            },
        ],
    });

    assert.strictEqual(output.summary.takenDoses, 1);
});

test('11 - timezone applies to log calendar date around midnight', () => {
    const output = calculate({
        timezone: 'Asia/Kolkata',
        periodStart: '2026-08-15',
        periodEnd: '2026-08-15',
        now: new Date('2026-08-15T12:00:00Z'),
        schedules: [
            makeSchedule({
                times: ['05:00'],
            }),
        ],
        logs: [
            {
                medicineId: 'med-1',
                scheduleId: 'schedule-1',
                // 23:30 UTC on Aug 14 = 05:00 IST on Aug 15.
                scheduledDate: '2026-08-14T23:30:00Z',
                scheduledTime: '05:00',
                status: 'taken',
            },
        ],
    });

    assert.strictEqual(output.summary.expectedDoses, 1);
    assert.strictEqual(output.summary.takenDoses, 1);
});

// ============================================================
// 12. ADHERENCE
// ============================================================

console.log('\n12. Adherence');

test('12 - adherence is taken divided by expected multiplied by 100', () => {
    const output = calculate({
        periodStart: '2026-08-10',
        periodEnd: '2026-08-12',
        now: new Date('2026-08-12T23:00:00Z'),
        logs: [
            {
                medicineId: 'med-1',
                scheduleId: 'schedule-1',
                scheduledDate: '2026-08-10',
                scheduledTime: '08:00',
                status: 'taken',
            },
            {
                medicineId: 'med-1',
                scheduleId: 'schedule-1',
                scheduledDate: '2026-08-11',
                scheduledTime: '08:00',
                status: 'taken',
            },
        ],
    });

    assert.strictEqual(output.summary.expectedDoses, 3);
    assert.strictEqual(output.summary.takenDoses, 2);
    assert.strictEqual(
        output.summary.adherenceRate,
        (2 / 3) * 100
    );
});

test('12 - zero expected doses produces null adherence', () => {
    const output = calculate({
        periodStart: '2026-08-15',
        periodEnd: '2026-08-15',
        now: new Date('2026-08-15T12:00:00Z'),
        schedules: [
            makeSchedule({
                times: ['20:00'],
            }),
        ],
    });

    assert.strictEqual(output.summary.expectedDoses, 0);
    assert.strictEqual(output.summary.adherenceRate, null);
});

test('12 - skipped doses reduce adherence', () => {
    const output = calculate({
        periodStart: '2026-08-10',
        periodEnd: '2026-08-12',
        now: new Date('2026-08-12T23:00:00Z'),
        logs: [
            {
                medicineId: 'med-1',
                scheduleId: 'schedule-1',
                scheduledDate: '2026-08-10',
                scheduledTime: '08:00',
                status: 'taken',
            },
            {
                medicineId: 'med-1',
                scheduleId: 'schedule-1',
                scheduledDate: '2026-08-11',
                scheduledTime: '08:00',
                status: 'skipped',
            },
        ],
    });

    assert.strictEqual(output.summary.expectedDoses, 3);
    assert.strictEqual(output.summary.takenDoses, 1);
    assert.strictEqual(output.summary.skippedDoses, 1);
    assert.strictEqual(
        output.summary.adherenceRate,
        (1 / 3) * 100
    );
});

test('12 - 100 percent adherence when every expected dose is taken', () => {
    const output = calculate({
        periodStart: '2026-08-10',
        periodEnd: '2026-08-12',
        now: new Date('2026-08-12T23:00:00Z'),
        logs: [
            makeLog({
                scheduledDate: '2026-08-10',
                status: 'taken',
            }),
            makeLog({
                scheduledDate: '2026-08-11',
                status: 'taken',
            }),
            makeLog({
                scheduledDate: '2026-08-12',
                status: 'taken',
            }),
        ],
    });

    assert.strictEqual(output.summary.expectedDoses, 3);
    assert.strictEqual(output.summary.takenDoses, 3);
    assert.strictEqual(output.summary.adherenceRate, 100);
});

// ============================================================
// 13. DAILY TREND
// ============================================================

console.log('\n13. Daily trend');

test('13 - trend contains every calendar day from periodStart through today', () => {
    const output = calculate({
        periodStart: '2026-08-10',
        periodEnd: '2026-08-20',
        now: new Date('2026-08-15T23:00:00Z'),
        schedules: [
            makeSchedule({
                times: ['08:00'],
            }),
        ],
    });

    assert.deepStrictEqual(trendDates(output), [
        '2026-08-10',
        '2026-08-11',
        '2026-08-12',
        '2026-08-13',
        '2026-08-14',
        '2026-08-15',
    ]);
});

test('13 - trend excludes dates after today', () => {
    const output = calculate({
        periodStart: '2026-08-10',
        periodEnd: '2026-08-20',
        now: new Date('2026-08-15T23:00:00Z'),
    });

    assert.ok(
        output.trend.every((row) => row.date <= '2026-08-15')
    );

    assert.strictEqual(output.trend.length, 6);
});

test('13 - trend ends at periodEnd when periodEnd is before today', () => {
    const output = calculate({
        periodStart: '2026-08-10',
        periodEnd: '2026-08-12',
        now: new Date('2026-08-15T23:00:00Z'),
    });

    assert.deepStrictEqual(trendDates(output), [
        '2026-08-10',
        '2026-08-11',
        '2026-08-12',
    ]);
});

test('13 - trend contains zero-dose days', () => {
    const output = calculate({
        periodStart: '2026-08-10',
        periodEnd: '2026-08-12',
        now: new Date('2026-08-12T23:00:00Z'),
        schedules: [
            makeSchedule({
                scheduleType: 'specific-days',
                daysOfWeek: ['monday'],
            }),
        ],
    });

    assert.strictEqual(output.trend.length, 3);

    const monday = getTrendDay(output, '2026-08-10');
    const tuesday = getTrendDay(output, '2026-08-11');

    assert.strictEqual(monday.expected, 1);
    assert.strictEqual(tuesday.expected, 0);
    assert.strictEqual(tuesday.adherenceRate, null);
});

test('13 - trend counts taken skipped and missed independently per day', () => {
    const output = calculate({
        periodStart: '2026-08-10',
        periodEnd: '2026-08-12',
        now: new Date('2026-08-12T23:00:00Z'),
        logs: [
            {
                medicineId: 'med-1',
                scheduleId: 'schedule-1',
                scheduledDate: '2026-08-10',
                scheduledTime: '08:00',
                status: 'taken',
            },
            {
                medicineId: 'med-1',
                scheduleId: 'schedule-1',
                scheduledDate: '2026-08-11',
                scheduledTime: '08:00',
                status: 'skipped',
            },
        ],
    });

    const monday = getTrendDay(output, '2026-08-10');
    const tuesday = getTrendDay(output, '2026-08-11');
    const wednesday = getTrendDay(output, '2026-08-12');

    assert.strictEqual(monday.taken, 1);
    assert.strictEqual(monday.skipped, 0);
    assert.strictEqual(monday.missed, 0);

    assert.strictEqual(tuesday.taken, 0);
    assert.strictEqual(tuesday.skipped, 1);
    assert.strictEqual(tuesday.missed, 0);

    assert.strictEqual(wednesday.taken, 0);
    assert.strictEqual(wednesday.skipped, 0);
    assert.strictEqual(wednesday.missed, 0);
    assert.strictEqual(wednesday.dueUnlogged, 1);
});

test('13 - historical unlogged dose appears as missed in trend', () => {
    const output = calculate({
        periodStart: '2026-08-10',
        periodEnd: '2026-08-11',
        now: new Date('2026-08-12T23:00:00Z'),
        schedules: [
            makeSchedule({
                times: ['08:00'],
            }),
        ],
    });

    const monday = getTrendDay(output, '2026-08-10');
    const tuesday = getTrendDay(output, '2026-08-11');

    assert.strictEqual(monday.missed, 1);
    assert.strictEqual(tuesday.missed, 1);
});

// ============================================================
// 14. MEDICINE BREAKDOWN
// ============================================================

console.log('\n14. Medicine breakdown');

test('14 - medicine breakdown contains every supplied medicine', () => {
    const output = calculate({
        medicines: [
            makeMedicine({
                id: 'med-1',
                name: 'Medicine A',
            }),
            makeMedicine({
                id: 'med-2',
                name: 'Medicine B',
            }),
        ],
        schedules: [
            makeSchedule({
                medicineId: 'med-1',
            }),
        ],
    });

    assert.strictEqual(output.medicineBreakdown.length, 2);

    assert.ok(
        output.medicineBreakdown.some(
            (row) => row.medicineId === 'med-1'
        )
    );

    assert.ok(
        output.medicineBreakdown.some(
            (row) => row.medicineId === 'med-2'
        )
    );
});

test('14 - medicine breakdown calculates independent adherence per medicine', () => {
    const output = calculate({
        medicines: [
            makeMedicine({
                id: 'med-1',
                name: 'Medicine A',
            }),
            makeMedicine({
                id: 'med-2',
                name: 'Medicine B',
            }),
        ],
        schedules: [
            makeSchedule({
                id: 'schedule-1',
                medicineId: 'med-1',
            }),
            makeSchedule({
                id: 'schedule-2',
                medicineId: 'med-2',
            }),
        ],
        periodStart: '2026-08-10',
        periodEnd: '2026-08-10',
        now: new Date('2026-08-10T23:00:00Z'),
        logs: [
            {
                medicineId: 'med-1',
                scheduleId: 'schedule-1',
                scheduledDate: '2026-08-10',
                scheduledTime: '08:00',
                status: 'taken',
            },
        ],
    });

    const medicineA = getMedicineBreakdown(output, 'med-1');
    const medicineB = getMedicineBreakdown(output, 'med-2');

    assert.strictEqual(medicineA.expectedDoses, 1);
    assert.strictEqual(medicineA.takenDoses, 1);
    assert.strictEqual(medicineA.adherenceRate, 100);

    assert.strictEqual(medicineB.expectedDoses, 1);
    assert.strictEqual(medicineB.takenDoses, 0);
    assert.strictEqual(medicineB.adherenceRate, 0);
});

test('14 - upcoming medicine still appears in breakdown', () => {
    const output = calculate({
        medicines: [
            makeMedicine({
                id: 'future-med',
                name: 'Future Medicine',
                startDate: '2026-09-01',
                endDate: '2026-09-10',
            }),
        ],
        schedules: [],
    });

    assert.strictEqual(output.medicineBreakdown.length, 1);

    const row = getMedicineBreakdown(output, 'future-med');

    assert.ok(row);
    assert.strictEqual(row.status, 'upcoming');
    assert.strictEqual(row.expectedDoses, 0);
    assert.strictEqual(row.adherenceRate, null);
});

test('14 - finished medicine still appears in breakdown', () => {
    const output = calculate({
        medicines: [
            makeMedicine({
                id: 'finished-med',
                name: 'Finished Medicine',
                startDate: '2026-08-01',
                endDate: '2026-08-10',
            }),
        ],
        schedules: [],
    });

    const row = getMedicineBreakdown(output, 'finished-med');

    assert.ok(row);
    assert.strictEqual(row.status, 'finished');
    assert.strictEqual(row.expectedDoses, 0);
    assert.strictEqual(row.adherenceRate, null);
});

test('14 - deleted medicine appears with deleted status', () => {
    const output = calculate({
        medicines: [
            makeMedicine({
                id: 'deleted-med',
                name: 'Deleted Medicine',
                isDeleted: true,
                deletedAt: '2026-08-12',
            }),
        ],
        periodStart: '2026-08-13',
        periodEnd: '2026-08-15',
        now: new Date('2026-08-15T23:00:00Z'),
    });

    const row = getMedicineBreakdown(output, 'deleted-med');

    assert.ok(row);
    assert.strictEqual(row.status, 'deleted');
    assert.strictEqual(row.expectedDoses, 0);
});

// ============================================================
// 15. ACTIVE MEDICINES
// ============================================================

console.log('\n15. Active medicines');

test('15 - active medicine is counted', () => {
    const output = calculate();

    assert.strictEqual(output.summary.activeMedicines, 1);
});

test('15 - upcoming medicine is not counted as active', () => {
    const output = calculate({
        medicines: [
            makeMedicine({
                startDate: '2026-09-01',
                endDate: '2026-09-10',
            }),
        ],
    });

    assert.strictEqual(output.summary.activeMedicines, 0);
});

test('15 - finished medicine is not counted as active', () => {
    const output = calculate({
        medicines: [
            makeMedicine({
                startDate: '2026-08-01',
                endDate: '2026-08-14',
            }),
        ],
    });

    assert.strictEqual(output.summary.activeMedicines, 0);
});

test('15 - deleted medicine is not counted as active', () => {
    const output = calculate({
        medicines: [
            makeMedicine({
                isDeleted: true,
                deletedAt: '2026-08-14',
            }),
        ],
    });

    assert.strictEqual(output.summary.activeMedicines, 0);
});

test('15 - medicine active on start boundary is counted', () => {
    const output = calculate({
        medicines: [
            makeMedicine({
                startDate: '2026-08-15',
                endDate: '2026-08-15',
            }),
        ],
    });

    assert.strictEqual(output.summary.activeMedicines, 1);
});

test('15 - medicine active on end boundary is counted', () => {
    const output = calculate({
        medicines: [
            makeMedicine({
                startDate: '2026-08-01',
                endDate: '2026-08-15',
            }),
        ],
    });

    assert.strictEqual(output.summary.activeMedicines, 1);
});

test('15 - multiple medicines are counted independently', () => {
    const output = calculate({
        medicines: [
            makeMedicine({
                id: 'active-med',
                startDate: '2026-08-01',
                endDate: '2026-08-20',
            }),
            makeMedicine({
                id: 'future-med',
                startDate: '2026-09-01',
                endDate: '2026-09-10',
            }),
            makeMedicine({
                id: 'finished-med',
                startDate: '2026-08-01',
                endDate: '2026-08-10',
            }),
            makeMedicine({
                id: 'deleted-med',
                startDate: '2026-08-01',
                endDate: '2026-08-20',
                isDeleted: true,
                deletedAt: '2026-08-12',
            }),
        ],
        schedules: [],
    });

    assert.strictEqual(output.summary.activeMedicines, 1);
});

// ============================================================
// 16. V1 OUTPUT CONTRACT
// ============================================================

console.log('\n16. V1 output contract');

test('16 - top-level output contains exactly V1 fields', () => {
    const output = calculate();

    assert.deepStrictEqual(
        Object.keys(output).sort(),
        [
            'medicineBreakdown',
            'period',
            'summary',
            'trend',
        ].sort()
    );
});

test('16 - period contains exactly startDate and endDate', () => {
    const output = calculate();

    assert.deepStrictEqual(
        Object.keys(output.period).sort(),
        [
            'startDate',
            'endDate',
        ].sort()
    );
});

test('16 - summary contains exactly V1 summary fields', () => {
    const output = calculate();

    assert.deepStrictEqual(
        Object.keys(output.summary).sort(),
        [
            'expectedDoses',
            'takenDoses',
            'skippedDoses',
            'missedDoses',
            'dueUnloggedDoses',
            'adherenceRate',
            'activeMedicines',
        ].sort()
    );
});

test('16 - trend row contains exactly V1 trend fields', () => {
    const output = calculate();

    assert.ok(output.trend.length > 0);

    assert.deepStrictEqual(
        Object.keys(output.trend[0]).sort(),
        [
            'date',
            'expected',
            'taken',
            'skipped',
            'missed',
            'dueUnlogged',
            'adherenceRate',
        ].sort()
    );
});

test('16 - medicine breakdown row contains exactly V1 fields', () => {
    const output = calculate();

    assert.ok(output.medicineBreakdown.length > 0);

    assert.deepStrictEqual(
        Object.keys(output.medicineBreakdown[0]).sort(),
        [
            'medicineId',
            'name',
            'expectedDoses',
            'takenDoses',
            'skippedDoses',
            'missedDoses',
            'dueUnloggedDoses',
            'adherenceRate',
            'status',
        ].sort()
    );
});

test('16 - scheduleId is not exposed anywhere in V1 output', () => {
    const output = calculate();

    const json = JSON.stringify(output);

    assert.strictEqual(
        json.includes('scheduleId'),
        false
    );
});

test('16 - scheduleVersion is not exposed anywhere in V1 output', () => {
    const output = calculate();

    const json = JSON.stringify(output);

    assert.strictEqual(
        json.includes('scheduleVersion'),
        false
    );
});

test('16 - V1 output contains no unexpected top-level values', () => {
    const output = calculate();

    assert.strictEqual(
        Object.prototype.hasOwnProperty.call(output, 'schedules'),
        false
    );

    assert.strictEqual(
        Object.prototype.hasOwnProperty.call(output, 'logs'),
        false
    );

    assert.strictEqual(
        Object.prototype.hasOwnProperty.call(output, 'doses'),
        false
    );
});

// ============================================================
// FINAL RESULT
// ============================================================

console.log('\n============================================================');
console.log('Medicine Compliance Test Results');
console.log('============================================================');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total : ${passed + failed}`);
console.log('============================================================');

if (failures.length > 0) {
    console.log('\nFailed tests:\n');

    failures.forEach((failure, index) => {
        console.log(`${index + 1}. ${failure.name}`);
        console.log(`   ${failure.error.message}`);
        console.log('');
    });

    console.log('============================================================');
    console.log('TEST RESULT: FAILED');
    console.log('============================================================');

    process.exitCode = 1;
} else {
    console.log('\n============================================================');
    console.log('TEST RESULT: ALL TESTS PASSED');
    console.log('============================================================');
}