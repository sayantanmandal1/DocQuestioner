# AI Microservices Deployment Guide

This guide covers deploying the AI Microservices platform to production using Vercel (frontend) and Render (backend).

## 🚀 Quick Deployment

### Prerequisites
- GitHub account
- Vercel account
- Render account
- OpenRouter API key

### 1. Frontend Deployment (Vercel)

#### Option A: Automatic Deployment (Recommended)

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Deploy to production"
   git push origin main
   ```

2. **Connect to Vercel**:
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your GitHub repository
   - Select the `frontend` folder as the root directory

3. **Configure Environment Variables**:
   - In Vercel dashboard, go to Project Settings → Environment Variables
   - Add: `NEXT_PUBLIC_API_URL` = `https://your-backend-url.onrender.com`

4. **Deploy**:
   - Vercel will automatically deploy on every push to main branch
   - Your app will be available at `https://your-app.vercel.app`

#### Option B: Manual Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Navigate to frontend
cd frontend

# Deploy
vercel --prod
```

### 2. Backend Deployment (Render)

#### Option A: Automatic Deployment (Recommended)

1. **Push to GitHub** (if not already done):
   ```bash
   git add .
   git commit -m "Deploy backend to Render"
   git push origin main
   ```

2. **Connect to Render**:
   - Go to [Render Dashboard](https://render.com/dashboard)
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select the repository and branch

3. **Configure Service**:
   - **Name**: `ai-microservices-backend`
   - **Root Directory**: `backend`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`

4. **Set Environment Variables**:
   - `OPENAI_API_KEY`: Your OpenRouter API key
   - `CORS_ORIGINS`: `https://your-frontend.vercel.app,http://localhost:3000`
   - `LOG_LEVEL`: `INFO`

5. **Deploy**:
   - Click "Create Web Service"
   - Render will build and deploy automatically
   - Your API will be available at `https://your-service.onrender.com`

#### Option B: Using render.yaml

1. **Use the provided render.yaml**:
   - The `backend/render.yaml` file is already configured
   - Update the `CORS_ORIGINS` with your actual frontend URL

2. **Deploy via Render Dashboard**:
   - In Render dashboard, create a new "Blueprint"
   - Connect your repository
   - Render will use the `render.yaml` configuration

## 🔧 Configuration

### Environment Variables

#### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com
```

#### Backend (.env)
```env
OPENAI_API_KEY=sk-or-v1-your-openrouter-key
CORS_ORIGINS=https://your-frontend.vercel.app,http://localhost:3000
LOG_LEVEL=INFO
```

### Domain Configuration

#### Custom Domain (Vercel)
1. Go to Project Settings → Domains
2. Add your custom domain
3. Configure DNS records as instructed

#### Custom Domain (Render)
1. Go to Service Settings → Custom Domains
2. Add your custom domain
3. Configure DNS records as instructed

## 🐳 Docker Deployment

### Local Development with Docker

```bash
# Build and run with Docker Compose
docker-compose up --build

# Run in background
docker-compose up -d

# Stop services
docker-compose down
```

### Production Docker Deployment

#### Backend
```bash
cd backend
docker build -t ai-microservices-backend .
docker run -p 8000:8000 -e OPENAI_API_KEY=your-key ai-microservices-backend
```

#### Frontend
```bash
cd frontend
docker build -t ai-microservices-frontend .
docker run -p 3000:3000 ai-microservices-frontend
```

## 🔍 Monitoring and Logs

### Vercel
- **Logs**: Vercel Dashboard → Project → Functions tab
- **Analytics**: Built-in analytics in dashboard
- **Performance**: Web Vitals monitoring

### Render
- **Logs**: Render Dashboard → Service → Logs tab
- **Metrics**: Built-in metrics and monitoring
- **Health Checks**: Automatic health monitoring at `/health`

## 🚨 Troubleshooting

### Common Issues

#### Frontend Build Failures
```bash
# Check build locally
cd frontend
npm run build

# Common fixes
npm ci --force
rm -rf .next node_modules
npm install
```

#### Backend Deployment Issues
```bash
# Test locally
cd backend
python main.py

# Check dependencies
pip install -r requirements.txt
python -c "import fastapi; print('OK')"
```

#### CORS Issues
- Ensure `CORS_ORIGINS` includes your frontend URL
- Check that URLs match exactly (https vs http)
- Verify environment variables are set correctly

#### API Key Issues
- Verify OpenRouter API key is valid
- Check that key has sufficient credits
- Ensure key is set in environment variables

### Health Checks

#### Backend Health Check
```bash
curl https://your-backend.onrender.com/health
```

#### Frontend Health Check
```bash
curl https://your-frontend.vercel.app/
```

## 📊 Performance Optimization

### Frontend Optimization
- **Image Optimization**: Next.js automatic image optimization
- **Code Splitting**: Automatic with Next.js App Router
- **Caching**: Vercel Edge Network caching
- **Bundle Analysis**: `npm run analyze` (if configured)

### Backend Optimization
- **Async Operations**: All I/O operations are async
- **Response Caching**: Consider adding Redis for caching
- **Database Connection Pooling**: If using database
- **Rate Limiting**: Implemented via OpenRouter

## 🔄 CI/CD Pipeline

### GitHub Actions (Optional)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Test Backend
        run: |
          cd backend
          python -m pytest
      - name: Test Frontend
        run: |
          cd frontend
          npm ci
          npm test

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
```

## 📈 Scaling Considerations

### Frontend Scaling
- **Vercel Pro**: Automatic scaling and edge functions
- **CDN**: Global edge network included
- **Serverless**: Automatic scaling with usage

### Backend Scaling
- **Render Pro**: Higher resource limits and scaling
- **Load Balancing**: Multiple instances
- **Database**: Consider managed database services
- **Caching**: Redis or Memcached for session/response caching

## 🔐 Security

### Production Security Checklist
- [ ] Environment variables are secure
- [ ] API keys are not exposed in frontend
- [ ] HTTPS is enabled (automatic with Vercel/Render)
- [ ] CORS is properly configured
- [ ] Security headers are set
- [ ] Rate limiting is implemented
- [ ] Input validation is in place

### Security Headers
Both platforms automatically provide:
- SSL/TLS encryption
- Security headers
- DDoS protection
- Firewall protection

## 💰 Cost Optimization

### Vercel Pricing
- **Hobby**: Free tier (sufficient for small projects)
- **Pro**: $20/month per user (commercial use)
- **Enterprise**: Custom pricing

### Render Pricing
- **Free**: Limited resources (good for testing)
- **Starter**: $7/month (production ready)
- **Standard**: $25/month (higher performance)

### Cost Saving Tips
1. Use free tiers for development/testing
2. Monitor usage and optimize accordingly
3. Implement proper caching strategies
4. Use efficient API calls to reduce OpenRouter costs

---

## 🆘 Support

If you encounter issues during deployment:

1. **Check the logs** in your deployment platform
2. **Verify environment variables** are set correctly
3. **Test locally** before deploying
4. **Check the health endpoints** after deployment
5. **Review the troubleshooting section** above

For additional help, refer to:
- [Vercel Documentation](https://vercel.com/docs)
- [Render Documentation](https://render.com/docs)
- [Next.js Deployment Guide](https://nextjs.org/docs/deployment)
- [FastAPI Deployment Guide](https://fastapi.tiangolo.com/deployment/)