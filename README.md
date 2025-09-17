# PFF Quiz Engine

A deterministic, behavior-based personality assessment engine that evaluates 7 family dimensions and 14 face archetypes through structured questioning and behavioral tells analysis.

## 🎯 Overview

The PFF Quiz Engine is a sophisticated personality assessment system that:

- **Evaluates 7 Family Dimensions**: Control, Pace, Boundary, Truth, Recognition, Bonding, and Stress
- **Identifies 14 Face Archetypes**: Two faces per family (e.g., Sovereign/Rebel for Control)
- **Uses Behavioral Tells**: Non-numeric indicators that reveal personality patterns
- **Provides Deterministic Results**: Consistent outputs for identical inputs
- **Supports Multiple Interfaces**: Web UI, API endpoints, and CLI tools

## 🏗️ Architecture

### Core Components

- **Engine** (`/engine/`): Core logic, state management, and API functions
- **Bank** (`/bank/`): Question database, registries, and validation schemas
- **UI** (`/pff-quiz/`): Next.js web application with React components
- **Scripts** (`/scripts/`): Testing, validation, and utility tools
- **Tests** (`/tests/`): Golden tests, replay data, and validation suites

### Key Features

- ✅ **Deterministic Behavior**: Identical inputs produce identical outputs
- ✅ **String-Blind Core**: No UI copy or styling in engine logic
- ✅ **Untrusted Input Validation**: All data validated against schemas
- ✅ **Immutable Question Bank**: Read-only at runtime
- ✅ **Comprehensive Testing**: Golden tests, edge cases, and replay validation
- ✅ **TypeScript Support**: Full type safety and IntelliSense
- ✅ **API-First Design**: Clean separation between engine and UI

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or pnpm
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/hussamallah/BESTALLAH.git
cd BESTALLAH

# Install dependencies
npm install

# Install UI dependencies
cd pff-quiz
npm install
cd ..
```

### Running the Application

```bash
# Start the development server
cd pff-quiz
npm run dev

# The application will be available at http://localhost:3000
```

### Running Tests

```bash
# Run all tests
npm run test

# Run specific test suites
node scripts/lint-bank.js
node scripts/test-engine.js
node scripts/test-edge-policies.js
node scripts/run-replay.js
```

## 📚 Documentation

### Core Concepts

- **[System Behavior Specification](.cursor/rules/18-system-behavior-spec.mdc)**: Complete behavioral contract
- **[Architecture Rules](.cursor/rules/01-architecture.mdc)**: System design principles
- **[API Contracts](.cursor/rules/12-api-contracts.mdc)**: Endpoint specifications
- **[Data Models](.cursor/rules/11-data-models.mdc)**: Schema definitions

### Development Guides

- **[Implementation Patterns](.cursor/rules/20-implementation-patterns.mdc)**: Code patterns and best practices
- **[Testing Requirements](.cursor/rules/15-testing-requirements.mdc)**: Testing strategies
- **[TypeScript Rules](.cursor/rules/06-typescript.mdc)**: Type safety guidelines

## 🔧 API Reference

### Core Engine Functions

```javascript
// Initialize a new session
const session = initSession(sessionSeed, bankPackage);

// Set family picks from Screen 1
const updatedSession = setPicks(session, pickedFamilies);

// Get next question in sequence
const question = getNextQuestion(session);

// Submit an answer
const result = submitAnswer(session, qid, optionKey);

// Finalize session and get results
const results = finalizeSession(session);
```

### Output Format

```json
{
  "line_verdicts": {
    "Control": "C|O|F",
    "Pace": "C|O|F",
    "Boundary": "C|O|F",
    "Truth": "C|O|F",
    "Recognition": "C|O|F",
    "Bonding": "C|O|F",
    "Stress": "C|O|F"
  },
  "face_states": {
    "FACE/Control/Sovereign": {
      "state": "LIT|LEAN|GHOST|COLD|ABSENT",
      "familiesHit": 0,
      "signatureHits": 0,
      "clean": 0,
      "bent": 0,
      "broken": 0,
      "contrastSeen": false
    }
  },
  "family_reps": [
    {
      "family": "Control",
      "rep": "FACE/Control/Sovereign",
      "rep_state": "LIT",
      "co_present": false
    }
  ],
  "anchor_family": "Boundary"
}
```

## 🧪 Testing

The project includes comprehensive testing:

- **Bank Validation**: Schema validation and data integrity checks
- **Engine Tests**: Core functionality and edge cases
- **Replay Tests**: Deterministic behavior verification
- **Edge Policies**: Special cases (picks=1, picks=7)
- **Golden Tests**: Reference implementations for regression testing

### Running Tests

```bash
# Complete test suite
node scripts/run-all-tests.js

# Essential tests only
node scripts/run-essential-tests.js

# Specific test categories
node scripts/lint-bank.js          # Bank validation
node scripts/test-engine.js        # Engine functionality
node scripts/test-edge-policies.js # Edge cases
node scripts/run-replay.js         # Replay validation
```

## 📁 Project Structure

```
BESTALLAH/
├── engine/                 # Core engine implementation
│   ├── index.js           # Main API functions
│   ├── bankLoader.js      # Bank loading and indices
│   └── ...                # Supporting modules
├── bank/                  # Question bank and data
│   ├── questions/         # Question files (7 families)
│   ├── registries/        # Face, tell, and family registries
│   ├── constants/         # Configuration constants
│   └── packaged/          # Packaged and signed bank
├── pff-quiz/              # Next.js web application
│   ├── src/app/           # App router pages
│   ├── src/hooks/         # React hooks
│   ├── src/lib/           # Utility libraries
│   └── src/types/         # TypeScript definitions
├── scripts/               # Testing and utility scripts
├── tests/                 # Test data and golden tests
├── docs/                  # Documentation
└── .cursor/               # Development rules and patterns
```

## 🔒 Security & Validation

- **Bank Signing**: Question banks are cryptographically signed
- **Input Validation**: All inputs validated against schemas
- **Deterministic Behavior**: No external dependencies in core logic
- **Immutable Data**: Question bank cannot be modified at runtime
- **Error Handling**: Comprehensive error codes and recovery

## 🚀 Deployment

### Web Application

The Next.js application can be deployed to:

- **Vercel**: `vercel --prod`
- **Netlify**: Connect GitHub repository
- **Docker**: Use included Dockerfile

### API Endpoints

The engine provides REST API endpoints:

- `POST /api/engine/session/init` - Initialize session
- `POST /api/engine/session/picks` - Set family picks
- `GET /api/engine/session/next` - Get next question
- `POST /api/engine/session/answer` - Submit answer
- `POST /api/engine/session/finalize` - Finalize session

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Follow the coding standards in `.cursor/rules/`
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

### Development Rules

- Follow deterministic principles
- Maintain string-blind core
- Validate all inputs
- Test edge cases
- Document API changes

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check `.cursor/rules/` for detailed specifications
- **Issues**: Report bugs via GitHub Issues
- **Discussions**: Use GitHub Discussions for questions

## 🔗 Links

- **Repository**: https://github.com/hussamallah/BESTALLAH
- **Live Demo**: [Coming Soon]
- **Documentation**: [Coming Soon]

---

**Built with ❤️ using Next.js, TypeScript, and deterministic design principles.**
