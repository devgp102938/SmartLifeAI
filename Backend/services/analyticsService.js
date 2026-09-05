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
    PERIODs
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
} = require('../utils/calculateDailyCheckInAnalytics.js')