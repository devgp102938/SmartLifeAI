const jwt = require('jsonwebtoken');
const User = require('../models/User.js');

const authmiddleware = async (req, res, next) => {
    try
    {
        const token = req.cookies.token;

        if(!token){
            return res.status(401).json({
                message : "No token Provided"
            });
        }
        
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        const user = await User.findById(decoded.id);

        if(!user){
            return res.status(404).json({
                message : "user not found",
            });
        }

        req.user = user;

        next();
    }
    catch(err)
    {
        res.status(500).json({
            messgae : err.message
        });
    }
}

module.exports = authmiddleware;