const DailyCheckIn = require('../models/DailyCheckIn.js');

//create dailyCehckins
const createDailyCheckIn = async (req, res) => {
    try
    {
        const {date, moodScore, mood, energy, productivity, reflection} = req.body;

        if(!date || moodScore == undefined || !mood || energy == undefined || productivity == undefined){
            return res.status(400).json({
                success : false,
                message : "Please Fill Required Feilds"
            });
        }

        //validate Date format
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

        if(!dateRegex.test(date)){
            return res.status(400).json({
                success : false,
                message : "Date must be in YYYY-MM-DD format."
            });
        }

        //validate Calender date(human calender)
        const [year, month, day] = date.split("-").map(Number);

        const inputDate = new Date(Date.UTC(year, month - 1, day));

        if(inputDate.getUTCFullYear() !== year ||
           inputDate.getUTCMonth() !== month - 1||
           inputDate.getUTCDate() !== day
        ){
            return res.status(400).json({
                success: false,
                message: "Invalid calendar date."
            });
        }

        const now = new Date();

        const today = new Date(
            Date.UTC(
                now.getFullYear(),
                now.getMonth(),
                now.getDate()
            )
        );

        if(inputDate > today){
            return res.status(400).json({
                success: false,
                message: "Future dates are not allowed."
            });
        }

        //max 5 day old check in
        const oldestAllowed = new Date(today);
        oldestAllowed.setUTCDate(today.getUTCDate() - 5);

        if(inputDate < oldestAllowed){
            return res.status(400).json({
                success: false,
                message: "Check-ins older than 5 days are not allowed."
            });
        }

        //check for existing daily check in 
        const existingCheckIn = await DailyCheckIn.findOne({user : req.user._id, date});

        if(existingCheckIn){
            return res.status(409).json({
                success: false,
                message: "You have already submitted a check-in for this date."
            });
        }

        const checkIn = await DailyCheckIn.create({
            user : req.user._id,
            date,
            moodScore,
            mood,
            energy,
            productivity,
            reflection
        });

        res.status(201).json({
            success: true,
            message: "Daily check-in created successfully.",
            checkIn
        })
    }
    catch(err)
    {
        //check for duplicate entry
        if(err.code == 11000){
            return res.status(409).json({
                success: false,
                message: "A check-in already exists for this date."
            });
        }

        if(err.name == "ValidationError"){
            return res.status(400).json({
                success: false,
                message: err.message
            })
        }

        res.status(500).json({
            success : false,
            message : err.message
        })
    }
}

