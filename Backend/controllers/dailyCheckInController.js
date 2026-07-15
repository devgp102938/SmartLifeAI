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