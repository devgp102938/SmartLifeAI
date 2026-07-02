const jwt = require('jsonwebtoken');

const generateToken = (id) => {
    try
    {
        return jwt.sign({
            id,
        },
        process.env.JWT_SECRET,
        {
            expiresIn : '1d'
        }
        )
    }
    catch(err)
    {
        console.log(err.message);
    }
}

module.exports = generateToken;