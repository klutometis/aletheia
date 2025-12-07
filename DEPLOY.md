# Deployment & Development Guide

## Prerequisites

- Node.js 18+ 
- npm, yarn, pnpm, or bun
- Gemini API key (for AI dialogue)

## Local Development

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/aletheia.git
cd aletheia
```

### 2. Install dependencies

```bash
npm install
# or
yarn install
# or
pnpm install
# or
bun install
```

### 3. Set up environment variables

Create a `.env.local` file in the root directory:

```bash
GEMINI_API_KEY=your_gemini_api_key_here
```

Get your API key from [Google AI Studio](https://makersuite.google.com/app/apikey).

### 4. Run the development server

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

The page auto-updates as you edit files in the `app/` directory.

## Project Structure

```
aletheia/
├── app/                    # Next.js app directory
│   ├── api/               # API routes (Gemini integration)
│   ├── layout.tsx         # Root layout with metadata
│   ├── page.tsx           # Main app page with graph + chat
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── InquiryGraph.tsx  # Cytoscape graph visualization
│   └── SidePanel.tsx     # Question detail panel
├── data/                  # Inquiry complex data
│   └── competence-ai.ts  # Seed questions
├── types/                 # TypeScript type definitions
│   └── inquiry.ts        # Core types (Question, InquiryComplex, etc.)
├── public/               # Static assets
├── NOTES.md              # Detailed research notes
├── PROJECT.md            # Project overview
└── DEPLOY.md             # This file
```

## Building for Production

```bash
npm run build
# or
yarn build
# or
pnpm build
# or
bun build
```

Test the production build locally:

```bash
npm run start
# or
yarn start
# or
pnpm start
# or
bun start
```

## Deploy to Cloud Run (Recommended)

Aletheia is designed to deploy to Google Cloud Run using the included deployment scripts.

### Prerequisites

- Google Cloud SDK (`gcloud`) installed and configured
- Docker installed locally (for testing)
- `GOOGLE_API_KEY` environment variable set

### Quick Deploy

```bash
# Set your API key
export GOOGLE_API_KEY='your_gemini_api_key_here'

# Deploy to Cloud Run (uses current gcloud project)
./scripts/deploy.sh

# Or specify custom image tag
./scripts/deploy.sh v1.0.0
```

The deploy script will:
1. Create an Artifact Registry repository (if needed)
2. Build the Docker image using Cloud Build
3. Deploy to Cloud Run with appropriate settings
4. Output the service URL

### Configuration

Set these environment variables before deploying:

```bash
export GOOGLE_API_KEY='your_api_key'
export GCP_PROJECT_ID='your-project-id'  # Optional, defaults to current gcloud project
export GCP_REGION='us-central1'          # Optional, defaults to us-central1
```

### Test Locally with Docker

Before deploying, test the Docker build locally:

```bash
# Build and run (foreground mode)
./scripts/test-docker.sh local build-and-run

# Or use individual commands
./scripts/test-docker.sh local build    # Build image only
./scripts/test-docker.sh local run      # Run existing image
./scripts/test-docker.sh local stop     # Stop container
./scripts/test-docker.sh local logs     # View logs
./scripts/test-docker.sh local status   # Check if running
```

Test at http://localhost:3000

### Cloud Run Settings

The deployment configures:
- **Memory**: 512Mi
- **CPU**: 1
- **Min instances**: 0 (scales to zero)
- **Max instances**: 10
- **Timeout**: 300s
- **Authentication**: Public (allow unauthenticated)

Modify these in `scripts/deploy.sh` if needed.

## Deploy to Other Platforms

### Docker (Generic)

```bash
# Build
docker build --build-arg GOOGLE_API_KEY=$GOOGLE_API_KEY -t aletheia .

# Run
docker run -p 3000:3000 -e GOOGLE_API_KEY=$GOOGLE_API_KEY aletheia
```

### Self-Hosted

After building:

```bash
npm run build
npm run start
```

Use a process manager like PM2:

```bash
npm i -g pm2
pm2 start npm --name "aletheia" -- start
```

### Other Cloud Platforms

The Docker image should work on any platform that supports containers:
- AWS ECS/Fargate
- Azure Container Instances
- DigitalOcean App Platform
- Fly.io

Just push the image to your platform's registry and configure the `GOOGLE_API_KEY` environment variable.

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GEMINI_API_KEY` | Google Gemini API key for AI dialogue | Yes |
| `NODE_ENV` | `development` or `production` | Auto-set |

## Troubleshooting

**Graph not rendering:**
- Check browser console for Cytoscape errors
- Ensure `components/InquiryGraph.tsx` is properly loaded
- Verify inquiry complex data structure in `data/competence-ai.ts`

**API errors:**
- Verify `GEMINI_API_KEY` is set correctly
- Check API quota/rate limits in Google AI Studio
- Review `app/api/` route logs

**Build errors:**
- Clear `.next` directory: `rm -rf .next`
- Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Check Next.js version compatibility

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Gemini API Documentation](https://ai.google.dev/docs)
- [Cytoscape.js Documentation](https://js.cytoscape.org/)
- [Vercel Deployment Docs](https://nextjs.org/docs/app/building-your-application/deploying)

## Contributing

This is currently a research prototype. If you're interested in contributing or have questions about the philosophical foundations, see [NOTES.md](NOTES.md) for the full theoretical framework.
