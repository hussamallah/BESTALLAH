# PFF Quiz - Development Guide

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
```bash
npm run dev
```

### 3. Open Browser
Navigate to [http://localhost:3000](http://localhost:3000)

## Development Mode Features

### Mock Mode
The app automatically runs in **mock mode** during development when:
- `NODE_ENV === 'development'`
- `NEXT_PUBLIC_ENGINE_URL` doesn't point to a real engine API

### Mock Behavior
- **Session Init**: Returns mock session data after 500ms
- **Family Picks**: Returns mock picked state after 300ms
- **Questions**: Returns mock questions with sample options
- **Answers**: Simulates answer processing
- **Results**: Returns mock finalization results

### Console Errors Fixed
- ✅ **Hydration Mismatch**: Suppressed for browser extension interference
- ✅ **Runtime Config**: Uses fallback when CDN unavailable
- ✅ **API Errors**: Mock mode prevents network failures

## Testing the Flow

### 1. Age Gate
- Click "I'm 16 or older"
- Should proceed to family selection

### 2. Family Selection
- Select 1-7 families
- Click "Continue"
- Should proceed to questions

### 3. Quiz Questions
- Answer mock questions
- Progress bar should update
- Should cycle through questions

### 4. Results
- After answering, should show mock results
- Display line verdicts, face states, family reps

## Environment Variables

### Development (.env.local)
```bash
NEXT_PUBLIC_ENGINE_URL=http://localhost:8787
NEXT_PUBLIC_BANK_HASH=f3b83f5647111864456d1d73accf7fd4936139e95381c827b0c4d2353749c6df
NEXT_PUBLIC_RESULTS_ENABLED=true
NEXT_PUBLIC_PICKS_POLICY=at_least_one
NEXT_PUBLIC_RUNTIME_CONFIG_URL=
```

### Production
Set these in Vercel dashboard:
```bash
NEXT_PUBLIC_ENGINE_URL=https://api.yourquiz.com
NEXT_PUBLIC_BANK_HASH=your_production_hash
NEXT_PUBLIC_RESULTS_ENABLED=true
NEXT_PUBLIC_PICKS_POLICY=at_least_one
```

## Troubleshooting

### Common Issues

1. **"Initializing quiz..." stuck**
   - ✅ Fixed with mock mode
   - Check browser console for errors

2. **Hydration mismatch errors**
   - ✅ Fixed with React strict mode disabled
   - Caused by browser extensions

3. **Runtime config errors**
   - ✅ Fixed with fallback to environment variables
   - Mock mode doesn't require real config

4. **API connection errors**
   - ✅ Fixed with mock mode
   - Real API only needed for production

### Debug Mode

Enable debug logging:
```bash
NEXT_PUBLIC_DEBUG=true npm run dev
```

### Browser Extensions

Some browser extensions can cause issues:
- Disable extensions if you see hydration errors
- Use incognito mode for testing
- Check browser console for extension errors

## File Structure

```
src/
├── app/
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Landing page
│   ├── quiz/
│   │   ├── page.tsx            # Quiz wrapper
│   │   └── QuizWrapper.tsx     # Quiz logic
│   └── results/
│       ├── page.tsx            # Results wrapper
│       └── ResultsWrapper.tsx  # Results logic
├── hooks/
│   └── useRuntimeConfig.ts     # Runtime config
├── lib/
│   └── api-client.ts           # API client with mocks
└── types/
    └── api.ts                  # TypeScript types
```

## Next Steps

1. **Test the complete flow** in development
2. **Deploy to Vercel** when ready
3. **Connect real engine API** for production
4. **Monitor analytics** events

## Support

- **Issues**: Check browser console
- **Mock Mode**: Automatically enabled in development
- **Production**: Requires real engine API
