import express from "express"
import AuthRouter from "./routes/authRoutes";
import cors from "cors";
import { AuthMiddleware } from "./middlewares/authMiddlewares";
import ContentRouter from "./routes/contentRoutes";
const app = express();

app.use(cors({
    origin: ["*"],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}))

app.use(express.json())
app.use('/api/auth', AuthRouter)

app.use(AuthMiddleware)
app.use('/api/content', ContentRouter)


export default app;
