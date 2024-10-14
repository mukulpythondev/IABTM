import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
import authRoutes from "./src/routes/userRoute.js"
import attributeRoutes from './src/routes/attributeRoute.js'
import expertroutes from './src/routes/expertRoute.js'
import shopRoutes from './src/routes/shopRoute.js'
import orderRoutes from './src/routes/orderRoutes.js'
import cartRoutes from './src/routes/cartRoutes.js'
import articleRoutes from './src/routes/articleRoutes.js'
const app= express()
app.use(cors({
    origin: process.env.CORS_ORIGIN
}))
app.use(express.json({ limit: "16kb" }))
app.use(express.urlencoded({ limit: "16kb", extended: true }))
app.use(express.static("public"))
app.use(cookieParser())
app.use("/api/auth/user", authRoutes);
app.use("/api/attribute", attributeRoutes);
app.use("/api/expert", expertroutes)
app.use("/api/shop",shopRoutes)
app.use("/api/order",orderRoutes)
app.use("/api/cart",cartRoutes)
app.use("/api/admin/articles", articleRoutes)
export default app;