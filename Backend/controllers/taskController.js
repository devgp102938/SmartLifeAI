const Task = require('../models/Task.js');
const TaskCompletion = require('../models/TaskCompletion.js');

//Create a Task
const createTask = async (req, res) => {
    try
    {
        const {title, description, dueDate, priority} = req.body;

        if(!title || !dueDate || !priority){
            return res.status(401).json({
                message : "All feild are required"
            });
        }

        const task = await Task.create({
            user : req.user._id,
            title,
            description,
            dueDate,
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
            user : req.user._id
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
        const task = await Task.findById(req.params.id);

        if(!task){
            return res.status(404).json({
                message : "Task not found"
            });
        }

        if(task.user.toString() !== req.user._id.toString()){
            return res.status(403).json({
                message : "Not authorized to access this task"
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
        const task = await Task.findById(req.params.id);

        if(!task){
            return res.status(404).json({
                message : "Task not found"
            });
        }

        if(task.user.toString() !== req.user._id.toString()){
            return res.status(403).json({
                message : "Not authorized to access this task"
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
            task.dueDate = dueDate
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
        const task = await Task.findById(req.params.id);

        if(!task){
            return res.status(404).json({
                message : "Task not found"
            });
        }

        if(task.user.toString() !== req.user._id.toString()){
            return res.status(403).json({
                message : "Not authorized to access this task"
            });
        }

        await TaskCompletion.deleteOne({task : task._id});
        await task.deleteOne();

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
        const task = await Task.findById(req.params.id);

        if(!task){
            return res.status(404).json({
                message : "Task not found"
            });
        }
        
        if(task.user.toString() !== req.user._id.toString()){
            return res.status(403).json({
                message : "Not authorized to access this task"
            });
        }

        if(task.status == 'completed'){
            return res.status(400).json({
                message : "Task is already completed"
            });
        }

        task.status = "completed";
        await task.save();

        await TaskCompletion.create({
            user : req.user._id,
            task : task._id
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
        const task = await Task.findById(req.params.id);

        if(!task){
            return res.status(404).json({
                message : "Task not found"
            });
        }

        if(task.user.toString() !== req.user._id.toString()){
            return res.status(403).json({
                message : "Not authorized to access this task"
            });
        }

        if(task.status == 'pending'){
             return res.status(400).json({
                message : "Task is already pending"
            });
        }

        task.status = 'pending'
        await task.save();

        await TaskCompletion.deleteMany({task : task._id});

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