/**
 * calculateTaskAnalytics.js
 *
 * Pure calculator: receives already-fetched data (no Mongo queries in here)
 * and returns { period, summary, trend, priorityBreakdown }.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ASSUMED SHAPES (adjust the field names in the small "adapter" spots below
 * — marked with `// SCHEMA:` — if your real documents differ)
 * ─────────────────────────────────────────────────────────────────────────
 *
 * task = {
 *   _id,
 *   dueDate,        // Date | ISO string — the task's due date
 *   priority,        // "high" | "medium" | "low"
 *   status,          // "pending" | "completed"  (current status, used only
 *                     //   for the *overdue* calculation, not history)
 *   isDeleted,       // boolean — current deletion state
 *   deletedAt,       // Date | ISO string | null — when it was deleted
 * }
 *
 * activity = {
 *   taskId,
 *   action,          // "completed" | "uncompleted"
 *   timestamp,       // Date | ISO string — when the action happened
 * }
 *
 * period = { start, end }   // Date | ISO string, inclusive calendar range
 * timezone = "America/New_York"  // IANA tz string, used for all calendar-
 *                                  // date normalization
 * today = Date | ISO string       // "now", as determined by the caller
 *
 * ─────────────────────────────────────────────────────────────────────────
 */
 
// ============================================================================
// 0. Small date utilities
// ============================================================================
 
/**
 * normalizeDate()
 * Converts any Date/ISO-string into a timezone-aware calendar date string
 * "YYYY-MM-DD". This is the single source of truth for "what calendar day
 * is this" — everything else (applicability, on-time/late, trend bucketing,
 * overdue) is built on top of this.
 */


function normalizeDate(dateInput, timezone){
    if (dateInput == null || dateInput == undefined){
        return null;
    }

    const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
    if(Number.isNaN(date.getTime())){
        throw new Error(`calculateTaskAnalytics : Invalid date ${dateInput}`);
    }

    // en-CA formats as YYYY-MM-DD, which is exactly the calendar-date
    // representation we want, already localized to the given timezone.
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone : timezone,
        year : 'numeric',
        month : '2-digit',
        day : '2-digit'
    });

    return formatter.format(date);
}

/** String comparison works correctly for "YYYY-MM-DD" calendar dates. */
function calendarDateCompare(a, b){
    if(a == b){
        return 0;
    }
    
    return a < b ? -1 : 1;
}

function isCalendarDateInRange(calDate, startCalDate, endCalDate){
    return (
        calendarDateCompare(calDate, startCalDate) >= 0 &&
        calendarDateCompare(calDate, endCalDate) <= 0
    )
}

// Input validation

function validateInput({tasks, taskActivity, period, timezone, today}){
  if (!Array.isArray(tasks)) {
    throw new Error('calculateTaskAnalytics: `tasks` must be an array');
  }

  if (!Array.isArray(taskActivity)) {
    throw new Error('calculateTaskAnalytics: `taskActivity` must be an array');
  }

  if (!period || !period.start || !period.end) {
    throw new Error(
      'calculateTaskAnalytics: `period` must be an object with `start` and `end`'
    );
  }

  if (!timezone || typeof timezone !== 'string') {
    throw new Error('calculateTaskAnalytics: `timezone` must be an IANA tz string');
  }

  if (!today) {
    throw new Error('calculateTaskAnalytics: `today` is required');
  }

  if(calendarDateCompare(
    normalizeDate(period.start, timezone),
    normalizeDate(period.end, timezone)
  ) > 0){
    throw new Error('calculateTaskAnalytics: `period.start` must be <= `period.end`');
  }
}

//  Applicable task population

