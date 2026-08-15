/* INPUT SHAPES (plain objects/arrays — Mongoose docs should be lean()'d
 * or otherwise plainified by the caller before this is called):
 *
 *   medicines: [{
 *     id,                 // string — Medicine._id
 *     name,
 *     startDate,          // Date|string
 *     endDate,            // Date|string
 *     isDeleted,          // boolean
 *     deletedAt,          // Date|string|null
 *   }]
 *
 *   schedules: [{
 *     id,                 // string — MedicineSchedule._id (this IS the
 *                         // "schedule version" — each doc is one version)
 *     medicineId,         // string — Medicine._id this schedule belongs to
 *     times,              // string[] — "HH:mm", e.g. ["08:00","20:00"]
 *     scheduleType,       // 'daily' | 'specific-days'
 *     daysOfWeek,         // string[] lowercase weekday names, only used
 *                         // when scheduleType === 'specific-days'
 *     effectiveFrom,      // Date|string
 *     effectiveUntil,     // Date|string|null
 *     version,            // number
 *   }]
 *
 *   logs: [{
 *     medicineId,         // string
 *     scheduleId,         // string — MedicineLog.schedule
 *     scheduledDate,      // Date|string
 *     scheduledTime,      // "HH:mm"
 *     status,             // 'taken' | 'skipped'
 *   }]
 *
 *   periodStart, periodEnd: Date|string — the requested analytics window
 *   now: Date                — current moment (calendar day AND clock time
 *                              both come from this, resolved via timezone)
 *   timezone: string         — IANA timezone, e.g. "Asia/Kolkata"
 *
 * OUTPUT: matches the V1 output contract exactly —
 *   { period, summary, trend, medicineBreakdown }
 * ---------------------------------------------------------------------
 */
 
// ------------------------------- date/time helpers -------------------------------
 
/**
 * Normalize a Date, ISO string, or plain 'YYYY-MM-DD' string into a
 * calendar-day string 'YYYY-MM-DD', evaluated in the given IANA timezone.
 */

function normalizeDate(input, timezone){
    if(input === null || input === undefined){ return null; }

    if(typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input)){
        return input;
    }

    const date = input instanceof Date ? input : new Date(input);

    if(Number.isNaN(date.getTime())){
        throw new Error(`calculateMedicineCompliance: invalid date "${input}"`);
    }

    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone : timezone,
        year : 'numeric',
        month : '2-digit',
        day : '2-digit'
    });

    return formatter.format(date);
}

function normalizeTimeOfDay(now, timezone){
    const date = now instanceof Date ? now : new Date(now);

    if(Number.isNaN(date.getTime())){
        throw new Error(`calculateMedicineCompliance : Invalid Date Input ${now}`);
    }

    const fromatter = new Intl.DateTimeFormat('en-GB', {
        timeZone : timezone,
        hour : '2-digit',
        minute : '2-digit',
        hour12 : false
        });
    return fromatter.format(date); // en-GB formats as HH:mm
}

function addDays(dayString, days){
    const [y, m , d] = dayString.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    dt.setUTCDate(dt.getUTCDate() + days);
    return dt.toISOString().slice(0, 10);
}

function enumerateDays(start, end){
    const days = [];
    let cursor = start;
    while(cursor <= end){
        days.push(cursor);
        cursor = addDays(cursor, 1);
    }
    return days;
}

const WEEKDAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

/**
 * Weekday name for a 'YYYY-MM-DD' string, using the same convention as
 * the existing controller code: (getDay() + 6) % 7 => Monday = 0.
 */

function getWeekdayName(dayString){
    const [y, m , d] = dayString.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    return WEEKDAYS[(dt.getUTCDay() + 6) % 7];
}

function minDatestr(...dates){
    return dates.filter((d) => d !== null && d !== undefined).sort()[0];
}


 
/**
 * Build a lookup key matching the MedicineLog unique index:
 * user+medicine+schedule+scheduledDate+scheduledTime (user is constant
 * per calculator invocation, so it's omitted here).
 */

function doseKey({medicineId, scheduleId, scheduledDate, scheduledTime}){
    return `${medicineId} : ${scheduleId} : ${scheduledDate} : ${scheduledTime}`;
}

/**
 * Find the schedule version effective on a given date, mirroring the
 * exact query used by takeDose/skipDose in medicineController.js:
 *   effectiveFrom <= date AND (effectiveUntil is null OR effectiveUntil >= date)
 * picking the one with the latest effectiveFrom.
 *
 * This is what makes historical reconstruction schedule-version-aware
 * instead of just using "whatever the current schedule is".
 */

function getEffectiveSchedule(scheduleForMedicine, dateStr){
    let best = null;
    for(const schedule of scheduleForMedicine){
        if(schedule.effectiveFrom > dateStr){ continue; }
        if(schedule.effectiveUntil !== null && schedule.effectiveUntil < dateStr){
            continue;
        }
        if(!best || schedule.effectiveFrom > best.effectiveFrom){
            best = schedule;
        }
    }
    return best;
}

