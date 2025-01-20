import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
const secret = process.env.JWT_SECRET || "MYSECRET";

export const AuthMiddleware = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const token = req.headers.authorization;
    try {
        if (!token) throw new Error("Not an Authenticated User")
        const decodedData = jwt.verify(token, secret) as { userId: number };
        if (!decodedData?.userId) throw new Error("Invalid Authentication Token");
        req.userId = decodedData.userId;
        next();
    } catch (error: any) {
        console.error(error)
        res.status(401).json({ message: error.message })
    }
}