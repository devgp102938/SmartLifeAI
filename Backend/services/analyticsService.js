//Analytics service
/*
    This module will collect data from database models,
    and set daterage and arrange data,
    will feed to diffrent calculator and return Analytics reports
    modules like : Task, Habit, Medicine, DailyCheckIn
*/

//Import neccessary files into analytics

const Task = require('../models/Task.js');
const TaskActivity = require('../models/TaskActivity.js');

const Habit = require('../models/Habit.js');
const HabitHistory = require('../models/HabitHistory.js');

const Medicine = require('../models/Medicine.js');
const MedicineSchedule = require('../models/MedicineSchedule.js');
const MecineLog = require('../models/MedicineLog.js');

const DailyCheckIn = require('../models/DailyCheckIn.js');

const {
    getDateRange,
    PERIODs,
    VALID_PERIODS
} = require('../utils/analyticsDateUtils.js');

const {
    calculateTaskAnalytics
} = require('../utils/calculateTaskAnalytics.js');

const {
    calculateHabitStreak
} = require('../utils/calculateHabitStreak.js');

const {
    calculateMedicineCompliance
} = require('../utils/calculateMedicineCompliance.js');

const {
    calculateDailyCheckInAnalytics
} = require('../utils/calculateDailyCheckInAnalytics.js');

const getAnalytics = async ({userId, period, timezone, customStart, customEnd, now = new Date()}) => {
   
    if(!userId){
        throw new Error("userId is required");
    }

    if(!period){
        throw new Error("period is required");
    }

    if(!timezone){
        throw new Error("Timezone is required");
    }

    if(!VALID_PERIODS.has(period)){
        throw new Error(`Invalid analytics period: ${period}`);
    }


    const {startDate, endDate} = getDateRange({
        period, 
        timezone, 
        referenceDate : now, 
        customStart, 
        customEnd
    });

    const context = {
        userId, 
        period,
        timezone,
        now,
        startDate,
        endDate
    }

    const tasks = await Task.find({
        user : userId
    });

    const taskActivity = await TaskActivity.find({
        user : userId
    });


    //Habit logic
    const habits = await Habit.find({
        user : userId
    });

    const habitHistories = await HabitHistory.find({
        user : userId
    });

    // calculate Streak for each habit
    const habitAnalytics = habits.map((habit) => {
        const habitId = habit._id.toString();

        const history = habitHistories.filter((entry) => {
            return (
                entry.habit &&
                entry.habit.toString() === habitId
            );
        });

        const completionDates = history.map((entry) => (entry.date).filter(Boolean));

        // Respect deletion boundary.
        // A deleted habit should remain available for historical 
        // analytics, but only until its deletion boundary.

        let effectiveEndDate = habit.endDate;

        if(habit.deletedAt){
            if(!effectiveEndDate){
                effectiveEndDate = habit.deletedAt;
            }
            else{
                effectiveEndDate = new Date(
                    Math.min(
                        new Date(effectiveEndDate).getTime(),
                        new Date(habit.deletedAt).getTime()
                    )
                );
            }
        }

        const streak = calculateHabitStreak({
            habitStartDate : habit.startDate
            habitEndDate : effectiveEndDate,
            completionDates,
            today : context.now,
            timezone : context.timezone
        });

        return {
            habitId : habit._id,
            ...streak
        };
    });

    return {
        period : {
            start : context.startDate,
            end : context.endDate
        },

        habit : habitAnalytics
    };

    const medicines = await Medicine.find({
        user: userId
    });

    const schedules = await MedicineSchedule.find({
        user: userId
    });

    const logs = await MedicineLog.find({
        user: userId
    });

    const checkIns = await DailyCheckIn.find({
        user: userId
    });
};

module.exports = {
    getAnalytics
};