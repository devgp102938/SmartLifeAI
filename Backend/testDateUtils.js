
// testDateUtil.js

const {
    PERIODS,
    VALID_PERIODS,
    MAX_CUSTOM_RANGE,
    AnalyticsValidationError,
    getStartOfDay,
    getEndOfDay,
    getDateRange,
    validateCustomRange,
    getPreviousEquivalentRange
} = require('./utils/analyticsDateUtils.js');


// ============================================================
// Test helpers
// ============================================================

let passed = 0;
let failed = 0;

const test = (name, fn) => {
    try {
        fn();
        console.log(`✅ PASS: ${name}`);
        passed++;
    } catch (error) {
        console.error(`❌ FAIL: ${name}`);
        console.error(`   ${error.message}`);
        failed++;
    }
};

const expect = (condition, message) => {
    if (!condition) {
        throw new Error(message);
    }
};

const expectThrows = (fn, expectedMessage) => {
    try {
        fn();
        throw new Error(
            `Expected function to throw "${expectedMessage}", but it did not throw`
        );
    } catch (error) {
        if (expectedMessage && !error.message.includes(expectedMessage)) {
            throw new Error(
                `Expected error containing "${expectedMessage}", got "${error.message}"`
            );
        }

        expect(
            error instanceof AnalyticsValidationError,
            `Expected AnalyticsValidationError, got ${error.constructor.name}`
        );
    }
};

const formatDate = (date) => {
    return date.toISOString();
};

const printRange = (label, range) => {
    console.log(`\n${label}`);
    console.log(`  period   : ${range.period || '-'}`);
    console.log(`  timezone : ${range.timezone || '-'}`);
    console.log(`  start    : ${formatDate(range.startDate)}`);
    console.log(`  end      : ${formatDate(range.endDate)}`);
};


// ============================================================
// Constants
// ============================================================

console.log('\n========================================');
console.log(' DATE UTIL TESTS');
console.log('========================================\n');

test('PERIODS contains expected values', () => {
    expect(PERIODS.TODAY === 'today', 'TODAY is incorrect');
    expect(PERIODS.YESTERDAY === 'yesterday', 'YESTERDAY is incorrect');
    expect(PERIODS.LAST_7_DAYS === 'last7days', 'LAST_7_DAYS is incorrect');
    expect(PERIODS.THIS_WEEK === 'thisWeek', 'THIS_WEEK is incorrect');
    expect(PERIODS.LAST_WEEK === 'lastWeek', 'LAST_WEEK is incorrect');
    expect(PERIODS.LAST_30_DAYS === 'last30days', 'LAST_30_DAYS is incorrect');
    expect(PERIODS.THIS_MONTH === 'thisMonth', 'THIS_MONTH is incorrect');
    expect(PERIODS.LAST_MONTH === 'lastMonth', 'LAST_MONTH is incorrect');
    expect(PERIODS.LAST_90_DAYS === 'last90days', 'LAST_90_DAYS is incorrect');
    expect(PERIODS.THIS_YEAR === 'thisYear', 'THIS_YEAR is incorrect');
    expect(PERIODS.CUSTOM === 'custom', 'CUSTOM is incorrect');
    expect(PERIODS.LIFETIME === 'lifetime', 'LIFETIME is incorrect');
});

test('VALID_PERIODS contains all PERIODS values', () => {
    for (const period of Object.values(PERIODS)) {
        expect(
            VALID_PERIODS.has(period),
            `VALID_PERIODS does not contain ${period}`
        );
    }
});

test('MAX_CUSTOM_RANGE is 366 days', () => {
    expect(MAX_CUSTOM_RANGE === 366, 'MAX_CUSTOM_RANGE should be 366');
});


// ============================================================
// Timezone validation
// ============================================================

test('getStartOfDay rejects missing timezone', () => {
    expectThrows(
        () => getStartOfDay(new Date(), undefined),
        'Timezone is required'
    );
});

test('getStartOfDay rejects invalid timezone', () => {
    expectThrows(
        () => getStartOfDay(new Date(), 'Invalid/Timezone'),
        'Invalid timezone'
    );
});

test('getEndOfDay rejects invalid timezone', () => {
    expectThrows(
        () => getEndOfDay(new Date(), 'Invalid/Timezone'),
        'Invalid timezone'
    );
});

test('Asia/Kolkata is accepted as a valid timezone', () => {
    const result = getStartOfDay(
        new Date('2026-08-08T12:00:00.000Z'),
        'Asia/Kolkata'
    );

    expect(result instanceof Date, 'Result should be a Date');
});

