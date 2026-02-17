const User = require('../models/User');

// Register new user
const register = async (req, res) => {
  try {
    // Extract data from request body
    const { username, email, password, role } = req.body;

    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide username, email, and password'
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    // Password strength validation
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this email or username already exists'
      });
    }

    // Create and save user (password will be hashed by pre-save middleware)
    const user = await User.create({
      username,
      email,
      password,
      role: role || 'participant'
    });

    // Send success response
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'User with this email or username already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
};


const login = async (req,res) =>{
    try{
        const {email , password} = req.body;
        if(!email || !password){
            return res.status(400).json({
                success: false,
                message: 'enter email and passward'
            });
        }
        const user = await User.findOne({email}).select('+password');
        if(!user){
            return res.status(401).json({
                success:false,
                message:"user does not exist"
            });
        }
        const isPasswordMatch = await user.comparePassward(password);
        if(!isPasswordMatch){
            return res.status(401).json({
                success:false,
                message:'passward is wrong'
            });
        }

        // Generate JWT token
        const jwt = require('jsonwebtoken');
        const token = jwt.sign(
          { id: user._id },
          process.env.JWT_SECRET || 'your-secret-key',
          { expiresIn: '7d' }
        );

        res.status(200).json({
            success:true,
            message:"login Success",
            token,
            data:{
                user:{
                    id: user.id,
                    username:user.username,
                    email:user.email,
                    role:user.role
                }
            }
        });
    }
    catch(error){
        console.error('Login error',error);
        res.status(500).json({
          success: false,
          message: 'Server error during login'
        });
    }
};

// Get current logged-in user
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt
        }
      }
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  register,
  login,
  getMe
};
