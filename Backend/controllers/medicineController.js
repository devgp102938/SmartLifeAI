const Medicine = require('../models/Medicine.js');
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

        //validate dates
        const start = new Date(startDate);
        const end = new Date(endDate);

        if(isNaN(start.getTime()) || isNaN(end.getTime())){
            return res.status(400).json({
                success : false,
                message : "Invalid date"
            })
        }

        if(start > end){
            return res.status(400).json({
                success: false,
                message: "Start date cannot be after end date."
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
        let medicineDays = [];

        if(scheduleType === 'specific-days'){

            if(!Array.isArray(daysOfWeek) || daysOfWeek.length === 0){
                return res.status(400).json({
                    success: false,
                    message: "Please select at least one day."
                });
            }

            const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

            const InValid = daysOfWeek.find(
                day => !validDays.includes(day)
            );

            if(InValid){
                return res.status(400).json({
                    success : false,
                    message : `Invalid day ${InValid}`
                });
            }

            medicineDays = daysOfWeek;
        }
        else{
            medicineDays = [];
        }

        const medicine = await Medicine.create({
            user : req.user._id,
            name,
            dosage,
            notes,
            times,
            scheduleType,
            daysOfWeek : medicineDays,
            startDate : start,
            endDate : end
        });

        res.status(201).json({
            success : true,
            message : "Medicine Profile has been created",
            medicine
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

        const medicine = await Medicine.findById(req.params.id);

        if(!medicine){
            return res.status(404).json({
                message : "Medicine not found"
            });
        }

        if(medicine.user.toString() !== req.user._id.toString()){
            return res.status(403).json({
                message : "Not authorized to access this Medicine"
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

        const medicine = await Medicine.findById(req.params.id);

        if(!medicine){
            return res.status(404).json({
                success : false,
                message : "Medicine not found"
            });
        }

        if(medicine.user.toString() !== req.user._id.toString()){
            return res.status(403).json({
                success : false,
                message : "Not authorized to access this medicine"
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

        if(times !== undefined){

            if(!Array.isArray(times) || times.length === 0){
                return res.status(400).json({
                    success: false,
                    message: "At least one medicine time is required."
                });
            }

            medicine.times = times;
        }

        const finalStartDate = startDate ? new Date(startDate) : medicine.startDate;
        const finalEndDate = endDate ? new Date(endDate) : medicine.endDate;

        if(Number.isNaN(finalStartDate.getTime()) || Number.isNaN(finalEndDate.getTime())){
            return res.status(400).json({
                success: false,
                message: "Invalid date."
            });
        }

        if(finalStartDate > finalEndDate){
            return res.status(400).json({
                success : false,
                message : "Start date cannot be after end date"
            });
        }

        medicine.startDate = finalStartDate;
        medicine.endDate = finalEndDate;

        //validate Schedule type
        if(scheduleType !== undefined && !["daily", "specific-days"].includes(scheduleType)){
            return res.status(400).json({
                success: false,
                message: "Invalid schedule type."
            });
        }

        //handles daysofweek
        const finalScheduleType = scheduleType || medicine.scheduleType;

        if(finalScheduleType == "daily"){
            medicine.scheduleType = "daily",
            medicine.daysOfWeek = []
        }
        else{
            medicine.scheduleType = "specific-days";

            if(daysOfWeek !== undefined){

                if(!Array.isArray(daysOfWeek) || daysOfWeek.length === 0){
                    return res.status(400).json({
                        success: false,
                        message: "Please select at least one day."
                    });
                }
                

                const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

                const InValid = daysOfWeek.find(
                    day => !validDays.includes(day)
                )

                if(InValid){
                    return res.status(400).json({
                        success : false,
                        message : `Invalid day ${InValid}`
                    });
                }

                medicine.daysOfWeek = daysOfWeek;
            }
            else if(medicine.daysOfWeek.length === 0){
                return res.status(400).json({
                    success: false,
                    message: "Please provide daysOfWeek for specific-days schedule."
                });
            }
        }

        await medicine.save();

        res.status(200).json({
            success : true,
            message : "Medicine details has been updated",
            medicine
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

        const medicine = await Medicine.findById(req.params.id);

        if(!medicine){
            return res.status(404).json({
                success : false,
                message : "Medicine not found"
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
                message : "scheduledDate is required"
            });
        }

        if(!scheduledTime){
            return res.status(400).json({
                success : false,
                message : "scheduleTime is required"
            });
        }

        const date = new Date(scheduledDate);

        if(isNaN(date.getTime())){
            return res.status(400).json({
                success : false,
                message : "Invalid scheduledDate"
            });
        }

        if(!medicine.times.includes(scheduledTime)){
            return res.status(400).json({
                success : false,
                message : "Invalid scheduled time for this medicine"
            });
        }

        const requestDate = new Date(scheduledDate);
        requestDate.setHours(0,0,0,0);

        const today = new Date();
        today.setHours(0,0,0,0);

        const startDate = new Date(medicine.startDate);
        startDate.setHours(0,0,0,0);

        const endDate = new Date(medicine.endDate);
        endDate.setHours(0,0,0,0);

        if(requestDate > today){
            return res.status(400).json({
                success: false,
                message: "Future doses cannot be logged"
        });
        }

        if(requestDate < startDate || requestDate > endDate){
            return res.status(400).json({
                success: false,
                message: "Scheduled date is outside the medicine schedule"            
            });
        }

        if(medicine.scheduleType == "specific-days"){

            const weekDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

            const weekDay = weekDays[(requestDate.getDay() + 6) % 7];

            if(!medicine.daysOfWeek.includes(weekDay)){
                return res.status(400).json({
                    success: false,
                    message: "Medicine is not scheduled for this weekday"
                });
            }
        }

        const existingLog = await MedicineLog.findOne({
            user : req.user._id,
            medicine : medicine._id,
            scheduledDate,
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
            scheduledDate,
            scheduledTime,
            status : "taken",
            takenAt : Date.now()
        });

        res.status(200).json({
            success : true,
            message : "Medicine dose logged successfully",
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
                message : "scheduledDate is required"
            });
        }

        if(!scheduledTime){
            return res.status(400).json({
                success : false,
                message : "scheduledTime is required"
            });
        }

        const date = new Date(scheduledDate);

        if(isNaN(date.getTime())){
            return res.status(400).json({
                success : false,
                message : "Invalid scheduledDate"
            });
        }

        if(!medicine.times.includes(scheduledTime)){
            return res.status(400).json({
                success : false,
                message : "Invalid scheduled time for this medicine"
            });
        }

        const requestDate = new Date(scheduledDate);
        requestDate.setHours(0,0,0,0);

        const today = new Date();
        today.setHours(0,0,0,0);

        const startDate = new Date(medicine.startDate);
        startDate.setHours(0,0,0,0);

        const endDate = new Date(medicine.endDate);
        endDate.setHours(0,0,0,0);

        if(requestDate > today){
            return res.status(400).json({
                success : false,
                message : "Cant skip future dose"
            })
        }

        if(requestDate < startDate || requestDate > endDate){
            return res.status(400).json({
                success: false,
                message: "Scheduled date is outside the medicine schedule"            
            });
        }

        if(medicine.scheduleType == "specific-days"){

            const weekDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

            const weekday = weekDays[(requestDate.getDay() + 6) % 7];

            if(!medicine.daysOfWeek.includes(weekday)){
                return res.status(400).json({
                    success: false,
                    message: "Medicine is not scheduled for this weekday"
                });
            }
        }

        const existingLog = await MedicineLog.findOne({
            user : req.user._id,
            medicine : medicine._id,
            scheduledDate,
            scheduledTime
        });

        if(existingLog){
            return res.status(400).json({
                success : false,
                message : "Dose has already been logged" 
            })
        }

        const medicinelog = await MedicineLog.create({
            user : req.user._id,
            medicine : medicine._id,
            scheduledDate,
            scheduledTime,
            status : "skipped"
        });

        res.status(201).json({
            success : true,
            message : "medicine has logged as skipped",
            medicinelog
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