test('America/New_York is accepted as a valid timezone', () => {
    const result = getStartOfDay(
        new Date('2026-08-08T12:00:00.000Z'),
        'America/New_York'
    );

    expect(result instanceof Date, 'Result should be a Date');
});


// ============================================================
// getStartOfDay / getEndOfDay
// ============================================================

test('getStartOfDay returns correct UTC boundary for Asia/Kolkata', () => {
    const date = new Date('2026-08-08T12:00:00.000Z');

    const result = getStartOfDay(date, 'Asia/Kolkata');

    expect(
        result.toISOString() === '2026-08-07T18:30:00.000Z',
        `Expected 2026-08-07T18:30:00.000Z, got ${result.toISOString()}`
    );
});

test('getEndOfDay returns correct UTC boundary for Asia/Kolkata', () => {
    const date = new Date('2026-08-08T12:00:00.000Z');

    const result = getEndOfDay(date, 'Asia/Kolkata');

    expect(
        result.toISOString() === '2026-08-08T18:29:59.999Z',
        `Expected 2026-08-08T18:29:59.999Z, got ${result.toISOString()}`
    );
});


// ============================================================
// getDateRange - TODAY
// ============================================================

const referenceDate = new Date('2026-08-08T12:00:00.000Z');

test('TODAY returns correct range', () => {
    const result = getDateRange({
        period: PERIODS.TODAY,
        timezone: 'Asia/Kolkata',
        referenceDate
    });

    printRange('TODAY', result);

    expect(result.period === PERIODS.TODAY, 'Wrong period');
    expect(result.timezone === 'Asia/Kolkata', 'Wrong timezone');

    expect(
        result.startDate.toISOString() === '2026-08-07T18:30:00.000Z',
        `Wrong startDate: ${result.startDate.toISOString()}`
    );

    expect(
        result.endDate.toISOString() === '2026-08-08T18:29:59.999Z',
        `Wrong endDate: ${result.endDate.toISOString()}`
    );
});


// ============================================================
// YESTERDAY
// ============================================================

test('YESTERDAY returns correct range', () => {
    const result = getDateRange({
        period: PERIODS.YESTERDAY,
        timezone: 'Asia/Kolkata',
        referenceDate
    });

    printRange('YESTERDAY', result);

    expect(
        result.startDate.toISOString() === '2026-08-06T18:30:00.000Z',
        `Wrong startDate: ${result.startDate.toISOString()}`
    );

    expect(
        result.endDate.toISOString() === '2026-08-07T18:29:59.999Z',
        `Wrong endDate: ${result.endDate.toISOString()}`
    );
});


// ============================================================
// LAST 7 DAYS
// ============================================================

test('LAST_7_DAYS returns exactly 7 calendar days', () => {
    const result = getDateRange({
        period: PERIODS.LAST_7_DAYS,
        timezone: 'Asia/Kolkata',
        referenceDate
    });

    printRange('LAST_7_DAYS', result);

    expect(
        result.startDate.toISOString() === '2026-08-01T18:30:00.000Z',
        `Wrong startDate: ${result.startDate.toISOString()}`
    );

    expect(
        result.endDate.toISOString() === '2026-08-08T18:29:59.999Z',
        `Wrong endDate: ${result.endDate.toISOString()}`
    );
});


// ============================================================
// LAST 30 DAYS
// ============================================================

test('LAST_30_DAYS returns correct range', () => {
    const result = getDateRange({
        period: PERIODS.LAST_30_DAYS,
        timezone: 'Asia/Kolkata',
        referenceDate
    });

    printRange('LAST_30_DAYS', result);

    expect(
        result.startDate.toISOString() === '2026-07-09T18:30:00.000Z',
        `Wrong startDate: ${result.startDate.toISOString()}`
    );

    expect(
        result.endDate.toISOString() === '2026-08-08T18:29:59.999Z',
        `Wrong endDate: ${result.endDate.toISOString()}`
    );
});


// ============================================================
// LAST 90 DAYS
// ============================================================

test('LAST_90_DAYS returns correct range', () => {
    const result = getDateRange({
        period: PERIODS.LAST_90_DAYS,
        timezone: 'Asia/Kolkata',
        referenceDate
    });

    printRange('LAST_90_DAYS', result);

expect(
    result.startDate.toISOString() === '2026-05-10T18:30:00.000Z',
    `Wrong startDate: ${result.startDate.toISOString()}`
);

    expect(
        result.endDate.toISOString() === '2026-08-08T18:29:59.999Z',
        `Wrong endDate: ${result.endDate.toISOString()}`
    );
});


// ============================================================
// THIS WEEK
// ============================================================

