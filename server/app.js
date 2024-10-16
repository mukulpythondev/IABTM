import express from "express";
import cors from "cors";
import session from 'express-session';
import cookieParser from "cookie-parser";
import http from 'http'; // Import http to create server
import authRoutes from "./src/routes/userRoute.js";
import attributeRoutes from './src/routes/attributeRoute.js'; 
import expertroutes from './src/routes/expertRoute.js';
import shopRoutes from './src/routes/shopRoute.js';
import orderRoutes from './src/routes/orderRoutes.js';
import cartRoutes from './src/routes/cartRoutes.js';
import notificationRoutes from './src/routes/notificationRoute.js';
import articleRoutes from './src/routes/articleRoutes.js';
import initializeSocket from './src/helpers/socketConnection.js'; // Import socket initialization

const jwt_secret = process.env.JWT_SECRET;

const app = express();

// Create HTTP server
const server = http.createServer(app);

// Initialize socket with server
initializeSocket(server); // Pass server to socket connection

app.use(cors({
    origin: process.env.CORS_ORIGIN
}));

app.use(session({
    secret: jwt_secret, 
    resave: false,
    saveUninitialized: true,
    cookie: { secure: process.env.NODE_ENV === 'production' }
}));

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ limit: "16kb", extended: true }));
app.use(express.static("public"));
app.use(cookieParser());

app.use("/api/user", authRoutes);
app.use("/api/attribute", attributeRoutes);
app.use("/api/expert", expertroutes);
app.use("/api/shop", shopRoutes);
app.use("/api/order", orderRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/admin/articles", articleRoutes);
app.use("/api/notifications", notificationRoutes);

export { app, server };
