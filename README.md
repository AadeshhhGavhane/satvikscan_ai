# SatvikScan AI - Food Validation System

An intelligent food validation API that uses Google's Gemini 2.5 Pro model to analyze food images and determine compliance with various Indian dietary standards (Swaminarayan, Jain, Vegan, and Upvas).

## 🚀 Features

- **AI-Powered Analysis**: Uses Google Gemini 2.5 Pro for accurate food recognition
- **Multiple Input Methods**: Support for file uploads, direct URLs, and base64 encoded images
- **Dietary Compliance**: Checks against Swaminarayan, Jain, Vegan, and Upvas dietary standards
- **Asynchronous Processing**: Queue-based architecture for scalable image processing
- **Real-time Updates**: Frontend polling for task status and results
- **Modern UI/UX**: Responsive web interface with drag-and-drop functionality

## 🏗️ Architecture

- **Web Framework**: Hono.js (lightweight, fast)
- **AI SDK**: Vercel AI SDK with Google Gemini provider
- **Task Queue**: Redis + Bull Queue for background processing
- **Runtime**: Bun (fast JavaScript runtime)
- **Frontend**: Vanilla HTML/CSS/JavaScript with modern design

## 📋 Prerequisites

- **Bun** installed on your system
- **Docker** for running Redis
- **Google Gemini API Key** from [Google AI Studio](https://makersuite.google.com/app/apikey)

## 🛠️ Installation & Setup

### 1. Clone and Install Dependencies

```bash
git clone https://github.com/AadeshhhGavhane/satvikscan_ai
cd satvikscan_ai
bun install
```

### 2. Environment Configuration

Create a `.env` file in the root directory:

```bash
# Google Gemini API Key
GOOGLE_GENERATIVE_AI_API_KEY=your_api_key_here

# Redis Configuration (optional - defaults shown)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Queue Configuration (optional - defaults shown)
QUEUE_CONCURRENCY=5
```

### 3. Start Redis

```bash
# Using Docker (recommended)
docker run -d --name redis-satvikscan -p 6379:6379 redis:alpine

# Or if you have Redis installed locally
redis-server
```

### 4. Build the Project

```bash
# Build the main API server
bun run build

# Build the background worker
bun run build:worker
```

## 🚀 Running the Project

### Option 1: Development Mode (Recommended for testing)

**Terminal 1 - Start the API Server:**
```bash
bun run dev
```
This starts the main API server on `http://localhost:3000`

**Terminal 2 - Start the Background Worker:**
```bash
bun run dev:worker
```
This starts the worker that processes food validation tasks

### Option 2: Production Mode

**Terminal 1 - Start the API Server:**
```bash
bun run start
```

**Terminal 2 - Start the Background Worker:**
```bash
bun run start:worker
```

## 🌐 Usage

### Web Interface

1. Open your browser and navigate to `http://localhost:3000`
2. Choose your preferred input method:
   - **Upload Image**: Drag & drop or click to select an image file
   - **Image URL**: Paste a direct image link
   - **Base64**: Paste encoded image data
3. Optionally add food name and ingredients
4. Click "Analyze Food" to submit
5. The system will queue your task and poll for results automatically

### API Endpoints

#### Submit Food Validation Task
```bash
POST /validate-food
Content-Type: multipart/form-data

# Form fields:
- image: image file (optional)
- imageUrl: direct URL (optional) 
- imageBase64: base64 string (optional)
- foodName: string (optional)
- ingredients: string (optional)
```

**Response:**
```json
{
  "success": true,
  "taskId": "123",
  "message": "Food validation task queued successfully",
  "estimatedProcessingTime": "10-30 seconds",
  "statusEndpoint": "/task-status/123",
  "queueTime": "45ms"
}
```

#### Check Task Status
```bash
GET /task-status/:taskId
```

**Response:**
```json
{
  "success": true,
  "taskId": "123",
  "status": "completed",
  "result": {
    "food_item": "Classic Potato Chips",
    "ingredients": ["potato", "refined oil", "salt"],
    "is_veg": "yes",
    "is_swaminarayan_compliant": "yes",
    "is_jain_compliant": "no",
    "is_vegan_compliant": "yes",
    "is_upvas_compliant": "no",
    "reason": [
      "- Contains potato, a root vegetable, making it non-compliant for Jain diets.",
      "- Contains grains (potato), making it non-compliant for Upvas fasting."
    ]
  },
  "processingTime": 15420,
  "completedAt": "2024-01-15T10:30:00.000Z"
}
```

#### Queue Status
```bash
GET /queue-status
```

#### Health Check
```bash
GET /health
```

## 🔧 Configuration Options

### Redis Settings
- **Host**: Redis server hostname (default: localhost)
- **Port**: Redis server port (default: 6379)
- **Password**: Redis authentication password (optional)
- **Database**: Redis database number (default: 0)

### Queue Settings
- **Concurrency**: Number of jobs processed simultaneously (default: 5)
- **Timeout**: Maximum job processing time (default: 30 minutes)
- **Retries**: Number of retry attempts for failed jobs (default: 3)
- **Backoff**: Exponential backoff strategy for retries

## 📊 Monitoring & Observability

### Queue Events
The system logs all queue events:
- Job waiting, active, completed, failed
- Processing times and retry attempts
- Error details and stack traces

### API Logging
- Request/response details
- Image processing steps
- Gemini API calls and responses
- Performance metrics

### Health Endpoint
Monitor system health including:
- API key availability
- System prompt loading
- HTML content availability

## 🚀 Scaling Considerations

### Horizontal Scaling
- Run multiple worker instances
- Use Redis cluster for high availability
- Load balance API requests

### Performance Tuning
- Adjust queue concurrency based on CPU cores
- Optimize Redis memory settings
- Monitor and tune timeout values

## 🔒 Security Features

- Environment variable configuration
- Input validation and sanitization
- Rate limiting (can be added)
- CORS configuration (can be added)

## 🐛 Troubleshooting

### Common Issues

**Worker not processing jobs:**
- Check Redis connection
- Verify worker is running
- Check job queue status

**Image analysis failing:**
- Verify Google API key
- Check image format support
- Review system prompt

**Queue jobs stuck:**
- Check Redis memory usage
- Verify worker processes
- Review job timeout settings

### Debug Mode
Enable detailed logging by setting:
```bash
NODE_ENV=development
```

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

The MIT License is a permissive license that allows for:
- Commercial use
- Modification
- Distribution
- Private use

## 🤝 Contributing

We welcome contributions to SatvikScan AI! Here's how you can help:

### How to Contribute

1. **Fork the repository** on GitHub
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Make your changes** and commit them (`git commit -m 'Add amazing feature'`)
4. **Push to the branch** (`git push origin feature/amazing-feature`)
5. **Open a Pull Request** with a clear description of your changes

### Development Guidelines

- **Code Style**: Follow existing code formatting and naming conventions
- **Testing**: Test your changes thoroughly before submitting
- **Documentation**: Update documentation for any new features
- **Commits**: Use clear, descriptive commit messages

### What We're Looking For

- 🐛 **Bug fixes** and improvements
- ✨ **New features** and enhancements
- 📚 **Documentation** improvements
- 🧪 **Test coverage** additions
- 🎨 **UI/UX** improvements
- 🚀 **Performance** optimizations

### Getting Help

- **Issues**: Use GitHub Issues for bug reports and feature requests
- **Discussions**: Start a discussion for questions and ideas
- **Code Review**: All contributions go through code review

### Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help others learn and grow
- Follow the project's coding standards

---

**Built with ❤️ using Hono.js, Google Gemini AI, and modern web technologies**
