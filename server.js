

//database connection
require('dotenv').config();

const path = require('path');
const express = require('express');
const logger = require('./middleware/logger');
const authRouter = require('./routes/auth');
const lessonRouter = require('./routes/lesson');
const quizRouter = require('./routes/quizzes');
const analyticsRouter = require('./routes/analytics')
const teacherAnalyticsRouter = require('./routes/teacherAnalytics');
const adminRouter = require('./routes/admin');




const app  = express();
const PORT = process.env.PORT;


// Middleware
app.use(logger)
app.use(express.json()); // reading the incoming request as json
app.use(express.static('public'));
// Serve TinyMCE from node_modules
app.use('/tinymce', express.static(path.join(__dirname, 'node_modules', 'tinymce')));


//routes
app.use('/api/auth',authRouter);
app.use('/api/lessons', lessonRouter);
app.use('/api/quizzes', quizRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/teacher-analytics', teacherAnalyticsRouter);
app.use('/api/admin', adminRouter);







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

