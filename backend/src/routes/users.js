import { Router } from 'express'
import crypto from 'node:crypto'
import User from '../models/User.js'
import { allowRoles, protect } from '../middleware/auth.js'
import { sendInvitationEmail } from '../services/mailer.js'

const router = Router()
const serializeUser = (user) => ({ ...user.toSafeJSON(), id: user.id || user._id?.toString?.() })
router.use(protect)

router.get('/', async (req, res, next) => {
  try { res.json(await User.find().sort({ createdAt: -1 })) } catch (error) { next(error) }
})
router.get('/:id', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
    if (!user) return res.status(404).json({ message: 'User not found' })
    res.json(user)
  } catch (error) { next(error) }
})
router.post('/', allowRoles('Admin'), async (req, res, next) => {
  let user
  try {
    const inviteCode = crypto.randomBytes(6).toString('hex').toUpperCase()
    user = await User.create({ ...req.body, status: 'Pending', inviteCode })
    const emailResult = await sendInvitationEmail({ name: user.name, email: user.email, temporaryPassword: req.body.password }).catch((error) => {
      console.warn('Invitation email failed:', error.message)
      return { sent: false, reason: error.message }
    })
    res.status(201).json({ ...user.toSafeJSON(), inviteCode, emailSent: Boolean(emailResult?.sent) })
  } catch (error) {
    if (user?._id) await User.findByIdAndDelete(user._id).catch(() => {})
    next(error)
  }
})
router.post('/transfer-admin', allowRoles('Admin'), async (req, res, next) => {
  try {
    const target = await User.findById(req.body.userId)
    if (!target) return res.status(404).json({ message: 'Target user not found' })
    if (target.id === req.user.id) return res.status(400).json({ message: 'Choose another member for admin transfer' })
    if (target.status && target.status !== 'Active') return res.status(400).json({ message: 'Only active members can become Admin' })
    const previousRole = target.role
    target.role = 'Admin'
    await target.save()
    const updatedCurrentUser = await User.findByIdAndUpdate(req.user.id, { role: 'Viewer' }, { new: true })
    if (!updatedCurrentUser) {
      target.role = previousRole
      await target.save()
      return res.status(404).json({ message: 'Current Admin not found' })
    }
    res.json({
      message: 'Admin role transferred',
      currentUser: serializeUser(updatedCurrentUser),
      targetUser: serializeUser(target)
    })
  } catch (error) { next(error) }
})
router.patch('/:id', async (req, res, next) => {
  try {
    if (req.user.role !== 'Admin' && req.user.id !== req.params.id) return res.status(403).json({ message: 'You can only update your own profile' })
    const allowed = ['name', 'email', 'employeeId', 'department', 'jobTitle', 'phone', 'location', 'employmentType', 'manager', 'status']
    if (req.user.role === 'Admin') allowed.push('role')
    const updates = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)))
    if (req.user.role !== 'Admin') delete updates.status
    if (req.user.role === 'Admin' && req.user.id === req.params.id && updates.role && updates.role !== 'Admin' && await User.countDocuments({ role: 'Admin' }) <= 1) return res.status(400).json({ message: 'Transfer Admin role to another active member first' })
    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true })
    if (!user) return res.status(404).json({ message: 'User not found' })
    res.json(user.toSafeJSON())
  } catch (error) { next(error) }
})
router.delete('/:id', allowRoles('Admin'), async (req, res, next) => {
  try {
    if (req.params.id === req.user.id) return res.status(400).json({ message: 'Transfer admin rights before deleting your own profile' })
    const targetUser = await User.findById(req.params.id)
    if (!targetUser) return res.status(404).json({ message: 'User not found' })
    if (targetUser.role === 'Admin' && await User.countDocuments({ role: 'Admin' }) <= 1) {
      return res.status(400).json({ message: 'Transfer admin role to another active member first' })
    }
    const user = await User.findByIdAndDelete(req.params.id)
    if (!user) return res.status(404).json({ message: 'User not found' })
    res.json({ message: 'User deleted' })
  } catch (error) { next(error) }
})
export default router