function getApplicableTasks(tasks, period, timezone){
    const periodStart = normalizeDate(period.start, timezone);
    const periodEnd = normalizeDate(period.end, timezone);

    return tasks.filter((task) => {
        const dueCalDate = normalizeDate(task.dueDate, timezone);
        if(!dueCalDate){
            return false;
        }

        if(!isCalendarDateInRange(dueCalDate, periodStart, periodEnd)){
            return false;
        }

        // SCHEMA: task.isDeleted / task.deletedAt
        if(task.isDeleted){
            const deletedCalDate = normalizeDate(task.deletedAt, timezone);

            if(deletedCalDate && calendarDateCompare(deletedCalDate, dueCalDate) < 0){
                return false;
            }
        }
        return true;
    });
}

// 3. Reconstruct final task state from Task + TaskActivity history
 
/**
 * reconstructTaskState()
 * Replays the sorted activity history for a single task to determine its
 * FINAL analytical state. Never counts raw "completed" activity documents —
 * a complete/uncomplete/complete sequence must resolve to a single final
 * completed state with the *last* completion's timestamp.
 */

function reconstructTaskState(tasks, activitiesForTask){
    const sorted = [...activitiesForTask].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    let isCompleted = false;
    let lastCompletionTimestamp = null;

    for(const activity of sorted){
        if(activity.action === "completed"){
            isCompleted = true;
            lastCompletionTimestamp = activity.timestamp;
        }
        else if(activity.action === "uncompleted"){
            isCompleted = false;
            lastCompletionTimestamp = null;
        }
    }

    return {
        state : isCompleted ? "completed" : "pending",
        finalCompletionTimestamp : lastCompletionTimestamp
    }
}

/**
 * getFinalCompletionDate()
 * Thin wrapper: given the reconstructed state, returns the calendar date of
 * the final completion, or null if the task isn't (finally) completed.
 */
function getFinalCompletionDate(reconstructedState, timezone){
    if (reconstructedState.state !== 'completed') return null;
    if (!reconstructedState.finalCompletionTimestamp) return null;
    return normalizeDate(reconstructedState.finalCompletionTimestamp, timezone);
}

 //Classify completion as on-time vs late (calendar-date based)

 /**
 * classifyCompletion()
 * completion calendar date <= due calendar date  => on time
 * Time of day is irrelevant — only calendar dates are compared.
 */

function classifyCompletion(dueCalDate, completionCalDate){
    if(!completionCalDate){
        return {
            onTime : false,
            late : false
        }
    }

    const onTime = calendarDateCompare(completionCalDate, dueCalDate) <= 0;
    return {onTime, late : !onTime}
}

// 5. Build canonical normalized task records
 
/**
 * buildNormalizedTasks()
 * Ties together getApplicableTasks -> reconstructTaskState ->
 * getFinalCompletionDate -> classifyCompletion into the canonical internal
 * representation described in V1. Downstream aggregators only ever see
 * these records and never need to understand TaskActivity.
 */

function buildNormalizedTasks(applicableTask, taskActivity, timezone){
    const activitiesByTaskId = new Map();

    for(const activity of taskActivity){
        const key = String(activity.taskId);
        if (!activitiesByTaskId.has(key)) activitiesByTaskId.set(key, []);
        activitiesByTaskId.get(key).push(activity);
    }

    return applicableTask.map((task) => {
        const dueCalDate = normalizeDate(task.dueDate, timezone);
        const taskId = String(task._id);
        const activitiesForTask = activitiesByTaskId.get(taskId) || [];

        const reconstructed = reconstructTaskState(task, activitiesForTask);

        if (reconstructed.state === 'completed') {
            const completionDate = getFinalCompletionDate(reconstructed, timezone);
            const { onTime, late } = classifyCompletion(dueCalDate, completionDate);
 
            return {
                taskId,
                dueDate: dueCalDate,
                priority: task.priority,
                state: 'completed',
                completionDate,
                onTime,
                late,
            };
        }
            return {
                taskId,
                dueDate: dueCalDate,
                priority: task.priority,
                state: 'pending',
                completionDate: null,
                onTime: false,
                late: false,
            };
    });
}

//Aggregation: summary