function isScheduleDay(schedule, dateStr){
    if(schedule.scheduleType === 'daily'){
        return true;
    }
    if(schedule.scheduleType === 'specific-days'){
        return schedule.daysOfWeek.includes(getWeekdayName(dateStr));
    }

    return false;
}

/**
 * Classify a single expected dose opportunity per the state machine in
 * the spec:
 *
 *   not yet due            -> 'future'   (excluded from expectedDoses)
 *   due, log taken          -> 'taken'
 *   due, log skipped        -> 'skipped'
 *   due, no log, is today   -> 'dueUnlogged'
 *   due, no log, is past    -> 'missed'
 */

function classifyDose(dose,todayStr, nowTimeStr, logIndex){
    const isToday = dose.scheduledDate === todayStr;
    const isFutureDay = dose.scheduledDate > todayStr;

    if(isFutureDay){
        return 'future';
    }
    if(isToday && dose.scheduledTime > nowTimeStr)
        return 'future';

    const log = logIndex.get(doseKey(dose));
    if(log === 'taken') return 'taken';
    if(log === 'skipped') return 'skipped';

    return isToday ? 'dueUnlogged' : 'missed';
}

/**
 * Resolve a medicine's current-state status. Deleted takes priority over
 * date-range status, per the spec ("Deleted medicines ... never count as
 * currently active").
 */

function getMedicineStatus(medicine, todayStr){
    if(medicine.isDeleted){
        return 'deleted';
    }
    if(medicine.startDateStr > todayStr){
        return 'upcoming';
    }
    if(medicine.endDateStr < todayStr){
        return 'finished';
    }

    return 'active';
}

//aggregation
function emptyCount(){
    return {expected : 0, taken : 0, skipped : 0, missed : 0, dueUnlogged : 0};
}

function addDoseToCount(counts, classification){
    counts.expected += 1;
    counts[classification] += 1;
}

function adherenceRate(counts){
    return counts.expected === 0 ? null : (counts.taken / counts.expected) * 100;
}

function aggregateSummary(classifiedDoses, normalizedMedicines, todayStr){
    const counts = emptyCount();
    for(const dose of classifiedDoses){
        addDoseToCount(counts, dose.classification);
    }

    const activeMedicines = normalizedMedicines.filter(
        (m) => !m.isDeleted && m.startDateStr <= todayStr && m.endDateStr >= todayStr
    ).length;

    return {
        expectedDoses : counts.expected,
        takenDoses : counts.taken,
        skippedDoses : counts.skipped,
        missedDoses : counts.missed,
        dueUnloggedDoses : counts.dueUnlogged,
        adherenceRate : adherenceRate(counts),
        activeMedicines, 
    };
}

/**
 * Trend covers every calendar day in [periodStart, min(periodEnd, today)],
 * including days with zero expected doses (e.g. no medicine applicable
 * that day), so charts don't have silent gaps. Days entirely after
 * "today" are excluded, since nothing can be due yet.
 */
function aggregateTrend(classifiedDoses, periodStartStr, periodEndStr, todayStr){
    const trendEnd = periodEndStr < todayStr ? periodEndStr : todayStr;
    
    if(periodStartStr > trendEnd){
        return [];
    }

    const byDate = new Map();
    for(const day of enumerateDays(periodStartStr, trendEnd)){
        byDate.set(day, emptyCount());
    }

    for(const dose of classifiedDoses){
        const counts = byDate.get(dose.scheduledDate);
        if(counts){
            addDoseToCount(counts, dose.classification);
        }
    }

    return Array.from(byDate.entries()).map(([date, counts]) => ({
        date,
        expected : counts.expected,
        taken : counts.taken,
        skipped : counts.skipped,
        missed : counts.missed,
        dueUnlogged : counts.dueUnlogged,
        adherenceRate : adherenceRate(counts),
    }));
}

/**
 * Breakdown includes every medicine passed in, even ones that produced
 * zero classified doses this period (e.g. upcoming medicines), so the
 * caller always gets a complete per-medicine row.
 */

function aggregateMedicineBreakdown(classifiedDoses, normalizedMedicines, todayStr){
    const byMedicine = new Map();
    for(const medicine of normalizedMedicines){
        byMedicine.set(medicine.id, emptyCount());
    }

    for(const dose of classifiedDoses){
        const counts = byMedicine.get(dose.medicineId);
        if(counts){
            addDoseToCount(counts, dose.classification);
        }
    }
    return normalizedMedicines.map((medicine) => {
        const count = byMedicine.get(medicine.id);
        return{
            medicineId : medicine.id,
            name : medicine.name,
            expectedDoses : count.expected,
            takenDoses: count.taken,
            skippedDoses: count.skipped,
            missedDoses: count.missed,
            dueUnloggedDoses : count.dueUnlogged,
            adherenceRate : adherenceRate(count),
            status : getMedicineStatus(medicine, todayStr),
        };
    });
}

