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

echo -e "${BLUE}📄 Building PDF from markdown...${NC}"
echo ""

# Check if pandoc is installed
if ! command -v pandoc &> /dev/null; then
  echo -e "${RED}❌ Error: pandoc not found${NC}"
  echo "Install with:"
  echo "  macOS: brew install pandoc basictex"
  echo "  Linux: sudo apt-get install pandoc texlive"
  exit 1
fi

# Check if input file exists
if [ ! -f "${INPUT_FILE}" ]; then
  echo -e "${RED}❌ Error: ${INPUT_FILE} not found${NC}"
  exit 1
fi

# Build PDF with nice LaTeX styling (xelatex for Unicode support)
echo -e "${YELLOW}🔨 Converting markdown to PDF...${NC}"

# Create temporary header for font setup with semantic Greek class
HEADER=$(mktemp)
cat > "$HEADER" << 'EOF'
\usepackage{fontspec}
\setmainfont{Latin Modern Roman}
\newfontfamily\greekfont{Gentium Plus}

% Define .greek class for Pandoc spans
\newcommand{\greek}[1]{{\greekfont #1}}

% Suppress page numbers
\pagestyle{empty}
EOF

pandoc "${INPUT_FILE}" -o "${OUTPUT_FILE}" \
  --pdf-engine=xelatex \
  -H "$HEADER" \
  -V geometry:margin=1in \
  -V fontsize=11pt \
  -V documentclass=article \
  -V colorlinks=true \
  -V linkcolor=blue \
  -V urlcolor=blue \
  --syntax-highlighting=tango \
  2>&1 | grep -v "Package hyperref Warning" || true

# Clean up temporary header
rm "$HEADER"

if [ -f "${OUTPUT_FILE}" ]; then
  echo -e "${GREEN}✅ PDF created: ${OUTPUT_FILE}${NC}"
  
  # Open PDF on macOS
  if [[ "$OSTYPE" == "darwin"* ]]; then
    echo -e "${BLUE}📖 Opening PDF...${NC}"
    open "${OUTPUT_FILE}"
  else
    echo -e "${BLUE}💡 Open with: xdg-open ${OUTPUT_FILE}${NC}"
  fi
else
  echo -e "${RED}❌ PDF generation failed${NC}"
  exit 1
fi
