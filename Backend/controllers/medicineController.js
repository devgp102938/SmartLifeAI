const Medicine = require('../models/Medicine.js');
const MedicineSchedule = require('../models/MedicineSchedule.js');
const MedicineLog = require('../models/MedicineLog.js');
const mongoose = require('mongoose');

//create medicine
const createMedicine = async (req, res) => {
    try
    {
        const {name, dosage, notes, times, scheduleType, daysOfWeek, startDate, endDate} = req.body;

        if(!name || !dosage || !times || !scheduleType || !startDate || !endDate){
            return res.status(400).json({
                success : false,
                message : "All feild are required"
            })
        }

         // Validate times array
        if(!Array.isArray(times) || times.length === 0){
            return res.status(400).json({
                success: false,
                message: "At least one medicine time is required."
            });
        }

        //HH:MM validation
        const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

        const uniqueTimes = [...new Set(times)];

        if(uniqueTimes.length !== times.length){
            return res.status(400).json({
                success : false,
                message : "Duplicate medicine times are not allowed."
            });
        }

        for(let i = 0; i < uniqueTimes.length; i++){
            if(!timeRegex.test(uniqueTimes[i])){
                return res.status(400).json({
                    success : false,
                    message : `Inavid Times Format ${uniqueTimes[i]}`
                });
            }
        }

        uniqueTimes.sort();

        //validate dates
        const start = new Date(startDate);
        const end = new Date(endDate);

        if(isNaN(start.getTime()) || isNaN(end.getTime())){
            return res.status(400).json({
                success : false,
                message : "Invalid date"
            });
        }

        start.setHours(0,0,0,0);
        end.setHours(0,0,0,0);

        const today = new Date();
        today.setHours(0,0,0,0);

        if(start < today){
            return res.status(400).json({
                success : false,
                message : "Start date cannot be in the past."
            });
        }

        if(end < start){
            return res.status(400).json({
                success : false,
                message : "End date cannot be before start date."
            });
        }

        
        //Validate schedule type
        if(!['daily', 'specific-days'].includes(scheduleType)){
            return res.status(400).json({
                success: false,
                message: "Invalid schedule type."
            });
        }

        //handle daysofweeks
        let finalDays = [];

        if(scheduleType === 'specific-days'){
            if(!Array.isArray(daysOfWeek) || daysOfWeek.length === 0){
                return res.status(400).json({
                    success: false,
                    message: "Please select at least one day."
                });
            }

            const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

            const normalizedDays  = daysOfWeek.map(day => day.toLowerCase());

            const uniqueDays = [...new Set(normalizedDays)];

            if(uniqueDays.length !== normalizedDays.length){
                return res.status(400).json({
                    success : false,
                    message : "Duplicate weekdays are not allowed"
                });
            }

            const InValid = uniqueDays.find(
                day => !validDays.includes(day)
            );

            if(InValid){
                return res.status(400).json({
                    success : false,
                    message : `Invalid day ${InValid}`
                });
            }

            finalDays = uniqueDays;
        }
        else{
            finalDays = [];
        }

        //create medicine
        const medicine = await Medicine.create({
                    user : req.user._id,
                    name,
                    dosage,
                    notes,
                    startDate : start,
                    endDate : end
                });

        //create Schedule
        const schedule = await MedicineSchedule.create({
                    user : req.user._id,
                    medicine : medicine._id,
                    times : uniqueTimes,
                    scheduleType,
                    daysOfWeek : finalDays,
                    effectiveFrom : start,
                    effectiveUntil : null,
                    isActive : true
                }
        );

        res.status(201).json({
            success : true,
            message : "Medicine Profile has been created",
            medicine : medicine,
            schedule : schedule
        });
    }
    catch(err)
    {
        res.status(500).json({
            success : false,
            message : err.message
        })
    }
}

//get medicine
const getMedicine = async (req, res) => {
    try
    {
        const medicine = await Medicine.find({user : req.user._id}).sort({createdAt : -1});

        if(!medicine){
            return res.status(404).json({
                success : false,
                message : "Medicine not found"
            });
        }

        res.status(200).json({
            success : true,
            medicine,
        });

    }
    catch(err)
    {
        res.status(500).json({
            success : false,
            message : err.message
        })
    }
}