test('THIS_WEEK starts on Monday for ISO week', () => {
    const result = getDateRange({
        period: PERIODS.THIS_WEEK,
        timezone: 'Asia/Kolkata',
        referenceDate
    });

    printRange('THIS_WEEK', result);

    // August 8, 2026 is Saturday.
    // Monday is August 3, 2026.
    expect(
        result.startDate.toISOString() === '2026-08-02T18:30:00.000Z',
        `Wrong startDate: ${result.startDate.toISOString()}`
    );

    expect(
        result.endDate.toISOString() === '2026-08-08T18:29:59.999Z',
        `Wrong endDate: ${result.endDate.toISOString()}`
    );
});


// ============================================================
// LAST WEEK
// ============================================================

test('LAST_WEEK returns previous Monday-Sunday', () => {
    const result = getDateRange({
        period: PERIODS.LAST_WEEK,
        timezone: 'Asia/Kolkata',
        referenceDate
    });

    printRange('LAST_WEEK', result);

    expect(
        result.startDate.toISOString() === '2026-07-26T18:30:00.000Z',
        `Wrong startDate: ${result.startDate.toISOString()}`
    );

    expect(
        result.endDate.toISOString() === '2026-08-02T18:29:59.999Z',
        `Wrong endDate: ${result.endDate.toISOString()}`
    );
});


// ============================================================
// THIS MONTH
// ============================================================

test('THIS_MONTH returns first day of current month until today', () => {
    const result = getDateRange({
        period: PERIODS.THIS_MONTH,
        timezone: 'Asia/Kolkata',
        referenceDate
    });

    printRange('THIS_MONTH', result);

    expect(
        result.startDate.toISOString() === '2026-07-31T18:30:00.000Z',
        `Wrong startDate: ${result.startDate.toISOString()}`
    );

    expect(
        result.endDate.toISOString() === '2026-08-08T18:29:59.999Z',
        `Wrong endDate: ${result.endDate.toISOString()}`
    );
});


// ============================================================
// LAST MONTH
// ============================================================

test('LAST_MONTH returns complete previous month', () => {
    const result = getDateRange({
        period: PERIODS.LAST_MONTH,
        timezone: 'Asia/Kolkata',
        referenceDate
    });

    printRange('LAST_MONTH', result);

    expect(
        result.startDate.toISOString() === '2026-06-30T18:30:00.000Z',
        `Wrong startDate: ${result.startDate.toISOString()}`
    );

    expect(
        result.endDate.toISOString() === '2026-07-31T18:29:59.999Z',
        `Wrong endDate: ${result.endDate.toISOString()}`
    );
});


// ============================================================
// THIS YEAR
// ============================================================

test('THIS_YEAR returns January 1 until today', () => {
    const result = getDateRange({
        period: PERIODS.THIS_YEAR,
        timezone: 'Asia/Kolkata',
        referenceDate
    });

    printRange('THIS_YEAR', result);

    expect(
        result.startDate.toISOString() === '2025-12-31T18:30:00.000Z',
        `Wrong startDate: ${result.startDate.toISOString()}`
    );

    expect(
        result.endDate.toISOString() === '2026-08-08T18:29:59.999Z',
        `Wrong endDate: ${result.endDate.toISOString()}`
    );
});


// ============================================================
// LIFETIME
// ============================================================

test('LIFETIME starts at 1970-01-01 UTC', () => {
    const result = getDateRange({
        period: PERIODS.LIFETIME,
        timezone: 'Asia/Kolkata',
        referenceDate
    });

    printRange('LIFETIME', result);

    expect(
        result.startDate.toISOString() === '1970-01-01T00:00:00.000Z',
        `Wrong startDate: ${result.startDate.toISOString()}`
    );

    expect(
        result.endDate.toISOString() === '2026-08-08T18:29:59.999Z',
        `Wrong endDate: ${result.endDate.toISOString()}`
    );
});


// ============================================================
// CUSTOM RANGE
// ============================================================

test('CUSTOM range works with YYYY-MM-DD dates', () => {
    const result = getDateRange({
        period: PERIODS.CUSTOM,
        timezone: 'Asia/Kolkata',
        customStart: '2026-08-01',
        customEnd: '2026-08-05'
    });

    printRange('CUSTOM', result);

    expect(
        result.startDate.toISOString() === '2026-07-31T18:30:00.000Z',
        `Wrong startDate: ${result.startDate.toISOString()}`
    );

    expect(
        result.endDate.toISOString() === '2026-08-05T18:29:59.999Z',
        `Wrong endDate: ${result.endDate.toISOString()}`
    );
});

