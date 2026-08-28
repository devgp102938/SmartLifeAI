const assert = require("assert");

const {
    calculateTaskAnalytics,
    normalizeDate,
    reconstructTaskState,
    classifyCompletion,
} = require("./utils/calculateTaskAnalytics.js");

// ============================================================
// TEST RUNNER
// ============================================================

let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        fn();
        passed++;
        console.log(`PASS: ${name}`);
    } catch (error) {
        failed++;
        console.log(`FAIL: ${name}`);
        console.log(`      ${error.message}`);
    }
}

function expectThrow(fn, messagePart) {
    assert.throws(fn, (error) => {
        return error.message.includes(messagePart);
    });
}


// ============================================================
// TEST HELPERS
// ============================================================

const TZ = "UTC";

function makeTask(overrides = {}) {
    return {
        _id: "task-1",
        dueDate: "2026-08-10T12:00:00Z",
        priority: "medium",
        status: "pending",
        isDeleted: false,
        deletedAt: null,

        ...overrides,
    };
}


function makeActivity(taskId, action, timestamp) {
    return {
        taskId,
        action,
        timestamp,
    };
}


function runAnalytics({
    tasks = [],
    taskActivity = [],
    period = {
        start: "2026-08-01T00:00:00Z",
        end: "2026-08-31T23:59:59Z",
    },
    timezone = TZ,
    today = "2026-08-20T12:00:00Z",
} = {}) {

    return calculateTaskAnalytics({
        tasks,
        taskActivity,
        period,
        timezone,
        today,
    });
}


// ============================================================
// 1. INPUT VALIDATION
// ============================================================

test("1. tasks must be an array", () => {

    expectThrow(
        () => runAnalytics({
            tasks: {}
        }),
        "`tasks` must be an array"
    );

});


test("1. taskActivity must be an array", () => {

    expectThrow(
        () => runAnalytics({
            taskActivity: {}
        }),
        "`taskActivity` must be an array"
    );

});


test("1. period is required", () => {

    expectThrow(
        () => calculateTaskAnalytics({
            tasks: [],
            taskActivity: [],
            timezone: TZ,
            today: "2026-08-20T00:00:00Z",
        }),
        "`period` must be an object"
    );

});


test("1. timezone is required", () => {

    expectThrow(
        () => calculateTaskAnalytics({
            tasks: [],
            taskActivity: [],
            period: {
                start: "2026-08-01",
                end: "2026-08-31"
            },
            today: "2026-08-20",
        }),
        "`timezone` must be an IANA tz string"
    );

});


test("1. today is required", () => {

    expectThrow(
        () => calculateTaskAnalytics({
            tasks: [],
            taskActivity: [],
            period: {
                start: "2026-08-01",
                end: "2026-08-31"
            },
            timezone: TZ,
        }),
        "`today` is required"
    );

});


test("1. period start cannot be after period end", () => {

    expectThrow(
        () => runAnalytics({
            period: {
                start: "2026-08-31T00:00:00Z",
                end: "2026-08-01T00:00:00Z",
            },
        }),
        "`period.start` must be <= `period.end`"
    );

});


// ============================================================
// 2. DUE-DATE POPULATION
// ============================================================

test("2. includes due dates inside inclusive period", () => {

    const result = runAnalytics({

        tasks: [

            makeTask({
                _id: "start",
                dueDate: "2026-08-01T00:00:00Z"
            }),

            makeTask({
                _id: "middle",
                dueDate: "2026-08-15T12:00:00Z"
            }),

            makeTask({
                _id: "end",
                dueDate: "2026-08-31T23:59:59Z"
            }),

            makeTask({
                _id: "before",
                dueDate: "2026-07-31T23:59:59Z"
            }),

            makeTask({
                _id: "after",
                dueDate: "2026-09-01T00:00:00Z"
            }),

        ],

    });

    assert.equal(result.summary.totalDue, 3);

});


test("2. excludes null dueDate", () => {

    const result = runAnalytics({

        tasks: [
            makeTask({
                dueDate: null
            })
        ],

    });

    assert.equal(result.summary.totalDue, 0);

});


// ============================================================
// 3. SOFT DELETION
// ============================================================

