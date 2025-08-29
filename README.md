# SatvikScan AI - Food Validation API

A smart food validation API that uses Google's Gemini 2.5 Pro model to analyze food images and determine compliance with various Indian dietary standards including Swaminarayan, Jain, Vegan, and Upvas (fasting) dietary codes.

## Features

- 🖼️ **Image Analysis**: Upload food images for instant dietary compliance analysis
- 🧠 **AI-Powered**: Uses Google's Gemini 2.5 Pro model for accurate food recognition
- 🍽️ **Multiple Standards**: Validates against Swaminarayan, Jain, Vegan, and Upvas dietary codes
- 📱 **Web Interface**: User-friendly HTML interface for testing the API
- 🔍 **Flexible Input**: Accepts both food images and optional ingredient lists

## API Endpoints

### POST `/validate-food`

Analyzes a food image and returns dietary compliance information. Supports three input methods: image file uploads, direct image URLs, and base64 encoded images.

**Request Body (multipart/form-data):**
- `image` (optional): Food image file (JPEG, PNG, etc.) - use this OR `imageUrl` OR `imageBase64`
- `imageUrl` (optional): Direct URL to the food image - use this OR `image` OR `imageBase64`
- `imageBase64` (optional): Base64 encoded image data - use this OR `image` OR `imageUrl`
- `foodName` (optional): Name of the food item
- `ingredients` (optional): Comma-separated list of ingredients

**Note:** You must provide exactly one of: `image` (file upload), `imageUrl` (direct URL), or `imageBase64` (base64 encoded).

**Base64 Support:**
- Accepts raw base64 strings
- Accepts data URLs (e.g., `data:image/jpeg;base64,/9j/4AAQ...`)
- Automatically detects media type from data URL prefix

**Response Format:**
```json
{
  "food_item": "detected or declared food name",
  "ingredients": ["ingredient1", "ingredient2", "..."],
  "is_veg": "yes | no",
  "is_swaminarayan_compliant": "yes | no",
  "is_jain_compliant": "yes | no",
  "is_vegan_compliant": "yes | no",
  "is_upvas_compliant": "yes | no",
  "reason": [
    "- explanation of compliance or non-compliance",
    "- additional details if needed"
  ]
}
```

## Installation & Setup

1. **Install dependencies:**
   ```bash
   bun install
   ```

2. **Set up Google AI credentials:**
   - Get your Google AI API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Set the environment variable:
     ```bash
     export GOOGLE_GENERATIVE_AI_API_KEY="your-api-key-here"
     ```

3. **Run the development server:**
   ```bash
   bun run dev
   ```

4. **Access the web interface:**
   - Open your browser and go to `http://localhost:3000`
   - Upload a food image and get instant dietary compliance analysis

## Usage Examples

### Using the Web Interface

1. Navigate to the root URL
2. Choose between:
   - **📁 Upload Image**: Select an image file from your device
   - **🔗 Image URL**: Paste a direct image URL (e.g., Appwrite cloud storage links)
3. Optionally provide the food name and ingredients
4. Click "Analyze Food" to get results

### Using the API directly

**File Upload:**
```bash
curl -X POST http://localhost:3000/validate-food \
  -F "image=@food-image.jpg" \
  -F "foodName=Dal Makhani" \
  -F "ingredients=lentils, cream, butter, spices"
```

**Direct URL:**
```bash
curl -X POST http://localhost:3000/validate-food \
  -F "imageUrl=https://fra.cloud.appwrite.io/v1/storage/buckets/.../files/.../view" \
  -F "foodName=Potato Chips" \
  -F "ingredients=potato, oil, salt"
```

**Base64 Encoded Image:**
```bash
curl -X POST http://localhost:3000/validate-food \
  -F "imageBase64=data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD..." \
  -F "foodName=Dal Makhani" \
  -F "ingredients=lentils, cream, butter, spices"
```

**Raw Base64 (without data URL prefix):**
```bash
curl -X POST http://localhost:3000/validate-food \
  -F "imageBase64=/9j/4AAQSkZJRgABAQAAAQABAAD..." \
  -F "foodName=Paneer Tikka"
```

### Programmatic Usage

```typescript
import { google } from '@ai-sdk/google';
import { generateText } from 'ai';

// For file uploads
const result = await generateText({
  model: google('gemini-2.5-pro'),
  system: systemPrompt, // Content from systemprompt.md
  messages: [
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: 'Analyze this food image for dietary compliance',
        },
        {
          type: 'file',
          data: imageBuffer,
          mediaType: 'image/jpeg',
        },
      ],
    },
  ],
});

// For direct URLs
const result = await generateText({
  model: google('gemini-2.5-pro'),
  system: systemPrompt,
  messages: [
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: 'Analyze this food image for dietary compliance',
        },
        {
          type: 'file',
          data: 'https://example.com/food-image.jpg',
          mediaType: 'image/jpeg',
        },
      ],
    },
  ],
});
```

## Dietary Standards Covered

### 🌿 Swaminarayan Compliance
- **Prohibited**: Onion, garlic, eggs, meat, fish, asafoetida
- **Allowed**: Root vegetables, dairy, honey (some sects)

### 🪷 Jain Compliance
- **Prohibited**: Onion, garlic, root vegetables, fermented foods, honey
- **Allowed**: Dairy, non-root green vegetables

### 🌱 Vegan Compliance
- **Prohibited**: All animal-derived products (milk, ghee, butter, etc.)
- **Allowed**: All plant-based foods

### 🌾 Upvas (Fasting) Compliance
- **Prohibited**: Onion, garlic, grains, cereals, fermented items
- **Allowed**: Sago, dairy, fruits, root vegetables

## Technology Stack

- **Backend**: Hono.js (fast web framework)
- **AI Model**: Google Gemini 2.5 Pro via Vercel AI SDK
- **Runtime**: Bun (fast JavaScript runtime)
- **Frontend**: Vanilla HTML/CSS/JavaScript

## Environment Variables

- `GOOGLE_GENERATIVE_AI_API_KEY`: Your Google AI API key (required)

## License

This project is licensed under the MIT License.
