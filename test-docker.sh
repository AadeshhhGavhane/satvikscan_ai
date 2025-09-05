#!/bin/bash

echo "🐳 Testing Docker setup for SatvikScan AI"
echo "=========================================="

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose > /dev/null 2>&1; then
    echo "❌ docker-compose is not installed. Please install docker-compose first."
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please create .env file with your Google API key."
    echo "Example:"
    echo "GOOGLE_GENERATIVE_AI_API_KEY=your_api_key_here"
    exit 1
fi

# Check if API key is set
if ! grep -q "GOOGLE_GENERATIVE_AI_API_KEY=" .env || grep -q "GOOGLE_GENERATIVE_AI_API_KEY=$" .env; then
    echo "❌ GOOGLE_GENERATIVE_AI_API_KEY not set in .env file."
    exit 1
fi

echo "✅ Docker environment check passed"
echo ""

# Build and start services
echo "🔨 Building Docker images..."
docker-compose build

if [ $? -ne 0 ]; then
    echo "❌ Docker build failed"
    exit 1
fi

echo "✅ Docker images built successfully"
echo ""

echo "🚀 Starting services..."
docker-compose up -d

if [ $? -ne 0 ]; then
    echo "❌ Failed to start services"
    exit 1
fi

echo "✅ Services started successfully"
echo ""

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
sleep 10

# Check service health
echo "🏥 Checking service health..."

# Check API health
if curl -s http://localhost:3000/health > /dev/null; then
    echo "✅ API service is healthy"
else
    echo "❌ API service is not responding"
fi

# Check Redis health
if docker-compose exec -T redis redis-cli ping > /dev/null 2>&1; then
    echo "✅ Redis service is healthy"
else
    echo "❌ Redis service is not responding"
fi

echo ""
echo "🎉 Docker setup test completed!"
echo ""
echo "📊 Service Status:"
docker-compose ps
echo ""
echo "🌐 Access the application at: http://localhost:3000"
echo "📋 View logs with: docker-compose logs -f"
echo "🛑 Stop services with: docker-compose down"
