import dotenv from "dotenv"
import User from "../models/userModel.js";
dotenv.config({
    path: "./.env"
})

import jwt from 'jsonwebtoken';
const JWT_SECRET =  process.env.JWT_SECRET


export const authenticate = async (req, res, next) => {
    try {
        const token = req.cookies.token;

        if (!token) {
            console.log('No token found in cookies');
            return res.status(401).json({ message: 'No token provided' });
        }

        console.log('Token found:', token);

        const decoded = jwt.verify(token, JWT_SECRET);
        console.log('Decoded ID:', decoded.id);

        const user = await User.findById(decoded.id);
        
        if (!user) {
            console.log('User not found');
            return res.status(404).json({ message: 'User not found' });
        }

        req.user = user;
        
        console.log('User ID:', user.id);
        console.log('User name:', user.name);
        
        next();
    } catch (error) {
        console.log('Authentication error:', error);
        return res.status(403).json({ message: 'Authentication failed' });
    }
};
