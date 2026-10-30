

//database connection
require('dotenv').config();

const express = require('express');
const logger = require('./middleware/logger');
const authRouter = require('./routes/auth');
const lessonRouter = require('./routes/lesson');
const quizRouter = require('./routes/quizzes');




const app  = express();
const PORT = process.env.PORT;


// Middleware
app.use(logger)
app.use(express.json()); // reading the incoming request as json
app.use(express.static('public'))


//routes
app.use('/api/auth',authRouter);
app.use('/api/lessons', lessonRouter);
app.use('/api/quizzes', quizRouter);







//404 handler

app.use((req, res) => {
    res.status(404).json({ error: "Not Found" });
});

// erroe handler

app.use((err,req,res,next) =>{
    console.error(' Error:',err.message);
    res.status(500).json({error: 'Server Error'});
});




// start
app.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
});

