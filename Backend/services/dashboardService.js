const analyticsService = require('./analyticsService.js');

const calculateAverage = (values) => {
    if (!values.length) {
        return null;
    }

    const total = values.reduce((sum, value) => sum + value, 0);

    return Number((total / values.length).toFixed(2));
};

const getDashboard = async ({
    userId,
    period = 'last7days',
    timezone,
    customStart,
    customEnd,
    now = new Date()
}) => {
    if (!userId) {
        throw new Error('userId is required');
    }

    if (!timezone) {
        throw new Error('timezone is required');
    }

    const analytics = await analyticsService.getAnalytics({
        userId,
        period,
        timezone,
        customStart,
        customEnd,
        now
    });

    const {
        task,
        habit,
        medicine,
        dailyCheckIn
    } = analytics;

    return {
        period: analytics.period,

        // Compact dashboard summary cards
        overview: {
            tasks: {
                totalDue: task.summary.totalDue,
                completed: task.summary.completed,
                pending: task.summary.pendingDue,
                overdue: task.summary.overdue,
                completionRate: task.summary.completionRate
            },

            habits: {
                totalHabits: habit.length,

                averageCurrentStreak: calculateAverage(
                    habit.map(item => item.currentStreak)
                ),

                averageLongestStreak: calculateAverage(
                    habit.map(item => item.longestStreak)
                )
            },

            medicines: {
                expectedDoses: medicine.summary.expectedDoses,
                takenDoses: medicine.summary.takenDoses,
                skippedDoses: medicine.summary.skippedDoses,
                missedDoses: medicine.summary.missedDoses,
                dueUnloggedDoses: medicine.summary.dueUnloggedDoses,
                adherenceRate: medicine.summary.adherenceRate
            },

            dailyCheckIns: {
                totalCheckIns: dailyCheckIn.summary.totalCheckIns,
                averageMood: dailyCheckIn.summary.averageMood,
                averageEnergy: dailyCheckIn.summary.averageEnergy,
                averageProductivity:
                    dailyCheckIn.summary.averageProductivity,
                consistencyRate: dailyCheckIn.summary.consistencyRate
            }
        },

        // Data consumed by dashboard charts
        charts: {
            taskTrend: task.trend,
            medicineTrend: medicine.trend,
            dailyCheckInTrend: dailyCheckIn.trend,
            moodDistribution: dailyCheckIn.moodDistribution
        },

        // Concise details for module widgets
        details: {
            habitStreaks: habit.map(item => ({
                habitId: item.habitId,
                currentStreak: item.currentStreak,
                longestStreak: item.longestStreak
            })),

            medicineBreakdown: medicine.medicineBreakdown.map(item => ({
                medicineId: item.medicineId,
                name: item.name,
                expectedDoses: item.expectedDoses,
                takenDoses: item.takenDoses,
                missedDoses: item.missedDoses,
                adherenceRate: item.adherenceRate,
                status: item.status
            }))
        }
    };
};

module.exports = {
    getDashboard
};