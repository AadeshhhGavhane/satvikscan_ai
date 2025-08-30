import { Hono } from 'hono'
import { google } from '@ai-sdk/google'
import { generateText } from 'ai'
import { readFileSync } from 'fs'
import { join } from 'path'
import { foodValidationQueue } from './queue/config'
import { FoodValidationTask } from './queue/processor'

const app = new Hono()

// Read the system prompt from the file
const systemPrompt = readFileSync(join(process.cwd(), 'systemprompt.md'), 'utf-8')
console.log('✅ System prompt loaded successfully, length:', systemPrompt.length)

// Read the HTML file for the web interface
const htmlContent = readFileSync(join(process.cwd(), 'public/index.html'), 'utf-8')
console.log('✅ HTML content loaded successfully, length:', htmlContent.length)

// Check environment variables
console.log('🔑 Environment check:')
console.log('  - GOOGLE_GENERATIVE_AI_API_KEY:', process.env.GOOGLE_GENERATIVE_AI_API_KEY ? '✅ Set' : '❌ Not set')
console.log('  - REDIS_HOST:', process.env.REDIS_HOST || 'localhost (default)')
console.log('  - NODE_ENV:', process.env.NODE_ENV || 'Not set')

app.get('/', (c) => {
  console.log('📄 Serving HTML interface')
  return c.html(htmlContent)
})

app.get('/health', (c) => {
  console.log('🏥 Health check requested')
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    system_prompt_loaded: !!systemPrompt,
    html_content_loaded: !!htmlContent,
    api_key_available: !!process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    redis_connected: true, // We'll add proper Redis health check later
    queue_status: 'active'
  })
})

// Async food validation endpoint - returns task ID immediately
app.post('/validate-food', async (c) => {
  const startTime = Date.now()
  console.log('🚀 Starting async food validation request')
  
  try {
    console.log('📝 Parsing form data...')
    const formData = await c.req.formData()
    console.log('✅ Form data parsed successfully')
    
    const imageFile = formData.get('image') as File
    const imageUrl = formData.get('imageUrl') as string
    const imageBase64 = formData.get('imageBase64') as string
    
    console.log('📸 Input received:', {
      hasFile: !!imageFile,
      hasUrl: !!imageUrl,
      hasBase64: !!imageBase64,
      fileName: imageFile?.name,
      fileSize: imageFile?.size,
      fileType: imageFile?.type,
      url: imageUrl,
      base64Length: imageBase64?.length || 0
    })
    
    if (!imageFile && !imageUrl && !imageBase64) {
      console.log('❌ No image input provided (file, URL, or base64)')
      return c.json({ error: 'Please provide either an image file, image URL, or base64 encoded image' }, 400)
    }

    // Prepare task data
    const taskData: FoodValidationTask = {
      foodName: formData.get('foodName') as string || '',
      ingredients: formData.get('ingredients') as string || '',
    }

    // Add image data based on input type
    if (imageFile) {
      console.log('🔄 Converting uploaded image to buffer...')
      const imageBuffer = await imageFile.arrayBuffer()
      const buffer = Buffer.from(imageBuffer)
      // Convert to base64 to avoid queue serialization issues
      taskData.imageBase64 = buffer.toString('base64')
      taskData.mediaType = imageFile.type || 'image/jpeg'
      console.log('✅ Image converted to base64, original size:', buffer.length, 'base64 length:', taskData.imageBase64.length)
    } else if (imageUrl) {
      console.log('🔗 Using direct image URL:', imageUrl)
      taskData.imageUrl = imageUrl
    } else if (imageBase64) {
      console.log('🔢 Using base64 encoded image, length:', imageBase64.length)
      taskData.imageBase64 = imageBase64
      taskData.mediaType = 'image/jpeg'
    }

    console.log('📋 Task data prepared:', {
      hasImage: !!(taskData.imageFile || taskData.imageUrl || taskData.imageBase64),
      foodName: taskData.foodName,
      ingredients: taskData.ingredients
    })

    // Add task to queue
    console.log('📤 Adding task to queue...')
    const job = await foodValidationQueue.add('food-validation', taskData, {
      priority: 1, // Normal priority
      delay: 0, // Process immediately
      attempts: 3, // Retry up to 3 times
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    })

    const queueTime = Date.now() - startTime
    console.log(`✅ Task queued successfully in ${queueTime}ms, Job ID:`, job.id)

    // Return task ID immediately
    return c.json({
      success: true,
      taskId: job.id,
      message: 'Food validation task queued successfully',
      estimatedProcessingTime: '10-30 seconds',
      statusEndpoint: `/task-status/${job.id}`,
      queueTime: `${queueTime}ms`
    })

  } catch (error) {
    const totalTime = Date.now() - startTime
    console.error('💥 Error in async food validation after', totalTime, 'ms:', error)
    console.error('🔍 Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      error_type: error instanceof Error ? error.constructor.name : 'Unknown'
    })
    
    return c.json({ 
      success: false,
      error: 'Failed to queue food validation task',
      details: error instanceof Error ? error.message : 'Unknown error',
      error_type: error instanceof Error ? error.constructor.name : 'Unknown',
      request_duration_ms: totalTime
    }, 500)
  }
})