function calculateSummary(normalizedTasks){
    const totalDue = normalizedTasks.length;
    const completed = normalizedTasks.filter((t) => t.state === 'completed').length;
    const onTimeCompleted = normalizedTasks.filter((t) => t.onTime).length;
    const lateCompleted = normalizedTasks.filter((t) => t.late).length;
    const pendingDue = totalDue - completed;

    const completionRate = totalDue === 0 ? null : (completed / totalDue) * 100;
    const onTimeCompletionRate = totalDue === 0 ? null : (onTimeCompleted / totalDue) * 100;


    return{
        totalDue,
        completed,
        onTimeCompleted,
        lateCompleted,
        pendingDue,
        completionRate,
        onTimeCompletionRate
    }
}

//Aggregation: trend (bucketed by DUE date, not completion date)
function calculateTrend(normalizedTasks){
    const byDueDate = new Map();

    for(const task of normalizedTasks){
        if(!byDueDate.has(task.dueDate)){
            byDueDate.set(task.dueDate, {date : task.dueDate, due : 0, completed : 0, onTime : 0, late : 0});
        }
        const bucket = byDueDate.get(task.dueDate);
        bucket.due += 1;
            if (task.state === 'completed') bucket.completed += 1;
            if (task.onTime) bucket.onTime += 1;
            if (task.late) bucket.late += 1;
    }

    return [...byDueDate.values()].sort((a,b) => calendarDateCompare(a.date, b.date));
}

//Aggregation: priority breakdown
function calculatePriorityBreakdown(normalizedTasks){
    const priorities = ['high', 'medium', 'low'];
    const breakdown = {};

    for(const priority of priorities){
        const tasksForPriority = normalizedTasks.filter((t) => t.priority === priority);
        const due = tasksForPriority.length;
        const completed = tasksForPriority.filter((t) => t.state === 'completed').length;

        breakdown[priority] = {
            due, 
            completed,
            completionRate : due === 0 ? null : (completed / due) * 100
        }
    }

    return breakdown;
}

// Overdue — current-state based, NOT derived from the period population
function calculateOverdue(tasks, today, timezone){
    const todayCalDate = normalizeDate(today, timezone);

    return tasks.filter((task) => {
        if(task.isDeleted){
            return false;
        }
        if(task.status !== 'pending'){
            return false;
        }

        const dueCalDate = normalizeDate(task.dueDate, timezone);
        if(!dueCalDate){
            return false;
        }

        return calendarDateCompare(dueCalDate, todayCalDate) < 0;
    }).length;
}

/**
 * calculateTaskAnalytics()
 *
 * @param {Object} params
 * @param {Array} params.tasks
 * @param {Array} params.taskActivity
 * @param {{start: Date|string, end: Date|string}} params.period
 * @param {string} params.timezone
 * @param {Date|string} params.today
 * @returns {{ period: Object, summary: Object, trend: Array, priorityBreakdown: Object }}
 */

function calculateTaskAnalytics({tasks, taskActivity, period, timezone, today}){
    validateInput({tasks, taskActivity, period, timezone, today});

    const applicableTasks = getApplicableTasks(tasks, period, timezone);
    const normalizedTasks = buildNormalizedTasks(applicableTasks, taskActivity, timezone);

    const summary = calculateSummary(normalizedTasks);
    summary.overdue = calculateOverdue(tasks, today, timezone);

    const trend = calculateTrend(normalizedTasks);
    const priorityBreakdown = calculatePriorityBreakdown(normalizedTasks);

    return {
        period : {
            start : normalizeDate(period.start, timezone),
            end : normalizeDate(period.end, timezone)
        },

        summary,
        trend,
        priorityBreakdown
    };
}

module.exports = {
    calculateTaskAnalytics,
    normalizeDate,
    getApplicableTasks,
    reconstructTaskState,
    getFinalCompletionDate,
    classifyCompletion,
    buildNormalizedTasks,
    calculateSummary,
    calculateTrend,
    calculatePriorityBreakdown,
    calculateOverdue,
}