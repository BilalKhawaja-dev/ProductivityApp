#!/bin/bash

# Interactive test runner for Productivity App backend APIs
# This script helps you choose and run the appropriate test method

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                                                        ║${NC}"
echo -e "${BLUE}║     Productivity App - Backend API Test Runner        ║${NC}"
echo -e "${BLUE}║                                                        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if API_GATEWAY_URL is set
if [ -z "$API_GATEWAY_URL" ]; then
    echo -e "${YELLOW}⚠️  API_GATEWAY_URL not set${NC}"
    echo ""
    echo "Please enter your API Gateway URL:"
    echo "(e.g., https://abc123.execute-api.us-east-1.amazonaws.com/prod)"
    echo ""
    read -p "API Gateway URL: " API_GATEWAY_URL
    
    if [ -z "$API_GATEWAY_URL" ]; then
        echo -e "${RED}Error: API Gateway URL is required${NC}"
        exit 1
    fi
    
    export API_GATEWAY_URL
fi

echo -e "${GREEN}✓ API Gateway URL: $API_GATEWAY_URL${NC}"
echo ""

# Show menu
echo "Choose a testing method:"
echo ""
echo "  1) Automated Node.js Tests (Recommended)"
echo "     - Comprehensive test suite"
echo "     - 28+ automated tests"
echo "     - Detailed output"
echo ""
echo "  2) Bash/curl Tests (Quick)"
echo "     - Simple curl-based tests"
echo "     - No dependencies"
echo "     - Fast execution"
echo ""
echo "  3) Postman Collection (Manual)"
echo "     - Visual testing"
echo "     - Import into Postman"
echo "     - Interactive"
echo ""
echo "  4) Show Test Documentation"
echo "     - View testing guides"
echo "     - See test coverage"
echo ""
echo "  5) Exit"
echo ""

read -p "Enter your choice (1-5): " choice

case $choice in
    1)
        echo ""
        echo -e "${BLUE}Running Automated Node.js Tests...${NC}"
        echo ""
        
        # Check if node is installed
        if ! command -v node &> /dev/null; then
            echo -e "${RED}Error: Node.js is not installed${NC}"
            echo "Please install Node.js to run automated tests"
            exit 1
        fi
        
        # Run tests
        node api-integration.test.js
        ;;
        
    2)
        echo ""
        echo -e "${BLUE}Running Bash/curl Tests...${NC}"
        echo ""
        
        # Check if curl is installed
        if ! command -v curl &> /dev/null; then
            echo -e "${RED}Error: curl is not installed${NC}"
            exit 1
        fi
        
        # Check if jq is installed
        if ! command -v jq &> /dev/null; then
            echo -e "${YELLOW}Warning: jq is not installed (optional but recommended)${NC}"
            echo "Install jq for better JSON parsing: brew install jq"
            echo ""
        fi
        
        # Run bash tests
        ./test-api.sh "$API_GATEWAY_URL"
        ;;
        
    3)
        echo ""
        echo -e "${BLUE}Postman Collection Setup${NC}"
        echo ""
        echo "To use the Postman collection:"
        echo ""
        echo "1. Open Postman"
        echo "2. Click 'Import' button"
        echo "3. Select: Productivity-App-API.postman_collection.json"
        echo "4. Update collection variable 'baseUrl' to:"
        echo "   $API_GATEWAY_URL"
        echo "5. Click 'Run' to execute all tests"
        echo ""
        echo "Collection file: $(pwd)/Productivity-App-API.postman_collection.json"
        echo ""
        ;;
        
    4)
        echo ""
        echo -e "${BLUE}Test Documentation${NC}"
        echo ""
        echo "Available documentation:"
        echo ""
        echo "  📄 QUICK_START.md"
        echo "     Quick start guide (3 steps)"
        echo ""
        echo "  📄 TESTING_GUIDE.md"
        echo "     Comprehensive testing guide"
        echo ""
        echo "  📄 MANUAL_TEST_CHECKLIST.md"
        echo "     Manual testing checklist"
        echo ""
        echo "  📄 CHECKPOINT_SUMMARY.md"
        echo "     Summary of checkpoint task"
        echo ""
        echo "  📄 README.md"
        echo "     Test suite overview"
        echo ""
        
        read -p "Press Enter to continue..."
        ;;
        
    5)
        echo ""
        echo -e "${GREEN}Goodbye!${NC}"
        exit 0
        ;;
        
    *)
        echo ""
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}✓ Done!${NC}"
echo ""