test("3. excludes task deleted before due date", () => {

    const result = runAnalytics({

        tasks: [

            makeTask({
                isDeleted: true,
                deletedAt: "2026-08-09T12:00:00Z",
            }),

        ],

    });

    assert.equal(result.summary.totalDue, 0);

});


test("3. includes task deleted after due date", () => {

    const result = runAnalytics({

        tasks: [

            makeTask({
                isDeleted: true,
                deletedAt: "2026-08-11T12:00:00Z",
            }),

        ],

    });

    assert.equal(result.summary.totalDue, 1);

});


test("3. includes task deleted on same due calendar date", () => {

    const result = runAnalytics({

        tasks: [

            makeTask({
                dueDate: "2026-08-10T08:00:00Z",
                isDeleted: true,
                deletedAt: "2026-08-10T20:00:00Z",
            }),

        ],

    });

    assert.equal(result.summary.totalDue, 1);

});


// ============================================================
// 4. FINAL TASK STATE
// ============================================================

test("4. final uncompleted activity makes task pending", () => {

    const result = runAnalytics({

        tasks: [
            makeTask({
                _id: "t1"
            })
        ],

        taskActivity: [

            makeActivity(
                "t1",
                "completed",
                "2026-08-09T10:00:00Z"
            ),

            makeActivity(
                "t1",
                "uncompleted",
                "2026-08-11T10:00:00Z"
            ),

        ],

    });

    assert.equal(result.summary.completed, 0);
    assert.equal(result.summary.pendingDue, 1);

});


test("4. final completed activity determines completion timestamp", () => {

    const state = reconstructTaskState(

        makeTask(),

        [

            makeActivity(
                "task-1",
                "completed",
                "2026-08-09T10:00:00Z"
            ),

            makeActivity(
                "task-1",
                "completed",
                "2026-08-12T10:00:00Z"
            ),

        ]

    );

    assert.equal(state.state, "completed");

    assert.equal(
        state.finalCompletionTimestamp,
        "2026-08-12T10:00:00Z"
    );

});


// ============================================================
// 5. MULTIPLE COMPLETION CYCLES
// ============================================================

test("5. complete -> uncomplete -> complete uses final completion", () => {

    const result = runAnalytics({

        tasks: [

            makeTask({
                _id: "cycle"
            }),

        ],

        taskActivity: [

            makeActivity(
                "cycle",
                "completed",
                "2026-08-08T10:00:00Z"
            ),

            makeActivity(
                "cycle",
                "uncompleted",
                "2026-08-09T10:00:00Z"
            ),

            makeActivity(
                "cycle",
                "completed",
                "2026-08-12T10:00:00Z"
            ),

        ],

    });

    assert.equal(result.summary.completed, 1);
    assert.equal(result.summary.lateCompleted, 1);

});


// ============================================================
// 6. ON-TIME COMPLETION
// ============================================================

test("6. completion before due date is on time", () => {

    const result = runAnalytics({

        tasks: [
            makeTask({
                _id: "early"
            })
        ],

        taskActivity: [

            makeActivity(
                "early",
                "completed",
                "2026-08-09T23:59:59Z"
            ),

        ],

    });

    assert.equal(result.summary.onTimeCompleted, 1);
    assert.equal(result.summary.lateCompleted, 0);

});


test("6. completion on due calendar date is on time", () => {

    const result = runAnalytics({

        tasks: [

            makeTask({
                _id: "same-day",
                dueDate: "2026-08-10T00:01:00Z"
            }),

        ],

        taskActivity: [

            makeActivity(
                "same-day",
                "completed",
                "2026-08-10T23:59:59Z"
            ),

        ],

    });

    assert.equal(result.summary.onTimeCompleted, 1);

});


// ============================================================
// 7. LATE COMPLETION
// ============================================================

test("7. completion after due date is late", () => {

    const result = runAnalytics({

        tasks: [
            makeTask({
                _id: "late"
            })
        ],

        taskActivity: [

            makeActivity(
                "late",
                "completed",
                "2026-08-11T00:00:00Z"
            ),

        ],

    });

    assert.equal(result.summary.lateCompleted, 1);
    assert.equal(result.summary.onTimeCompleted, 0);

});


// ============================================================
// 8. PENDING TASKS
// ============================================================

