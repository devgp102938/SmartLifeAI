// debugMedicineCompliance.js

const {
    calculateMedicineCompliance,
} = require('./utils/calculateMedicineCompliance.js');

const result = calculateMedicineCompliance({
    medicines: [{
        id: 'med-1',
        name: 'Medicine A',
        startDate: '2026-08-10',
        endDate: '2026-08-20',
        isDeleted: false,
        deletedAt: null,
    }],

    schedules: [{
        id: 'schedule-1',
        medicineId: 'med-1',
        times: ['08:00', '20:00'],
        scheduleType: 'daily',
        daysOfWeek: [],
        effectiveFrom: '2026-08-10',
        effectiveUntil: null,
        version: 1,
    }],

    logs: [],

    periodStart: '2026-08-15',
    periodEnd: '2026-08-15',

    now: new Date('2026-08-15T10:00:00+05:30'),

    timezone: 'Asia/Kolkata',
});

console.dir(result, { depth: null });