/**
 * Normalize any accepted date input (Date object, ISO string, or a plain
 * 'YYYY-MM-DD' string) into a calendar-day string 'YYYY-MM-DD', evaluated
 * in the given IANA timezone. This is what lets a UTC-stored Date and a
 * calendar-date concept ("July 23") agree on which day it actually is.
 *
 * @param {Date|string|null|undefined} input
 * @param {string} timezone - IANA timezone, e.g. "America/New_York"
 * @returns {string|null} 'YYYY-MM-DD' or null if input is null/undefined
 */

function normalizeDate(input, timezone){
    if(input === null || input === undefined){
        return null;
    }

    if(typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input)){
        const [y, m , d] = input.split("-").map(Number);

        const date = new Date(Date.UTC(y, m - 1, d));

        if(date.toISOString().slice(0, 10) !== input){
            throw new Error(`calculateHabitStreak : Invalid Date Input ${input}`);
        }

        return input;
    }

    const date = input instanceof Date ? input : new Date(input);

    if(Number.isNaN(date.getTime())){
        throw new Error(`calculateHabitStreak : Invalid Date Input ${input}`);
    }

    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone : timezone,
        year : 'numeric',
        month : '2-digit',
        day : '2-digit'
    });

    return formatter.format(date); // en-CA formats as YYYY-MM-DD
}

/**
 * Add `days` calendar days to a 'YYYY-MM-DD' string, returning a new
 * 'YYYY-MM-DD' string. Arithmetic is done on a UTC-anchored Date to avoid
 * any local-timezone drift, since the input string is already the
 * resolved calendar day.
 *
 * @param {string} dayString - 'YYYY-MM-DD'
 * @param {number} days
 * @returns {string}
 */

function addDays(dayString, days){
    const [y, m , d] = dayString.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    dt.setUTCDate(dt.getUTCDate() + days);

    return dt.toISOString().slice(0, 10);
}

/**
 * Enumerate every 'YYYY-MM-DD' calendar day from start to end, inclusive.
 * Assumes start <= end.
 *
 * @param {string} start - 'YYYY-MM-DD'
 * @param {string} end - 'YYYY-MM-DD'
 * @returns {string[]}
 */

function enumerateDays(start, end){
    const days = [];

    let cursor = start; 
    while(cursor <= end){
        days.push(cursor);
        cursor = addDays(cursor, 1);
    }

    return days;
}

/**
 * Calculate current and longest streak for a single habit.
 *
 * @param {Object} params
 * @param {Date|string} params.habitStartDate - Habit.startDate
 * @param {Date|string|null} params.habitEndDate - Habit.endDate. Callers
 *   handling a soft-deleted habit should pass the already-clipped
 *   effective end date (min(habit.endDate, deletionBoundary)), per the
 *   spec's soft-deletion rule — this module does not know about deletion.
 * @param {Array<Date|string>} params.completionDates - Dates on which a
 *   valid HabitHistory record exists for this habit (one per calendar
 *   day; duplicates are safely ignored).
 * @param {Date|string} params.today - "Now", as a calendar day.
 * @param {string} params.timezone - IANA timezone used to resolve all of
 *   the above into consistent calendar days.
 *
 * @returns {{ currentStreak: number, longestStreak: number }}
 */

function calculateHabitStreak({
    habitStartDate,
    habitEndDate,
    completionDates,
    today,
    timezone : timeZone,
}){
    if(!timeZone){
        throw new Error(`calculateHabitStreak : Timezone is required`);
    }

    const startDate = normalizeDate(habitStartDate, timeZone);
    const endDate = normalizeDate(habitEndDate, timeZone);
    const todayDate = normalizeDate(today, timeZone);

    if(!startDate || !todayDate){
        throw new Error(`calculateHabitStreak : startDate and todayDate are required`);
    }

    const completedSet = new Set();

    for(const completionDate of completionDates || []){
        const normalized = normalizeDate(completionDate, timeZone);

        if(normalized !== null){
            completedSet.add(normalized);
        }
    }

    const effectiveEnd = endDate !== null && endDate < todayDate ? endDate : todayDate;
    
    if(startDate > effectiveEnd){
        return {currentStreak : 0, longestStreak : 0};
    }

    const days = enumerateDays(startDate, effectiveEnd);

    // ---- longestStreak: plain longest run of completed applicable days ----

    let longestStreak = 0;
    let run = 0;

    for(const day of days){
        if(completedSet.has(day)){
            run += 1;
            longestStreak = Math.max(longestStreak, run);
        }
        else{
            run = 0
        }
    }

    // ---- currentStreak: run ending at the current end of the sequence ----
    // If the last applicable day is today and today has no completion yet,
    // it is "incomplete but not missed" — skip it rather than treating it
    // as a break, and evaluate the streak as of yesterday instead.

    let pointer = days.length - 1;
    const lastDay = days[pointer];
    if(lastDay === todayDate && !completedSet.has(todayDate)){
        pointer -= 1;
    }

    let currentStreak = 0;
    for(let i = pointer; i >= 0; i--){
        if(completedSet.has(days[i])){
            currentStreak += 1;
        }
        else{
            break;
        }
    }

    return {currentStreak, longestStreak};
}

module.exports = {calculateHabitStreak};