/**
 * @param {Object} params
 * @param {Array} params.medicines
 * @param {Array} params.schedules
 * @param {Array} params.logs
 * @param {Date|string} params.periodStart
 * @param {Date|string} params.periodEnd
 * @param {Date} params.now
 * @param {string} params.timezone
 * @returns {{period: object, summary: object, trend: Array, medicineBreakdown: Array}}
 */

function calculateMedicineCompliance({medicines, schedules, logs, periodStart, periodEnd, now, timezone}){
    if(!timezone){
        throw new Error(`calculateMedicineCompliance : Timezone is required`);
    }

    if(!now){
        throw new Error(`calculateMedicineCompliance : Now is required`);
    }

    const periodStartStr = normalizeDate(periodStart, timezone);
    const periodEndStr = normalizeDate(periodEnd, timezone);
    const todayStr = normalizeDate(now, timezone);
    const nowTimeStr = normalizeTimeOfDay(now, timezone);

    if(!periodStartStr || !periodEndStr){
        throw new Error(`calculateMedicineCompliance : periodStart and periodEnd are required`);
    }

    // Normalize medicines once, up front — every downstream helper works
    // off calendar-day strings rather than re-resolving timezones per dose.

    const normalizedMedicines = (medicines || []).map((m) => {
        const startDateStr = normalizeDate(m.startDate, timezone);
        const endDateStr = normalizeDate(m.endDate, timezone);

        // Deletion boundary: the calendar day a medicine was deleted on.
        // Exact same-day-deletion semantics are deferred (per spec) to the
        // global date/timezone stage — here we treat the deletion day itself
        // as still applicable, and only days AFTER it as cut off, mirroring
        // the Habit soft-deletion rule (effectiveEnd = min(endDate, deletion
        // boundary)).  

        const deletionBoundaryStr = 
            m.isDeleted && m.deletedAt ? normalizeDate(m.deletedAt, timezone) : null;

            return {
                id : String(m.id),
                name : m.name,
                startDateStr,
                endDateStr,
                isDeleted : !!m.isDeleted,
                deletionBoundaryStr
            };
    });

    //index schedule by medicine , with dates normalized once
    const schedulesByMedicine = new Map();
    for(const s of schedules || []){
        const medicineId = String(s.medicineId);
        const normalizedSchedule = {
            id : String(s.id),
            medicineId,
            times: s.times,
            scheduleType : s.scheduleType,
            daysOfWeek: (s.daysOfWeek || []).map((d) => d.toLowerCase()),
            effectiveFrom : normalizeDate(s.effectiveFrom, timezone),
            effectiveUntil : s.effectiveUntil ? normalizeDate(s.effectiveUntil, timezone) : null,
            version : s.version
        };

        if(!schedulesByMedicine.has(medicineId)){
            schedulesByMedicine.set(medicineId, []);
        }
        schedulesByMedicine.get(medicineId).push(normalizedSchedule);
    }

    // Index logs by dose identity (medicine + schedule version + date + time).
    const logIndex = new Map();
    for(const log of logs || []){
        const key = doseKey({
            medicineId : String(log.medicineId),
            scheduleId : String(log.scheduleId),
            scheduledDate : normalizeDate(log.scheduledDate, timezone),
            scheduledTime : log.scheduledTime 
        });
        logIndex.set(key, log.status);
    }

    // ---- expected dose reconstruction (per medicine, per applicable day) ----
    const classifiedDoses = [];
    for(const medicine of normalizedMedicines){
        let effectiveEnd = minDatestr(
            medicine.endDateStr,
            medicine.deletionBoundaryStr,
            todayStr,
            periodEndStr
        );
        const effectiveStart = 
        medicine.startDateStr > periodStartStr ? medicine.startDateStr : periodStartStr;

        if(effectiveStart > effectiveEnd){ continue; }
        const medSchedules = schedulesByMedicine.get(medicine.id) || [];
   

        for(const dateStr of enumerateDays(effectiveStart, effectiveEnd)){
            const schedule = getEffectiveSchedule(medSchedules, dateStr);

            if(!schedule){ continue; }
            if(!isScheduleDay(schedule, dateStr)){ continue; }

            for(const scheduledTime of schedule.times){
                const dose = {
                    medicineId : medicine.id,
                    scheduleId : schedule.id,
                    scheduleVersion : schedule.version,
                    scheduledDate : dateStr,
                    scheduledTime,
                };

                const classification = classifyDose(dose, todayStr, nowTimeStr, logIndex);
                if(classification === 'future'){
                    continue;
                }

                classifiedDoses.push({...dose, classification});
        }
    }
}

        return {
            period : {startDate : periodStartStr, endDate : periodEndStr},
            summary : aggregateSummary(classifiedDoses, normalizedMedicines, todayStr),
            trend : aggregateTrend(classifiedDoses, periodStartStr, periodEndStr, todayStr),
            medicineBreakdown : aggregateMedicineBreakdown(
                classifiedDoses,
                normalizedMedicines,
                todayStr
        ),
    }
}

module.exports = {
    calculateMedicineCompliance
}

