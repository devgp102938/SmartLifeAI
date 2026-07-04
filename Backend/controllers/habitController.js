const Habit = require('../models/Habit.js');
const HabitHistory = require('../models/HabitHistory.js');

//crate Habit
const createHabit = async (req, res) => {

    try
    {
        const {title, description, durationDays, startDate} = req.body;

        if(!title || !durationDays || !startDate){
            return res.status(400).json({
                messgae : "All feild are required"
            });
        }

        const start = new Date(startDate);
        const endDate = new Date(start);

        endDate.setDate(endDate.getDate() + Number(durationDays) - 1);

        const habit = await Habit.create({
            user : req.user._id,
            title,
            description,
            durationDays,
            startDate,
            endDate
        });


        res.status(201).json({
            success : true,
            message : "Habit has been created",
            habit,
        });
    }
    catch(err)
    {
        res.status(500).json({
            message : err.message
        })
    }
}

//getHabits
const getHabits = async (req, res) => {
    try
    {
        const habits = await Habit.find({user : req.user._id}).sort({startDate : 1});
        
        const now = new Date();

        const habitsWithStatus = habits.map(habit => {
        const habitObj = habit.toObject();

        habitObj.status = 
            now < habit.startDate ? 'upcoming' 
                : now > habit.endDate ? 'finished'
                    : 'active'; 

        return habitObj;
       });

        res.status(200).json({
            success : true,
            habits : habitsWithStatus
        });
    }
    catch(err)
    {
        res.status(500).json({
            message : err.message,
        })
    }
}


//gethabit with id
const getHabitbyId = async (req, res) => {

    try
    {
        const habit = await Habit.findById(req.params.id);

        if(!habit){
            return res.status(404).json({
                message : "No habit found!"
            });
        }

        if(habit.user.toString() !== req.user._id.toString()){
            return res.status(403).json({
                message : "Not authorized to access this Habit Profile"
            });
        }

        res.status(200).json({
            success : true,
            habit,
        });
    }
    catch(err){
        res.status(500).json({
            message : err.message
        });
    }
}

//update habit

const updateHabit = async (req, res) => {
    try
    {
        const habit = await Habit.findById(req.params.id);

        if(!habit){
            return res.status(404).json({
                success: false,
                message: "Habit not found"
            });
        }

        if(habit.user.toString() !== req.user._id.toString()){
            return res.status(403).json({
                message: "You are not authorized to update this habit"
            });
        }

        const {title, description, durationDays, startDate} = req.body;

        if(title !== undefined){
            habit.title = title;
        }
        if(description !== undefined){
            habit.description = description;
        }
        if(durationDays !== undefined){
            habit.durationDays = durationDays;
        }
        if(startDate !== undefined){
            habit.startDate = startDate;
        }

        if(startDate || durationDays){
            const start = new Date(startDate);
            const end = new Date(start);

            end.setDate(end.getDate() + Number(habit.durationDays) - 1);

            habit.endDate = end;
        }

        await habit.save();

        res.status(200).json({
            success: true,
            message: "Habit updated successfully",
            habit,
        });
    }
    catch(err){
        res.status(500).json({
            message : err.message
        });
    }
}

module.exports = {
    createHabit,
    getHabits,
    getHabitbyId,
    updateHabit,
}

