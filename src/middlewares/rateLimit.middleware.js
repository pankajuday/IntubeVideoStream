import rateLimit from "express-rate-limit";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 5, 
    message: { error: "Too many login attempts, please try again after 15 minutes." },
    keyGenerator: (req) => req.ip, 
    standardHeaders: true, 
    legacyHeaders: false, 
    handler: (req, res, next, options) => {
       
        const logFilePath = path.join(__dirname, "../../log/rate-limit.log");
        const logMessage = `[${new Date().toISOString()}] Too many login attempts from IP: ${req.ip}\n`;
        fs.appendFile(logFilePath, logMessage, (err) => {
            if (err) console.error("Failed to log rate limit event:", err);
        });

        
        res.status(options.statusCode).json({
            error: "Too many login attempts, please try again after 15 minutes.",
            retryAfter: Math.ceil((options.windowMs) / 1000 / 60) + " minutes",
        });
    },
});

export { loginLimiter };
