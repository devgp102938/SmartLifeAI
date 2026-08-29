/**
 * calculateDailyCheckInAnalytics.js
 *
 * Pure calculator: receives already-fetched data (no Mongo queries in here)
 * and returns { period, summary, moodDistribution, trend, reflectionMetrics,
 * checkInBreakdown } per the locked V1 spec.
 *
 *
 * checkIn = {                          // matches DailyCheckIn model exactly
 *   _id,
 *   date,          // String "YYYY-MM-DD" — already a plain calendar date,
 *                   //   NOT a Date object. No timezone conversion needed
 *                   //   for this field; it's compared as-is.
 *   moodScore,      // Number 1-5
 *   mood,           // String enum: happy|calm|excited|neutral|tired|
 *                   //   stressed|anxious|sad|frustrated
 *   energy,         // Number 1-5
 *   productivity,   // Number 1-5
 *   reflection,     // String, may be ""
 *   isDeleted,      // Boolean
 *   deletedAt,      // Date | null
 * }
 *
 * period = { start, end }   // Date | ISO string, inclusive calendar range
 * timezone = "America/New_York"  // IANA tz string — used ONLY to convert
 *                                  // period.start / period.end / today into
 *                                  // calendar-date strings; checkIn.date is
 *                                  // already a calendar-date string.
 * today = Date | ISO string       // "now", as determined by the caller
 *
 *
 */
 
/**
 * normalizeDate()
 * Converts any Date/ISO-string into a timezone-aware calendar date string
 * "YYYY-MM-DD". Used only for period.start / period.end / today — never for
 * checkIn.date, which is already in this format.
 */

function normalizeDate(dateInput, timezone){
    if(dateInput == null || dateInput == undefined){
        return null;
    }

    const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
    if(Number.isNaN(date.getTime())){
        throw new Error(`{calculateDailyCheckInAnalytics} : Invalid Date Input : ${dateInput}`);
    }

    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone : timezone,
        year : 'numeric',
        month : '2-digit',
        day : '2-digit'
    });

    return formatter.format(date); // YYYY-MM-DD
}

function calenderDateCompare(a, b){
    if(a == b){
        return 0;
    }
    
    return a < b ? -1 : 1;
}

function isCalederDateInRange(calDate, startCalDate, endCalDate){
    return (
        calenderDateCompare(calDate, startCalDate) >= 0 &&
        calenderDateCompare(calDate, endCalDate) <= 0
    );
}

/**
 * getCalendarDatesInRange()
 * Pure string/UTC-based day-by-day enumeration between two "YYYY-MM-DD"
 * calendar dates (inclusive). Safe to do in UTC because both inputs are
 * already timezone-resolved calendar dates, not instants.
 */

