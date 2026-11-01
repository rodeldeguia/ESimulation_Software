
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Student = require('../models/studentModel');
const Teacher = require('../models/teacherModel');

const JWt_SECRET = process.env.JWt_SECRET;
const JWT_EXPIRES = '7d';
const SALT_ROUNDS = 10;

// styudent signup
exports.signupStudent =  async(req,res) => {
    try{
        const {username, password, full_name,grade_level,birth_date,LRN} = req.body;

        if(!username || !password || !full_name|| !grade_level){
            return res.status(400).json({error: ' username, password, fullname, and grade level are required!!'});
        
        }

        const existingTeacher = await Teacher.findUsername(username);
        const existingStudent = await Student.findUsername(username);
        if(existingTeacher || existingStudent){
            return res.status(409).json({error: 'Username already Taken'});
        }

        const password_hash = await bcrypt.hash(password,SALT_ROUNDS);

        const newStudent = await Student.create({
            username,
            password_hash,
            full_name,
            grade_level,
            birth_date,
            LRN
        })

        res.status(201).json({message : 'Student Created Successfully',
                                user: newStudent})

    }catch(err){
        console.error('Error in signupStudent:', err);
        res.status(500).json({error: 'Internal Server Error'});
    }
};


// teacher signup
exports.signupTeacher = async(req,res) =>{
    try{
        const {username, password, full_name, department, specialization, contact_number} = req.body;

        if(!username || !password || !full_name){
            return res.status(400).json({error : 'username, password, and fullname are required !!'});

        }

        const existingStudent = await Student.findUsername(username);
        const existingTeacher = await Teacher.findUsername(username);
        if(existingTeacher || existingStudent){
            return res.status(409).json({error: 'username already Taken'});
        }

        const password_hash = await bcrypt.hash(password,SALT_ROUNDS);

        const newTeacher = await Teacher.create({
            username,
            password_hash,
            full_name,
            department,
            specialization,
            contact_number
        });

    
        res.status(201).json({message : 'Teacher Created succecfully',
                                user: newTeacher});
        
    }catch(err){
        console.error('Error in signupTeacher:', err);
        res.status(500).json({error: 'Internal Server Error'});
    }
}

// login Student
exports.loginStudent = async(req,res) => {
    try{
        const {username, password} = req.body;

        if(!username || !password){
            return res.status(400).json({error : ' username and password are required !!'});
        }

        const student = await Student.findUsername(username);
        if(!student){
            return res.status(401).json({ error: 'Invalid Credential !!'});
        }

        if(!student.is_active){
            return res.status(403).json({error : 'Accouunt Disabled!!'});
        }

        const match = await bcrypt.compare(password,student.password_hash);
        if(!match){
            return res.status(401).json({error: 'Invalid Credential !!'});
        }

        // json web token generator
        const token = jwt.sign({id: student.student_id,role : 'student',username : student.username},JWt_SECRET,{expiresIn : JWT_EXPIRES})

        res.json({
            message: ' Login Succesfully',
            token,
            user:{
                id:student.student_id,
                username: student.username,
                full_name: student.full_name,
                role: 'student',
                grade_level: student.grade_level,
            }
        })

    }catch(error){
        console.error('Error in loginStudent:', error);
        res.status(500).json({error: 'Internal Server Error'});

    }
};

exports.loginTeacher = async (req,res) => {
    try {
        const {username,password} = req.body;

        if(!username ||!password){
            return res.status(400).json({error: ' username and password are required!!'});
        }

        const teacher = await Teacher.findUsername(username);
        if(!teacher){
            return res.status(401).json({error: 'Invalid Credential'});
        }

        const match = await bcrypt.compare(password,teacher.password_hash);
        if(!match){
            return res.status(401).json({error: 'Invalid Credential !!'})
        }

        //json web token generator
        const token = jwt.sign({id: teacher.teacher_id, role : teacher.role, username: teacher.username},JWt_SECRET,{expiresIn: JWT_EXPIRES});

        res.json({
            message: 'Login Succesfully',
            token,
            user:{
                id: teacher.teacher_id,
                username:teacher.username,
                full_name:teacher.full_name,
                department: teacher.department,
                specialization:teacher.specialization,
                contact_number: teacher.contact_number,
                role: teacher.role

            }
        })
        
    } catch (error) {
        console.error('Error in loginStudent:', error);
        res.status(500).json({error: 'Internal service Error!!'})
        
        
    }

}

exports.me = (req,res) => {
    res.json({ user: req.user });
}