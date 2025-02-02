import express, { Express, Request, Response } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import routes from './routes'
import jobController from './controllers/jobController'
import { checkImageGenerationAppStatus } from './controllers/imageAppController'

const app: Express = express()
const port = process.env.PORT || 3001

app.use(cors())
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(helmet())

app.use('/api', routes)
app.get('/', (req: Request, res: Response) => {
  res.send('Express + TypeScript Server')
})

checkImageGenerationAppStatus()
jobController.startProcessing()

setInterval(checkImageGenerationAppStatus, 60000)

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`)
})
