import { Job } from 'bull';
import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { readFileSync } from 'fs';
import { join } from 'path';

// Task data interface
export interface FoodValidationTask {
  imageFile?: Buffer;        // Legacy support
  imageUrl?: string;         // Direct URL support
  imageBase64?: string;      // Primary method - base64 encoded image
  foodName?: string;
  ingredients?: string;
  mediaType?: string;
}

// Task result interface
export interface FoodValidationResult {
  taskId: string;
  status: 'completed' | 'failed';
  result?: any;
  error?: string;
  processingTime: number;
  completedAt: string;
}

// Read the system prompt from the file
const systemPrompt = readFileSync(join(process.cwd(), 'systemprompt.md'), 'utf-8');

/**
 * Process food validation task
 * This function runs in the background worker
 */
export async function processFoodValidation(job: Job<FoodValidationTask>): Promise<FoodValidationResult> {
  const startTime = Date.now();
  const taskId = job.id?.toString() || 'unknown';
  
  console.log(`🔄 Processing task ${taskId}:`, {
    hasFile: !!job.data.imageFile,
    hasUrl: !!job.data.imageUrl,
    hasBase64: !!job.data.imageBase64,
    foodName: job.data.foodName,
    imageFileType: job.data.imageFile ? typeof job.data.imageFile : 'N/A',
    imageFileConstructor: job.data.imageFile ? job.data.imageFile.constructor.name : 'N/A',
    imageFileLength: job.data.imageFile ? job.data.imageFile.length : 'N/A',
    imageFileIsBuffer: job.data.imageFile ? Buffer.isBuffer(job.data.imageFile) : 'N/A'
  });

  try {
    // Prepare the user message content - replicate the working approach from index.ts
    console.log('📝 Preparing user message content...')
    const userContent: any[] = [
      {
        type: 'text',
        text: `Please analyze this food image and determine its compliance with various dietary standards.`
      }
    ]

    // Add image content based on input type - exactly like the working index.ts
    if (job.data.imageFile) {
      // Handle file upload
      console.log('🔄 Processing uploaded image file...')
      userContent.push({
        type: 'file',
        data: job.data.imageFile,
        mediaType: job.data.mediaType || 'image/jpeg',
      })
    } else if (job.data.imageUrl) {
      // Handle direct URL
      console.log('🔗 Using direct image URL:', job.data.imageUrl)
      userContent.push({
        type: 'file',
        data: job.data.imageUrl,
        mediaType: 'image/jpeg', // Default media type for URLs
      })
    } else if (job.data.imageBase64) {
      // Handle base64 encoded image
      console.log('🔢 Processing base64 encoded image...')
      
      // Remove data URL prefix if present (e.g., "data:image/jpeg;base64,")
      let cleanBase64 = job.data.imageBase64
      let mediaType = job.data.mediaType || 'image/jpeg' // Default media type
      
      if (job.data.imageBase64.startsWith('data:')) {
        const match = job.data.imageBase64.match(/^data:([^;]+);base64,(.+)$/)
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

    // Get optional food name and ingredients
    const foodName = job.data.foodName || ''
    const ingredients = job.data.ingredients || ''
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

    console.log(`🤖 Calling Google Gemini API for task ${taskId}...`)
    console.log('🔑 API Key available:', !!process.env.GOOGLE_GENERATIVE_AI_API_KEY)
    
    // Call Gemini API with the EXACT same format as the working index.ts
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

    // Parse the response exactly like the working index.ts
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
      
      const processingTime = Date.now() - startTime
      console.log(`🎉 Task ${taskId} completed successfully in ${processingTime}ms`)
      
      return {
        taskId,
        status: 'completed',
        result: jsonResponse,
        processingTime,
        completedAt: new Date().toISOString(),
      };
    } catch (parseError) {
      console.log('❌ JSON parsing failed:', parseError)
      console.log('📄 Raw response that failed to parse:', result.text)
      throw new Error(`Failed to parse AI response as JSON: ${parseError instanceof Error ? parseError.message : 'Unknown parse error'}`);
    }

  } catch (error) {
    const processingTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    console.error(`💥 Task ${taskId} failed after ${processingTime}ms:`, errorMessage);
    console.error(`🔍 Full error:`, error);
    
    return {
      taskId,
      status: 'failed',
      error: errorMessage,
      processingTime,
      completedAt: new Date().toISOString(),
    };
  }
} 