test('CUSTOM rejects missing customStart', () => {
    expectThrows(
        () =>
            validateCustomRange({
                customEnd: '2026-08-05',
                timezone: 'Asia/Kolkata'
            }),
        'customStart and customEnd are both required'
    );
});

test('CUSTOM rejects missing customEnd', () => {
    expectThrows(
        () =>
            validateCustomRange({
                customStart: '2026-08-01',
                timezone: 'Asia/Kolkata'
            }),
        'customStart and customEnd are both required'
    );
});

test('CUSTOM rejects reversed dates', () => {
    expectThrows(
        () =>
            validateCustomRange({
                customStart: '2026-08-10',
                customEnd: '2026-08-01',
                timezone: 'Asia/Kolkata'
            }),
        'customStart must be before or equal to customEnd'
    );
});

test('CUSTOM rejects range greater than 366 days', () => {
    expectThrows(
        () =>
            validateCustomRange({
                customStart: '2025-01-01',
                customEnd: '2026-01-03',
                timezone: 'Asia/Kolkata'
            }),
        'range exceeds maximum of 366 days'
    );
});

test('CUSTOM accepts exactly 366 days', () => {
    const result = validateCustomRange({
        customStart: '2025-01-01',
        customEnd: '2026-01-01',
        timezone: 'Asia/Kolkata'
    });

    expect(result.startDate instanceof Date, 'startDate should be Date');
    expect(result.endDate instanceof Date, 'endDate should be Date');
});


// ============================================================
// Invalid periods
// ============================================================

test('getDateRange rejects unsupported period', () => {
    expectThrows(
        () =>
            getDateRange({
                period: 'invalidPeriod',
                timezone: 'Asia/Kolkata',
                referenceDate
            }),
        'unsupported period'
    );
});

test('getDateRange rejects missing timezone', () => {
    expectThrows(
        () =>
            getDateRange({
                period: PERIODS.TODAY,
                referenceDate
            }),
        'Timezone is required'
    );
});


// ============================================================
// Previous equivalent range
// ============================================================

test('getPreviousEquivalentRange works for a 4-day range', () => {
    const result = getPreviousEquivalentRange({
        startDate: '2026-08-01T00:00:00.000Z',
        endDate: '2026-08-04T23:59:59.999Z',
        timezone: 'Asia/Kolkata'
    });

    printRange('PREVIOUS EQUIVALENT RANGE', result);

    // Original range represents Aug 1-Aug 4.
    // Previous equivalent should represent Jul 28-Jul 31.
    expect(
        result.startDate.toISOString() === '2026-07-27T18:30:00.000Z',
        `Wrong startDate: ${result.startDate.toISOString()}`
    );

    expect(
        result.endDate.toISOString() === '2026-07-31T18:29:59.999Z',
        `Wrong endDate: ${result.endDate.toISOString()}`
    );
});

test('getPreviousEquivalentRange rejects missing startDate', () => {
    expectThrows(
        () =>
            getPreviousEquivalentRange({
                endDate: '2026-08-04T23:59:59.999Z',
                timezone: 'Asia/Kolkata'
            }),
        'startDate and endDate are required'
    );
});

test('getPreviousEquivalentRange rejects missing endDate', () => {
    expectThrows(
        () =>
            getPreviousEquivalentRange({
                startDate: '2026-08-01T00:00:00.000Z',
                timezone: 'Asia/Kolkata'
            }),
        'startDate and endDate are required'
    );
});

test('getPreviousEquivalentRange rejects reversed dates', () => {
    expectThrows(
        () =>
            getPreviousEquivalentRange({
                startDate: '2026-08-10T00:00:00.000Z',
                endDate: '2026-08-01T00:00:00.000Z',
                timezone: 'Asia/Kolkata'
            }),
        'startDate must be before or equal to endDate'
    );
});


// ============================================================
// DST timezone test
// ============================================================

test('DST timezone produces correct New York day boundaries', () => {
    const date = new Date('2026-07-15T12:00:00.000Z');

    const start = getStartOfDay(date, 'America/New_York');
    const end = getEndOfDay(date, 'America/New_York');

    expect(
        start.toISOString() === '2026-07-15T04:00:00.000Z',
        `Wrong New York start: ${start.toISOString()}`
    );

    expect(
        end.toISOString() === '2026-07-16T03:59:59.999Z',
        `Wrong New York end: ${end.toISOString()}`
    );
});


// ============================================================
// Final result
// ============================================================

console.log('\n========================================');
console.log(' TEST SUMMARY');
console.log('========================================');
console.log(`Total : ${passed + failed}`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log('========================================\n');

if (failed > 0) {
    process.exit(1);
} else {
    console.log('🎉 All date utility tests passed!\n');
    process.exit(0);
}

