const Medicine = require('../models/Medicine.js');
const MedicineLog = require('../models/MedicineLog.js');

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

        if(isNaN(start.getTime() || isNaN(end.getTime()))){
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
            message : err.message
        })
    }
}

//get medicine
const getMedicine = async (req, res) => {
    try
    {
        const medicine = await Medicine.findById(
            req.params.id
        )

        if(!medicine){
            return res.status(404).json({
                success : false,
                message : "Medicine not found"
            });
        }
        if(medicine.user.toString() !== req.user._id.toString()){
            return res.status(403).json({
                success : false,
                message : "Not authorized to access this Medicine records"
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
            message : err.message
        })
    }
}

//getMEdicine by id
const getMedicineById = async (req, res) => {
    try
    {
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
            message : err.message
        })
    }
}

//update medicine
const updateMedicine = async (req, res) => {
    try
    {
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
                message : "Not authorized to access this task"
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
        }

        const finalStartDate = startDate ? new Date(startDate) : medicine.startDate;
        const finalEndDate = endDate ? new Date(endDate) : medicine.endDate;

        if(Number.isNaN(finalStartDate.getTime()) || Number.isNaN(FinalEndDate.getTime())){
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
        if(scheduleType !== undefined || !["daily", "specific-days"].includes(scheduleType)){
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

        medicine.save();

        res.status(200).json({
            success : true,
            message : "Medicine details has been updated"
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



module.exports = {
    createMedicine,
    getMedicine,
    getMedicineById,
}