//get dailyCheckin
const getDailyCheckIn = async (req, res) => {
    try
    {
        const page = req.query.page !== undefined ? Number(req.query.page) : 1;
        const limit = req.query.limit !== undefined ? Number(req.query.limit) : 10;

        if(!Number.isInteger(page) || page < 1|| !Number.isInteger(limit) || limit < 1){
            return res.status(400).json({
                success : false,
                message : "Page and limit must be positive integers."
            });
        }

        const cappedLimit = Math.min(limit, 50);

        const skip = (page - 1) * cappedLimit;

        const checkIns = await DailyCheckIn.find({
            user : req.user._id
        })
        .sort({ date : -1 })
        .skip(skip)
        .limit(cappedLimit)

        const totalCheckIns = await DailyCheckIn.countDocuments({
            user : req.user._id
        });

        const totalPages = Math.ceil( totalCheckIns / cappedLimit );

        res.status(200).json({
            success : true,
            pagination : {
                page : page,
                totalCheckIns,
                totalPages,
                limit : cappedLimit
            },
            count : checkIns.length,
            checkIns
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

//get chekcin of specifc date
const getDailyCheckInByDate = async (req, res) => {
    try
    {
        const {date} = req.params;

        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        
        if(!dateRegex.test(date)){
            return res.status(400).json({
                success : false,
                message : "Date must be in YYYY-MM-DD format."
            });
        }

        const [year, month, day] = date.split("-").map(Number);

        const inputDate = new Date(Date.UTC(year, month - 1, day));

        if(inputDate.getUTCFullYear() !== year ||
           inputDate.getUTCMonth() !== month - 1 ||
           inputDate.getUTCDate() !== day
          )
          {
            return res.status(400).json({
                success : false,
                message: "Invalid calendar date."
            });
           }

        const checkIn = await DailyCheckIn.findOne({
            user : req.user._id,
            date,
        });

        if(!checkIn){
            return res.status(404).json({
                success : false,
                message : "Check-in not found for this date."
            });
        }

        res.status(200).json({
            success : true,
            checkIn
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

//update Dailycheckin
const updateDailyCheckIn = async (req, res) => {
    try
    {
        //extract date
        const {date} = req.params;

        //validate date
        if(!date){
            return res.status(400).json({
                success : false,
                message : "Date is required."
            });
        }

        //validate date format
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

        if(!dateRegex.test(date)){
            return res.status(400).json({
                success : false,
                message : "Date must be in YYYY-MM-DD format."
            });
        }

        //validate actual calander date
        const[year, month, day] = date.split("-").map(Number);

        const inputDate = new Date(Date.UTC(year, month - 1, day));

        if(inputDate.getUTCFullYear() !== year ||
           inputDate.getUTCMonth() !== month - 1 ||
           inputDate.getUTCDate() !== day)
           {
            return res.status(400).json({
                success : false,
                message: "Invalid calendar date."
            });
           }

        //todays date(UTC)
        const now = new Date();
        
        const today = new Date(
            Date.UTC(
                now.getFullYear(),
                now.getMonth(),
                now.getDate()
            )
        );

        //prevent future date updates
        if(today < inputDate){
            return res.status(400).json({
                success : false,
                message : "Future dates are not allowed."
            });
        }
        
        //Allow 5 day old dates updation
        const oldestAllowed = new Date(today);
        oldestAllowed.setUTCDate(today.getUTCDate() - 5);

        if(inputDate < oldestAllowed){
            return res.status(400).json({
                success: false,
                message: "Check-ins older than 5 days are not allowed."
            });
        }

        //find authenticated users data 
        const checkIn = await DailyCheckIn.findOne({
            user :req.user._id,
            date
        });

        if(!checkIn){ //check if user exists
            return res.status(404).json({
                success : false,
                message : "Daily check-in not found."
            });
        }

        //extract updation information from body
        const {mood, moodScore, energy, productivity, reflection} = req.body;

        //reject empty/invalid update body
        if(
            mood == undefined &&
            moodScore == undefined &&
            energy == undefined &&
            productivity == undefined &&
            reflection == undefined
        )
        {
            return res.status(400).json({
                success: false,
                message: "No valid fields provided for update."
            });
        }

        //update only allowed fields
        if(mood !== undefined){
            checkIn.mood = mood;
        }
        if(moodScore !== undefined){
            checkIn.moodScore = moodScore;
        }
        if(energy !== undefined){
            checkIn.energy = energy;
        }
        if(productivity !== undefined){
            checkIn.productivity = productivity;
        }
        if(reflection !== undefined){
            checkIn.reflection = reflection;
        }

        await checkIn.save(); //save

        res.status(200).json({
            success : true,
            checkIn
        });
    }
    catch(err)
    {
        if(err.name == "ValidationError"){
            return res.status(400).json({
                success : false,
                message : err.message
            })
        }

        res.status(500).json({
            success : false,
            message : err.message
        });
    }
}

//delete dailycehckin by date
const deleteDailyCheckIn = async (req, res) => {
    try
    {
        const {date} = req.params;

        if(!date){
            return res.status(400).json({
                success : false,
                message : "Date is required"
            });
        }

        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

        if(!dateRegex.test(date)){
            return res.status(400).json({
                success : false,
                message : "Date must be in YYYY-MM-DD format."
            });
        }

        const [year, month, day] = date.split("-").map(Number);

        const inputDate = new Date(Date.UTC(year, month - 1, day));

        if(inputDate.getUTCFullYear() !== year ||
           inputDate.getUTCMonth() !== month - 1 ||
           inputDate.getUTCDate() !== day
        )
        {
            return res.status(400).json({
                success : false,
                message : "Invalid calendar date."
            });
        }

        const checkIn = await DailyCheckIn.findOne({
            user : req.user._id,
            date
        });

        if(!checkIn){
            return res.status(404).json({
                success : false,
                message : "Daily check-in not found."
            });
        }

        await checkIn.deleteOne();

        res.status(200).json({
            success : true,
            message : "Check-in has been deleted"
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
module.exports = {
    createDailyCheckIn,
    getDailyCheckIn,
    getDailyCheckInByDate,
    updateDailyCheckIn,
    deleteDailyCheckIn,
}