import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 8, select: false },
  role: { type: String, enum: ['Admin', 'Editor', 'Viewer'], default: 'Viewer' },
  status: { type: String, enum: ['Active', 'Pending'], default: 'Active' },
  inviteCode: { type: String, select: false },
  employeeId: { type: String, trim: true },
  department: { type: String, trim: true, default: 'General' },
  jobTitle: { type: String, trim: true, default: 'Team member' },
  phone: { type: String, trim: true },
  location: { type: String, trim: true },
  employmentType: { type: String, enum: ['Full-time', 'Part-time', 'Contractor', 'Intern'], default: 'Full-time' },
  manager: { type: String, trim: true }
}, { timestamps: true })

userSchema.pre('save', async function save() {
  if (!this.isModified('password')) return
  this.password = await bcrypt.hash(this.password, 12)
})

userSchema.methods.comparePassword = function comparePassword(candidate) { return bcrypt.compare(candidate, this.password) }
userSchema.methods.toSafeJSON = function toSafeJSON() { const result = this.toObject(); delete result.password; return result }

export default mongoose.model('User', userSchema)
