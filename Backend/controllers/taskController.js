const Task = require('../models/Task.js');
const TaskActivity = require('../models/TaskActivity.js');
const mongoose = require('mongoose');

//Create a Task
const createTask = async (req, res) => {
    try
    {
        const {title, description, dueDate, priority} = req.body;

        if(!title || !dueDate){
            return res.status(401).json({
                message : "All feild are required"
            });
        }

        const due = new Date(dueDate);
        if(Number.isNaN(due.getTime())){
            return res.status(400).json({
                success : false,
                message : "Invalid due date."
            })
        }
        due.setHours(0,0,0,0);

        const today = new Date();
        today.setHours(0,0,0,0);

        if(due < today){
            return res.status(400).json({
                success : false,
                message : "Due date cannot be before today."
            })
        }

        const task = await Task.create({
            user : req.user._id,
            title,
            description,
            dueDate : due,
            priority,
        });

        res.status(201).json({
            success : true,
            message : "Task has been Set!",
            task,
        });
    }
    catch(err)
    {
        res.status(500).json({
            message : err.message
        });
    }
}

//get all Tasks
const getTasks = async (req, res) => {
    try
    {
        const tasks = await Task.find({
            user : req.user._id,
            isDeleted : false
        }).sort({dueDate : 1}); //Duedate 1 sort tasks in  soonest-due tasks order 

        res.status(200).json({
            success : true,
            tasks,
        })
    }
    catch(err)
    {
        res.status(500).json({
            message : err.message
        });
    }
}

//get task by id
const getTaskById = async (req, res) => {
    try
    {
        if(!mongoose.Types.ObjectId.isValid(req.params.id)){
            return res.status(400).json({
                success : false,
                message : "invalid Task id"
            });
        }

        const task = await Task.findOne({
            _id : req.params.id,
            user : req.user._id,
            isDeleted : false
        });

        if(!task){
            return res.status(404).json({
                message : "Task not found"
            });
        }

        res.status(200).json({
            success : true,
            task,
        });
    }
    catch(err)
    {
        res.status(500).json({
            message : err.message
        });
    }
}

//update task
const updateTask = async (req, res) => {
    try
    {
        if(!mongoose.Types.ObjectId.isValid(req.params.id)){
            return res.status(400).json({
                success : false,
                message : "invalid Task id"
            });
        }

        const task = await Task.findOne({
            _id : req.params.id,
            user : req.user._id,
            isDeleted : false
        });

        if(!task){
            return res.status(404).json({
                message : "Task not found"
            });
        }

        const {title, description, dueDate, priority} = req.body;

        if(title !== undefined){
            task.title = title
        }
        if(description !== undefined){
            task.description = description
        }
        if(dueDate !== undefined){

            if(task.status == "completed"){
                return res.status(400).json({
                    success: false,
                    message: "Cannot change due date of a completed task."
                });
            }
            
            const due = new Date(dueDate);
            if(Number.isNaN(due.getTime())){
                return res.status(400).json({
                    success : false,
                    message : "Invalid due date."
                })
            }
            due.setHours(0,0,0,0);

            const today = new Date();
            today.setHours(0,0,0,0);

            if(due < today){
                return res.status(400).json({
                    success : false,
                    message : "Due date cannot be before today."
                });
            }
            else{
                task.dueDate = due;
            }
        }
        if(priority !== undefined){
            task.priority = priority
        }

        await task.save();

        res.status(200).json({
            success : true,
            message : "Task Updated",
            task
        });
    }
    catch(err)
    {
        res.status(500).json({
            message : err.message
        });
    }
}

//deleteTask 
const deleteTask = async (req, res) =>{
    try 
    {
        if(!mongoose.Types.ObjectId.isValid(req.params.id)){
            return res.status(400).json({
                success : false,
                message : "invalid Task id"
            });
        }

        const task = await Task.findOne({
            _id : req.params.id,
            user : req.user._id,
            isDeleted : false
        });

        if(!task){
            return res.status(404).json({
                message : "Task not found"
            });
        }

        task.isDeleted = true;
        task.deletedAt = Date.now();

        await task.save();

        res.status(200).json({
            success : true,
            message : "Task Deleted"
        });
    }
    catch(err)
    {
        res.status(500).json({
            message : err.message
        });
    }
}

//completeTask mark as completed
const completeTask = async (req, res) => {
    try
    {
        if(!mongoose.Types.ObjectId.isValid(req.params.id)){
            return res.status(400).json({
                success : false,
                message : "invalid Task id"
            });
        }
        
        const task = await Task.findOne({
            _id : req.params.id,
            user : req.user._id,
            isDeleted : false
        });

        if(!task){
            return res.status(404).json({
                message : "Task not found"
            });
        }

        if(task.status === 'completed'){
            return res.status(400).json({
                message : "Task is already completed"
            });
        }

        task.status = "completed";
        await task.save();

        await TaskActivity.create({
            user : req.user._id,
            task : task._id,
            action : "completed",
            dueDateAtAction : task.dueDate
        });

        res.status(200).json({
            success : true,
            message : "Task marked as completed",
            task,
        });
    }
    catch(err)
    {
        res.status(500).json({
            message : err.message
        });
    }
}

//uncomplet mark as pending again
const uncompleteTask = async(req, res) => {
    try
    {
        if(!mongoose.Types.ObjectId.isValid(req.params.id)){
            return res.status(400).json({
                success : false,
                message : "invalid Task id"
            });
        }
        
        const task = await Task.findOne({
            _id : req.params.id,
            user : req.user._id,
            isDeleted : false
        })

        if(!task){
            return res.status(404).json({
                success : false,
                message : "Task not found"
            });
        }

        if(task.status === 'pending'){
             return res.status(400).json({
                message : "Task is already pending"
            });
        }

        task.status = 'pending'
        await task.save();

        await TaskActivity.create({
            user : req.user._id,
            task : task._id,
            action : 'uncompleted',
            dueDateAtAction : task.dueDate
        })

        res.status(200).json({
            success : true,
            message : "Task marked as pending",
            task
        });
    }
    catch(err){
        res.status(500).json({
            message : err.message
        })
    }
}

module.exports = {
    createTask,
    getTasks,
    getTaskById,
    updateTask,
    deleteTask,
    completeTask,
    uncompleteTask,
};