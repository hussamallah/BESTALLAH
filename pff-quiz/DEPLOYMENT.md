# PFF Quiz - Vercel Deployment Guide

## Prerequisites

- **Engine API** running at `https://api.yourquiz.com`
- **Bank package** uploaded and immutable
- **Public key** available to the engine
- **CORS** configured on engine for your domain

## Environment Variables

Set these in **Vercel → Project → Settings → Environment Variables**:

### Required Variables

```bash
NEXT_PUBLIC_ENGINE_URL=https://api.yourquiz.com
NEXT_PUBLIC_BANK_HASH=f3b83f5647111864456d1d73accf7fd4936139e95381c827b0c4d2353749c6df
NEXT_PUBLIC_RESULTS_ENABLED=true
NEXT_PUBLIC_PICKS_POLICY=at_least_one
```

### Optional Variables

```bash
NEXT_PUBLIC_DEBUG=false
```

## Deployment Steps

### 1. Push to GitHub

```bash
git add .
git commit -m "Initial PFF Quiz frontend"
git push origin main
```

### 2. Import in Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Import Project"
3. Select your GitHub repository
4. Framework preset: **Next.js**
5. Click "Deploy"

### 3. Configure Environment Variables

1. Go to Project → Settings → Environment Variables
2. Add all required variables for **Preview** and **Production**
3. Click "Save"

### 4. Verify Deployment

1. Check the production URL
2. Test the age gate
3. Test family selection
4. Test quiz flow
5. Verify results display
6. Check bank hash verification

## Runtime Configuration (Optional)

For runtime config without rebuild:

### 1. Host Config JSON

Create `https://cdn.yoursite.com/runtime-config.json`:

```json
{
  "resultsEnabled": true,
  "allowedBankHashes": ["f3b83f5647111864456d1d73accf7fd4936139e95381c827b0c4d2353749c6df"],
  "picksPolicy": "at_least_one"
}
```

### 2. Update Runtime Config URL

Edit `src/hooks/useRuntimeConfig.ts`:

```typescript
const RUNTIME_CONFIG_URL = 'https://cdn.yoursite.com/runtime-config.json';
```

## Monitoring

### Essential Checks

- [ ] Age gate works
- [ ] Family selection (1-7 picks)
- [ ] Question flow (14/18/20 questions)
- [ ] Progress bar accuracy
- [ ] Results display
- [ ] Bank hash verification
- [ ] Error handling
- [ ] Mobile responsiveness

### Analytics Events

Monitor these events:
- `session_start`
- `question_shown`
- `answer_submit`
- `agree_click`
- `session_complete`

## Troubleshooting

### Common Issues

1. **CORS Errors**
   - Check proxy configuration in `next.config.js`
   - Verify engine CORS settings

2. **Bank Hash Mismatch**
   - Verify `NEXT_PUBLIC_BANK_HASH` matches engine
   - Check bank package integrity

3. **Session Errors**
   - Verify engine API availability
   - Check network connectivity

4. **Build Failures**
   - Check TypeScript errors
   - Verify all dependencies installed

### Debug Mode

Enable debug logging:

```bash
NEXT_PUBLIC_DEBUG=true
```

## Rollback

### Instant Rollback

1. Go to Vercel → Deployments
2. Find previous working deployment
3. Click "Promote to Production"

### Environment Rollback

1. Go to Project → Settings → Environment Variables
2. Revert to previous values
3. Redeploy

## Security

### Headers

Security headers configured in `vercel.json`:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`

### Bank Verification

- Bank hash verification on results
- Mismatch warnings displayed
- No PII stored in frontend

## Performance

### Optimizations

- Static generation where possible
- Image optimization
- Code splitting
- Edge caching

### Monitoring

- Core Web Vitals
- Page load times
- API response times
- Error rates

## Support

For issues:
1. Check [handoff documentation](../HANDOFF_PROMPT.md)
2. Verify engine API contracts
3. Check environment configuration
4. Review Vercel deployment logs