function getCalendarDatesInRange(startCalDate, endCalDate){
    const dates = [];
    const cursor = new Date(`${startCalDate}T00:00:00Z`);
    const end = new Date(`${endCalDate}T00:00:00Z`);

    while(cursor.getTime() <= end.getTime()){
        dates.push(cursor.toISOString().slice(0, 10));
        cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    return dates;
}

//Input validation

function validateInput({checkIns, period, timezone, today}){
    if(!Array.isArray(checkIns)){
        throw new Error('calculateDailyCheckInAnalytics: `checkIns` must be an array');
    }

    if(!period || !period.start || !period.end){
        throw new Error('calculateDailyCheckInAnalytics: `period` must be an object with `start` and `end`');
    }

    if(!timezone || typeof timezone !== 'string'){
        throw new Error('calculateDailyCheckInAnalytics: `timezone` must be an IANA tz string');
    }

    if(!today){
        throw new Error('calculateDailyCheckInAnalytics: `today` is required');
    }

    if(
        calenderDateCompare(
            normalizeDate(period.start, timezone),
            normalizeDate(period.end, timezone)
        ) > 0
    ){
        throw new Error('calculateDailyCheckInAnalytics: `period.start` must be <= `period.end`');
    }
}

// Active check-in population

/**
 * getActiveCheckIns()
 * "Active" = not soft-deleted. In-period = checkIn.date falls inside the
 * period's calendar-date range. Because checkIn.date is already a plain
 * "YYYY-MM-DD" string, no per-record timezone conversion is needed here.
 */

function getActiveCheckIns(checkIns, period, timezone){
    const periodStart = normalizeDate(period.start, timezone);
    const periodEnd = normalizeDate(period.end, timezone);

    return checkIns.filter((checkIns) => {
        if(checkIns.isDeleted){
            return false;
        }
        if(!checkIns.date){
            return false;
        }
        return isCalederDateInRange(checkIns.date, periodStart, periodEnd);
    });
}

// Build canonical normalized check-in records

/**
 * buildNormalizedCheckIns()
 * Canonical internal representation. Downstream aggregators only ever see
 * these records.
 */

function buildNormalizedCheckIns(activeCheckIns){
    return activeCheckIns.map((checkIn) => ({
        date : checkIn.date,
        mood : checkIn.mood,
        moodScore : checkIn.moodScore,
        energy : checkIn.energy,
        productivity : checkIn.productivity,
        hasReflection : Boolean(checkIn.reflection && checkIn.reflection.trim().length > 0),
    }))
    .sort((a, b) => calenderDateCompare(a.date, b.date));
}

//Averages

function averages(values){
    if(values.length === 0){
        return null;
    }
    
    const sum = values.reduce((acc, v) => acc + v, 0);
    return sum / values.length
}

function calculateAverages(normalizedCheckIns){
    return {
        averageMood : averages(normalizedCheckIns.map((c) => c.moodScore)),
        averageEnergy : averages(normalizedCheckIns.map((c) => c.energy)),
        averageProductivity : averages(normalizedCheckIns.map((c) => c.productivity))
    };
}

//Mood distribution
const MOOD_CATEGORIES = [
    "happy",
    "calm",
    "excited",
    "neutral",
    "tired",
    "stressed",
    "anxious",
    "sad",
    "frustrated"
]

/**
 * calculateMoodDistribution()
 * All known mood categories are always present in the output (0 if unused),
 * mirroring the always-present-keys pattern used for priority breakdowns
 * elsewhere in this codebase, so user never need to guard for a
 * missing key.
 */
function calculateMoodDistribution(normalizedCheckIns){
    const distribution = {};

    for(const mood of MOOD_CATEGORIES){
        distribution[mood] = 0;
    }

    for(const checkIn of normalizedCheckIns){
        if(Object.prototype.hasOwnProperty.call(distribution, checkIn.mood)){
            distribution[checkIn.mood] += 1;
        }
    }

    return distribution;
}

// Countable days (drives both consistencyRate and missingDays)
/**
 * getCountableDays()
 * A day "counts" toward expectedDays/missingDays only once it has fully
 * ended: it must be >= period.start, <= period.end, AND strictly before
 * today's calendar date. This automatically satisfies both locked rules:
 *   - "Today is not considered missing until the day ends"
 *   - "Future dates are never counted"
 */

function getCountableDays(period, today, timezone){
    const periodStart = normalizeDate(period.start, timezone);
    const periodEnd = normalizeDate(period.end, timezone);
    const todayCalDate = normalizeDate(today, timezone);

    return getCalendarDatesInRange(periodStart, periodEnd).filter(
        (calDate) => calenderDateCompare(calDate, todayCalDate) < 0
    );
}


// Missing days (count) + consistency rate
function calculateMissingDaysCount(normalizedCheckIns, countableDays){
    const checkInDates = new Set(normalizedCheckIns.map((c) => c.date));
    return countableDays.filter((day) => !checkInDates.has(day)).length;
}

/**
 * calculateConsistencyRate()
 * (totalCheckIns / expectedDays) × 100, expectedDays = countableDays.length.
 * expectedDays === 0 → null.
 */

function calculateConsistencyRate(totalCheckIns, expectedDays){
    return expectedDays === 0 ? null : (totalCheckIns / expectedDays ) * 100;
}

// Trend
function calculateTrend(normalizedCheckIns){
    return normalizedCheckIns.map(
        (c) => ({
            date : c.date,
            mood : c.mood,
            moodScore : c.moodScore,
            energy : c.energy,
            productivity : c.productivity,
        })
    );
}

// Reflection metrics

function calculateReflectionMetrics(normalizedCheckIns, totalCheckIns){
    const totalReflections  = normalizedCheckIns.filter((c) => c.hasReflection).length;

    const reflectionRate = totalCheckIns === 0 ? null : (totalReflections / totalCheckIns) * 100;

    return {totalReflections, reflectionRate};
}

//Check-in breakdown

function calculateCheckInBreakdown(normalizedCheckIns){
    return normalizedCheckIns.map(
        (c) => ({
            date : c.date,
            mood : c.mood,
            moodScore : c.moodScore,
            energy : c.energy,
            productivity : c.productivity,
            hasReflection : c.hasReflection
        })
    );
}

/**
 * calculateDailyCheckInAnalytics()
 *
 * @param {Object} params
 * @param {Array} params.checkIns
 * @param {{start: Date|string, end: Date|string}} params.period
 * @param {string} params.timezone
 * @param {Date|string} params.today
 * @returns {{
 *   period: Object,
 *   summary: Object,
 *   moodDistribution: Object,
 *   trend: Array,
 *   reflectionMetrics: Object,
 *   checkInBreakdown: Array
 * }}
 */

function calculateDailyCheckInAnalytics({ checkIns, period, timezone, today}){
    validateInput({ checkIns, period, timezone, today});

    const activeCheckIns = getActiveCheckIns(checkIns, period, timezone);
    const normalizedCheckIns = buildNormalizedCheckIns(activeCheckIns);

    const totalCheckIns = normalizedCheckIns.length;

    const { averageMood, averageEnergy, averageProductivity } = calculateAverages(normalizedCheckIns);

    const countableDays = getCountableDays(period, today, timezone);
    const missingDays= calculateMissingDaysCount(normalizedCheckIns, countableDays);
    const consistencyRate = calculateConsistencyRate(totalCheckIns, countableDays.length);

    const moodDistribution = calculateMoodDistribution(normalizedCheckIns);
    const trend = calculateTrend(normalizedCheckIns);
    const reflectionMetrics = calculateReflectionMetrics(normalizedCheckIns, totalCheckIns);
    const checkInBreakdown = calculateCheckInBreakdown(normalizedCheckIns);


    return{
        period : {
            start : normalizeDate(period.start, timezone),
            end : normalizeDate(period.end, timezone)
        },

        summary : {
            totalCheckIns,
            averageMood,
            averageEnergy,
            averageProductivity,
            consistencyRate,
            missingDays
        },
        moodDistribution,
        trend,
        reflectionMetrics,
        checkInBreakdown
    };
}

module.exports = {
    calculateDailyCheckInAnalytics,
    //exported individually for unit testing  
    normalizeDate,
    getCalendarDatesInRange,
    getActiveCheckIns,
    buildNormalizedCheckIns,
    calculateAverages,
    calculateMoodDistribution,
    getCountableDays,
    calculateMissingDaysCount,
    calculateConsistencyRate,
    calculateTrend,
    calculateReflectionMetrics,
    calculateCheckInBreakdown,
}