import express, { Express, Request, Response } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { config } from './config'
import routes from './routes'
import jobController from './controllers/jobController'
import { checkImageGenerationAppStatus } from './controllers/imageAppController'
import { errorHandler } from './middleware/errorHandler'
import { generalLimiter } from './middleware/rateLimiter'
import { log } from './utils/logger'

const app: Express = express()

// CORS configuration
app.use(
  cors({
    origin: config.cors.origin,
    credentials: config.cors.credentials
  })
)

// Body parsing with size limits
app.use(express.json({ limit: config.request.bodySizeLimit }))
app.use(express.urlencoded({ extended: true }))

// Security headers
app.use(helmet())

// Rate limiting
app.use(generalLimiter)

// API routes
app.use('/api', routes)

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.send('Express + TypeScript Server')
})

// Error handling middleware (must be registered after all routes)
app.use(errorHandler)

// Start background processes
checkImageGenerationAppStatus()
jobController.startProcessing()

// Periodic health check
setInterval(checkImageGenerationAppStatus, config.health.checkInterval)

// Start server
app.listen(config.server.port, () => {
  log.info('Server started', {
    url: `http://${config.server.host}:${config.server.port}`,
    environment: config.server.env
  })
})
