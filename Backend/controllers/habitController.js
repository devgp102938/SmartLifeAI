const Habit = require('../models/Habit.js');
const HabitHistory = require('../models/HabitHistory.js');
const mongoose = require('mongoose');

//crate Habit
const createHabit = async (req, res) => {
    try
    {
        const {title, description, durationDays, startDate} = req.body;

        if(!title || !durationDays || !startDate){
            return res.status(400).json({
                messgae : "All fields are required"
            });
        }

        const today = new Date();
        today.setHours(0,0,0,0);

        const start = new Date(startDate);
        if(isNaN(start.getTime())){
            return res.status(400).json({
                success : false,
                message : "Invalid Start date"
            })
        }
        start.setHours(0,0,0,0);

        if(start < today){
            return res.status(400).json({
                success : false,
                message : "startDate cannot be in the past"
            })
        }

        const days = Number(durationDays);

        if(!Number.isInteger(days) || days < 1 || days > 365){
            return res.status(400).json({
                success:false,
                message:"Invalid durationDays"
            })
        }

        const endDate = new Date(start);
        endDate.setDate(endDate.getDate() + days - 1);

        const habit = await Habit.create({
            user : req.user._id,
            title,
            description,
            durationDays : days,
            startDate : start,
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
            success : false,
            message : err.message
        })
    }
}

//getHabits
const getHabits = async (req, res) => {
    try
    {
        const habits = await Habit.find({
            user : req.user._id,
            isDeleted : false
        }).sort({startDate : 1});
        
        const now = new Date();
        now.setHours(0,0,0,0);

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
            success : false,
            message : err.message,
        })
    }
}

//gethabit with id
const getHabitbyId = async (req, res) => {

    try
    {
        if(!mongoose.Types.ObjectId.isValid(req.params.id)){
            return res.status(400).json({
                success : false,
                message : "Invalid Habit id"
            });
        }

        const habit = await Habit.findOne({
            _id : req.params.id,
            user  : req.user._id,
            isDeleted : false
        });

        if(!habit){
            return res.status(404).json({
                message : "No habit found!"
            });
        }
        
        res.status(200).json({
            success : true,
            habit,
        });
    }
    catch(err){
        res.status(500).json({
            success : false,
            message : err.message
        });
    }
}

//update habit
const updateHabit = async (req, res) => {
    try
    {
        if(!mongoose.Types.ObjectId.isValid(req.params.id)){
            return res.status(400).json({
                success : false,
                message : "Invalid Habit id"
            });
        }

        const habit = await Habit.findOne({
            _id : req.params.id,
            user : req.user._id,
            isDeleted : false
        });

        if(!habit){
            return res.status(404).json({
                success: false,
                message: "Habit not found"
            });
        }

        const {title, description, durationDays, startDate} = req.body;

        const today = new Date();
        today.setHours(0,0,0,0);

        const habitStart = new Date(habit.startDate);
        habitStart.setHours(0,0,0,0);

        const started = today >= habitStart;

        if(started && (
            startDate !== undefined ||
            durationDays !== undefined
        )){
            return res.status(400).json({
                success : false,
                message : "Cannot change startDate or durationDays after the habit has started"
            });
        }

        if(title !== undefined){
            habit.title = title;
        }
        if(description !== undefined){
            habit.description = description;
        }
        
        if(durationDays !== undefined){

            const days = Number(durationDays);

            if(!Number.isInteger(days) || days < 1 || days > 365){
                return res.status(400).json({
                    success : false,
                    message : "Invalid durationDays"
                });
            }

            habit.durationDays = days;
        }

        if(startDate !== undefined){

            const start = new Date(startDate);
            if(isNaN(start.getTime())){
                return res.status(400).json({
                    success : false,
                    message : "Invalid startDate"
                });
            }
            start.setHours(0,0,0,0);

            if(start < today){
                return res.status(400).json({
                    success : false,
                    message : "startDate cannot be in the past"
                });
            }

            habit.startDate = start;
        }

        if(startDate !== undefined || durationDays !== undefined){
            const end = new Date(habit.startDate);
            end.setHours(0,0,0,0);

            end.setDate(end.getDate() + habit.durationDays - 1);
            habit.endDate = end;
        }


        await habit.save();

        res.status(200).json({
            success: true,
            message: "Habit updated successfully",
            habit,
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

//delete habit
const deleteHabit = async (req, res) => {
    try
    {
        if(!mongoose.Types.ObjectId.isValid(req.params.id)){
            return res.status(400).json({
                success : false,
                message : "Invalid Habit id"
            });
        }

        const habit = await Habit.findOne({
            _id : req.params.id,
            user : req.user._id,
            isDeleted : false
        });

         if(!habit){
            return res.status(404).json({
                success: false,
                message: "Habit not found"
            });
        }

        habit.isDeleted = true;
        habit.deletedAt = new Date();

        await habit.save();

        res.status(200).json({
            success : true,
            message : "Habit has been deleted"
        });
    }
    catch(err){
        res.status(500).json({
            success : false,
            message : err.message
        });
    }
}

//complete habit
const completeHabit = async (req, res) => {
    try
    {
        if(!mongoose.Types.ObjectId.isValid(req.params.id)){
            return res.status(400).json({
                success : false,
                message : "Invalid Habit id"
            });
        }

        const habit = await Habit.findOne({
            _id : req.params.id,
            user : req.user._id,
            isDeleted : false
        });

        if(!habit){
            return res.status(404).json({
                success: false,
                message: "Habit not found"
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
            user : req.user._id,
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
            success : false,
            message : err.message
        });
    }
}

//uncomplete habit
const uncompleteHabit = async (req, res) => {
    try
    {
        if(!mongoose.Types.ObjectId.isValid(req.params.id)){
            return res.status(400).json({
                success : false,
                message : "Invalid Habit id"
            });
        }
        
        const habit = await Habit.findOne({
            _id : req.params.id,
            user : req.user._id,
            isDeleted : false
        });

        if(!habit){
            return res.status(404).json({
                success: false,
                message: "Habit not found"
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
            user : req.user._id,
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
            success : false,
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

