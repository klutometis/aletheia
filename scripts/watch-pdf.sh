#!/usr/bin/env bash
set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
INPUT_FILE="doc/project.md"
OUTPUT_FILE="doc/project.pdf"

echo -e "${BLUE}👁️  Watching ${INPUT_FILE} for changes...${NC}"
echo ""

# Check if entr is installed
if ! command -v entr &> /dev/null; then
  echo -e "${RED}❌ Error: entr not found${NC}"
  echo "Install with:"
  echo "  macOS: brew install entr"
  echo "  Linux: sudo apt-get install entr"
  exit 1
fi

# Build initial PDF
echo -e "${YELLOW}🔨 Building initial PDF...${NC}"
./scripts/build-pdf.sh

# Open PDF viewer (zathura and evince auto-reload on file changes)
if command -v zathura &> /dev/null; then
  echo -e "${BLUE}📖 Opening with zathura (auto-reloads)...${NC}"
  zathura "${OUTPUT_FILE}" &> /dev/null &
elif command -v evince &> /dev/null; then
  echo -e "${BLUE}📖 Opening with evince (auto-reloads)...${NC}"
  evince "${OUTPUT_FILE}" &> /dev/null &
elif [[ "$OSTYPE" == "darwin"* ]]; then
  echo -e "${BLUE}📖 Opening with Preview...${NC}"
  open "${OUTPUT_FILE}"
else
  echo -e "${YELLOW}⚠️  No PDF viewer found. Install zathura or evince.${NC}"
fi

echo -e "${GREEN}✅ Watching for changes... (Ctrl+C to stop)${NC}"
echo ""

# Watch for changes and rebuild with entr
# -p flag: postpone first execution if files are currently changing
echo "${INPUT_FILE}" | entr -p ./scripts/build-pdf.sh
