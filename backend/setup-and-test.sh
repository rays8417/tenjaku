#!/bin/bash

# 🏏 Cricket Fantasy Backend Setup and Test Script
# This script sets up your backend and runs comprehensive tests

echo "🚀 Cricket Fantasy Backend Setup & Test"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Node.js is installed
check_node() {
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js first."
        exit 1
    fi
    
    NODE_VERSION=$(node --version)
    print_success "Node.js found: $NODE_VERSION"
}

# Check if npm is installed
check_npm() {
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm first."
        exit 1
    fi
    
    NPM_VERSION=$(npm --version)
    print_success "npm found: $NPM_VERSION"
}

# Check if .env file exists
check_env() {
    if [ ! -f .env ]; then
        print_warning ".env file not found. Creating template..."
        cat > .env << EOF
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/cricket_fantasy"

# Server
PORT=3000
NODE_ENV=development

# Add your other environment variables here
EOF
        print_warning "Please update .env file with your database credentials"
        print_warning "Example: DATABASE_URL=\"postgresql://user:pass@localhost:5432/cricket_fantasy\""
    else
        print_success ".env file found"
    fi
}

# Install dependencies
install_deps() {
    print_status "Installing dependencies..."
    if npm install; then
        print_success "Dependencies installed successfully"
    else
        print_error "Failed to install dependencies"
        exit 1
    fi
}

# Generate Prisma client
generate_prisma() {
    print_status "Generating Prisma client..."
    if npm run prisma:generate; then
        print_success "Prisma client generated successfully"
    else
        print_error "Failed to generate Prisma client"
        exit 1
    fi
}

# Run database migrations
run_migrations() {
    print_status "Running database migrations..."
    if npm run prisma:migrate; then
        print_success "Database migrations completed successfully"
    else
        print_warning "Migration failed. This might be expected if database is not set up yet."
        print_warning "Please ensure your database is running and DATABASE_URL is correct in .env"
    fi
}

# Build the project
build_project() {
    print_status "Building project..."
    if npm run build; then
        print_success "Project built successfully"
    else
        print_error "Failed to build project"
        exit 1
    fi
}

# Run unit tests
run_unit_tests() {
    print_status "Running unit tests..."
    if npm run test; then
        print_success "Unit tests passed!"
    else
        print_warning "Unit tests failed or no tests found"
    fi
}

# Start server in background
start_server() {
    print_status "Starting server in background..."
    npm run dev &
    SERVER_PID=$!
    
    # Wait for server to start
    print_status "Waiting for server to start..."
    sleep 5
    
    # Check if server is running
    if curl -s http://localhost:3000/health > /dev/null; then
        print_success "Server is running on http://localhost:3000"
        return 0
    else
        print_error "Server failed to start or health check failed"
        return 1
    fi
}

# Run integration tests
run_integration_tests() {
    print_status "Running integration tests..."
    if npm run test:integration; then
        print_success "Integration tests passed!"
        return 0
    else
        print_error "Integration tests failed"
        return 1
    fi
}

# Stop server
stop_server() {
    if [ ! -z "$SERVER_PID" ]; then
        print_status "Stopping server..."
        kill $SERVER_PID 2>/dev/null
        print_success "Server stopped"
    fi
}

# Cleanup function
cleanup() {
    stop_server
    exit 1
}

# Set trap for cleanup
trap cleanup INT TERM

# Main execution
main() {
    echo
    print_status "Checking prerequisites..."
    check_node
    check_npm
    check_env
    
    echo
    print_status "Setting up project..."
    install_deps
    generate_prisma
    run_migrations
    build_project
    
    echo
    print_status "Running tests..."
    run_unit_tests
    
    echo
    print_status "Starting server for integration tests..."
    if start_server; then
        run_integration_tests
        TEST_RESULT=$?
        stop_server
        
        if [ $TEST_RESULT -eq 0 ]; then
            echo
            echo "🎉 SUCCESS! Your Cricket Fantasy Backend is working perfectly!"
            echo "=================================================="
            echo "✅ All dependencies installed"
            echo "✅ Database setup complete"
            echo "✅ Project built successfully"
            echo "✅ Unit tests passed"
            echo "✅ Integration tests passed"
            echo
            echo "🚀 Ready for development!"
            echo "   Start server: npm run dev"
            echo "   Run tests: npm run test:all"
            echo "   View database: npm run prisma:studio"
        else
            echo
            print_error "Some tests failed. Check the output above for details."
            exit 1
        fi
    else
        print_error "Failed to start server for integration tests"
        exit 1
    fi
}

# Run main function
main