//getMEdicine by id
const getMedicineById = async (req, res) => {
    try
    {
        if(!mongoose.Types.ObjectId.isValid(req.params.id)){
            return res.status(400).json({
                success: false,
                message: "Invalid medicine ID"
            })
        }

        const medicine = await Medicine.findOne({
            user : req.user._id,
            _id : req.params.id,
            isDeleted : false
        });

        if(!medicine){
            return res.status(404).json({
                message : "Medicine not found"
            });
        }

        res.status(200).json({
            success : true,
            medicine
        })
    }
    catch(err)
    {
        res.status(500).json({
            success : false,
            message : err.message
        })
    }
}

//update medicine
const updateMedicine = async (req, res) => {
    try
    {
        if(!mongoose.Types.ObjectId.isValid(req.params.id)){
            return res.status(400).json({
                success : false,
                message : "Invalid medicine ID"
            });
        }

        const medicine = await Medicine.findOne({
            _id : req.params.id,
            user : req.user._id,
            isDeleted : false
        })

        if(!medicine){
            return res.status(404).json({
                success : false,
                message : "Medicine not found"
            });
        }

        const activeSchedule = await MedicineSchedule.findOne({
            medicine : medicine._id,
            isActive : true
        }).sort({effectiveFrom : -1});

        if(!activeSchedule){
            return res.status(400).json({
                success : false,
                message : "No Active medicine found."
            });
        }

        const {name, dosage, notes, times, scheduleType, daysOfWeek, startDate, endDate} = req.body;

        if(name !== undefined){
            medicine.name = name;
        }
        if(dosage !== undefined){
            medicine.dosage = dosage;
        }
        if(notes !== undefined){
            medicine.notes = notes;
        }

        //start/end date rules
        const today = new Date();
        today.setHours(0,0,0,0);

        const medicineStartDate = new Date(medicine.startDate);
        medicineStartDate.setHours(0,0,0,0);

        const treatmentStarted = today >= medicineStartDate;

        if(startDate !== undefined){
            if(treatmentStarted){
                return res.status(400).json({
                    success : false,
                    message : "Treatment already started. Start date cannot be changed."
                });
            }

            const newStart = new Date(startDate);
            newStart.setHours(0,0,0,0);

            if(Number.isNaN(newStart.getTime())){
                return res.status(400).json({
                    success : false,
                    message : "Invalid start date."
                });
            }

            if(newStart < today){
                return res.status(400).json({
                    success : false,
                    message : "Start date cannot be in the past."
                });
            }

            medicine.startDate = newStart;
        }

        if(endDate !== undefined){
            const newEnd = new Date(endDate);

            if(Number.isNaN(newEnd.getTime())){
                return res.status(400).json({
                    success: false,
                    message: "Invalid end date."
                });
            }

            if(newEnd < today){
                return res.status(400).json({
                    success : false,
                    message : "End date cannot in past"
                });
            }

            if(newEnd < medicineStartDate){
                return res.status(400).json({
                    success : false,
                    message : "End date cannot be before start date"
                });
            }

            medicine.endDate = newEnd;
        }

        //Detect Schedule Change

        const scheduleChange = times !== undefined ||
                            scheduleType !== undefined || 
                            daysOfWeek !== undefined;

        if(!scheduleChange){
            await medicine.save();

            return res.status(200).json({
                success : true,
                message : "Medicine details has been updated",
                medicine
            });
        }
        

        //Final schedule Values
        const finalScheduleType = scheduleType ?? activeSchedule.scheduleType;
        const finalTimes = times ?? activeSchedule.times;
        let finalDays = daysOfWeek ?? activeSchedule.daysOfWeek;

        //validate times
        if(!Array.isArray(finalTimes) || finalTimes.length === 0){

            return res.status(400).json({
                success : false,
                message : "At least one medicine time is required."
            });
        }

        const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/; //HH:MM

        const invalidTime = finalTimes.find(time => !timeRegex.test(time));

        if(invalidTime){
            return res.status(400).json({
                success: false,
                message: `Invalid time: ${invalidTime}`
            });
        }

        const uniqueTimes = new Set(finalTimes);

        if(uniqueTimes.size !== finalTimes.length){

            return res.status(400).json({
                success: false,
                message: "Duplicate medicine times are not allowed."
            });
        }

        const sortedTimes = [...finalTimes].sort();

        //validate scheduletypes
        if(!['daily', 'specific-days'].includes(finalScheduleType)){
            return res.status(400).json({
                success : false,
                message : "Invalid schedule type."
            });
        }

        //validate days of weeks
        const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

        if(finalScheduleType == 'daily'){
            finalDays = [];
        }
        else{
            if(!Array.isArray(finalDays) || finalDays.length === 0){
                return res.status(400).json({
                    success: false,
                    message: "Please select at least one weekday."
                });
            }

            finalDays = finalDays.map(day => day.toLowerCase());

            const uniqueDays = new Set(finalDays);

            if(uniqueDays.size !== finalDays.length){
                return res.status(400).json({
                    success : false,
                    message : "Duplicate weekdays are not allowed."
                });
            }

            const inValidDay = finalDays.find(day => !validDays.includes(day));

            if(inValidDay){
                return res.status(400).json({
                    success: false,
                    message: `Invalid weekday: ${inValidDay}`
                });
            }
        }

        //if treatment hasn't started yet then update current schedule
        const effectiveFrom = new Date(activeSchedule.effectiveFrom);
        effectiveFrom.setHours(0,0,0,0);

        if(today < effectiveFrom){
            activeSchedule.times = sortedTimes;
            activeSchedule.scheduleType = finalScheduleType;
            activeSchedule.daysOfWeek = finalDays;

            await activeSchedule.save();
            await medicine.save();

            return res.status(200).json({
                success : true,
                message : "Medicine details are updated",
                schedule : activeSchedule,
                medicine
            });

        }

        //if treatment has started check if todays dose has been logged

        const todayLog = await MedicineLog.findOne({
            user : req.user._id,
            medicine : medicine._id,
            scheduledDate : today,
        });

        //Effective dose
        const newEffectiveDate = new Date(today);

        if(todayLog){
            newEffectiveDate.setDate(newEffectiveDate.getDate() + 1);
        }

        //close old schdule version
        activeSchedule.isActive = false;

        activeSchedule.effectiveUntil = new Date(newEffectiveDate);

        activeSchedule.effectiveUntil.setDate(activeSchedule.effectiveUntil.getDate() - 1);

        await activeSchedule.save();

        //create new Schedule vesrion
        const latestVesrion = await MedicineSchedule.findOne({
            medicine : medicine._id
        }).sort({ version : -1});

        const nextVersion = latestVesrion ? latestVesrion.version + 1 : 1;

        const newSchedule = await MedicineSchedule.create({
                    user : req.user._id,
                    medicine : medicine._id,
                    times : sortedTimes,
                    scheduleType : finalScheduleType,
                    daysOfWeek : finalDays,
                    effectiveFrom : newEffectiveDate,
                    effectiveUntil : null,
                    isActive : true,
                    version : nextVersion
                });

        await medicine.save();

        res.status(200).json({
            success : true,
            message : todayLog ? "Medicine schedule updated. New schedule will start tomorrow." 
            : "Medicine schedule updated successfully.",
            medicine,
            schedule : newSchedule
        });
    }
    catch(err)
    {
        res.status(500).json({
            success : false,
            message : err.message
        });
    }
}

