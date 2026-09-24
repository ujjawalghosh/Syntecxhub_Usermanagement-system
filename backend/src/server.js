import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import mongoose from 'mongoose'
import authRoutes from './routes/auth.js'
import userRoutes from './routes/users.js'
import { errorHandler } from './middleware/error.js'

const app = express()
const port = process.env.PORT || 5000
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173').split(',').map((origin) => origin.trim()).filter(Boolean)
if (!allowedOrigins.includes('http://127.0.0.1:5173')) allowedOrigins.push('http://127.0.0.1:5173')
const isAllowedOrigin = (origin) => {
  if (!origin) return true
  const hostname = new URL(origin).hostname
  return allowedOrigins.includes(origin) || hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.vercel.app')
}
app.use(cors({
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) return callback(null, true)
    callback(new Error('Not allowed by CORS'))
  },
  credentials: true
}))
app.use(express.json())
app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'lumina-api' }))
app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use(errorHandler)

if (!process.env.JWT_SECRET) console.warn('JWT_SECRET is not configured. Add it to backend/.env before authenticating.')
if (process.env.MONGO_URI) mongoose.connect(process.env.MONGO_URI).then(() => console.log('MongoDB connected')).catch((error) => console.error('MongoDB connection failed:', error.message))
else console.warn('MONGO_URI is not configured. API will start, but database routes need MongoDB.')
app.listen(port, () => console.log(`Lumina API listening on http://localhost:${port}`))
