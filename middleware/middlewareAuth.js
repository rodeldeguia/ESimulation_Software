const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

module.exports = (req,res,next) => {
    const header = req.headers.authorization || '';

    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if(!token){
        return res.status(401).json({error : 'No token Provided'});
    }

    try {

        const decoded  = jwt.verify(token,JWT_SECRET);
        req.user = decoded; // this will assign the payload of the token
        next()
        
    } catch (error) {
        return res.status(401).json({ error : ' Invalid or Token Expired'});
        
    }

}