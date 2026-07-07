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

module.exports = {
    createMedicine,
    getMedicine,
}