//delete medicine
const deleteMedicine = async (req, res) => {
    try
    {
        if(!mongoose.Types.ObjectId.isValid(req.params.id)){
            return res.status(400).json({
                success : false,
                message : "Invalid medicine ID"
            });
        }

        const medicine = await Medicine.findById(req.params.id);

        if(!medicine){
            return res.status(404).json({
                success : false,
                message : "medicine not found"
            });
        }

        if(medicine.user.toString() !== req.user._id.toString()){
            return res.status(403).json({
                success : false,
                message : "Not authorized to access this medicine"
            });
        }

        await MedicineLog.deleteMany({
            medicine : medicine._id
        });

        await medicine.deleteOne();

        res.status(200).json({
            success : true,
            message : "Medicine has been deleted"
        })
    }
    catch(err)
    {
        res.status(500).json({
            success : false,
            message : err.message
        });
    }
}
    
//take medinine
const takeDose = async (req, res) => {
    try
    {
        if(!mongoose.Types.ObjectId.isValid(req.params.id)){
            return res.status(400).json({
                success : false,
                message : "Invalid medicine ID"
            });
        }

        const medicine = await Medicine.findOne({
            _id : req.params.id,
            user : req.user.id,
            isDeleted : false
        })

        if(!medicine){
            return res.status(404).json({
                success : false,
                message : "Medicine not found"
            });
        }

        const {scheduledDate, scheduledTime} = req.body;

        if(!scheduledDate){
            return res.status(400).json({
                success : false,
                message : "scheduledDate is required"
            });
        }

        if(!scheduledTime){
            return res.status(400).json({
                success : false,
                message : "scheduleTime is required"
            });
        }

        //validate times
        const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

        if(!timeRegex.test(scheduledTime)){
            return res.status(400).json({
                success: false,
                message: "Invalid time format. Use HH:mm."
            });
        }

        //validate dates
        const doseDate = new Date(scheduledDate);

        if(isNaN(doseDate.getTime())){
            return res.status(400).json({
                success : false,
                message : "Invalid scheduledDate"
            });
        }
        doseDate.setHours(0,0,0,0);

        const startDate = new Date(medicine.startDate);
        startDate.setHours(0,0,0,0);

        const endDate = new Date(medicine.endDate);
        endDate.setHours(0,0,0,0);

        if(doseDate < startDate || doseDate > endDate){
            return res.status(400).json({
                success: false,
                message: "Scheduled date is outside the treatment period."
            });
        }


        //future validation
        const today = new Date();
        const todayDate = new Date(today);
        todayDate.setHours(0,0,0,0);

        if(doseDate > todayDate){
            return res.status(400).json({
                success : false,
                message : "Future doses cannot be logged."
            });
        }

        const schedule = await MedicineSchedule.findOne({
            medicine : medicine._id,
            effectiveFrom : { $lte : doseDate },
                $or : [
                    {
                        effectiveUntil : null
                    },
                    {
                        effectiveUntil : { $gte : doseDate }
                    }
                ] 
        }).sort({
            effectiveFrom : -1
        });

        if(!schedule){
            return res.status(400).json({
                success: false,
                message: "No active schedule found for this date."
            });
        }

        if(medicine.scheduleType == "specific-days"){

            const weekDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

            const weekDay = weekDays[doseDate.getDay()];

            if(!medicine.daysOfWeek.includes(weekDay)){
                return res.status(400).json({
                    success: false,
                    message: "Medicine is not scheduled for this weekday"
                });
            }
        }

        if(!medicine.times.includes(scheduledTime)){
            return res.status(400).json({
                success : false,
                message : "Invalid scheduled time for this medicine"
            });
        }

        const existingLog = await MedicineLog.findOne({
            user : req.user._id,
            medicine : medicine._id,
            schedule : schedule._id,
            scheduledDate : doseDate,
            scheduledTime
        });

        if(existingLog){
            return res.status(400).json({
                success : false,
                message : "Dose has already been logged"
            });
        }

        const medicinelog = await MedicineLog.create({
            user : req.user._id,
            medicine : medicine._id,
            schedule : schedule._id,
            scheduledDate,
            scheduledTime,
            status : "taken",
            takenAt : Date.now()
        });

        res.status(200).json({
            success : true,
            message : "Medicine dose logged as taken successfully",
            medicinelog,
        });
    }
    catch(err)
    {
        res.status(500).json({
            success : false,
            message : err.message
        });
    }
}