test("8. pendingDue equals totalDue minus completed", () => {

    const result = runAnalytics({

        tasks: [

            makeTask({ _id: "a" }),
            makeTask({ _id: "b" }),
            makeTask({ _id: "c" }),

        ],

        taskActivity: [

            makeActivity(
                "a",
                "completed",
                "2026-08-09T10:00:00Z"
            ),

        ],

    });

    assert.equal(result.summary.totalDue, 3);
    assert.equal(result.summary.completed, 1);
    assert.equal(result.summary.pendingDue, 2);

});


// ============================================================
// 9. COMPLETION RATE
// ============================================================

test("9. completion rate is completed / totalDue * 100", () => {

    const result = runAnalytics({

        tasks: [

            makeTask({ _id: "a" }),
            makeTask({ _id: "b" }),
            makeTask({ _id: "c" }),
            makeTask({ _id: "d" }),

        ],

        taskActivity: [

            makeActivity("a", "completed", "2026-08-08T10:00:00Z"),
            makeActivity("b", "completed", "2026-08-08T10:00:00Z"),
            makeActivity("c", "completed", "2026-08-08T10:00:00Z"),

        ],

    });

    assert.equal(result.summary.completionRate, 75);

});


// ============================================================
// 10. ON-TIME COMPLETION RATE
// ============================================================

test("10. on-time completion rate uses totalDue as denominator", () => {

    const result = runAnalytics({

        tasks: [

            makeTask({ _id: "a" }),
            makeTask({ _id: "b" }),
            makeTask({ _id: "c" }),
            makeTask({ _id: "d" }),

        ],

        taskActivity: [

            makeActivity(
                "a",
                "completed",
                "2026-08-09T10:00:00Z"
            ),

            makeActivity(
                "b",
                "completed",
                "2026-08-09T10:00:00Z"
            ),

            makeActivity(
                "c",
                "completed",
                "2026-08-12T10:00:00Z"
            ),

        ],

    });

    assert.equal(
        result.summary.onTimeCompletionRate,
        50
    );

});


// ============================================================
// 11. OVERDUE
// ============================================================

test("11. counts active pending tasks due before today", () => {

    const result = runAnalytics({

        today: "2026-08-20T12:00:00Z",

        tasks: [

            makeTask({
                _id: "overdue",
                dueDate: "2026-08-19T12:00:00Z",
                status: "pending",
            }),

            makeTask({
                _id: "today",
                dueDate: "2026-08-20T00:00:00Z",
                status: "pending",
            }),

            makeTask({
                _id: "completed",
                dueDate: "2026-08-01T00:00:00Z",
                status: "completed",
            }),

            makeTask({
                _id: "deleted",
                dueDate: "2026-08-01T00:00:00Z",
                status: "pending",
                isDeleted: true,
            }),

        ],

    });

    assert.equal(result.summary.overdue, 1);

});


// ============================================================
// 12. DUE-DATE TREND
// ============================================================

test("12. trend groups by due date and sorts ascending", () => {

    const result = runAnalytics({

        tasks: [

            makeTask({
                _id: "a",
                dueDate: "2026-08-12T10:00:00Z"
            }),

            makeTask({
                _id: "b",
                dueDate: "2026-08-10T10:00:00Z"
            }),

            makeTask({
                _id: "c",
                dueDate: "2026-08-10T12:00:00Z"
            }),

        ],

        taskActivity: [

            makeActivity(
                "a",
                "completed",
                "2026-08-13T10:00:00Z"
            ),

            makeActivity(
                "b",
                "completed",
                "2026-08-09T10:00:00Z"
            ),

        ],

    });

    assert.deepEqual(result.trend, [

        {
            date: "2026-08-10",
            due: 2,
            completed: 1,
            onTime: 1,
            late: 0,
        },

        {
            date: "2026-08-12",
            due: 1,
            completed: 1,
            onTime: 0,
            late: 1,
        },

    ]);

});


// ============================================================
// 13. PRIORITY BREAKDOWN
// ============================================================

