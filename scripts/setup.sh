#!/bin/bash

# Setup script for WhatsApp Notion Intake
# This script helps you get started quickly

set -e

echo "🚀 WhatsApp Notion Intake - Setup Script"
echo "========================================"
echo ""

# Check Node.js version
echo "✓ Checking Node.js version..."
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo "❌ Error: Node.js 18+ required. You have: $(node -v)"
  exit 1
fi
echo "  Node.js $(node -v) detected ✓"
echo ""

# Check Docker
echo "✓ Checking Docker..."
if ! command -v docker &> /dev/null; then
  echo "❌ Error: Docker not found. Please install Docker."
  exit 1
fi
echo "  Docker $(docker --version | cut -d' ' -f3 | tr -d ',') detected ✓"
echo ""

# Install dependencies
echo "✓ Installing dependencies..."
npm install
echo "  Dependencies installed ✓"
echo ""

# Copy .env.example if .env doesn't exist
if [ ! -f .env ]; then
  echo "✓ Creating .env file..."
  cp .env.example .env
  echo "  .env created from .env.example ✓"
  echo "  ⚠️  Remember to edit .env with your credentials!"
  echo ""
else
  echo "  .env already exists (skipping)"
  echo ""
fi

# Start Docker services
echo "✓ Starting Docker services (PostgreSQL, Redis, MinIO)..."
docker-compose up -d
echo "  Docker services started ✓"
echo ""

# Wait for services to be ready
echo "✓ Waiting for services to be ready..."
sleep 5

# Check PostgreSQL
until docker-compose exec -T postgres pg_isready -U postgres &> /dev/null; do
  echo "  Waiting for PostgreSQL..."
  sleep 2
done
echo "  PostgreSQL ready ✓"

# Check Redis
until docker-compose exec -T redis redis-cli ping &> /dev/null; do
  echo "  Waiting for Redis..."
  sleep 2
done
echo "  Redis ready ✓"
echo ""

# Run migrations
echo "✓ Running database migrations..."
npm run migrate
echo "  Migrations completed ✓"
echo ""

echo "========================================"
echo "✅ Setup Complete!"
echo "========================================"
echo ""
echo "Next steps:"
echo ""
echo "1. Edit .env with your credentials:"
echo "   - WhatsApp API credentials"
echo "   - Notion API key and database ID"
echo "   - Anthropic API key"
echo ""
echo "2. Start the development servers:"
echo "   npm run dev        # Start webhook server"
echo "   npm run worker     # Start worker (in another terminal)"
echo "   npm run admin      # Start admin UI (optional)"
echo ""
echo "3. Configure WhatsApp webhook:"
echo "   - Use ngrok: ngrok http 3000"
echo "   - Set webhook URL in Meta Developer Console"
echo ""
echo "4. Test by sending a message to your WhatsApp Business number"
echo ""
echo "📚 Documentation: ./README.md"
echo "❓ Help: https://github.com/your-repo/issues"
echo ""
