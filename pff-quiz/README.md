# PFF Quiz - Next.js Frontend

A minimal Next.js frontend for the PFF Quiz Engine, designed for Vercel deployment.

## Features

- **Age Gate**: 16+ age verification
- **Family Selection**: Choose 1-7 families
- **Quiz Interface**: 14/18/20 questions based on picks
- **Results Display**: Line verdicts, face states, family reps
- **Bank Hash Verification**: Security validation
- **Analytics Tracking**: Essential browser events
- **Responsive Design**: Mobile-friendly interface
- **Accessibility**: WCAG compliant

## Quick Start

### Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set environment variables:**
   Create `.env.local`:
   ```bash
   NEXT_PUBLIC_ENGINE_URL=http://localhost:8787
   NEXT_PUBLIC_BANK_HASH=your_bank_hash_here
   NEXT_PUBLIC_RESULTS_ENABLED=true
   NEXT_PUBLIC_PICKS_POLICY=at_least_one
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

4. **Open browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Vercel Deployment

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Initial PFF Quiz frontend"
   git push origin main
   ```

2. **Import in Vercel:**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "Import Project"
   - Select your GitHub repository
   - Framework preset: **Next.js**

3. **Set Environment Variables:**
   In Vercel → Project → Settings → Environment Variables:
   ```
   NEXT_PUBLIC_ENGINE_URL = https://api.yourquiz.com
   NEXT_PUBLIC_BANK_HASH = f3b83f5647111864456d1d73accf7fd4936139e95381c827b0c4d2353749c6df
   NEXT_PUBLIC_RESULTS_ENABLED = true
   NEXT_PUBLIC_PICKS_POLICY = at_least_one
   ```

4. **Deploy:**
   - Vercel automatically deploys on push
   - Preview URLs for each PR
   - Production URL on merge to main

## Architecture

### Pages

- **`/`** - Landing page with age gate
- **`/quiz`** - Quiz interface (picks + questions)
- **`/results`** - Results display

### API Integration

- **Proxy Rewrite**: `/api/engine/*` → Engine API
- **Session Management**: Client-side state
- **Error Handling**: Graceful degradation

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_ENGINE_URL` | Engine API URL | Yes |
| `NEXT_PUBLIC_BANK_HASH` | Bank hash for verification | Yes |
| `NEXT_PUBLIC_RESULTS_ENABLED` | Enable results display | Yes |
| `NEXT_PUBLIC_PICKS_POLICY` | Picks policy (at_least_one/all_21_on_zero) | Yes |

## Runtime Configuration (Optional)

For runtime config without rebuild:

1. **Host config JSON:**
   ```json
   {
     "resultsEnabled": true,
     "allowedBankHashes": ["your_bank_hash"],
     "picksPolicy": "at_least_one"
   }
   ```

2. **Update `RUNTIME_CONFIG_URL`** in `src/hooks/useRuntimeConfig.ts`

## Monitoring

### Analytics Events

- `session_start` - Quiz initialization
- `question_shown` - Question display
- `answer_submit` - Answer submission
- `agree_click` - Results agreement
- `session_complete` - Quiz completion

### Error Tracking

- Network errors
- API failures
- Session validation
- Bank hash mismatches

## Security

- **Bank Hash Verification**: Validates engine responses
- **CORS Protection**: Proxy prevents cross-origin issues
- **Input Validation**: Client-side validation
- **Error Boundaries**: Graceful error handling

## Performance

- **Static Generation**: Optimized builds
- **Image Optimization**: Next.js built-in
- **Code Splitting**: Automatic optimization
- **Caching**: Vercel edge caching

## Accessibility

- **Keyboard Navigation**: Full keyboard support
- **Focus Management**: Clear focus indicators
- **Color Contrast**: WCAG AA compliant
- **Screen Readers**: Semantic HTML

## Troubleshooting

### Common Issues

1. **CORS Errors**: Check proxy configuration
2. **Bank Hash Mismatch**: Verify environment variables
3. **Session Errors**: Check engine API availability
4. **Build Failures**: Verify TypeScript types

### Debug Mode

Enable debug logging:
```bash
NEXT_PUBLIC_DEBUG=true npm run dev
```

## Development

### Scripts

- `npm run dev` - Development server
- `npm run build` - Production build
- `npm run start` - Production server
- `npm run lint` - ESLint checking

### TypeScript

- Strict type checking enabled
- API types in `src/types/api.ts`
- Component props typed

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:
- Check the [handoff documentation](../HANDOFF_PROMPT.md)
- Review engine API contracts
- Verify environment configuration