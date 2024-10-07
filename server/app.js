import mongoose from "mongoose";
import express from "express";
import cookieParser from "cookie-parser";
 
import authRoutes from "./src/routes/userRoute.js";

const port = process.env.PORT;

async function main() {
  await mongoose.connect(process.env.DATABASE_URL);
  console.log("Database connected");
}

main().catch(err => console.log(err));

const app = express();
app.use(cookieParser());
app.use(express.json());

app.use(authRoutes);

app.listen(port, () => {
  console.log(`App is listening on port ${port}`);
});
