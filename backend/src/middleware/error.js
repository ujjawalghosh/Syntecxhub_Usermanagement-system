export function errorHandler(error, req, res, next) {
  if (error.code === 11000) return res.status(409).json({ message: 'An account with that email already exists' })
  if (error.name === 'ValidationError') return res.status(400).json({ message: Object.values(error.errors).map((item) => item.message).join(', ') })
  if (error.statusCode) return res.status(error.statusCode).json({ message: error.message })
  console.error(error)
  res.status(500).json({ message: 'Something went wrong on the server' })
}
