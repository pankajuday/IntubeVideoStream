import rateLimit from "express-rate-limit";


// ✅ Set up Rate Limiting
const loginLimiter = rateLimit({
    windowMs: 10 * 1000,
    max: 5, // 🚀 Allow only 5 requests per minute
    message: { error: "Too many login attempts, try again later." },
    keyGenerator: (req) => req.ip,
});

export default loginLimiter