// Task status checking endpoint
app.get('/task-status/:taskId', async (c) => {
  const taskId = c.req.param('taskId')
  console.log(`🔍 Checking status for task: ${taskId}`)
  
  try {
    // Get job from queue
    const job = await foodValidationQueue.getJob(taskId)
    
    if (!job) {
      console.log(`❌ Task ${taskId} not found`)
      return c.json({
        success: false,
        error: 'Task not found',
        taskId: taskId
      }, 404)
    }

    const jobState = await job.getState()
    console.log(`📊 Task ${taskId} state: ${jobState}`)

    // Get job progress and result
    const progress = job.progress()
    const result = job.returnvalue
    const failedReason = job.failedReason

    const response: any = {
      success: true,
      taskId: taskId,
      status: jobState,
      progress: progress,
      createdAt: job.timestamp,
      processedAt: job.processedOn,
      finishedAt: job.finishedOn,
      attempts: job.attemptsMade,
      maxAttempts: job.opts.attempts || 3,
    }

    // Add result data if completed
    if (jobState === 'completed' && result) {
      response.result = result.result
      response.processingTime = result.processingTime
      response.completedAt = result.completedAt
    }

    // Add error data if failed
    if (jobState === 'failed' && failedReason) {
      response.error = failedReason
      response.failedAt = job.finishedOn
    }

    // Add queue position if waiting
    if (jobState === 'waiting') {
      const waitingCount = await foodValidationQueue.getWaiting()
      const position = waitingCount.findIndex(j => j.id === parseInt(taskId)) + 1
      response.queuePosition = position
      response.estimatedWaitTime = `${position * 10} seconds`
    }

    // Add processing info if active
    if (jobState === 'active') {
      response.processingStartedAt = job.processedOn
      response.estimatedCompletionTime = '5-15 seconds'
    }

    console.log(`✅ Status retrieved for task ${taskId}:`, jobState)
    return c.json(response)

  } catch (error) {
    console.error(`💥 Error checking status for task ${taskId}:`, error)
    return c.json({
      success: false,
      error: 'Failed to retrieve task status',
      details: error instanceof Error ? error.message : 'Unknown error',
      taskId: taskId
    }, 500)
  }
})

// Queue status endpoint for monitoring
app.get('/queue-status', async (c) => {
  try {
    const waiting = await foodValidationQueue.getWaiting()
    const active = await foodValidationQueue.getActive()
    const completed = await foodValidationQueue.getCompleted()
    const failed = await foodValidationQueue.getFailed()
    const delayed = await foodValidationQueue.getDelayed()

    const status = {
      success: true,
      queue: 'food-validation',
      timestamp: new Date().toISOString(),
      counts: {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        delayed: delayed.length,
        total: waiting.length + active.length + completed.length + failed.length + delayed.length
      },
      performance: {
        avgProcessingTime: 'Calculating...', // We can implement this later
        successRate: completed.length > 0 ? ((completed.length / (completed.length + failed.length)) * 100).toFixed(2) + '%' : 'N/A'
      }
    }

    console.log('📊 Queue status retrieved:', status.counts)
    return c.json(status)

  } catch (error) {
    console.error('💥 Error retrieving queue status:', error)
    return c.json({
      success: false,
      error: 'Failed to retrieve queue status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

console.log('🚀 Server starting up with async task queueing...')
export default app
