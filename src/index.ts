import { Hono } from 'hono'
import { google } from '@ai-sdk/google'
import { generateText } from 'ai'
import { readFileSync } from 'fs'
import { join } from 'path'

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
    api_key_available: !!process.env.GOOGLE_GENERATIVE_AI_API_KEY
  })
})

app.post('/validate-food', async (c) => {
  const startTime = Date.now()
  console.log('🚀 Starting food validation request')
  
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

    // Prepare the user message content
    console.log('📝 Preparing user message content...')
    const userContent: any[] = [
      {
        type: 'text',
        text: `Please analyze this food image and determine its compliance with various dietary standards.`
      }
    ]

    // Add image content based on input type
    if (imageFile) {
      // Handle file upload
      console.log('🔄 Converting uploaded image to buffer...')
      const imageBuffer = await imageFile.arrayBuffer()
      const imageData = Buffer.from(imageBuffer)
      console.log('✅ Image converted to buffer, size:', imageData.length)
      
      userContent.push({
        type: 'file',
        data: imageData,
        mediaType: imageFile.type || 'image/jpeg',
      })
    } else if (imageUrl) {
      // Handle direct URL
      console.log('🔗 Using direct image URL:', imageUrl)
      userContent.push({
        type: 'file',
        data: imageUrl,
        mediaType: 'image/jpeg', // Default media type for URLs
      })
    } else if (imageBase64) {
      // Handle base64 encoded image
      console.log('🔢 Processing base64 encoded image...')
      
      // Remove data URL prefix if present (e.g., "data:image/jpeg;base64,")
      let cleanBase64 = imageBase64
      let mediaType = 'image/jpeg' // Default media type
      
      if (imageBase64.startsWith('data:')) {
        const match = imageBase64.match(/^data:([^;]+);base64,(.+)$/)
        if (match) {
          mediaType = match[1]
          cleanBase64 = match[2]
          console.log('🧹 Cleaned base64 data URL, media type:', mediaType)
        }
      }
      
      // Convert base64 to buffer
      const imageBuffer = Buffer.from(cleanBase64, 'base64')
      console.log('✅ Base64 converted to buffer, size:', imageBuffer.length)
      
      userContent.push({
        type: 'file',
        data: imageBuffer,
        mediaType: mediaType,
      })
    }

    // Get optional food name and ingredients from form data
    const foodName = formData.get('foodName') as string || ''
    const ingredients = formData.get('ingredients') as string || ''
    console.log('📋 Additional info:', { foodName, ingredients })

    // Add food name and ingredients if provided
    if (foodName || ingredients) {
      userContent[0].text += `\n\nAdditional information:\n`
      if (foodName) {
        userContent[0].text += `Food name: ${foodName}\n`
      }
      if (ingredients) {
        userContent[0].text += `Ingredients: ${ingredients}\n`
      }
    }
    console.log('✅ User message content prepared:', userContent[0].text.substring(0, 100) + '...')

    console.log('🤖 Calling Google Gemini API...')
    console.log('🔑 API Key available:', !!process.env.GOOGLE_GENERATIVE_AI_API_KEY)
    console.log('🔑 API Key length:', process.env.GOOGLE_GENERATIVE_AI_API_KEY?.length || 0)
    
    const apiStartTime = Date.now()
    const result = await generateText({
      model: google('gemini-2.5-pro'),
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userContent,
        },
      ],
    })
    const apiEndTime = Date.now()
    
    console.log('✅ Gemini API response received in', apiEndTime - apiStartTime, 'ms')
    console.log('📄 Response length:', result.text.length)
    console.log('📄 Response preview:', result.text.substring(0, 200) + '...')

    // Try to parse the response as JSON
    console.log('🔍 Attempting to parse response as JSON...')
    try {
      // Clean the response by removing markdown code blocks if present
      let cleanResponse = result.text.trim()
      
      // Remove markdown code blocks if they exist
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '')
        console.log('🧹 Cleaned markdown wrapper from response')
      } else if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '')
        console.log('🧹 Cleaned generic markdown wrapper from response')
      }
      
      console.log('🔍 Attempting to parse cleaned response...')
      const jsonResponse = JSON.parse(cleanResponse)
      console.log('✅ JSON parsed successfully:', Object.keys(jsonResponse))
      const totalTime = Date.now() - startTime
      console.log('🎉 Request completed successfully in', totalTime, 'ms')
      return c.json(jsonResponse)
    } catch (parseError) {
      console.log('❌ JSON parsing failed:', parseError)
      console.log('📄 Raw response that failed to parse:', result.text)
      console.log('📄 Raw response length:', result.text.length)
      // If parsing fails, return the raw text response
      return c.json({
        error: 'Failed to parse AI response as JSON',
        raw_response: result.text,
        parse_error: parseError instanceof Error ? parseError.message : 'Unknown parse error',
        response_length: result.text.length,
        response_preview: result.text.substring(0, 500)
      }, 500)
    }

  } catch (error) {
    const totalTime = Date.now() - startTime
    console.error('💥 Error in food validation after', totalTime, 'ms:', error)
    console.error('🔍 Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      error_type: error instanceof Error ? error.constructor.name : 'Unknown'
    })
    
    return c.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
      error_type: error instanceof Error ? error.constructor.name : 'Unknown',
      request_duration_ms: totalTime
    }, 500)
  }
})

console.log('🚀 Server starting up...')
export default app