test("13. priority breakdown contains high medium and low", () => {

    const result = runAnalytics({

        tasks: [

            makeTask({
                _id: "h1",
                priority: "high"
            }),

            makeTask({
                _id: "h2",
                priority: "high"
            }),

            makeTask({
                _id: "m1",
                priority: "medium"
            }),

            makeTask({
                _id: "l1",
                priority: "low"
            }),

        ],

        taskActivity: [

            makeActivity(
                "h1",
                "completed",
                "2026-08-09T10:00:00Z"
            ),

            makeActivity(
                "m1",
                "completed",
                "2026-08-09T10:00:00Z"
            ),

        ],

    });

    assert.deepEqual(result.priorityBreakdown, {

        high: {
            due: 2,
            completed: 1,
            completionRate: 50,
        },

        medium: {
            due: 1,
            completed: 1,
            completionRate: 100,
        },

        low: {
            due: 1,
            completed: 0,
            completionRate: 0,
        },

    });

});


// ============================================================
// 14. TIMEZONE
// ============================================================

test("14. normalizeDate respects timezone", () => {

    const date = "2026-08-10T00:30:00Z";

    assert.equal(
        normalizeDate(date, "UTC"),
        "2026-08-10"
    );

    assert.equal(
        normalizeDate(date, "America/New_York"),
        "2026-08-09"
    );

});


test("14. period applicability uses timezone aware date", () => {

    const result = runAnalytics({

        timezone: "America/New_York",

        period: {

            start: "2026-08-09T04:00:00Z",
            end: "2026-08-09T23:59:59Z",

        },

        tasks: [

            makeTask({
                _id: "tz-task",

                // This is August 9 in New York
                dueDate: "2026-08-10T00:30:00Z"
            }),

        ],

    });

    assert.equal(result.summary.totalDue, 1);

});


// ============================================================
// 15. ZERO / NULL CASES
// ============================================================

test("15. zero applicable tasks returns null rates", () => {

    const result = runAnalytics({
        tasks: []
    });

    assert.equal(result.summary.totalDue, 0);
    assert.equal(result.summary.completed, 0);
    assert.equal(result.summary.pendingDue, 0);

    assert.equal(
        result.summary.completionRate,
        null
    );

    assert.equal(
        result.summary.onTimeCompletionRate,
        null
    );

    assert.deepEqual(result.trend, []);

});


test("15. empty priority groups return null completion rate", () => {

    const result = runAnalytics({

        tasks: [

            makeTask({
                priority: "high"
            }),

        ],

    });

    assert.equal(
        result.priorityBreakdown.medium.completionRate,
        null
    );

    assert.equal(
        result.priorityBreakdown.low.completionRate,
        null
    );

});


test("15. null completion date is neither on-time nor late", () => {

    assert.deepEqual(

        classifyCompletion(
            "2026-08-10",
            null
        ),

        {
            onTime: false,
            late: false,
        }

    );

});


// ============================================================
// 16. V1 OUTPUT CONTRACT
// ============================================================

test("16. output contains correct V1 properties", () => {

    const result = runAnalytics({

        tasks: [

            makeTask({
                _id: "contract"
            }),

        ],

    });


    assert.deepEqual(

        Object.keys(result).sort(),

        [
            "period",
            "summary",
            "trend",
            "priorityBreakdown"
        ].sort()

    );


    assert.deepEqual(

        Object.keys(result.period).sort(),

        [
            "start",
            "end"
        ].sort()

    );


    assert.deepEqual(

        Object.keys(result.summary).sort(),

        [
            "totalDue",
            "completed",
            "onTimeCompleted",
            "lateCompleted",
            "pendingDue",
            "completionRate",
            "onTimeCompletionRate",
            "overdue",
        ].sort()

    );


    assert.deepEqual(

        Object.keys(result.priorityBreakdown).sort(),

        [
            "high",
            "medium",
            "low"
        ].sort()

    );

});


// ============================================================
// BUG CHECK
// ============================================================

// This test checks whether a completed task with NO activity
// history should still be considered completed.
//
// Your CURRENT code will probably FAIL this test because
// reconstructTaskState() starts with:
//
// let isCompleted = false;
//
// and does not use task.status.

test("BUG CHECK: completed task with no activity should respect task.status", () => {

    const result = runAnalytics({

        tasks: [

            makeTask({
                _id: "status-only",
                status: "completed",
            }),

        ],

        taskActivity: [],

    });

    assert.equal(
        result.summary.completed,
        1
    );

});


// ============================================================
// FINAL RESULT
// ============================================================

console.log("\n========================================");
console.log(`RESULT: ${passed} passed, ${failed} failed`);
console.log("========================================");


if (failed > 0) {
    process.exitCode = 1;
}