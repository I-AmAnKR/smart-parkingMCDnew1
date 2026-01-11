# 🚀 Deploying MCD Smart Parking System to Render

This guide will help you deploy both the backend API and frontend to Render.

## 📋 Prerequisites

1. **GitHub Account** - Your code should be pushed to GitHub
2. **Render Account** - Sign up at https://render.com
3. **MongoDB Atlas** - Free cluster at https://www.mongodb.com/cloud/atlas

---

## 🗄️ Step 1: Set Up MongoDB Atlas

1. Go to https://www.mongodb.com/cloud/atlas
2. Create a free cluster
3. Create a database user with username and password
4. Whitelist all IPs: `0.0.0.0/0` (for Render access)
5. Get your connection string (looks like: `mongodb+srv://username:password@cluster.mongodb.net/`)

---

## 🔧 Step 2: Deploy Backend to Render

### 2.1 Create Web Service

1. Go to https://dashboard.render.com
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: `mcd-parking-backend` (or your choice)
   - **Region**: Choose closest to your users
   - **Branch**: `main` (or your branch name)
   - **Root Directory**: `smart-parkingMCD/smart-parking/backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`

### 2.2 Add Environment Variables

In the "Environment" section, add these variables:

| Key | Value |
|-----|-------|
| `MONGODB_URI` | Your MongoDB Atlas connection string |
| `PORT` | `5000` |
| `NODE_ENV` | `production` |
| `JWT_SECRET` | Generate a random secure string |
| `SESSION_SECRET` | Generate another random secure string |
| `FRONTEND_URL` | Leave empty for now (will add after frontend deployment) |

**To generate secure secrets**, run in terminal:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2.3 Deploy

1. Click **"Create Web Service"**
2. Wait for deployment to complete (5-10 minutes)
3. Note your backend URL: `https://mcd-parking-backend.onrender.com`

### 2.4 Test Backend

Visit: `https://your-backend-url.onrender.com/api/health`

You should see:
```json
{
  "success": true,
  "message": "Smart Parking API is running",
  "timestamp": "2026-01-11T..."
}
```

---

## 🌐 Step 3: Deploy Frontend to Render

### 3.1 Create Static Site

1. Go to https://dashboard.render.com
2. Click **"New +"** → **"Static Site"**
3. Connect your GitHub repository
4. Configure the site:
   - **Name**: `mcd-parking-frontend` (or your choice)
   - **Branch**: `main`
   - **Root Directory**: `smart-parkingMCD/smart-parking/frontend`
   - **Build Command**: Leave empty (static HTML)
   - **Publish Directory**: `.` (current directory)

### 3.2 Deploy

1. Click **"Create Static Site"**
2. Wait for deployment
3. Note your frontend URL: `https://mcd-parking-frontend.onrender.com`

---

## 🔗 Step 4: Connect Frontend to Backend

### 4.1 Update Backend CORS

1. Go to your backend service on Render
2. Go to "Environment" tab
3. Update `FRONTEND_URL` to your frontend URL:
   ```
   FRONTEND_URL=https://mcd-parking-frontend.onrender.com
   ```
4. Click "Save Changes"
5. Service will auto-redeploy

### 4.2 Update Frontend API URLs

You need to update the API URLs in your frontend JavaScript files:

**Files to update:**
- `login.js`
- `admin.js`
- `contractor.js`
- Any other JS files making API calls

**Change from:**
```javascript
const API_URL = 'http://localhost:5000/api';
```

**Change to:**
```javascript
const API_URL = 'https://your-backend-url.onrender.com/api';
```

**Or use environment detection:**
```javascript
const API_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:5000/api'
  : 'https://mcd-parking-backend.onrender.com/api';
```

### 4.3 Redeploy Frontend

After updating API URLs:
1. Commit and push changes to GitHub
2. Render will auto-deploy the frontend

---

## ✅ Step 5: Verify Deployment

### Test Login Flow

1. Visit your frontend URL: `https://mcd-parking-frontend.onrender.com`
2. Try logging in with demo credentials:
   - **Admin**: `admin@mcd.gov.in` / `admin123`
   - **Contractor**: `contractor@parking.com` / `contractor123`

### Check Browser Console

Open DevTools (F12) → Console tab:
- ✅ No CORS errors
- ✅ API calls successful
- ✅ Authentication working

---

## 🐛 Troubleshooting

### CORS Errors

**Problem**: "Access to fetch has been blocked by CORS policy"

**Solution**:
1. Check `FRONTEND_URL` in backend environment variables
2. Make sure it matches your frontend URL exactly (no trailing slash)
3. Check backend logs for CORS warnings

### API Not Responding

**Problem**: API calls timeout or fail

**Solution**:
1. Check backend service is running on Render dashboard
2. Visit `/api/health` endpoint directly
3. Check backend logs for errors
4. Verify MongoDB connection string is correct

### MongoDB Connection Failed

**Problem**: "MongoDB connection error"

**Solution**:
1. Check MongoDB Atlas IP whitelist includes `0.0.0.0/0`
2. Verify connection string is correct
3. Check database user credentials
4. Ensure network access is enabled

### Frontend Not Loading

**Problem**: Static site shows 404 or blank page

**Solution**:
1. Check "Publish Directory" is set to `.`
2. Verify `index.html` or `login.html` exists in root
3. Check Render build logs for errors

---

## 📝 Important Notes

### Free Tier Limitations

- **Backend**: Spins down after 15 minutes of inactivity
  - First request after spin-down takes 30-60 seconds
  - Subsequent requests are fast
- **Frontend**: Always available (static files)
- **MongoDB Atlas**: 512MB storage limit

### Custom Domain (Optional)

1. Go to your Render service
2. Click "Settings" → "Custom Domain"
3. Add your domain
4. Update DNS records as instructed

### Environment Variables Security

- ✅ Never commit `.env` file to GitHub
- ✅ Use strong, random secrets for JWT and SESSION
- ✅ Keep MongoDB credentials secure
- ✅ Rotate secrets periodically

---

## 🎉 Your App is Live!

**Frontend**: https://mcd-parking-frontend.onrender.com
**Backend API**: https://mcd-parking-backend.onrender.com/api

**Demo Credentials:**
- Admin: `admin@mcd.gov.in` / `admin123`
- Contractor: `contractor@parking.com` / `contractor123`

---

## 📞 Support

If you encounter issues:
1. Check Render service logs
2. Check browser console for errors
3. Verify all environment variables are set
4. Test API endpoints directly

**Render Documentation**: https://render.com/docs
**MongoDB Atlas Docs**: https://docs.atlas.mongodb.com
