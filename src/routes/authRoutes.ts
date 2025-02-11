import { Request, Response, Router } from "express";
import { z } from "zod";
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from "../config/db";
const AuthRouter = Router()

const zodUserSchema = z.object({
    username: z.string({
        required_error: "username is required",
        invalid_type_error: "username must be a string"
    })
    .min(4, "username is too short")
    .max(15, "username is too long"),
    password: z.string({
        required_error: "password is required"
    })
    .min(8, "Password should be in minimum 8 characters")
    .max(20, "Password should be at most 20 characters long")
}) 

type User = z.infer<typeof zodUserSchema>
    
AuthRouter.post('/signup', async (req: Request, res: Response): Promise<any> => {
    try {
        console.log(req.body)
        const userData : User = zodUserSchema.parse(req.body)
        const passwordHash = await bcrypt.hash(userData.password, 10);
        
        const existingUser = await prisma.user.findUnique({
            where: {
                username: userData.username
            },
            select: {
                username: true
            }
        })
        if (existingUser) return res.status(409).json({
            message: "Username already taken",
        })
        const response = await prisma.user.create({
            data: {
                username: userData.username,
                password: passwordHash
            },
            select: {
                username: true
            }
        })
        return res.status(201).json({
            message: "User created successfully",
            data: response
        })
        
    } catch (error) {
        
        if (error instanceof z.ZodError) {
            console.error("Validation error:", error.errors); 
            return res.status(400).json({
                message: "Validation error",
                errors: error.errors.map((err) => ({
                    field: err.path.join("."),
                    message: err.message,
                })),
            });
        }

        console.error("Error during user signup:", error);
        return res.status(500).json({
            message: "An unexpected error occurred",
        });
    }
})

AuthRouter.post('/signin', async(req: Request, res: Response) : Promise<any> => {
    
    try {
        const userData : User = zodUserSchema.parse(req.body)
        
        const existingUser = await prisma.user.findUnique({
            where: {
                username: userData.username
            }
        })
        if (!existingUser) return res.status(401).json({
            message: "Invalid username or password",
        })
        
        const validPassword = await bcrypt.compare(userData.password, existingUser.password)
        
        if (!validPassword) return res.status(401).json({
            message: "Invalid username or password",
        })
        
        const token = jwt.sign({ userId: existingUser.id }, process.env.JWT_SECRET as string, {
            expiresIn: "1h" // need to change expiry time later
        })
        return res.status(201).json({
            message: "User signed in successfully",
            token: token
        })
        
    } catch (error) {
        
        if (error instanceof z.ZodError) {
            console.error("Validation error:", error.errors); 
            return res.status(400).json({
                message: "Validation error",
                errors: error.errors.map((err) => ({
                    field: err.path.join("."),
                    message: err.message,
                })),
            });
        }
    
        console.error("Error during user signup:", error);
        return res.status(500).json({
            message: "An unexpected error occurred",
        });
    }

})

export default AuthRouter;