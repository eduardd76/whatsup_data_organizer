# Contributing to WhatsApp Notion Intake

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on the code, not the person
- Help others learn and grow

## Getting Started

### 1. Fork and Clone

```bash
# Fork on GitHub, then:
git clone https://github.com/YOUR_USERNAME/whatsapp-notion-intake.git
cd whatsapp-notion-intake
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Development Environment

```bash
# Start infrastructure
docker-compose up -d

# Copy environment file
cp .env.example .env

# Run migrations
npm run migrate
```

### 4. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/bug-description
```

## Development Workflow

### Running Locally

```bash
# Terminal 1: Server
npm run dev

# Terminal 2: Worker
npm run worker

# Terminal 3: Admin UI (optional)
npm run admin
```

### Code Style

We use ESLint and Prettier:

```bash
# Lint
npm run lint

# Auto-fix
npm run lint:fix

# Format
npm run format
```

### Testing

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

**Coverage Requirements:**
- Minimum 70% overall
- New features must include tests
- Bug fixes should include regression tests

### Type Checking

```bash
npm run typecheck
```

TypeScript strict mode is enabled. All code must pass type checking.

## Pull Request Process

### 1. Before Submitting

- [ ] Code follows style guidelines (ESLint + Prettier)
- [ ] Tests pass (`npm test`)
- [ ] Type checking passes (`npm run typecheck`)
- [ ] Coverage is maintained or improved
- [ ] Documentation is updated
- [ ] Commit messages are clear

### 2. Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add YouTube transcript support
fix: handle PDF parsing errors gracefully
docs: update deployment guide
test: add tests for image pipeline
chore: upgrade dependencies
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `test`: Adding tests
- `chore`: Maintenance
- `refactor`: Code restructuring
- `perf`: Performance improvement

### 3. Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## How Has This Been Tested?
Describe testing performed

## Checklist
- [ ] Tests pass
- [ ] Linting passes
- [ ] Documentation updated
- [ ] No breaking changes (or clearly documented)
```

### 4. Review Process

1. Submit PR
2. Automated CI checks run
3. Maintainer reviews code
4. Address feedback
5. Get approval
6. Merge!

## Project Structure

```
src/
├── admin/          # Admin UI server
├── config/         # Configuration management
├── ingestion/      # WhatsApp webhook receiver
├── notion/         # Notion API integration
├── pipelines/      # Content processing pipelines
├── queue/          # Job queue (producer + worker)
├── services/       # External services (AI, HTTP)
├── storage/        # Database + S3
├── types/          # TypeScript types
├── utils/          # Utilities
└── index.ts        # Main server entry point
```

## Adding New Features

### Adding a New Pipeline

1. Create `src/pipelines/your-pipeline.ts`:

```typescript
import { AbstractPipeline } from './base';
import { PipelineContext, EnrichedItem, EnrichedItemType } from '../types';

export class YourPipeline extends AbstractPipeline {
  name = 'YourPipeline';

  async process(context: PipelineContext): Promise<EnrichedItem> {
    // Implementation
  }
}
```

2. Register in `src/pipelines/router.ts`

3. Add tests in `src/__tests__/pipelines/your-pipeline.test.ts`

4. Update documentation

### Adding New Notion Properties

1. Update `src/types/index.ts`:

```typescript
export interface NotionPageProperties {
  // ... existing properties
  'New Property': { rich_text: Array<{ text: { content: string } }> };
}
```

2. Update `src/notion/writer.ts`:

```typescript
properties['New Property'] = {
  rich_text: [{ text: { content: item.newProperty } }]
};
```

3. Update docs/NOTION_SETUP.md

## Testing Guidelines

### Unit Tests

Test individual functions/methods:

```typescript
describe('extractUrls', () => {
  it('should extract URLs from text', () => {
    const text = 'Check https://example.com';
    const urls = extractUrls(text);
    expect(urls).toContain('https://example.com');
  });
});
```

### Integration Tests

Test multiple components together:

```typescript
describe('Pipeline Integration', () => {
  it('should process text through TextPipeline', async () => {
    const event = createMockEvent({ text: 'Test' });
    const result = await routeAndProcessEvent(event, 'trace-id');
    expect(result.pipelineUsed).toBe('TextPipeline');
  });
});
```

### Mocking

Mock external services:

```typescript
jest.mock('../services/ai', () => ({
  getAICompletion: jest.fn().mockResolvedValue('Mock response'),
}));
```

## Documentation

### Code Documentation

Use JSDoc comments:

```typescript
/**
 * Extract URLs from text using regex
 * @param text - Input text to search
 * @returns Array of URLs found
 */
export function extractUrls(text: string): string[] {
  // Implementation
}
```

### Updating Docs

When adding features, update:
- README.md (if user-facing)
- Relevant docs/ files
- Code comments
- Type definitions

## Common Tasks

### Adding a Dependency

```bash
npm install package-name

# Dev dependency
npm install --save-dev package-name
```

Update package.json description if needed.

### Updating Database Schema

1. Create migration file:
```sql
-- src/storage/migrations/002_add_new_column.sql
ALTER TABLE intake_events ADD COLUMN new_field TEXT;
```

2. Run migration:
```bash
npm run migrate
```

3. Update TypeScript types

### Debugging

```typescript
import { logger } from '../utils/logger';

// Log with trace ID
logger.info('Processing event', { eventId, traceId });
logger.error('Error occurred', error);
```

View logs:
```bash
# Development
npm run dev
# Logs appear in console

# Production
# Check your deployment platform logs
```

## Performance Guidelines

### Database Queries

- Use indexes for frequently queried fields
- Limit result sets (use LIMIT/OFFSET)
- Use connection pooling (already configured)

### Memory Management

- Stream large files when possible
- Clean up temp files after processing
- Limit concurrent operations

### AI API Calls

- Cache repeated prompts
- Use batch operations when possible
- Implement retry with backoff (already done)

## Security

### Sensitive Data

Never commit:
- API keys
- Passwords
- Tokens
- .env files

Use:
- Environment variables
- Secret managers (production)
- .env.example (template only)

### Input Validation

Always validate:
- Webhook payloads (using Zod)
- User inputs
- File uploads

### Dependencies

Keep dependencies updated:

```bash
npm audit
npm update
```

## Getting Help

Stuck? Here's how to get help:

1. **Check existing issues:** [GitHub Issues](https://github.com/your-repo/issues)
2. **Ask in discussions:** [GitHub Discussions](https://github.com/your-repo/discussions)
3. **Read the docs:** Start with README.md
4. **Debug:** Enable DEBUG logging

## Recognition

Contributors are recognized in:
- README.md contributors section
- Release notes
- GitHub contributors page

Thank you for contributing! 🎉
