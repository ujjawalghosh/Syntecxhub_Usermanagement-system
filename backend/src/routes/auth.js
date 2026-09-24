import { Router } from 'express'
import jwt from 'jsonwebtoken'
import User from '../models/User.js'

const router = Router()
const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' })

router.post('/signup', async (req, res, next) => {
  try {
    const { name, email, password } = req.body
    const role = await User.exists({}) ? 'Viewer' : 'Admin'
    const user = await User.create({ name, email, password, role })
    res.status(201).json({ user: user.toSafeJSON(), token: signToken(user.id) })
  } catch (error) { next(error) }
})

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body
    const user = await User.findOne({ email }).select('+password')
    if (!user || !(await user.comparePassword(password))) return res.status(401).json({ message: 'Email or password is incorrect' })
    res.json({ user: user.toSafeJSON(), token: signToken(user.id) })
  } catch (error) { next(error) }
})

export default router