//skipDose
const skipDose = async (req, res) => {
    try
    {
        if(!mongoose.Types.ObjectId.isValid(req.params.id)){
            return res.status(400).json({
                success : false,
                message : "Invalid medicine ID"
            });
        }
        
        const medicine = await Medicine.findOne({
            _id : req.params.id,
            user : req.user._id,
            isDeleted : false
        })

        if(!medicine){
            return res.status(404).json({
                success : false,
                message : "Medicine not found!"
            });
            }

        const {scheduledDate, scheduledTime} = req.body;

        if(!scheduledDate){
            return res.status(400).json({
                success : false,
                message : "Schedule date is required"
            });
        }

        if(!scheduledTime){
            return res.status(400).json({
                success : false,
                message : "Schedule time is required"
            });
        }

        //validate time format
        const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

        if(!timeRegex.test(scheduledTime)){
            return res.status(400).json({
                success: false,
                message: "Invalid time format. Use HH:mm."
            });
        }

        //validate date
        const doseDate = new Date(scheduledDate);

        if(isNaN(doseDate.getTime())){
            return res.status(400).json({
                success: false,
                message: "Invalid scheduledDate"
            });
        }

        doseDate.setHours(0,0,0,0);

        // Normalize medicine dates
        const startDate = new Date(medicine.startDate);
        startDate.setHours(0,0,0,0);

        const endDate = new Date(medicine.endDate);
        endDate.setHours(0,0,0,0);

        // Treatment period validation
        if(doseDate < startDate || doseDate > endDate){
            return res.status(400).json({
                success: false,
                message: "Scheduled date is outside the treatment period."
            });
        }

        // Future validation
        const today = new Date();
        const todayDate = new Date(today);
        todayDate.setHours(0,0,0,0);

        if(doseDate > todayDate){
            return res.status(400).json({
                success : false,
                message : "Future doses cannot be logged."
            });
        }

        const schedule = await MedicineSchedule.findOne({
            medicine : medicine._id,
            effectiveFrom : { $lte : doseDate },
            $or : [
                {
                    effectiveUntil : null
                },
                {
                    effectiveUntil : { $gte : doseDate }
                }
            ]
        }).sort({effectiveFrom : -1})

        if(!schedule){
            return res.status(404).json({
                success : false,
                message : "No dose log found for the specified date and time."
            });
        }

        // Validate weekday
        if(schedule.scheduleType === 'specific-days'){
            const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],

            const weekday = weekdays[doseDate().getDay];

            if(!schedule.daysOfWeek.includes(weekday)){
                return res.status(400).json({
                    success: false,
                    message: "Medicine is not scheduled for this weekday."
                });
            }
        }

        // Validate scheduled time
        if(!schedule.times.includes(scheduledTime)){
            return res.status(400).json({
                success: false,
                message: "Invalid scheduled time."
            });
        }

        const existingLog = await MedicineLog.findOne({
            user : req.user._id,
            medicine : medicine._id,
            schedule : schedule._id,
            scheduledDate : doseDate,
            scheduledTime
        });

        if(existingLog){
            return res.status(400).json({
                success: false,
                message: "Dose has already been logged."
            })
        }

        const medicinelog = await MedicineLog.create({
            user : req.user._id,
            medicine : medicine._id,
            schedule : schedule._id,
            scheduledDate : doseDate,
            scheduledTime,
            status : "skipped",
            takenAt : Date.now()
        });

        res.status(200).json({
            success : true,
            message : "Medicine marked as Skipped.",
            medicineLog
        })
    }
    catch(err)
    {
        res.status(500).json({
            success : false,
            message : err.message
        });
    }
}

