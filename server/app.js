import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
import authRoutes from "./src/routes/userRoute.js"
import attributeRoutes from './src/routes/attributeRoute.js'

const app= express()
app.use(cors({
    origin:process.env.CORS_ORIGIN
}))
app.use(express.json({limit:"16kb"}))
app.use(express.urlencoded({limit:"16kb", extended:true}))
app.use(express.static("public"))
app.use(cookieParser())
app.use("/api/auth", authRoutes);
app.use("/api/attribute", attributeRoutes);

export default app;