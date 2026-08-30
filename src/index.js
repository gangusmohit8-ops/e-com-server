import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import mongoose from "mongoose";
import expressRateLimit from "express-rate-limit";
import router from "./router/routes.js"; 
import { globalErrorHandler } from "./middleware/allerror.js";

dotenv.config({ quiet: true });

const PORT = process.env.PORT || 5000;
const app = express();

// Database Connection
mongoose.connect(process.env.MONGODB_URI )
    .then(() => console.log('✅ MongoDB Connected'))
    .catch((err) => console.error('❌ MongoDB Connection Error:', err));

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL ,
    credentials: true
}));

app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

// Rate Limiting
app.use(expressRateLimit({
    windowMs: 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many requests from this IP, please try again after a minute"
    }
}));

// Health Check
app.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString()
    });
});

// Routes — mounted at /api/v1 prefix
app.use("/api/v1", router);

// 404 Handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Route not found: ${req.method} ${req.originalUrl}`
    });
});

// Global Error Handler (from allerror.js)
app.use(globalErrorHandler);

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 API URL: http://localhost:${PORT}/api/v1`);
});