//undoDoseAction
const undoDoseAction = async (req, res) => {
    try
    {
        if(!mongoose.Types.ObjectId.isValid(req.params.id)){
            return res.status(400).json({
                success : false,
                message : "Invalid medicine ID"
            });
        }
        
        const medicine = await Medicine.findById(req.params.id);

        if(!medicine){
            return res.status(404).json({
                success : false,
                message : "Medicine not found!"
            });
            }

        if(medicine.user.toString() !== req.user._id.toString()){
            return res.status(403).json({
                success : false,
                message : "Not authorized to access this medicine"
            });
        }

        const {scheduledDate, scheduledTime} = req.body;

        if(!scheduledDate){
            return res.status(400).json({
                success : false,
                message : "Schedule date is required"
            });
        }

        const date = new Date(scheduledDate);
        if(Number.isNaN(date.getTime())){
            return res.status(400).json({
                success: false,
                message: "Invalid scheduledDate."
            });
        }

        if(!scheduledTime){
            return res.status(400).json({
                success : false,
                message : "Schedule time is required"
            });
        }

        if(!medicine.times.includes(scheduledTime)){
            return res.status(400).json({
                success: false,
                message: "Invalid scheduled time."
            });
        }

        const medicinelog = await MedicineLog.findOne({
            user : req.user._id,
            medicine : medicine._id,
            scheduledDate,
            scheduledTime
        });

        if(!medicinelog){
            return res.status(404).json({
                success : false,
                message : "No dose log found for the specified date and time."
            });
        }

        await medicinelog.deleteOne();

        res.status(200).json({
            success : true,
            message : "Dose action has been undone successfully."
        });
    }
    catch(err)
    {
        res.status(500).json({
            success : false,
            message : err.message
        })
    }
}

module.exports = {
    createMedicine,
    getMedicine,
    getMedicineById,
    updateMedicine,
    deleteMedicine,
    takeDose,
    skipDose,
    undoDoseAction,
}