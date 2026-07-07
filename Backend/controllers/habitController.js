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

        if(isNaN(start.getTime()) || isNaN(endDate.getTime())) {
                return res.status(400).json({
                success: false,
                message: "Invalid date"
            });
        }

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

            const start = new Date(startDate);

            if(Number.isNaN(start.getTime())){
                    return res.status(400).json({
                    success: false,
                    message: "Invalid date"
            });

            habit.startDate = startDate;
        }

        if(startDate || durationDays){
            const start = new Date(habit.startDate);
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
    }
    catch(err){
        res.status(500).json({
            message : err.message
        });
    }
}

//delete habit
const deleteHabit = async (req, res) => {
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

        await HabitHistory.deleteMany({habit : habit._id});
        await habit.deleteOne();

        res.status(200).json({
            success : true,
            message : "Habit has been deleted"
        });
    }
    catch(err){
        res.status(500).json({
            message : err.message
        });
    }
}

//complete habit
const completeHabit = async (req, res) => {
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

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const startDate = new Date(habit.startDate);
        startDate.setHours(0, 0, 0, 0);

        const endDate = new Date(habit.endDate);
        endDate.setHours(0, 0, 0, 0);


        if(today < startDate){
            return res.status(400).json({
                success : false,
                message : "Challenge has not started yet"
            })
        }
        if(today > endDate){
            return res.status(400).json({
                success : false,
                message : "Challenge has ended"
            })
        }

        const alreadyCompleted = await HabitHistory.findOne({
            habit : habit._id,
            date : today
        })

        if(alreadyCompleted){
            return res.status(400).json({
                success : false,
                message : "Habit already completed today"
            });
        }

        const history = await HabitHistory.create({
            user : req.user._id,
            habit : habit._id,
            date : today
        });

        res.status(201).json({
            success : true,
            message: "Habit completed successfully",
            history
        });

       

    }
    catch(err){
        res.status(500).json({
            message : err.message
        });
    }
}

//uncomplete habit
const uncompleteHabit = async (req, res) => {
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

        const today = new Date();
        today.setHours(0,0,0,0);

        const startDate = new Date(habit.startDate);
        startDate.setHours(0,0,0,0);

        const endDate = new Date(habit.endDate);
        endDate.setHours(0,0,0,0)

        if(today < startDate){
            return res.status(400).json({
                success : false,
                message : "Challenge has not started yet"
            });
        }

        if(today > endDate){
            return res.status(400).json({
                success : false,
                message : "Challenge has ended"
            });
        }

        const history = await HabitHistory.findOne({
            habit : habit._id,
            date : today
        });

        if(!history){
            return res.status(404).json({
                success : false,
                message : "No habit history found"
            })
        }

        await history.deleteOne();

        res.status(200).json({
            success : true,
            message : "Habit marked as incomplete"
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
    deleteHabit,
    completeHabit,
    uncompleteHabit,
}

