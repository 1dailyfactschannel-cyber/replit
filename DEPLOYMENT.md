# TeamSync - Deployment Guide

## Deploying to Vercel

### Prerequisites
1. Install Vercel CLI: `npm install -g vercel`
2. Create a Vercel account at [vercel.com](https://vercel.com)

### Environment Variables
Before deploying, set these environment variables in your Vercel project:

```bash
DATABASE_URL=your_postgresql_database_url
SESSION_SECRET=your_secure_session_secret
NODE_ENV=production
```

### Deployment Steps

1. **Build the project locally first:**
   ```bash
   npm run build
   ```

2. **Deploy using Vercel CLI:**
   ```bash
   vercel
   ```

3. **Or deploy using Git integration:**
   - Push your code to GitHub/GitLab
   - Import project in Vercel dashboard
   - Set environment variables in Vercel project settings

### Project Structure for Vercel
- `server/vercel-adapter.ts` - Vercel serverless function handler
- `vercel.json` - Vercel configuration
- `dist/` - Built assets (created during build process)

### Notes
- The project uses Express.js with Vercel's serverless functions
- Static files are served from the built client bundle
- Database connections should use connection pooling for serverless environments
- WebSocket functionality may require additional configuration for production

### Local Development
```bash
# Run development server
npm run dev

# Run client only
npm run dev:client

# Build for production
npm run build
```