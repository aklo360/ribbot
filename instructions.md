# Building a Custom Telegram AI Agent with Eliza

## Project Overview
Create a Telegram-based AI agent using the Eliza framework, trained on personal Twitter data to create a customized personality.

## Technical Requirements
- Python 2.7+
- Node.js 23+
- pnpm package manager

## Project Setup

### 1. Environment Configuration
1. Copy `.env.example` to `.env`
2. Configure required environment variables:
   - Model settings (XAI_MODEL)
   - API keys
   - Client credentials (Twitter/Telegram/Discord)

### 2. Character Configuration
Characters are defined in JSON format and specify:
- Core identity and behavior patterns
- Model provider settings
- Client configurations
- Interaction examples
- Style guidelines

Character files can be loaded in two ways:
1. Modify the default character in `src/core/defaultCharacter.ts`
2. Create custom character files and load them using:
   ```bash
   pnpm start --characters="path/to/your/character.json"
   ```

### 3. Custom Actions
- Custom actions should be added to the `custom_actions` directory
- Configure actions in `elizaConfig.yaml`
- Reference `elizaConfig.example.yaml` for examples

### 4. Model Configuration

#### Llama Configuration
Set XAI_MODEL environment variable to:
- `meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo` for 70B model
- `meta-llama/Meta-Llama-3.1-405B-Instruct` for 405B model

#### OpenAI Configuration
Set XAI_MODEL environment variable to:
- `gpt-4o-mini` for smaller model
- `gpt-4o` for larger model

## Code Examples

### Character Configuration
```json
{
  "name": "trump",
  "clients": ["discord", "direct"],
  "settings": {
    "voice": { "model": "en_US-male-medium" }
  },
  "bio": [
    "Built a strong economy and reduced inflation.",
    "Promises to make America the crypto capital and restore affordability."
  ],
  "lore": [
    "Secret Service allocations used for election interference.",
    "Promotes WorldLibertyFi for crypto leadership."
  ],
  "knowledge": [
    "Understands border issues, Secret Service dynamics, and financial impacts on families."
  ],
  "messageExamples": [
    {
      "user": "{{user1}}",
      "content": { "text": "What about the border crisis?" },
      "response": "Current administration lets in violent criminals. I secured the border; they destroyed it."
    }
  ],
  "postExamples": [
    "End inflation and make America affordable again.",
    "America needs law and order, not crime creation."
  ]
}
```

### Custom Action Implementation
```typescript
import { Action, IAgentRuntime, Memory, State } from "@ai16z/eliza";

const documentAnalysisAction: Action = {
  name: "ANALYZE_DOCUMENT",
  similes: ["READ_DOCUMENT", "PROCESS_DOCUMENT", "REVIEW_DOCUMENT"],
  description: "Analyzes uploaded documents and provides insights",

  validate: async (runtime: IAgentRuntime, message: Memory) => {
    // Check for document attachment
    if (!message.content.attachments?.length) {
      return false;
    }

    // Verify document type
    const attachment = message.content.attachments[0];
    return ["pdf", "txt", "doc"].includes(attachment.type);
  },

  handler: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
    try {
      // Get document service
      const docService = runtime.getService<IDocumentService>(
        ServiceType.DOCUMENT,
      );

      // Process document
      const content = await docService.processDocument(
        message.content.attachments[0],
      );

      // Store analysis
      await runtime.documentsManager.createMemory({
        id: generateId(),
        content: {
          text: content,
          analysis: await docService.analyze(content),
        },
        userId: message.userId,
        roomId: message.roomId,
        createdAt: Date.now(),
      });

      return true;
    } catch (error) {
      console.error("Document analysis failed:", error);
      return false;
    }
  },

  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "Can you analyze this document?",
          attachments: [{ type: "pdf", url: "document.pdf" }],
        },
      },
      {
        user: "{{user2}}",
        content: {
          text: "I'll analyze that document for you",
          action: "ANALYZE_DOCUMENT",
        },
      },
    ],
  ],
};
```

### Knowledge Management Tools
```bash
# Convert folder contents to knowledge
npx folder2knowledge <path/to/folder>

# Add knowledge to character file
npx knowledge2character <character-file> <knowledge-file>
```

### Debugging
```typescript
const debug = require("debug")("eliza:advanced");

debug("Detailed operation info: %O", {
  operation: "complexOperation",
  parameters: params,
  result: result,
});
```

### Package Installation
```bash
# Install core package
pnpm add @ai16z/core

# Install specific adapters
pnpm add @ai16z/adapter-postgres
pnpm add @ai16z/adapter-sqlite

# Install clients
pnpm add @ai16z/client-discord
pnpm add @ai16z/client-telegram
```

### WSL Setup Commands
```bash
# Install WSL
wsl --install

# Update Ubuntu packages
sudo apt update && sudo apt upgrade -y

# Install system dependencies
sudo apt install -y \
    build-essential \
    python3 \
    python3-pip \
    git \
    curl \
    ffmpeg \
    libtool-bin \
    autoconf \
    automake \
    libopus-dev

# Install Node.js
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 23
nvm use 23

# Install pnpm
curl -fsSL https://get.pnpm.io/install.sh | sh -
source ~/.bashrc
```

-------------------

# Eliza Framework Documentation

## Introduction to Eliza

Eliza is a multi-agent simulation framework for creating, deploying, and managing autonomous AI agents. Built in TypeScript, it enables development of intelligent agents that maintain consistent personalities and knowledge across multiple platforms.

### Core Capabilities
1. **Multi-Agent Architecture**
   - Deploy multiple unique AI personalities simultaneously
   - Manage multiple agents with different roles and purposes
   - Coordinate interactions between agents

2. **Character System**
   - Flexible character creation using characterfile framework
   - Personality consistency across platforms
   - Customizable behavior patterns

3. **Memory Management**
   - Advanced RAG (Retrieval Augmented Generation) system
   - Long-term memory storage
   - Context awareness across conversations

4. **Platform Integration**
   - Discord with voice channel support
   - Twitter/X bot capabilities
   - Telegram integration
   - Direct API access

### Media Processing Capabilities
- PDF document analysis
- Link content extraction
- Audio transcription
- Video content processing
- Image analysis
- Conversation summarization

### AI Model Support
- Local inference with open-source models
- Cloud-based inference through OpenAI
- Default: Nous Hermes Llama 3.1B
- Claude integration for complex queries

### Primary Use Cases
1. **AI Assistants**
   - Customer support agents
   - Community moderators
   - Personal assistants

2. **Social Media Personas**
   - Automated content creators
   - Engagement bots
   - Brand representatives

3. **Knowledge Workers**
   - Research assistants
   - Content analysts
   - Document processors

4. **Interactive Characters**
   - Role-playing characters
   - Educational tutors
   - Entertainment bots

## Framework Features
- 🛠️ Full-featured connectors for Discord, Twitter, and Telegram
- 👥 Multi-agent and room support for complex interactions
- 📚 Easy document ingestion and interaction capabilities
- 💾 Retrievable memory and document storage system
- 🚀 Highly extensible architecture for custom actions and clients
- ☁️ Support for multiple AI models:
  - Local Llama models (70B and 405B variants)
  - OpenAI models
  - Anthropic models
  - Groq models
  - And more

## Advanced Features

### Fine-Tuning
- Custom model training capabilities
- Personality adaptation through conversation history
- Training data preparation and validation
- Model evaluation and performance metrics

### Trust Engine
- Advanced security and validation system
- Input/output verification
- Safety constraints and guidelines
- Content moderation capabilities

### Infrastructure
- Scalable deployment options
- Load balancing and high availability
- Monitoring and logging systems
- Performance optimization

### Autonomous Trading
- Automated trading capabilities
- Market analysis integration
- Risk management systems
- Trading strategy implementation

### Secure Execution
- Trusted execution environment (TEE) support
- Secure data handling
- Encryption and privacy features
- Compliance management

## Package Structure

### Core Package
- Base framework functionality
- Character management
- Model integration
- Memory systems

### Adapters
- Interface implementations
- Protocol handlers
- Data transformation
- Integration utilities

### Clients
- Discord implementation
- Twitter integration
- Telegram bot support
- Custom client development

### Agent
- Autonomous agent framework
- Decision-making systems
- Task management
- Goal-oriented behavior

### Plugins
- Extension system
- Custom functionality
- Third-party integrations
- Feature modules

## Development Guides

### Local Development
- Development environment setup
- Testing procedures
- Debugging tools
- Performance profiling

### WSL Support
- Windows Subsystem for Linux setup
- Cross-platform compatibility
- Development workflow
- Environment configuration

### Secrets Management
- API key handling
- Secure credential storage
- Environment variable management
- Security best practices

### Configuration Guide
- System configuration
- Performance tuning
- Feature toggles
- Environment-specific settings

## Quickstart Guide

### Prerequisites
- Node.js 23+
- pnpm 9+
- Git for version control
- VS Code or VSCodium (recommended)
- CUDA Toolkit (optional, for GPU acceleration)

### Installation Steps

1. **Clone the Repository**
```bash
# Clone the repository
git clone https://github.com/ai16z/eliza.git

# Enter directory
cd eliza

# Checkout the latest release
git checkout $(git describe --tags --abbrev=0)

# Install dependencies (initial run)
pnpm install --no-frozen-lockfile
```

2. **Build Local Libraries**
```bash
pnpm build
```

3. **Configure Environment**
```bash
# Copy example environment file
cp .env.example .env

# Required environment variables
DISCORD_APPLICATION_ID=  # For Discord integration
DISCORD_API_TOKEN=      # Bot token
HEURIST_API_KEY=       # Heurist API key for LLM and image generation
OPENAI_API_KEY=        # OpenAI API key
GROK_API_KEY=          # Grok API key
ELEVENLABS_XI_API_KEY= # API key from elevenlabs (for voice)
```

### Platform Integration

#### Discord Bot Setup
1. Create new application at Discord Developer Portal
2. Create bot and get token
3. Add bot to server using OAuth2 URL generator
4. Set `DISCORD_API_TOKEN` and `DISCORD_APPLICATION_ID` in `.env`

#### Twitter Integration
```bash
# Add to .env:
TWITTER_USERNAME=  # Account username
TWITTER_PASSWORD=  # Account password
TWITTER_EMAIL=     # Account email
TWITTER_COOKIES=   # Account cookies (auth_token and CT0)

# Example TWITTER_COOKIES format:
TWITTER_COOKIES='[{"key":"auth_token","value":"your token","domain":".twitter.com"},
  {"key":"ct0","value":"your ct0","domain":".twitter.com"},
  {"key":"guest_id","value":"your guest_id","domain":".twitter.com"}]'
```

#### Telegram Bot Setup
1. Create a bot through BotFather
2. Add bot token to `.env`:
```bash
TELEGRAM_BOT_TOKEN=your_token_here
```

### Running Your Agent

1. **Create a Character File**
- Use templates from `characters/trump.character.json` or `characters/tate.character.json`
- Reference `core/src/core/defaultCharacter.ts` for structure

2. **Start the Agent**
```bash
# Run single character
pnpm start --character="characters/trump.character.json"

# Run multiple characters
pnpm start --characters="characters/trump.character.json,characters/tate.character.json"
```

3. **Interact with the Agent**
```bash
# Start the client interface
pnpm start:client

# Access the chat interface at http://localhost:5173/
```

### GPU Acceleration Setup
```bash
# Install CUDA support
npx --no node-llama-cpp source download --gpu cuda

# Ensure CUDA Toolkit, cuDNN, and cuBLAS are installed
```

### Troubleshooting Common Issues

1. **Node.js Version Issues**
   - Ensure Node.js 23.3.0 is installed
   - Use `node -v` to check version
   - Consider using nvm for version management

2. **Sharp Installation Issues**
```bash
pnpm install --include=optional sharp
```

3. **Exit Status 1 Fix**
```bash
# Add dependencies to workspace root
pnpm add -w -D ts-node typescript @types/node

# Add to agent package
pnpm add -D ts-node typescript @types/node --filter "@ai16z/agent"

# Add to core package
pnpm add -D ts-node typescript @types/node --filter "@ai16z/eliza"

# Clean and rebuild
pnpm clean
pnpm install -r
pnpm build
```

4. **Better-sqlite3 Version Mismatch**
```bash
# Rebuild better-sqlite3
pnpm rebuild better-sqlite3

# If that doesn't work, clean and reinstall
rm -fr node_modules
pnpm store prune
pnpm i
```

## Frequently Asked Questions

### General Questions

#### What is Eliza?
Eliza is an open-source, multi-agent simulation framework for creating and managing autonomous AI agents. It enables developers to build unique AI personalities that can interact across various platforms like Discord, Twitter, and Telegram.

#### Who is behind Eliza?
- Led by the developers of ai16z, an AI-driven DAO
- Lead developer: Shaw (known for @pmairca and @degenspartanai)
- Open source project: https://github.com/ai16z/eliza

### Architecture Components

#### Core Components
1. **Agents**
   - Represent individual AI personalities
   - Operate within runtime environment
   - Handle platform interactions

2. **Actions**
   - Predefined behaviors for message responses
   - Task execution capabilities
   - External system interaction

3. **Clients**
   - Platform-specific interfaces
   - Handle message format translation
   - Manage communication protocols

4. **Providers**
   - Supply contextual information
   - Time awareness
   - User relationship management
   - External data integration

5. **Evaluators**
   - Conversation assessment
   - Goal tracking
   - Memory building
   - Context maintenance

6. **Character Files**
   - JSON-based personality definitions
   - Knowledge base configuration
   - Behavior patterns

7. **Memory System**
   - Vector embeddings
   - Relational database storage
   - Information retrieval system

### Database Configuration
- Primary database: Supabase for local development
- Follow documentation for Supabase project setup
- Configure database connection in `.env`

### Contributing to Eliza

#### Technical Contributions
- Develop new actions, clients, providers, and evaluators
- Improve database management (PostgreSQL, SQLite, SQL.js)
- Enhance local development workflows
- Fine-tune models
- Contribute to autonomous trading and trust engine features

#### Non-Technical Contributions
- Community management
- Content creation (tutorials, documentation, videos)
- Translation work
- Domain expertise sharing

### Future Development

#### Planned Features
- Expanded platform compatibility
- Enhanced model capabilities
- Improved trust engine
- Community growth initiatives

#### Project Roadmap
- Platform support expansion
- Model performance improvements
- Security enhancements
- Community-driven development

### Common Questions

#### About GitHub Forks
- The framework is open-source and can be forked
- Pre-trained models (used by AI Marc and DegenSpartan AI) are not included
- Each implementation will require its own model training

#### Database Requirements
- Supabase for local development
- PostgreSQL compatibility
- Vector storage support for embeddings

#### Model Support
- Local inference with open-source models
- Cloud-based inference through OpenAI
- Default: Nous Hermes Llama 3.1B
- Claude integration for complex queries

#### Security Considerations
- API key management
- Platform authentication
- Data privacy
- Model access control

# Core Concepts

## Character Files

Character files are JSON-formatted configurations that define an AI character's personality, knowledge, and behavior patterns. They are fundamental to creating effective Eliza agents.

### Core Components Structure
```json
{
  "id": "unique-identifier",
  "name": "character_name",
  "modelProvider": "ModelProviderName",
  "clients": ["Client1", "Client2"],
  "settings": {
    "secrets": { "key": "value" },
    "voice": { "model": "VoiceModelName", "url": "VoiceModelURL" },
    "model": "CharacterModel",
    "embeddingModel": "EmbeddingModelName"
  },
  "bio": "Character biography or description",
  "lore": [
    "Storyline or backstory element 1",
    "Storyline or backstory element 2"
  ],
  "messageExamples": [["Message example 1", "Message example 2"]],
  "postExamples": ["Post example 1", "Post example 2"],
  "topics": ["Topic1", "Topic2"],
  "adjectives": ["Adjective1", "Adjective2"],
  "style": {
    "all": ["All style guidelines"],
    "chat": ["Chat-specific style guidelines"],
    "post": ["Post-specific style guidelines"]
  }
}
```

### Required Fields

1. **name**
   - Character's display name
   - Used for identification and conversations

2. **modelProvider**
   - Specifies the AI model provider
   - Options: `anthropic`, `llama_local`, `openai`, etc.

3. **clients**
   - Array of supported platforms
   - Options: `discord`, `direct`, `twitter`, `telegram`, `farcaster`

### Optional Fields

1. **bio**
   - Character background information
   - Can be string or array of statements
   - Example:
   ```json
   "bio": [
     "Mark Andreessen is an American entrepreneur and investor",
     "Co-founder of Netscape and Andreessen Horowitz",
     "Pioneer of the early web, created NCSA Mosaic"
   ]
   ```

2. **lore**
   - Backstory elements and character traits
   - Used for personality definition
   - Example:
   ```json
   "lore": [
     "Believes strongly in the power of software to transform industries",
     "Known for saying 'Software is eating the world'",
     "Early investor in Facebook, Twitter, and other tech giants"
   ]
   ```

3. **knowledge**
   - Used for RAG (Retrieval Augmented Generation)
   - Contains factual information
   - Can be generated from documents using tools

4. **style**
   - Defines behavior patterns across contexts
   - Example:
   ```json
   "style": {
     "all": ["maintain technical accuracy", "be approachable and clear"],
     "chat": ["ask clarifying questions", "provide examples when helpful"],
     "post": ["share insights concisely", "focus on practical applications"]
   }
   ```

### Complete Example: Technical AI Character
```json
{
  "name": "TechAI",
  "modelProvider": "anthropic",
  "clients": ["discord", "direct"],
  "bio": "AI researcher and educator focused on practical applications",
  "lore": [
    "Pioneer in open-source AI development",
    "Advocate for AI accessibility"
  ],
  "messageExamples": [
    [
      {
        "user": "{{user1}}",
        "content": { "text": "Can you explain how AI models work?" }
      },
      {
        "user": "TechAI",
        "content": {
          "text": "Think of AI models like pattern recognition systems."
        }
      }
    ]
  ],
  "postExamples": [
    "Understanding AI doesn't require a PhD - let's break it down simply",
    "The best AI solutions focus on real human needs"
  ],
  "topics": [
    "artificial intelligence",
    "machine learning",
    "technology education"
  ],
  "style": {
    "all": ["explain complex topics simply", "be encouraging and supportive"],
    "chat": ["use relevant examples", "check understanding"],
    "post": ["focus on practical insights", "encourage learning"]
  },
  "adjectives": ["knowledgeable", "approachable", "practical"],
  "settings": {
    "model": "claude-3-opus-20240229",
    "voice": { "model": "en-US-neural" }
  }
}
```

### Best Practices

1. **Randomization for Variety**
   - Break bio and lore into smaller chunks
   - Creates more natural, varied responses
   - Prevents repetitive behavior

2. **Knowledge Management**
   - Use provided tools for document conversion:
   ```bash
   npx folder2knowledge <path/to/folder>
   npx knowledge2character <character-file> <knowledge-file>
   ```

3. **Style Instructions**
   - Be specific about communication patterns
   - Include both dos and don'ts
   - Consider platform-specific behavior

4. **Message Examples**
   - Include diverse scenarios
   - Show character-specific responses
   - Demonstrate typical interactions

### Quality Tips

1. **Bio and Lore**
   - Mix factual and personality information
   - Include historical and current details
   - Break into modular pieces

2. **Style Guidelines**
   - Be specific about tone and mannerisms
   - Include platform-specific guidance
   - Define clear boundaries

3. **Examples**
   - Cover common scenarios
   - Show character-specific reactions
   - Demonstrate proper tone

4. **Knowledge Management**
   - Focus on relevant information
   - Organize in digestible chunks
   - Update regularly

## Agents

Agents are the core components of the Eliza framework that handle autonomous interactions. Each agent runs in a runtime environment and can interact through various clients while maintaining consistent behavior and memory.

### Core Components

Each agent runtime consists of:

1. **Clients**
   - Enable cross-platform communication (Discord, Telegram, Direct API)
   - Platform-specific feature implementations
   - Message format handling

2. **Providers**
   - Extend agent capabilities
   - Integrate additional services
   - Handle time, wallet, and custom data services

3. **Actions**
   - Define agent behaviors
   - Process attachments
   - Generate images
   - Follow rooms
   - Custom action support

4. **Evaluators**
   - Manage response assessment
   - Handle goal management
   - Extract facts
   - Build long-term memory

### Agent Runtime Implementation

```typescript
interface IAgentRuntime {
  // Core identification
  agentId: UUID;
  serverUrl: string;
  token: string;

  // Configuration
  character: Character;
  modelProvider: ModelProviderName;

  // Components
  actions: Action[];
  evaluators: Evaluator[];
  providers: Provider[];

  // Database & Memory
  databaseAdapter: IDatabaseAdapter;
  messageManager: IMemoryManager;
  descriptionManager: IMemoryManager;
  loreManager: IMemoryManager;
}
```

### Creating an Agent Runtime

```typescript
import { AgentRuntime, ModelProviderName } from "@ai16z/eliza";

// Configuration example
const runtime = new AgentRuntime({
  token: "auth-token",
  modelProvider: ModelProviderName.ANTHROPIC,
  character: characterConfig,
  databaseAdapter: new DatabaseAdapter(),
  conversationLength: 32,
  serverUrl: "http://localhost:7998",
  actions: customActions,
  evaluators: customEvaluators,
  providers: customProviders,
});
```

### Memory Systems

The framework uses multiple types of memory:

1. **Message History**
   - Stores recent conversations
   - Maintains session context
   - Prevents repetitive responses

2. **Factual Memory**
   - User preferences
   - Recent activities
   - Cross-session information

3. **Knowledge Base**
   - General knowledge storage
   - Pre-defined responses
   - Static character lore

4. **Relationship Tracking**
   - User-agent interaction frequency
   - Sentiment analysis
   - Connection history

5. **RAG Integration**
   - Vector search capabilities
   - Contextual recall
   - Similarity matching

### Memory Management Example

```typescript
// Get memory manager
const memoryManager = runtime.getMemoryManager("messages");

// Create memory
await memoryManager.createMemory({
  id: messageId,
  content: { text: "Message content" },
  userId: userId,
  roomId: roomId,
});
```

### State Management

The runtime maintains state through the State interface:

```typescript
interface State {
  userId?: UUID;
  agentId?: UUID;
  roomId: UUID;
  bio: string;
  lore: string;
  agentName?: string;
  senderName?: string;
  actors: string;
  actorsData?: Actor[];
  recentMessages: string;
  recentMessagesData: Memory[];
  goals?: string;
  goalsData?: Goal[];
  actions?: string;
  actionNames?: string;
  providers?: string;
}
```

#### State Management Examples

```typescript
// Compose initial state
const state = await runtime.composeState(message, {
  additionalContext: "custom-context",
});

// Update message state
const updatedState = await runtime.updateRecentMessageState(state);
```

### Message Processing

```typescript
// Process message with actions
await runtime.processActions(message, responses, state, async (newMessages) => {
  // Handle new messages
  return [message];
});
```

### Service Management

```typescript
// Register service
runtime.registerService(new TranscriptionService());

// Get service
const service = runtime.getService<ITranscriptionService>(
  ServiceType.TRANSCRIPTION,
);
```

### Best Practices

1. **Memory Management**
   - Use appropriate memory managers for different data types
   - Consider memory limits
   - Use the `unique` flag for deduplication
   - Implement regular cleanup
   - Cache frequently accessed data

2. **State Management**
   - Keep state immutable where possible
   - Use `composeState` for initialization
   - Use `updateRecentMessageState` for updates
   - Cache frequently accessed state data

3. **Service Integration**
   - Implement proper error handling
   - Use type-safe service registration
   - Maintain service independence
   - Log service operations

4. **Evaluation System**
   - Implement comprehensive evaluation criteria
   - Handle evaluation failures gracefully
   - Cache evaluation results when appropriate
   - Monitor evaluation performance

## Providers

Providers are core modules that inject dynamic context and real-time information into agent interactions. They serve as a bridge between the agent and external systems, enabling access to market data, wallet information, sentiment analysis, and temporal context.

### Core Structure

```typescript
interface Provider {
  get: (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
  ) => Promise<string>;
}
```

### Built-in Providers

#### Time Provider
```typescript
const timeProvider: Provider = {
  get: async (_runtime: IAgentRuntime, _message: Memory) => {
    const currentDate = new Date();
    const currentTime = currentDate.toLocaleTimeString("en-US");
    const currentYear = currentDate.getFullYear();
    return `The current time is: ${currentTime}, ${currentYear}`;
  },
};
```

#### Boredom Provider
```typescript
interface BoredomLevel {
  minScore: number;
  statusMessages: string[];
}

const boredomProvider: Provider = {
  get: async (runtime: IAgentRuntime, message: Memory) => {
    const messages = await runtime.messageManager.getMemories({
      roomId: message.roomId,
      count: 10,
    });

    return messages.length > 0
      ? "Actively engaged in conversation"
      : "No recent interactions";
  },
};
```

### Comprehensive Provider Example

```typescript
import { Provider, IAgentRuntime, Memory, State } from "@ai16z/eliza";

const comprehensiveProvider: Provider = {
  get: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
    try {
      // Get recent messages
      const messages = await runtime.messageManager.getMemories({
        roomId: message.roomId,
        count: 5,
      });

      // Get user context
      const userContext = await runtime.descriptionManager.getMemories({
        roomId: message.roomId,
        userId: message.userId,
      });

      // Get relevant facts
      const facts = await runtime.messageManager.getMemories({
        roomId: message.roomId,
        tableName: "facts",
        count: 3,
      });

      // Format comprehensive context
      return `
# Conversation Context
${messages.map((m) => `- ${m.content.text}`).join("\n")}

# User Information
${userContext.map((c) => c.content.text).join("\n")}

# Related Facts
${facts.map((f) => `- ${f.content.text}`).join("\n")}
      `.trim();
    } catch (error) {
      console.error("Provider error:", error);
      return "Context temporarily unavailable";
    }
  },
};
```

### Memory Integration Example

```typescript
const memoryProvider: Provider = {
  get: async (runtime: IAgentRuntime, message: Memory) => {
    // Get recent messages
    const messages = await runtime.messageManager.getMemories({
      roomId: message.roomId,
      count: 5,
      unique: true,
    });

    // Get user descriptions
    const descriptions = await runtime.descriptionManager.getMemories({
      roomId: message.roomId,
      userId: message.userId,
    });

    // Combine and format
    return `
Recent Activity:
${formatMessages(messages)}

User Context:
${formatDescriptions(descriptions)}
    `.trim();
  },
};
```

### Best Practices

1. **Data Management**
   - Implement robust caching strategies
   - Use appropriate TTL for different data types
   - Validate data before caching

2. **Performance Optimization**
```typescript
// Example of optimized data fetching
async function fetchDataWithCache<T>(
  key: string,
  fetcher: () => Promise<T>,
): Promise<T> {
  const cached = await cache.get(key);
  if (cached) return cached;

  const data = await fetcher();
  await cache.set(key, data);
  return data;
}
```

3. **Error Handling**
   - Implement retry mechanisms
   - Provide fallback values
   - Log errors comprehensively
   - Handle API timeouts

4. **Security**
   - Validate input parameters
   - Sanitize returned data
   - Implement rate limiting
   - Handle sensitive data appropriately

### Integration with Runtime

```typescript
// Register provider
runtime.registerContextProvider(customProvider);

// Providers are accessed through composeState
const state = await runtime.composeState(message);
```

### Troubleshooting

1. **Stale Data**
```typescript
// Implement cache invalidation
const invalidateCache = async (pattern: string) => {
  const keys = await cache.keys(pattern);
  await Promise.all(keys.map((k) => cache.del(k)));
};
```

2. **Rate Limiting**
```typescript
// Implement backoff strategy
const backoff = async (attempt: number) => {
  const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
  await new Promise((resolve) => setTimeout(resolve, delay));
};
```

3. **API Failures**
```typescript
// Implement fallback data sources
const getFallbackData = async () => {
  // Attempt alternative data sources
};
```

## Actions

Actions are core building blocks in Eliza that define how agents respond to and interact with messages. They enable agents to interact with external systems, modify behavior, and perform tasks beyond simple message responses.

### Core Structure

```typescript
interface Action {
  name: string;
  similes: string[];
  description: string;
  validate: (runtime: IAgentRuntime, message: Memory) => Promise<boolean>;
  handler: (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
  ) => Promise<void>;
  examples: ActionExample[][];
}
```

### Built-in Actions

1. **CONTINUE**
   - Maintains conversation when more context is needed
   - Manages natural dialogue progression
   - Limited to 3 consecutive continues

2. **IGNORE**
   - Gracefully disengages from conversations
   - Handles inappropriate interactions
   - Manages natural conversation endings
   - Handles post-closing responses

3. **NONE**
   - Default response action
   - Used for standard conversational replies

### External Integration Example

```typescript
const take_order: Action = {
  name: "TAKE_ORDER",
  similes: ["BUY_ORDER", "PLACE_ORDER"],
  description: "Records a buy order based on the user's conviction level.",
  validate: async (runtime: IAgentRuntime, message: Memory) => {
    const text = (message.content as Content).text;
    const tickerRegex = /\b[A-Z]{1,5}\b/g;
    return tickerRegex.test(text);
  },
  // ... rest of implementation
};
```

### Complete Action Implementation Example

```typescript
import { Action, IAgentRuntime, Memory, State } from "@ai16z/eliza";

const documentAnalysisAction: Action = {
  name: "ANALYZE_DOCUMENT",
  similes: ["READ_DOCUMENT", "PROCESS_DOCUMENT", "REVIEW_DOCUMENT"],
  description: "Analyzes uploaded documents and provides insights",

  validate: async (runtime: IAgentRuntime, message: Memory) => {
    // Check for document attachment
    if (!message.content.attachments?.length) {
      return false;
    }

    // Verify document type
    const attachment = message.content.attachments[0];
    return ["pdf", "txt", "doc"].includes(attachment.type);
  },

  handler: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
    try {
      // Get document service
      const docService = runtime.getService<IDocumentService>(
        ServiceType.DOCUMENT,
      );

      // Process document
      const content = await docService.processDocument(
        message.content.attachments[0],
      );

      // Store analysis
      await runtime.documentsManager.createMemory({
        id: generateId(),
        content: {
          text: content,
          analysis: await docService.analyze(content),
        },
        userId: message.userId,
        roomId: message.roomId,
        createdAt: Date.now(),
      });

      return true;
    } catch (error) {
      console.error("Document analysis failed:", error);
      return false;
    }
  },

  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "Can you analyze this document?",
          attachments: [{ type: "pdf", url: "document.pdf" }],
        },
      },
      {
        user: "{{user2}}",
        content: {
          text: "I'll analyze that document for you",
          action: "ANALYZE_DOCUMENT",
        },
      },
    ],
  ],
};
```

### Creating Custom Actions

#### Basic Template
```typescript
const customAction: Action = {
  name: "CUSTOM_ACTION",
  similes: ["ALTERNATE_NAME", "OTHER_TRIGGER"],
  description: "Detailed description of when and how to use this action",
  validate: async (runtime: IAgentRuntime, message: Memory) => {
    // Validation logic
    return true;
  },
  handler: async (runtime: IAgentRuntime, message: Memory) => {
    // Implementation logic
    return true;
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: { text: "Trigger message" },
      },
      {
        user: "{{user2}}",
        content: { text: "Response", action: "CUSTOM_ACTION" },
      },
    ],
  ],
};
```

#### Advanced Action Example
```typescript
const complexAction: Action = {
  name: "PROCESS_DOCUMENT",
  similes: ["READ_DOCUMENT", "ANALYZE_DOCUMENT"],
  description: "Process and analyze uploaded documents",
  validate: async (runtime, message) => {
    const hasAttachment = message.content.attachments?.length > 0;
    const supportedTypes = ["pdf", "txt", "doc"];
    return (
      hasAttachment &&
      supportedTypes.includes(message.content.attachments[0].type)
    );
  },
  handler: async (runtime, message, state) => {
    const attachment = message.content.attachments[0];

    // Process document
    const content = await runtime
      .getService<IDocumentService>(ServiceType.DOCUMENT)
      .processDocument(attachment);

    // Store in memory
    await runtime.documentsManager.createMemory({
      id: generateId(),
      content: { text: content },
      userId: message.userId,
      roomId: message.roomId,
    });

    return true;
  },
};
```

### Best Practices

1. **Action Design**
   - Follow single responsibility principle
   - Define clear triggers
   - Establish clear success criteria
   - Implement robust validation
   - Handle edge cases gracefully

2. **Example Organization**
```typescript
examples: [
  // Happy path
  [basicUsageExample],
  // Edge cases
  [edgeCaseExample],
  // Error cases
  [errorCaseExample],
];
```

3. **Clear Context**
```typescript
examples: [
  [
    {
      user: "{{user1}}",
      content: {
        text: "Context message showing why action is needed",
      },
    },
    {
      user: "{{user2}}",
      content: {
        text: "Clear response demonstrating action usage",
        action: "ACTION_NAME",
      },
    },
  ],
];
```

### Troubleshooting

1. **Action Not Triggering**
   - Check validation logic
   - Verify similes list
   - Review example patterns

2. **Handler Failures**
   - Validate service availability
   - Check state requirements
   - Review error logs

3. **State Inconsistencies**
   - Verify state updates
   - Check concurrent modifications
   - Review state transitions

### Testing Actions

```typescript
test("Validate action behavior", async () => {
  const message: Memory = {
    userId: user.id,
    content: { text: "Test message" },
    roomId,
  };

  const response = await handleMessage(runtime, message);
  // Verify response
});
```

## Evaluators

Evaluators are core components that assess and extract information from conversations. They integrate with the AgentRuntime's evaluation system to build long-term memory, track goal progress, extract facts and insights, and maintain contextual awareness.

### Core Structure

```typescript
interface Evaluator {
  name: string;
  similes: string[];
  description: string;
  validate: (runtime: IAgentRuntime, message: Memory) => Promise<boolean>;
  handler: (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: any,
  ) => Promise<any>;
  examples: EvaluatorExample[];
}
```

### Built-in Evaluators

#### Fact Evaluator
```typescript
interface Fact {
  claim: string;
  type: "fact" | "opinion" | "status";
  in_bio: boolean;
  already_known: boolean;
}

// Example fact
{
  "claim": "User completed marathon training",
  "type": "fact",
  "in_bio": false,
  "already_known": false
}
```

#### Goal Evaluator
```typescript
interface Goal {
  id: string;
  name: string;
  status: "IN_PROGRESS" | "DONE" | "FAILED";
  objectives: Objective[];
}

interface Objective {
  description: string;
  completed: boolean;
}
```

### Quick Start Example

```typescript
import { Evaluator, IAgentRuntime, Memory, State } from "@ai16z/eliza-core";

const evaluator: Evaluator = {
  name: "BASIC_EVALUATOR",
  similes: ["SIMPLE_EVALUATOR"],
  description: "Evaluates basic conversation elements",
  validate: async (runtime: IAgentRuntime, message: Memory) => true,
  handler: async (runtime: IAgentRuntime, message: Memory) => {
    // Evaluation logic here
    return result;
  },
  examples: [],
};
```

### Memory Integration Example

```typescript
try {
  const memory = await runtime.memoryManager.addEmbeddingToMemory({
    userId: user?.id,
    content: { text: evaluationResult },
    roomId: roomId,
    embedding: await embed(runtime, evaluationResult),
  });

  await runtime.memoryManager.createMemory(memory);
} catch (error) {
  console.error("Failed to store evaluation result:", error);
}
```

### Memory Usage Example

```typescript
const memoryEvaluator: Evaluator = {
  name: "MEMORY_EVAL",
  handler: async (runtime: IAgentRuntime, message: Memory) => {
    // Store in message memory
    await runtime.messageManager.createMemory({
      id: message.id,
      content: message.content,
      roomId: message.roomId,
      userId: message.userId,
      agentId: runtime.agentId,
    });

    // Store in description memory
    await runtime.descriptionManager.createMemory({
      id: message.id,
      content: { text: "User description" },
      roomId: message.roomId,
      userId: message.userId,
      agentId: runtime.agentId,
    });
  },
};
```

### Best Practices

#### Fact Extraction
- Validate facts before storage
- Avoid duplicate entries
- Include relevant context
- Properly categorize information types

#### Goal Tracking
- Define clear, measurable objectives
- Update only changed goals
- Handle failures gracefully
- Track partial progress

#### Validation
- Keep validation logic efficient
- Check prerequisites first
- Consider message content and state
- Use appropriate memory managers

#### Handler Implementation
- Use runtime services appropriately
- Store results in correct memory manager
- Handle errors gracefully
- Maintain state consistency

#### Examples
- Provide clear context descriptions
- Show typical trigger messages
- Document expected outcomes
- Cover edge cases

### Integration with Agent Runtime

```typescript
// Register evaluator
runtime.registerEvaluator(customEvaluator);

// Process evaluations
const results = await runtime.evaluate(message, state);
```

### Error Handling Example

```typescript
const robustEvaluator: Evaluator = {
  name: "ROBUST_EVAL",
  handler: async (runtime: IAgentRuntime, message: Memory) => {
    try {
      // Attempt evaluation
      await runtime.messageManager.createMemory({
        id: message.id,
        content: message.content,
        roomId: message.roomId,
        userId: message.userId,
        agentId: runtime.agentId,
      });
    } catch (error) {
      // Log error and handle gracefully
      console.error("Evaluation failed:", error);

      // Store error state if needed
      await runtime.messageManager.createMemory({
        id: message.id,
        content: { text: "Evaluation failed" },
        roomId: message.roomId,
        userId: message.userId,
        agentId: runtime.agentId,
      });
    }
  },
};
```

# Guides

## Configuration Guide

This guide covers how to configure Eliza for different use cases and environments.

### Environment Configuration

#### Basic Setup
```bash
# Create your environment configuration file
cp .env.example .env
```

#### Core Environment Variables
```bash
# Core API Keys
OPENAI_API_KEY=sk-your-key    # Required for OpenAI features
ANTHROPIC_API_KEY=your-key    # Required for Claude models
TOGETHER_API_KEY=your-key     # Required for Together.ai models

# Default Settings
XAI_MODEL=gpt-4o-mini        # Default model to use
X_SERVER_URL=                # Optional model API endpoint
```

#### Client-Specific Configuration

##### Discord Configuration
```bash
DISCORD_APPLICATION_ID=     # Your Discord app ID
DISCORD_API_TOKEN=         # Discord bot token
```

##### Twitter Configuration
```bash
TWITTER_USERNAME=          # Bot Twitter username
TWITTER_PASSWORD=          # Bot Twitter password
TWITTER_EMAIL=            # Twitter account email
TWITTER_DRY_RUN=false    # Test mode without posting
```

##### Telegram Configuration
```bash
TELEGRAM_BOT_TOKEN=       # Telegram bot token
```

#### Model Provider Settings
```bash
# OpenAI Settings
OPENAI_API_KEY=sk-*

# Anthropic Settings
ANTHROPIC_API_KEY=

# Together.ai Settings
TOGETHER_API_KEY=

# Heurist Settings
HEURIST_API_KEY=

# Livepeer Settings
LIVEPEER_GATEWAY_URL=

# Local Model Settings
XAI_MODEL=meta-llama/Llama-3.1-7b-instruct
```

### Character Configuration

#### Character File Structure
```json
{
    "name": "AgentName",
    "clients": ["discord", "twitter"],
    "modelProvider": "openai",
    "settings": {
        "secrets": {
            "OPENAI_API_KEY": "character-specific-key",
            "DISCORD_TOKEN": "bot-specific-token"
        }
    }
}
```

#### Loading Characters
```bash
# Load default character
pnpm start

# Load specific character
pnpm start --characters="characters/your-character.json"

# Load multiple characters
pnpm start --characters="characters/char1.json,characters/char2.json"
```

### Custom Actions

#### Adding Custom Actions
1. Create a `custom_actions` directory
2. Add your action files there
3. Configure in `elizaConfig.yaml`:

```yaml
actions:
    - name: myCustomAction
      path: ./custom_actions/myAction.ts
```

#### Action Configuration Structure
```typescript
export const myAction: Action = {
    name: "MY_ACTION",
    similes: ["SIMILAR_ACTION", "ALTERNATE_NAME"],
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        // Validation logic
        return true;
    },
    description: "Action description",
    handler: async (runtime: IAgentRuntime, message: Memory) => {
        // Action logic
        return true;
    },
};
```

### Provider Configuration

#### Database Providers
```typescript
// SQLite (Recommended for development)
import { SqliteDatabaseAdapter } from "@your-org/agent-framework/adapters";
const db = new SqliteDatabaseAdapter("./dev.db");

// PostgreSQL (Production)
import { PostgresDatabaseAdapter } from "@your-org/agent-framework/adapters";
const db = new PostgresDatabaseAdapter({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});
```

#### Model Providers
```json
{
    "modelProvider": "openai",
    "settings": {
        "model": "gpt-4o-mini",
        "temperature": 0.7,
        "maxTokens": 2000
    }
}
```

### Advanced Configuration

#### Runtime Settings
```typescript
const settings = {
    // Logging
    DEBUG: "eliza:*",
    LOG_LEVEL: "info",

    // Performance
    MAX_CONCURRENT_REQUESTS: 5,
    REQUEST_TIMEOUT: 30000,

    // Memory
    MEMORY_TTL: 3600,
    MAX_MEMORY_ITEMS: 1000,
};
```

#### Plugin Configuration
```yaml
plugins:
    - name: solana
      enabled: true
      settings:
          network: mainnet-beta
          endpoint: https://api.mainnet-beta.solana.com

    - name: image-generation
      enabled: true
      settings:
          provider: dalle
          size: 1024x1024
```

### Configuration Best Practices

1. **Environment Segregation**
   - Use different `.env` files for different environments
   - Follow naming convention: `.env.development`, `.env.staging`, `.env.production`

2. **Secret Management**
   - Never commit secrets to version control
   - Use secret management services in production
   - Rotate API keys regularly

3. **Character Configuration**
   - Keep character files modular and focused
   - Use inheritance for shared traits
   - Document character behaviors

4. **Plugin Management**
   - Enable only needed plugins
   - Configure plugin-specific settings in separate files
   - Monitor plugin performance

5. **Database Configuration**
   - Use SQLite for development
   - Configure connection pooling for production
   - Set up proper indexes

### Troubleshooting

#### Common Issues

1. **Environment Variables Not Loading**
```bash
# Check .env file location
node -e "console.log(require('path').resolve('.env'))"
# Verify environment variables
node -e "console.log(process.env)"
```

2. **Character Loading Failures**
```bash
# Validate character file
npx ajv validate -s character-schema.json -d your-character.json
```

3. **Database Connection Issues**
```bash
# Test database connection
npx ts-node scripts/test-db-connection.ts
```

#### Configuration Validation
```bash
# Use the built-in config validator
pnpm run validate-config
```

This will check:
- Environment variables
- Character files
- Database configuration
- Plugin settings

## Advanced Usage Guide

This guide covers advanced features and capabilities of Eliza, including complex integrations, custom services, and specialized plugins.

### Service Integration

#### Video Processing Service
```typescript
import { VideoService } from "@elizaos/core/plugin-node";

// Initialize service
const videoService = new VideoService();

// Process video content
const result = await videoService.processVideo(url, runtime);
```

Key features:
- Automatic video downloading
- Transcription support
- Subtitle extraction
- Cache management
- Queue processing

#### Image Processing
```typescript
import { ImageDescriptionService } from "@elizaos/core/plugin-node";

const imageService = new ImageDescriptionService();
const description = await imageService.describeImage(imageUrl, "gpu", runtime);
```

Features:
- Local and cloud processing options
- CUDA acceleration support
- Automatic format handling
- GIF frame extraction

### Blockchain Integration

#### Solana Integration
```typescript
import { solanaPlugin } from "@elizaos/core/plugin-solana";

// Initialize plugin
runtime.registerPlugin(solanaPlugin);

// Token Operations
const swapResult = await swapToken(
    connection,
    walletPublicKey,
    inputTokenCA,
    outputTokenCA,
    amount,
);

// Sell tokens
const sellResult = await sellToken({
    sdk,
    seller: walletKeypair,
    mint: tokenMint,
    amount: sellAmount,
    priorityFee,
    allowOffCurve: false,
    slippage: "1",
    connection,
});
```

#### Trust Score System
```typescript
const trustScoreManager = new TrustScoreManager(tokenProvider, trustScoreDb);

// Generate trust scores
const score = await trustScoreManager.generateTrustScore(
    tokenAddress,
    recommenderId,
    recommenderWallet,
);

// Monitor trade performance
await trustScoreManager.createTradePerformance(runtime, tokenAddress, userId, {
    buy_amount: amount,
    is_simulation: false,
});
```

### Custom Services

#### Speech Generation
```typescript
class SpeechService extends Service implements ISpeechService {
    async generate(runtime: IAgentRuntime, text: string): Promise<Readable> {
        if (runtime.getSetting("ELEVENLABS_XI_API_KEY")) {
            return textToSpeech(runtime, text);
        }

        const { audio } = await synthesize(text, {
            engine: "vits",
            voice: "en_US-hfc_female-medium",
        });

        return Readable.from(audio);
    }
}
```

#### PDF Processing
```typescript
class PdfService extends Service {
    async convertPdfToText(pdfBuffer: Buffer): Promise<string> {
        const pdf = await getDocument({ data: pdfBuffer }).promise;
        const numPages = pdf.numPages;
        const textPages = [];

        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();
            const pageText = textContent.items
                .filter(isTextItem)
                .map((item) => item.str)
                .join(" ");
            textPages.push(pageText);
        }

        return textPages.join("\n");
    }
}
```

### Advanced Memory Management

#### Retrievable Memory System
```typescript
class MemoryManager {
    async getMemories({
        agentId,
        roomId,
        count,
    }: {
        agentId: string;
        roomId: string;
        count: number;
    }): Promise<Memory[]> {
        // Implement memory retrieval logic
    }

    async createMemory(
        memory: Memory,
        allowDuplicates: boolean = false,
    ): Promise<void> {
        // Implement memory storage logic
    }
}
```

#### Trust Score Database
```typescript
class TrustScoreDatabase {
    async calculateValidationTrust(tokenAddress: string): number {
        const sql = `
      SELECT rm.trust_score
      FROM token_recommendations tr
      JOIN recommender_metrics rm ON tr.recommender_id = rm.recommender_id
      WHERE tr.token_address = ?;
    `;

        const rows = this.db.prepare(sql).all(tokenAddress);
        if (rows.length === 0) return 0;

        const totalTrust = rows.reduce((acc, row) => acc + row.trust_score, 0);
        return totalTrust / rows.length;
    }
}
```

### Plugin Development

#### Creating Custom Plugins
```typescript
const customPlugin: Plugin = {
    name: "custom-plugin",
    description: "Custom Plugin for Eliza",
    actions: [
        // Custom actions
    ],
    evaluators: [
        // Custom evaluators
    ],
    providers: [
        // Custom providers
    ],
};
```

#### Advanced Action Development
```typescript
export const complexAction: Action = {
    name: "COMPLEX_ACTION",
    similes: ["ALTERNATIVE_NAME", "OTHER_NAME"],
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        // Implement validation logic
        return true;
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        options: { [key: string]: unknown },
        callback?: HandlerCallback,
    ): Promise<boolean> => {
        // Implement complex handling logic
        return true;
    },
};
```

### Advanced Configuration

#### Custom Runtime Configuration
```typescript
const customRuntime = new AgentRuntime({
    databaseAdapter: new PostgresDatabaseAdapter(config),
    modelProvider: new OpenAIProvider(apiKey),
    plugins: [solanaPlugin, customPlugin],
    services: [
        new VideoService(),
        new ImageDescriptionService(),
        new SpeechService(),
    ],
});
```

#### Advanced Model Configuration
```typescript
const modelConfig = {
    modelClass: ModelClass.LARGE,
    temperature: 0.7,
    maxTokens: 2000,
    topP: 0.9,
    frequencyPenalty: 0.5,
    presencePenalty: 0.5,
};

const response = await generateText({
    runtime,
    context: prompt,
    ...modelConfig,
});
```

### Performance Optimization

#### Caching Strategy
```typescript
class CacheManager {
    private cache: NodeCache;
    private cacheDir: string;

    constructor() {
        this.cache = new NodeCache({ stdTTL: 300 });
        this.cacheDir = path.join(__dirname, "cache");
        this.ensureCacheDirectoryExists();
    }

    private async getCachedData<T>(key: string): Promise<T | null> {
        // Implement tiered caching strategy
    }
}
```

#### Queue Management
```typescript
class QueueManager {
    private queue: string[] = [];
    private processing: boolean = false;

    async processQueue(): Promise<void> {
        if (this.processing || this.queue.length === 0) {
            return;
        }

        this.processing = true;
        while (this.queue.length > 0) {
            const item = this.queue.shift();
            await this.processItem(item);
        }
        this.processing = false;
    }
}
```

### Best Practices

#### Error Handling
```typescript
try {
    const result = await complexOperation();
    if (!result) {
        throw new Error("Operation failed");
    }
    return result;
} catch (error) {
    console.error("Error in operation:", error);
    await errorReporting.log(error);
    throw new OperationalError("Failed to complete operation", {
        cause: error,
    });
}
```

#### Resource Management
```typescript
class ResourceManager {
    private resources: Map<string, Resource> = new Map();

    async acquire(id: string): Promise<Resource> {
        // Implement resource acquisition with timeout
    }

    async release(id: string): Promise<void> {
        // Implement resource cleanup
    }
}
```

### Troubleshooting

#### Common Issues
1. **Memory Leaks**
   - Monitor memory usage
   - Implement proper cleanup
   - Use WeakMap for caching

2. **Performance Bottlenecks**
   - Profile slow operations
   - Implement batching
   - Use connection pooling

3. **Integration Issues**
   - Verify API credentials
   - Check network connectivity
   - Validate request formatting

#### Debugging
```typescript
const debug = require("debug")("eliza:advanced");

debug("Detailed operation info: %O", {
    operation: "complexOperation",
    parameters: params,
    result: result,
});
```

## Secrets Management

A comprehensive guide for managing secrets, API keys, and sensitive configuration in Eliza.

### Core Concepts

#### Environment Variables

Eliza uses a hierarchical environment variable system:
1. Character-specific namespaced environment variables (highest priority)
2. Character-specific secrets
3. Environment variables
4. Default values (lowest priority)

#### Secret Types
```bash
# API Keys
OPENAI_API_KEY=sk-*
ANTHROPIC_API_KEY=your-key
ELEVENLABS_XI_API_KEY=your-key
GOOGLE_GENERATIVE_AI_API_KEY=your-key

# Client Authentication
DISCORD_API_TOKEN=your-token
TELEGRAM_BOT_TOKEN=your-token

# Database Credentials
SUPABASE_URL=your-url
SUPABASE_SERVICE_API_KEY=your-key

# EVM
EVM_PRIVATE_KEY=EXAMPLE_WALLET_PRIVATE_KEY

# Solana
SOLANA_PRIVATE_KEY=EXAMPLE_WALLET_PRIVATE_KEY
SOLANA_PUBLIC_KEY=EXAMPLE_WALLET_PUBLIC_KEY

# Fallback Wallet Configuration (deprecated)
WALLET_PRIVATE_KEY=EXAMPLE_WALLET_PRIVATE_KEY
WALLET_PUBLIC_KEY=EXAMPLE_WALLET_PUBLIC_KEY
```

### Implementation Guide

#### Basic Setup
```typescript
import { config } from "dotenv";
import path from "path";

export function findNearestEnvFile(startDir = process.cwd()) {
  let currentDir = startDir;

  while (currentDir !== path.parse(currentDir).root) {
    const envPath = path.join(currentDir, ".env");

    if (fs.existsSync(envPath)) {
      return envPath;
    }

    currentDir = path.dirname(currentDir);
  }

  return null;
}
```

#### Character-Specific Secrets
```json
{
  "name": "TradingBot",
  "settings": {
    "secrets": {
      "OPENAI_API_KEY": "character-specific-key",
      "WALLET_PRIVATE_KEY": "character-specific-wallet"
    }
  }
}
```

Access secrets in code:
```typescript
const apiKey = runtime.getSetting("OPENAI_API_KEY");
```

#### Secure Storage

##### Database Secrets
```typescript
class SecureDatabase {
  private connection: Connection;

  constructor(encryptedConfig: string) {
    const config = this.decryptConfig(encryptedConfig);
    this.connection = new Connection(config);
  }

  private decryptConfig(encrypted: string): DatabaseConfig {
    // Implement decryption logic
    return JSON.parse(decrypted);
  }
}
```

##### Wallet Management
```typescript
class WalletManager {
  private async initializeWallet(runtime: IAgentRuntime) {
    const privateKey =
      runtime.getSetting("SOLANA_PRIVATE_KEY") ??
      runtime.getSetting("WALLET_PRIVATE_KEY");

    if (!privateKey) {
      throw new Error("Wallet private key not configured");
    }

    // Validate key format
    try {
      const keyBuffer = Buffer.from(privateKey, "base64");
      if (keyBuffer.length !== 64) {
        throw new Error("Invalid key length");
      }
    } catch (error) {
      throw new Error("Invalid private key format");
    }

    // Initialize wallet securely
    return new Wallet(privateKey);
  }
}
```

#### Secret Rotation
```typescript
class SecretRotation {
  private static readonly SECRET_LIFETIME = 90 * 24 * 60 * 60 * 1000; // 90 days

  async shouldRotateSecret(secretName: string): Promise<boolean> {
    const lastRotation = await this.getLastRotation(secretName);
    return Date.now() - lastRotation > SecretRotation.SECRET_LIFETIME;
  }

  async rotateSecret(secretName: string): Promise<void> {
    // Implement rotation logic
    const newSecret = await this.generateNewSecret();
    await this.updateSecret(secretName, newSecret);
    await this.recordRotation(secretName);
  }
}
```

#### Access Control
```typescript
class SecretAccess {
  private static readonly ALLOWED_KEYS = [
    "OPENAI_API_KEY",
    "DISCORD_TOKEN",
    // ... other allowed keys
  ];

  static validateAccess(key: string): boolean {
    return this.ALLOWED_KEYS.includes(key);
  }

  static async getSecret(
    runtime: IAgentRuntime,
    key: string,
  ): Promise<string | null> {
    if (!this.validateAccess(key)) {
      throw new Error(`Unauthorized access to secret: ${key}`);
    }

    return runtime.getSetting(key);
  }
}
```

#### Encryption at Rest
```typescript
import { createCipheriv, createDecipheriv } from "crypto";

class SecretEncryption {
  static async encrypt(value: string, key: Buffer): Promise<string> {
    const iv = crypto.randomBytes(16);
    const cipher = createCipheriv("aes-256-gcm", key, iv);

    let encrypted = cipher.update(value, "utf8", "hex");
    encrypted += cipher.final("hex");

    return JSON.stringify({
      iv: iv.toString("hex"),
      encrypted,
      tag: cipher.getAuthTag().toString("hex"),
    });
  }

  static async decrypt(encrypted: string, key: Buffer): Promise<string> {
    const { iv, encrypted: encryptedData, tag } = JSON.parse(encrypted);

    const decipher = createDecipheriv(
      "aes-256-gcm",
      key,
      Buffer.from(iv, "hex"),
    );

    decipher.setAuthTag(Buffer.from(tag, "hex"));

    let decrypted = decipher.update(encryptedData, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  }
}
```

### Best Practices

#### 1. Environment Segregation
Maintain separate environment files:
```bash
.env.development    # Local development settings
.env.staging       # Staging environment
.env.production    # Production settings
```

#### 2. Git Security
Exclude sensitive files:
```gitignore
# .gitignore
.env
.env.*
characters/**/secrets.json
**/serviceAccount.json
```

#### 3. Secret Validation
```typescript
async function validateSecrets(character: Character): Promise<void> {
  const required = ["OPENAI_API_KEY"];
  const missing = required.filter((key) => !character.settings.secrets[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required secrets: ${missing.join(", ")}`);
  }
}
```

#### 4. Error Handling
```typescript
try {
  await loadSecrets();
} catch (error) {
  if (error.code === "ENOENT") {
    console.error("Environment file not found");
  } else if (error instanceof ValidationError) {
    console.error("Invalid secret format");
  } else {
    // Log securely without exposing secret values
    console.error("Error loading secrets");
  }
}
```

### Security Considerations

#### 1. Handling API Keys
```typescript
class APIKeyManager {
  private validateAPIKey(key: string): boolean {
    if (key.startsWith("sk-")) {
      return key.length > 20;
    }
    return false;
  }

  async rotateAPIKey(provider: string): Promise<void> {
    // Implement key rotation logic
  }
}
```

#### 2. Secure Configuration Loading
```typescript
class ConfigLoader {
  private static sanitizePath(path: string): boolean {
    return !path.includes("../") && !path.startsWith("/");
  }

  async loadConfig(path: string): Promise<Config> {
    if (!this.sanitizePath(path)) {
      throw new Error("Invalid config path");
    }
    // Load configuration
  }
}
```

#### 3. Memory Security
```typescript
class SecureMemory {
  private secrets: Map<string, WeakRef<string>> = new Map();

  set(key: string, value: string): void {
    this.secrets.set(key, new WeakRef(value));
  }

  get(key: string): string | null {
    const ref = this.secrets.get(key);
    return ref?.deref() ?? null;
  }
}
```

### Troubleshooting

#### Common Issues

1. Missing Secrets
```typescript
if (!process.env.OPENAI_API_KEY) {
  throw new Error(
    "OpenAI API key not found in environment or character settings",
  );
}
```

2. Invalid Secret Format
```typescript
function validateApiKey(key: string): boolean {
  // OpenAI keys start with 'sk-'
  if (key.startsWith("sk-")) {
    return key.length > 20;
  }
  return false;
}
```

3. Secret Loading Errors
```typescript
try {
  await loadSecrets();
} catch (error) {
  if (error.response) {
    console.error("Response data:", error.response.data);
    console.error("Response status:", error.response.status);
  } else if (error.request) {
    console.error("No response received:", error.request);
  } else {
    console.error("Error setting up request:", error.message);
  }
}
```

[Rest of the documentation remains unchanged...]

# Advanced Topics

These topics cover more specialized and advanced features of Eliza that may not be necessary for basic usage but provide additional capabilities for specific use cases.

## Fine-tuning

Eliza supports multiple AI model providers and offers extensive configuration options for fine-tuning model behavior, embedding generation, and performance optimization.

### Model Providers

Eliza supports multiple model providers through a flexible configuration system:

```typescript
enum ModelProviderName {
  OPENAI,
  ANTHROPIC,
  CLAUDE_VERTEX,
  GROK,
  GROQ,
  LLAMACLOUD,
  LLAMALOCAL,
  GOOGLE,
  REDPILL,
  OPENROUTER,
  HEURIST,
}
```

#### Provider Configuration
```typescript
const models = {
  [ModelProviderName.ANTHROPIC]: {
    settings: {
      stop: [],
      maxInputTokens: 200000,
      maxOutputTokens: 8192,
      frequency_penalty: 0.0,
      presence_penalty: 0.0,
      temperature: 0.3,
    },
    endpoint: "https://api.anthropic.com/v1",
    model: {
      [ModelClass.SMALL]: "claude-3-5-haiku",
      [ModelClass.MEDIUM]: "claude-3-5-sonnet-20241022",
      [ModelClass.LARGE]: "claude-3-5-opus-20240229",
    },
  },
  // ... other providers
};
```

### Model Classes

Models are categorized into different classes based on their capabilities:

```typescript
enum ModelClass {
    SMALL,     // Fast, efficient for simple tasks
    MEDIUM,    // Balanced performance and capability
    LARGE,     // Most capable but slower/more expensive
    EMBEDDING, // Specialized for vector embeddings
    IMAGE      // Image generation capabilities
}
```

### Embedding System

#### Configuration
```typescript
const embeddingConfig = {
  dimensions: 1536,
  modelName: "text-embedding-3-small",
  cacheEnabled: true,
};
```

#### Implementation
```typescript
async function embed(runtime: IAgentRuntime, input: string): Promise<number[]> {
  // Check cache first
  const cachedEmbedding = await retrieveCachedEmbedding(runtime, input);
  if (cachedEmbedding) return cachedEmbedding;

  // Generate new embedding
  const response = await runtime.fetch(
    `${runtime.modelProvider.endpoint}/embeddings`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${runtime.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input,
        model: runtime.modelProvider.model.EMBEDDING,
        dimensions: 1536,
      }),
    },
  );

  const data = await response.json();
  return data?.data?.[0].embedding;
}
```

### Fine-tuning Options

#### Temperature Control
```typescript
const temperatureSettings = {
  creative: {
    temperature: 0.8,
    frequency_penalty: 0.7,
    presence_penalty: 0.7,
  },
  balanced: {
    temperature: 0.5,
    frequency_penalty: 0.3,
    presence_penalty: 0.3,
  },
  precise: {
    temperature: 0.2,
    frequency_penalty: 0.0,
    presence_penalty: 0.0,
  },
};
```

#### Context Window
```typescript
const contextSettings = {
  OPENAI: {
    maxInputTokens: 128000,
    maxOutputTokens: 8192,
  },
  ANTHROPIC: {
    maxInputTokens: 200000,
    maxOutputTokens: 8192,
  },
  LLAMALOCAL: {
    maxInputTokens: 32768,
    maxOutputTokens: 8192,
  },
};
```

### Provider-Specific Optimizations

#### OpenAI
```typescript
const openAISettings = {
  endpoint: "https://api.openai.com/v1",
  settings: {
    stop: [],
    maxInputTokens: 128000,
    maxOutputTokens: 8192,
    frequency_penalty: 0.0,
    presence_penalty: 0.0,
    temperature: 0.6,
  },
  model: {
    [ModelClass.SMALL]: "gpt-4o-mini",
    [ModelClass.MEDIUM]: "gpt-4o",
    [ModelClass.LARGE]: "gpt-4o",
    [ModelClass.EMBEDDING]: "text-embedding-3-small",
    [ModelClass.IMAGE]: "dall-e-3",
  },
};
```

#### Anthropic
```typescript
const anthropicSettings = {
  endpoint: "https://api.anthropic.com/v1",
  settings: {
    stop: [],
    maxInputTokens: 200000,
    maxOutputTokens: 8192,
    temperature: 0.3,
  },
  model: {
    [ModelClass.SMALL]: "claude-3-5-haiku",
    [ModelClass.MEDIUM]: "claude-3-5-sonnet-20241022",
    [ModelClass.LARGE]: "claude-3-5-opus-20240229",
  },
};
```

#### Local LLM
```typescript
const llamaLocalSettings = {
  settings: {
    stop: ["<|eot_id|>", "<|eom_id|>"],
    maxInputTokens: 32768,
    maxOutputTokens: 8192,
    repetition_penalty: 0.0,
    temperature: 0.3,
  },
  model: {
    [ModelClass.SMALL]: "NousResearch/Hermes-3-Llama-3.1-8B-GGUF",
    [ModelClass.MEDIUM]: "NousResearch/Hermes-3-Llama-3.1-8B-GGUF",
    [ModelClass.LARGE]: "NousResearch/Hermes-3-Llama-3.1-8B-GGUF",
    [ModelClass.EMBEDDING]: "togethercomputer/m2-bert-80M-32k-retrieval",
  },
};
```

### Testing and Validation

#### Embedding Tests
```typescript
async function validateEmbedding(
  embedding: number[],
  expectedDimensions: number = 1536,
): Promise<boolean> {
  if (!Array.isArray(embedding)) return false;
  if (embedding.length !== expectedDimensions) return false;
  if (embedding.some((n) => typeof n !== "number")) return false;
  return true;
}
```

#### Model Performance Testing
```typescript
async function benchmarkModel(
  runtime: IAgentRuntime,
  modelClass: ModelClass,
  testCases: TestCase[],
): Promise<BenchmarkResults> {
  const results = {
    latency: [],
    tokenUsage: [],
    accuracy: [],
  };

  for (const test of testCases) {
    const start = Date.now();
    const response = await runtime.generateText({
      context: test.input,
      modelClass,
    });
    results.latency.push(Date.now() - start);
    // ... additional metrics
  }

  return results;
}
```

### Best Practices

#### Model Selection Guidelines
1. **Task Complexity**
   - Use SMALL for simple, quick responses
   - Use MEDIUM for balanced performance
   - Use LARGE for complex reasoning

2. **Context Management**
   - Keep prompts concise and focused
   - Use context windows efficiently
   - Implement proper context truncation

3. **Temperature Adjustment**
   - Lower for factual responses
   - Higher for creative tasks
   - Balance based on use case

#### Performance Optimization
1. **Caching Strategy**
   - Cache embeddings for frequently accessed content
   - Implement tiered caching (memory/disk)
   - Regular cache cleanup

2. **Resource Management**
   - Monitor token usage
   - Implement rate limiting
   - Optimize batch processing

### Troubleshooting

#### Common Issues
1. **Token Limits**
```typescript
function handleTokenLimit(error: Error) {
  if (error.message.includes("token limit")) {
    return truncateAndRetry();
  }
}
```

2. **Embedding Errors**
```typescript
function handleEmbeddingError(error: Error) {
  if (error.message.includes("dimension mismatch")) {
    return regenerateEmbedding();
  }
}
```

3. **Model Availability**
```typescript
async function handleModelFailover(error: Error) {
  if (error.message.includes("model not available")) {
    return switchToFallbackModel();
  }
}
```

[Rest of the documentation remains unchanged...]

## Infrastructure

Eliza's infrastructure is built on a flexible database architecture that supports multiple adapters and efficient data storage mechanisms for AI agent interactions, memory management, and relationship tracking.

### Core Components

#### Database Adapters

Eliza supports multiple database backends through a pluggable adapter system:
- **PostgreSQL** - Full-featured adapter with vector search capabilities
- **SQLite** - Lightweight local database option
- **SQL.js** - In-memory database for testing and development
- **Supabase** - Cloud-hosted PostgreSQL with additional features

#### Schema Structure
```sql
- accounts: User and agent identities
- rooms: Conversation spaces
- memories: Vector-indexed message storage
- goals: Agent objectives and progress
- participants: Room membership tracking
- relationships: Inter-agent connections
```

### Setting Up Infrastructure

#### PostgreSQL Setup
```sql
-- Install PostgreSQL Extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create base tables
CREATE TABLE accounts (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT,
    "username" TEXT UNIQUE,
    "email" TEXT NOT NULL UNIQUE,
    "avatarUrl" TEXT,
    "details" JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE rooms (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE memories (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "content" JSONB NOT NULL,
    "embedding" vector(1536),
    "userId" UUID REFERENCES accounts("id"),
    "agentId" UUID REFERENCES accounts("id"),
    "roomId" UUID REFERENCES rooms("id"),
    "isUnique" BOOLEAN DEFAULT true NOT NULL
);

CREATE TABLE participants (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId" UUID REFERENCES accounts("id"),
    "roomId" UUID REFERENCES rooms("id"),
    "joinedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Set Up Indexes
CREATE INDEX idx_memories_embedding ON memories
    USING hnsw ("embedding" vector_cosine_ops);

CREATE INDEX idx_memories_type_room ON memories("type", "roomId");

CREATE INDEX idx_participants_user ON participants("userId");
CREATE INDEX idx_participants_room ON participants("roomId");
```

#### Connection Configuration
```typescript
// PostgreSQL Configuration
const postgresConfig = {
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

// Supabase Configuration
const supabaseConfig = {
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_KEY,
};
```

### Memory Management

#### Vector Storage
```typescript
async function storeMemory(runtime: IAgentRuntime, content: string) {
  const embedding = await runtime.embed(content);

  await runtime.databaseAdapter.createMemory({
    type: "message",
    content: { text: content },
    embedding,
    roomId: roomId,
    userId: userId,
  });
}
```

#### Memory Retrieval
```typescript
async function searchMemories(runtime: IAgentRuntime, query: string) {
  const embedding = await runtime.embed(query);

  return runtime.databaseAdapter.searchMemoriesByEmbedding(embedding, {
    match_threshold: 0.8,
    count: 10,
    tableName: "memories",
  });
}
```

### Scaling Considerations

#### Database Optimization
1. **Index Management**
   - Use HNSW indexes for vector similarity search
   - Create appropriate indexes for frequent query patterns
   - Regularly analyze and update index statistics

2. **Connection Pooling**
```typescript
const pool = new Pool({
  max: 20, // Maximum pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

3. **Query Optimization**
   - Use prepared statements
   - Implement efficient pagination
   - Optimize vector similarity searches

#### High Availability
1. **Database Replication**
   - Set up read replicas for scaling read operations
   - Configure streaming replication for failover
   - Implement connection retry logic

2. **Backup Strategy**
```bash
# Regular backups
pg_dump -Fc mydb > backup.dump
# Point-in-time recovery
pg_basebackup -D backup -Fp -Xs -P
```

### Security

#### Access Control
```sql
-- Row Level Security
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "memories_isolation" ON memories
    USING (auth.uid() = "userId" OR auth.uid() = "agentId");

-- Role Management
CREATE ROLE app_user;
GRANT SELECT, INSERT ON memories TO app_user;
GRANT USAGE ON SCHEMA public TO app_user;
```

#### Data Protection
1. **Encryption**
   - Use TLS for connections
   - Encrypt sensitive data at rest
   - Implement key rotation

2. **Audit Logging**
```sql
CREATE TABLE logs (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "userId" UUID NOT NULL REFERENCES accounts("id"),
    "body" JSONB NOT NULL,
    "type" TEXT NOT NULL,
    "roomId" UUID NOT NULL REFERENCES rooms("id")
);
```

### Monitoring

#### Health Checks
```typescript
async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await db.query("SELECT 1");
    return true;
  } catch (error) {
    console.error("Database health check failed:", error);
    return false;
  }
}
```

#### Performance Metrics
Track key metrics:
- Query performance
- Connection pool utilization
- Memory usage
- Vector search latency

### Maintenance

#### Regular Tasks
```sql
-- Regular vacuum
VACUUM ANALYZE memories;

-- Analyze statistics
ANALYZE memories;

-- Reindex vector similarity index
REINDEX INDEX idx_memories_embedding;
```

#### Data Lifecycle
```typescript
async function cleanupOldMemories() {
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - 6);

  await db.query(
    `
        DELETE FROM memories 
        WHERE "createdAt" < $1
    `,
    [cutoffDate],
  );
}
```

### Troubleshooting

#### Common Issues
1. **Connection Problems**
   - Check connection pool settings
   - Verify network connectivity
   - Review firewall rules

2. **Performance Issues**
   - Analyze query plans
   - Check index usage
   - Monitor resource utilization

3. **Vector Search Problems**
   - Verify embedding dimensions
   - Check similarity thresholds
   - Review index configuration

#### Diagnostic Queries
```sql
-- Check connection status
SELECT * FROM pg_stat_activity;

-- Analyze query performance
EXPLAIN ANALYZE
SELECT * FROM memories
WHERE embedding <-> $1 < 0.3
LIMIT 10;

-- Monitor index usage
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes;
```

[Rest of the documentation remains unchanged...]

# Packages

## Core Components

The Eliza framework is built on a modular architecture with the following core packages:

- **@elizaos/core**: Central framework and shared functionality
- **@elizaos/agent**: Agent runtime and management
- **@elizaos/adapters**: Database implementations (PostgreSQL, SQLite, etc.)
- **@elizaos/clients**: Platform integrations (Discord, Telegram, etc.)
- **@elizaos/plugins**: Extension modules for additional functionality

## Package Architecture

The framework is organized into five main components:

1. **Core Package**
   - Provides fundamental building blocks
   - Handles shared types and interfaces
   - Manages core utilities and helpers
   - Implements base functionality

2. **Agent Package**
   - Manages agent lifecycle
   - Handles runtime environment
   - Controls agent state
   - Processes agent interactions

3. **Adapters**
   - Enables different storage backends
   - Implements database connections
   - Handles data persistence
   - Manages memory systems

4. **Clients**
   - Connects to various platforms
   - Handles message formatting
   - Manages platform-specific features
   - Implements communication protocols

5. **Plugins**
   - Adds specialized capabilities
   - Extends core functionality
   - Provides custom features
   - Enables third-party integrations

## Getting Started

```bash
# Install core package
pnpm add @elizaos/core

# Install specific adapters
pnpm add @elizaos/adapter-postgres
pnpm add @elizaos/adapter-sqlite

# Install clients
pnpm add @elizaos/client-discord
pnpm add @elizaos/client-telegram
```

## Package Dependencies

Each package serves a specific purpose and may depend on others:

```
@elizaos/core
├── Base types
├── Shared utilities
└── Core interfaces

@elizaos/agent
├── Depends on @elizaos/core
├── Runtime implementation
└── Agent management

@elizaos/adapters
├── Depends on @elizaos/core
├── Database implementations
└── Storage management

@elizaos/clients
├── Depends on @elizaos/core
├── Platform integrations
└── Communication handlers

@elizaos/plugins
├── Depends on @elizaos/core
├── Optional features
└── Extensions
```

This modular architecture allows for:
- Independent package development
- Flexible deployment options
- Easy maintenance and updates
- Custom implementation support
- Scalable feature additions

[Rest of the documentation remains unchanged...]

## Core Package

The Core Package (`@elizaos/core`) provides the fundamental building blocks of Eliza's architecture, handling essential functionalities like memory management, message processing, runtime environment, action systems, provider integration, and service infrastructure.

### Installation
```bash
pnpm add @elizaos/core
```

### Key Components

#### AgentRuntime
The AgentRuntime class serves as the central nervous system of Eliza, orchestrating all major components:

```typescript
import { AgentRuntime } from "@elizaos/core";

const runtime = new AgentRuntime({
    // Core configuration
    databaseAdapter,
    token,
    modelProvider: ModelProviderName.OPENAI,
    character,

    // Extension points
    plugins: [bootstrapPlugin, nodePlugin],
    providers: [],
    actions: [],
    services: [],
    managers: [],

    // Optional settings
    conversationLength: 32,
    agentId: customId,
    fetch: customFetch,
});
```

Key capabilities:
- State composition and management
- Plugin and service registration
- Memory and relationship management
- Action processing and evaluation
- Message generation and handling

#### Memory System
The MemoryManager handles persistent storage and retrieval of context-aware information:

```typescript
class MemoryManager implements IMemoryManager {
    runtime: IAgentRuntime;
    tableName: string;

    // Create new memories with embeddings
    async createMemory(memory: Memory, unique = false): Promise<void> {
        if (!memory.embedding) {
            memory.embedding = await embed(this.runtime, memory.content.text);
        }

        await this.runtime.databaseAdapter.createMemory(
            memory,
            this.tableName,
            unique,
        );
    }

    // Semantic search with embeddings
    async searchMemoriesByEmbedding(
        embedding: number[],
        opts: {
            match_threshold?: number;
            count?: number;
            roomId: UUID;
            unique?: boolean;
        },
    ): Promise<Memory[]> {
        return this.runtime.databaseAdapter.searchMemories({
            tableName: this.tableName,
            roomId: opts.roomId,
            embedding,
            match_threshold: opts.match_threshold ?? 0.8,
            match_count: opts.count ?? 10,
            unique: opts.unique ?? false,
        });
    }
}
```

#### Context System
The context system manages state composition and template handling:

```typescript
// Template composition
export const composeContext = ({
    state,
    template,
}: {
    state: State;
    template: string;
}): string => {
    return template.replace(/{{\w+}}/g, (match) => {
        const key = match.replace(/{{|}}/g, "");
        return state[key] ?? "";
    });
};

// Header handling
export const addHeader = (header: string, body: string): string => {
    return body.length > 0 ? `${header ? header + "\n" : header}${body}\n` : "";
};
```

#### Action System
Actions define the available behaviors and responses:

```typescript
interface Action {
    name: string;
    similes: string[];
    description: string;
    examples: MessageExample[][];

    validate: (
        runtime: IAgentRuntime,
        message: Memory,
        state?: State,
    ) => Promise<boolean>;

    handler: (
        runtime: IAgentRuntime,
        message: Memory,
        state?: State,
        options?: any,
        callback?: HandlerCallback,
    ) => Promise<void>;
}
```

#### Evaluation System
Evaluators assess messages and guide agent behavior:

```typescript
interface Evaluator {
    name: string;
    similes: string[];
    alwaysRun?: boolean;

    validate: (
        runtime: IAgentRuntime,
        message: Memory,
        state?: State,
    ) => Promise<boolean>;

    handler: (runtime: IAgentRuntime, message: Memory) => Promise<void>;
}
```

#### State Management
The state system maintains conversation context and agent knowledge:

```typescript
interface State {
    // Agent identity
    agentId: UUID;
    agentName: string;
    bio: string;
    lore: string;
    adjective?: string;

    // Conversation context
    senderName?: string;
    actors: string;
    actorsData: Actor[];
    recentMessages: string;
    recentMessagesData: Memory[];

    // Objectives
    goals: string;
    goalsData: Goal[];

    // Behavioral guidance
    actions: string;
    actionNames: string;
    evaluators: string;
    evaluatorNames: string;

    // Additional context
    providers: string;
    attachments: string;
    characterPostExamples?: string;
    characterMessageExamples?: string;
}
```

### Service Architecture
The core implements a service-based architecture:

```typescript
// Service base class
class Service {
    static serviceType: ServiceType;

    async initialize(
        device: string | null,
        runtime: IAgentRuntime,
    ): Promise<void>;
}

// Service registry
class ServiceRegistry {
    private services = new Map<ServiceType, Service>();

    registerService(service: Service): void {
        const type = (service as typeof Service).serviceType;
        if (this.services.has(type)) {
            console.warn(`Service ${type} already registered`);
            return;
        }
        this.services.set(type, service);
    }

    getService<T>(type: ServiceType): T | null {
        return (this.services.get(type) as T) || null;
    }
}
```

### Best Practices

#### Memory Management
```typescript
// Use unique flags for important memories
await memoryManager.createMemory(memory, true);

// Search with appropriate thresholds
const similar = await memoryManager.searchMemoriesByEmbedding(embedding, {
    match_threshold: 0.8,
    count: 10,
});

// Clean up old memories periodically
await memoryManager.removeAllMemories(roomId, tableName);
```

#### State Composition
```typescript
// Compose full state
const state = await runtime.composeState(message, {
    additionalContext: "Custom context",
});

// Update with recent messages
const updatedState = await runtime.updateRecentMessageState(state);

// Add custom providers
state.providers = addHeader(
    "# Additional Information",
    await Promise.all(providers.map((p) => p.get(runtime, message))).join("\n"),
);
```

#### Service Management
```typescript
// Service initialization
class CustomService extends Service {
    static serviceType = ServiceType.CUSTOM;

    async initialize(device: string | null, runtime: IAgentRuntime) {
        await this.setupDependencies();
        await this.validateConfig();
        await this.connect();
    }

    async cleanup() {
        await this.disconnect();
        await this.clearResources();
    }
}

// Service registration
runtime.registerService(new CustomService());

// Service usage
const service = runtime.getService<CustomService>(ServiceType.CUSTOM);
```

### Error Handling
Implement proper error handling throughout:

```typescript
try {
    await runtime.processActions(message, responses, state);
} catch (error) {
    if (error instanceof TokenError) {
        await this.refreshToken();
    } else if (error instanceof DatabaseError) {
        await this.reconnectDatabase();
    } else {
        console.error("Unexpected error:", error);
        throw error;
    }
}
```

### Advanced Features

#### Custom Memory Types
```typescript
// Create specialized memory managers
class DocumentMemoryManager extends MemoryManager {
    constructor(runtime: IAgentRuntime) {
        super({
            runtime,
            tableName: "documents",
            useCache: true,
        });
    }

    async processDocument(doc: Document): Promise<void> {
        const chunks = await splitChunks(doc.content);

        for (const chunk of chunks) {
            await this.createMemory({
                content: { text: chunk },
                metadata: {
                    documentId: doc.id,
                    section: chunk.section,
                },
            });
        }
    }
}
```

#### Enhanced Embeddings
```typescript
// Advanced embedding handling
async function enhancedEmbed(
    runtime: IAgentRuntime,
    text: string,
    opts: {
        model?: string;
        dimensions?: number;
        pooling?: "mean" | "max";
    },
): Promise<number[]> {
    // Get cached embedding if available
    const cached = await runtime.databaseAdapter.getCachedEmbeddings({
        query_input: text,
        query_threshold: 0.95,
    });

    if (cached.length > 0) {
        return cached[0].embedding;
    }

    // Generate new embedding
    return embed(runtime, text, opts);
}
```

#### State Persistence
```typescript
class StateManager {
    async saveState(state: State): Promise<void> {
        await this.runtime.databaseAdapter.createMemory(
            {
                content: {
                    type: "state",
                    data: state,
                },
                roomId: state.roomId,
                userId: state.agentId,
            },
            "states",
        );
    }

    async loadState(roomId: UUID): Promise<State | null> {
        const states = await this.runtime.databaseAdapter.getMemories({
            roomId,
            tableName: "states",
            count: 1,
        });

        return states[0]?.content.data || null;
    }
}
```

[Rest of the documentation remains unchanged...]

## Database Adapters

Database Adapters provide Eliza's persistence layer, enabling storage and retrieval of memories, relationships, goals, and other data through a unified interface.

### Available Adapters

Each adapter is optimized for different use cases:

- **PostgreSQL** (`@elizaos/adapter-postgres`)
  - Production-ready with vector search
  - Connection pooling and high performance
  - JSONB and pgvector support

- **SQLite** (`@elizaos/adapter-sqlite`)
  - Lightweight local development
  - No external dependencies
  - Full-text search capabilities

- **Supabase** (`@elizaos/adapter-supabase`)
  - Cloud-native PostgreSQL
  - Real-time subscriptions
  - Built-in RPC functions

- **SQL.js** (`@elizaos/adapter-sqljs`)
  - In-memory SQLite for testing
  - Browser compatibility
  - Zero configuration

### Installation

```bash
# PostgreSQL
pnpm add @elizaos/adapter-postgres pg

# SQLite
pnpm add @elizaos/adapter-sqlite better-sqlite3

# SQL.js
pnpm add @elizaos/adapter-sqljs sql.js

# Supabase
pnpm add @elizaos/adapter-supabase @supabase/supabase-js
```

### Quick Start

#### PostgreSQL Setup
```typescript
import { PostgresDatabaseAdapter } from "@elizaos/adapter-postgres";

const db = new PostgresDatabaseAdapter({
    connectionString: process.env.DATABASE_URL,
    max: 20, // Connection pool size
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Test connection
await db.testConnection();
```

#### SQLite Setup
```typescript
import { SqliteDatabaseAdapter } from "@elizaos/adapter-sqlite";
import Database from "better-sqlite3";

const db = new SqliteDatabaseAdapter(
    new Database("./db.sqlite", {
        // SQLite options
        memory: false,
        readonly: false,
        fileMustExist: false,
    }),
);
```

#### Supabase Setup
```typescript
import { SupabaseDatabaseAdapter } from "@elizaos/adapter-supabase";

const db = new SupabaseDatabaseAdapter(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
);
```

### Core Features

#### Memory Operations
```typescript
// Create memory
await db.createMemory({
    id: uuid(),
    type: "messages",
    content: {
        text: "Hello world",
        attachments: [],
    },
    embedding: new Float32Array(1536), // Embedding vector
    userId,
    roomId,
    agentId,
    createdAt: Date.now(),
    unique: true,
});

// Search by embedding
const memories = await db.searchMemories({
    tableName: "messages",
    roomId,
    embedding: vectorData,
    match_threshold: 0.8,
    match_count: 10,
    unique: true,
});

// Get recent memories
const recent = await db.getMemories({
    roomId,
    count: 10,
    unique: true,
    tableName: "messages",
    start: startTime,
    end: endTime,
});
```

#### Relationship Management
```typescript
// Create relationship
await db.createRelationship({
    userA: user1Id,
    userB: user2Id,
});

// Get relationship
const relationship = await db.getRelationship({
    userA: user1Id,
    userB: user2Id,
});

// Get all relationships
const relationships = await db.getRelationships({
    userId: user1Id,
});
```

#### Goal Management
```typescript
// Create goal
await db.createGoal({
    id: uuid(),
    roomId,
    userId,
    name: "Complete task",
    status: GoalStatus.IN_PROGRESS,
    objectives: [
        { text: "Step 1", completed: false },
        { text: "Step 2", completed: false },
    ],
});

// Update goal status
await db.updateGoalStatus({
    goalId,
    status: GoalStatus.COMPLETED,
});

// Get active goals
const goals = await db.getGoals({
    roomId,
    userId,
    onlyInProgress: true,
    count: 10,
});
```

#### Room & Participant Management
```typescript
// Create room
const roomId = await db.createRoom();

// Add participant
await db.addParticipant(userId, roomId);

// Get participants
const participants = await db.getParticipantsForRoom(roomId);

// Get rooms for participant
const rooms = await db.getRoomsForParticipant(userId);
```

### Vector Search Implementation

#### PostgreSQL (with pgvector)
```typescript
// PostgreSQL vector search
async searchMemoriesByEmbedding(
  embedding: number[],
  params: {
    match_threshold?: number;
    count?: number;
    roomId?: UUID;
    unique?: boolean;
    tableName: string;
  }
): Promise<Memory[]> {
  const client = await this.pool.connect();
  try {
    let sql = `
      SELECT *,
      1 - (embedding <-> $1::vector) as similarity
      FROM memories
      WHERE type = $2
    `;

    const values: any[] = [
      `[${embedding.join(",")}]`,
      params.tableName
    ];

    if (params.unique) {
      sql += ` AND "unique" = true`;
    }

    if (params.roomId) {
      sql += ` AND "roomId" = $3::uuid`;
      values.push(params.roomId);
    }

    if (params.match_threshold) {
      sql += ` AND 1 - (embedding <-> $1::vector) >= $4`;
      values.push(params.match_threshold);
    }

    sql += ` ORDER BY embedding <-> $1::vector`;

    if (params.count) {
      sql += ` LIMIT $5`;
      values.push(params.count);
    }

    const { rows } = await client.query(sql, values);
    return rows.map(row => ({
      ...row,
      content: typeof row.content === "string"
        ? JSON.parse(row.content)
        : row.content,
      similarity: row.similarity
    }));
  } finally {
    client.release();
  }
}
```

#### SQLite (with sqlite-vss)
```typescript
// SQLite vector search implementation
async searchMemories(params: {
  tableName: string;
  roomId: UUID;
  embedding: number[];
  match_threshold: number;
  match_count: number;
  unique: boolean;
}): Promise<Memory[]> {
  const queryParams = [
    new Float32Array(params.embedding),
    params.tableName,
    params.roomId,
    params.match_count
  ];

  let sql = `
    SELECT *, vec_distance_L2(embedding, ?) AS similarity
    FROM memories
    WHERE type = ?
  `;

  if (params.unique) {
    sql += " AND `unique` = 1";
  }

  sql += ` ORDER BY similarity ASC LIMIT ?`;

  const memories = this.db.prepare(sql).all(...queryParams);

  return memories.map(memory => ({
    ...memory,
    content: JSON.parse(memory.content),
    similarity: memory.similarity
  }));
}
```

### Schema Management

#### PostgreSQL Schema
```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY,
    "createdAt" DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT,
    "username" TEXT,
    "email" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "details" JSONB DEFAULT '{}'::"jsonb",
    "is_agent" BOOLEAN DEFAULT false NOT NULL,
    "location" TEXT,
    "profile_line" TEXT,
    "signed_tos" BOOLEAN DEFAULT false NOT NULL
);

ALTER TABLE ONLY accounts ADD CONSTRAINT users_email_key UNIQUE (email);

CREATE TABLE IF NOT EXISTS participants (
    "id" UUID PRIMARY KEY,
    "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "userId" UUID REFERENCES accounts(id),
    "roomId" UUID REFERENCES rooms(id),
    "userState" TEXT,  -- For MUTED, NULL, or FOLLOWED states
    "last_message_read" UUID
);

ALTER TABLE ONLY participants ADD CONSTRAINT participants_id_key UNIQUE (id);
ALTER TABLE ONLY participants ADD CONSTRAINT participants_roomId_fkey FOREIGN KEY ("roomId") REFERENCES rooms(id);
ALTER TABLE ONLY participants ADD CONSTRAINT participants_userId_fkey FOREIGN KEY ("userId") REFERENCES accounts(id);

CREATE TABLE rooms (
  id UUID PRIMARY KEY,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE memories (
  id UUID PRIMARY KEY,
  type TEXT NOT NULL,
  content JSONB NOT NULL,
  embedding vector(1536),
  "userId" UUID NOT NULL,
  "roomId" UUID NOT NULL,
  "agentId" UUID NOT NULL,
  "unique" BOOLEAN DEFAULT FALSE,
  "createdAt" TIMESTAMP NOT NULL
);

ALTER TABLE ONLY memories ADD CONSTRAINT memories_roomId_fkey FOREIGN KEY ("roomId") REFERENCES rooms(id);
ALTER TABLE ONLY memories ADD CONSTRAINT memories_userId_fkey FOREIGN KEY ("userId") REFERENCES accounts(id);

CREATE INDEX memory_embedding_idx ON
  memories USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

CREATE TABLE relationships (
  id UUID PRIMARY KEY,
  "userA" UUID NOT NULL,
  "userB" UUID NOT NULL,
  status TEXT DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE ONLY relationships ADD CONSTRAINT friendships_id_key UNIQUE (id);
ALTER TABLE ONLY relationships ADD CONSTRAINT relationships_userA_fkey FOREIGN KEY ("userA") REFERENCES accounts(id);
ALTER TABLE ONLY relationships ADD CONSTRAINT relationships_userB_fkey FOREIGN KEY ("userB") REFERENCES accounts(id);
ALTER TABLE ONLY relationships ADD CONSTRAINT relationships_userId_fkey FOREIGN KEY ("userId") REFERENCES accounts(id);

CREATE TABLE goals (
  id UUID PRIMARY KEY,
  "roomId" UUID NOT NULL,
  "userId" UUID,
  name TEXT NOT NULL,
  status TEXT NOT NULL,
  objectives JSONB NOT NULL,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### SQLite Schema
```sql
CREATE TABLE IF NOT EXISTS memories (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding BLOB,
  userId TEXT NOT NULL,
  roomId TEXT NOT NULL,
  agentId TEXT NOT NULL,
  "unique" INTEGER DEFAULT 0,
  createdAt INTEGER NOT NULL
);

CREATE VIRTUAL TABLE IF NOT EXISTS memory_fts
  USING fts5(content, content_rowid=id);

CREATE TABLE IF NOT EXISTS goals (
  id TEXT PRIMARY KEY,
  roomId TEXT NOT NULL,
  userId TEXT,
  name TEXT NOT NULL,
  status TEXT NOT NULL,
  objectives TEXT NOT NULL,
  createdAt INTEGER DEFAULT (unixepoch())
);
```

### Performance Optimization

#### Connection Pooling
```typescript
// PostgreSQL connection pool
constructor(connectionConfig: any) {
  super();
  this.pool = new Pool({
    ...connectionConfig,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000
  });

  this.pool.on("error", (err) => {
    console.error("Unexpected error on idle client", err);
  });
}
```

#### Prepared Statements
```typescript
// SQLite prepared statements
class SqliteDatabaseAdapter extends DatabaseAdapter {
    private statements = new Map<string, Statement>();

    prepareStatement(sql: string): Statement {
        let stmt = this.statements.get(sql);
        if (!stmt) {
            stmt = this.db.prepare(sql);
            this.statements.set(sql, stmt);
        }
        return stmt;
    }

    // Use prepared statements
    async getMemoryById(id: UUID): Promise<Memory | null> {
        const stmt = this.prepareStatement(
            "SELECT * FROM memories WHERE id = ?",
        );
        const memory = stmt.get(id);
        return memory
            ? {
                  ...memory,
                  content: JSON.parse(memory.content),
              }
            : null;
    }
}
```

#### Batch Operations
```typescript
// Batch memory creation
async createMemories(memories: Memory[], tableName: string) {
  const client = await this.pool.connect();
  try {
    await client.query('BEGIN');

    const stmt = await client.prepare(
      `INSERT INTO memories (
        id, type, content, embedding, "userId",
        "roomId", "agentId", "unique", "createdAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`
    );

    for (const memory of memories) {
      await stmt.execute([
        memory.id,
        tableName,
        JSON.stringify(memory.content),
        memory.embedding,
        memory.userId,
        memory.roomId,
        memory.agentId,
        memory.unique ?? false,
        memory.createdAt
      ]);
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

### Error Handling
```typescript
class DatabaseAdapter {
    protected async withTransaction<T>(
        callback: (client: PoolClient) => Promise<T>,
    ): Promise<T> {
        const client = await this.pool.connect();
        try {
            await client.query("BEGIN");
            const result = await callback(client);
            await client.query("COMMIT");
            return result;
        } catch (error) {
            await client.query("ROLLBACK");
            if (error instanceof DatabaseError) {
                // Handle specific database errors
                if (error.code === "23505") {
                    throw new UniqueViolationError(error);
                }
            }
            throw error;
        } finally {
            client.release();
        }
    }
}
```

### Extension Points

#### Custom Adapter Implementation
```typescript
class CustomDatabaseAdapter extends DatabaseAdapter {
    constructor(config: CustomConfig) {
        super();
        // Initialize custom database connection
    }

    // Implement required methods
    async createMemory(memory: Memory, tableName: string): Promise<void> {
        // Custom implementation
    }

    async searchMemories(params: SearchParams): Promise<Memory[]> {
        // Custom implementation
    }

    // Add custom functionality
    async customOperation(): Promise<void> {
        // Custom database operation
    }
}
```

### Best Practices

1. **Connection Management**
   - Use connection pooling for PostgreSQL
   - Handle connection failures gracefully
   - Implement proper cleanup

2. **Transaction Handling**
   - Use transactions for atomic operations
   - Implement proper rollback handling
   - Manage nested transactions

3. **Error Handling**
   - Implement specific error types
   - Handle constraint violations
   - Provide meaningful error messages

4. **Resource Management**
   - Close connections properly
   - Clean up prepared statements
   - Monitor connection pools

[Rest of the documentation remains unchanged...]

## Client Packages

Eliza's client packages enable integration with various platforms and services. Each client provides a standardized interface for sending and receiving messages, handling media, and interacting with platform-specific features.

### Available Clients

- **Discord** (`@eliza/client-discord`) - Full Discord bot integration
- **Twitter** (`@eliza/client-twitter`) - Twitter bot and interaction handling
- **Telegram** (`@eliza/client-telegram`) - Telegram bot integration
- **Direct** (`@eliza/client-direct`) - Direct API interface for custom integrations
- **Auto** (`@eliza/client-auto`) - Automated trading and interaction client

### Installation

```bash
# Discord
pnpm add @eliza/client-discord

# Twitter
pnpm add @eliza/client-twitter

# Telegram
pnpm add @eliza/client-telegram

# Direct API
pnpm add @eliza/client-direct

# Auto Client
pnpm add @eliza/client-auto
```

### Discord Client

The Discord client provides full integration with Discord's features including voice, reactions, and attachments.

#### Basic Setup
```typescript
import { DiscordClientInterface } from "@eliza/client-discord";

// Initialize client
const client = await DiscordClientInterface.start(runtime);

// Configuration in .env
DISCORD_APPLICATION_ID = your_app_id;
DISCORD_API_TOKEN = your_bot_token;
```

#### Features
- Voice channel integration
- Message attachments
- Reactions handling
- Media transcription
- Room management

#### Voice Integration
```typescript
class VoiceManager {
  // Join a voice channel
  async handleJoinChannelCommand(interaction) {
    await this.joinVoiceChannel(channel);
  }

  // Handle voice state updates
  async handleVoiceStateUpdate(oldState, newState) {
    if (newState.channelId) {
      await this.handleUserJoinedChannel(newState);
    }
  }
}
```

#### Message Handling
```typescript
class MessageManager {
  async handleMessage(message) {
    // Ignore bot messages
    if (message.author.bot) return;

    // Process attachments
    if (message.attachments.size > 0) {
      await this.processAttachments(message);
    }

    // Generate response
    await this.generateResponse(message);
  }
}
```

### Twitter Client

The Twitter client enables posting, searching, and interacting with Twitter users.

#### Basic Setup
```typescript
import { TwitterClientInterface } from "@eliza/client-twitter";
// Initialize client
const client = await TwitterClientInterface.start(runtime);

// Configuration in .env
TWITTER_USERNAME = your_username;
TWITTER_PASSWORD = your_password;
TWITTER_EMAIL = your_email;
```

#### Components
- **PostClient**: Handles creating and managing posts
- **SearchClient**: Handles search functionality
- **InteractionClient**: Manages user interactions

#### Post Management
```typescript
class TwitterPostClient {
  async createPost(content: string) {
    return await this.post({
      text: content,
      media: await this.processMedia(),
    });
  }

  async replyTo(tweetId: string, content: string) {
    return await this.post({
      text: content,
      reply: { in_reply_to_tweet_id: tweetId },
    });
  }
}
```

#### Search Features
```typescript
class TwitterSearchClient {
  async searchTweets(query: string) {
    return await this.search({
      query,
      filters: {
        recency: "recent",
        language: "en",
      },
    });
  }
}
```

### Telegram Client

The Telegram client provides messaging and bot functionality for Telegram.

#### Basic Setup
```typescript
import { TelegramClientInterface } from "@eliza/client-telegram";

// Initialize client
const client = await TelegramClientInterface.start(runtime);

// Configuration in .env
TELEGRAM_BOT_TOKEN = your_bot_token;
```

#### Message Management
```typescript
class TelegramClient {
  async handleMessage(message) {
    // Process message content
    const content = await this.processMessage(message);

    // Generate response
    const response = await this.generateResponse(content);

    // Send response
    await this.sendMessage(message.chat.id, response);
  }
}
```

### Direct Client

The Direct client provides a REST API interface for custom integrations.

#### Basic Setup
```typescript
import { DirectClientInterface } from "@eliza/client-direct";

// Initialize client
const client = await DirectClientInterface.start(runtime);
```

#### API Endpoints
```typescript
class DirectClient {
  constructor() {
    // Message endpoint
    this.app.post("/:agentId/message", async (req, res) => {
      const response = await this.handleMessage(req.body);
      res.json(response);
    });

    // Image generation endpoint
    this.app.post("/:agentId/image", async (req, res) => {
      const images = await this.generateImage(req.body);
      res.json(images);
    });
  }
}
```

### Auto Client

The Auto client enables automated interactions and trading.

#### Basic Setup
```typescript
import { AutoClientInterface } from "@eliza/client-auto";

// Initialize client
const client = await AutoClientInterface.start(runtime);
```

#### Automated Trading
```typescript
class AutoClient {
  constructor(runtime: IAgentRuntime) {
    this.runtime = runtime;

    // Start trading loop
    this.interval = setInterval(
      () => {
        this.makeTrades();
      },
      60 * 60 * 1000,
    ); // 1 hour interval
  }

  async makeTrades() {
    // Get recommendations
    const recommendations = await this.getHighTrustRecommendations();

    // Analyze tokens
    const analysis = await this.analyzeTokens(recommendations);

    // Execute trades
    await this.executeTrades(analysis);
  }
}
```

### Common Features

#### Message Handling
All clients implement standard message handling:
```typescript
interface ClientInterface {
  async handleMessage(message: Message): Promise<void>;
  async generateResponse(context: Context): Promise<Response>;
  async sendMessage(destination: string, content: Content): Promise<void>;
}
```

#### Media Processing
```typescript
interface MediaProcessor {
  async processImage(image: Image): Promise<ProcessedImage>;
  async processVideo(video: Video): Promise<ProcessedVideo>;
  async processAudio(audio: Audio): Promise<ProcessedAudio>;
}
```

#### Error Handling
```typescript
class BaseClient {
  protected async handleError(error: Error) {
    console.error("Client error:", error);

    if (error.code === "RATE_LIMIT") {
      await this.handleRateLimit(error);
    } else if (error.code === "AUTH_FAILED") {
      await this.refreshAuth();
    }
  }
}
```

### Best Practices

1. **Authentication**
   - Store credentials securely in environment variables
   - Implement token refresh mechanisms
   - Handle authentication errors gracefully

2. **Rate Limiting**
   - Implement exponential backoff
   - Track API usage
   - Queue messages during rate limits

3. **Error Handling**
   - Log errors with context
   - Implement retry logic
   - Handle platform-specific errors

4. **Media Processing**
   - Validate media before processing
   - Handle different file formats
   - Implement size limits

### Performance Optimization

#### Connection Management
```typescript
class ClientManager {
  private reconnect() {
    await this.disconnect();
    await wait(this.backoff());
    await this.connect();
  }
}
```

#### Message Queuing
```typescript
class MessageQueue {
  async queueMessage(message: Message) {
    await this.queue.push(message);
    this.processQueue();
  }
}
```

### Troubleshooting

#### Common Issues

1. **Authentication Failures**
```typescript
// Implement token refresh
async refreshAuth() {
  const newToken = await this.requestNewToken();
  await this.updateToken(newToken);
}
```

2. **Rate Limits**
```typescript
// Handle rate limiting
async handleRateLimit(error) {
  const delay = this.calculateBackoff(error);
  await wait(delay);
  return this.retryRequest();
}
```

3. **Connection Issues**
```typescript
// Implement reconnection logic
async handleDisconnect() {
  await this.reconnect({
    maxAttempts: 5,
    backoff: 'exponential'
  });
}
```

4. **Message Processing Failure**
```typescript
async processMessage(message) {
  try {
    return await this.messageProcessor(message);
  } catch (error) {
    if (error.code === "INVALID_FORMAT") {
      return this.handleInvalidFormat(message);
    }
    throw error;
  }
}
```

[Rest of the documentation remains unchanged...]

## Agent Package

The Agent Package (`@elizaos/agent`) provides the core functionality for creating and managing autonomous AI agents within the Eliza framework. It handles agent lifecycle, state management, and interaction processing.

### Installation
```bash
pnpm add @elizaos/agent
```

### Core Components

#### Agent Class
The main class for creating autonomous agents:

```typescript
import { Agent, AgentConfig } from "@elizaos/agent";

const agent = new Agent({
    id: "unique-agent-id",
    name: "AgentName",
    runtime: agentRuntime,
    character: characterConfig,
    clients: [discordClient, telegramClient],
});
```

#### Agent Configuration
```typescript
interface AgentConfig {
    id: string;
    name: string;
    runtime: IAgentRuntime;
    character: Character;
    clients: Client[];
    options?: {
        maxConcurrentTasks?: number;
        taskTimeout?: number;
        memoryLimit?: number;
    };
}
```

### State Management

#### Agent State
```typescript
interface AgentState {
    // Core state
    id: string;
    name: string;
    status: AgentStatus;
    
    // Runtime state
    currentTask?: Task;
    pendingTasks: Task[];
    
    // Memory state
    shortTermMemory: Memory[];
    longTermMemory: Memory[];
    
    // Relationship state
    relationships: Map<string, Relationship>;
}
```

#### State Updates
```typescript
class Agent {
    async updateState(update: Partial<AgentState>): Promise<void> {
        this.state = {
            ...this.state,
            ...update,
        };
        
        await this.runtime.stateManager.saveState(this.state);
    }
}
```

### Task Management

#### Task Definition
```typescript
interface Task {
    id: string;
    type: TaskType;
    priority: Priority;
    status: TaskStatus;
    data: any;
    createdAt: number;
    deadline?: number;
}
```

#### Task Processing
```typescript
class TaskProcessor {
    async processTask(task: Task): Promise<void> {
        try {
            // Update task status
            await this.updateTaskStatus(task, TaskStatus.PROCESSING);
            
            // Process based on type
            switch (task.type) {
                case TaskType.MESSAGE:
                    await this.processMessage(task.data);
                    break;
                case TaskType.ACTION:
                    await this.processAction(task.data);
                    break;
                // ... other task types
            }
            
            await this.updateTaskStatus(task, TaskStatus.COMPLETED);
        } catch (error) {
            await this.handleTaskError(task, error);
        }
    }
}
```

### Memory Management

#### Memory Types
```typescript
enum MemoryType {
    SHORT_TERM = "short_term",
    LONG_TERM = "long_term",
    EPISODIC = "episodic",
    SEMANTIC = "semantic",
}
```

#### Memory Operations
```typescript
class MemoryManager {
    async storeMemory(memory: Memory): Promise<void> {
        // Process memory for storage
        const processed = await this.processMemory(memory);
        
        // Store based on type
        if (memory.type === MemoryType.SHORT_TERM) {
            await this.storeShortTerm(processed);
        } else {
            await this.storeLongTerm(processed);
        }
    }
    
    async retrieveMemories(query: MemoryQuery): Promise<Memory[]> {
        // Search both memory types
        const shortTerm = await this.searchShortTerm(query);
        const longTerm = await this.searchLongTerm(query);
        
        // Combine and sort by relevance
        return this.mergeAndSort([...shortTerm, ...longTerm]);
    }
}
```

### Relationship Management

#### Relationship Types
```typescript
interface Relationship {
    userId: string;
    type: RelationType;
    trust: number;
    interactions: number;
    lastInteraction: number;
    context: Map<string, any>;
}
```

#### Relationship Updates
```typescript
class RelationshipManager {
    async updateRelationship(userId: string, update: Partial<Relationship>): Promise<void> {
        const current = this.relationships.get(userId);
        
        this.relationships.set(userId, {
            ...current,
            ...update,
            lastInteraction: Date.now(),
        });
        
        await this.saveRelationships();
    }
}
```

### Best Practices

1. **Agent Lifecycle**
   - Initialize agents with proper configuration
   - Handle cleanup on shutdown
   - Manage resource usage
   - Implement proper error handling

2. **Task Management**
   - Prioritize tasks appropriately
   - Handle task timeouts
   - Implement retry logic
   - Monitor task queues

3. **Memory Management**
   - Use appropriate memory types
   - Implement memory cleanup
   - Optimize memory searches
   - Handle memory limits

4. **Error Handling**
```typescript
class Agent {
    private async handleError(error: Error): Promise<void> {
        console.error(`Agent ${this.id} error:`, error);
        
        if (error instanceof TaskError) {
            await this.handleTaskError(error);
        } else if (error instanceof MemoryError) {
            await this.handleMemoryError(error);
        } else {
            // Handle other errors
            await this.runtime.errorHandler.handle(error);
        }
    }
}
```

### Advanced Features

#### Custom Task Types
```typescript
class CustomTaskProcessor extends TaskProcessor {
    async processCustomTask(task: CustomTask): Promise<void> {
        // Implement custom task logic
    }
}
```

#### Memory Optimization
```typescript
class OptimizedMemoryManager extends MemoryManager {
    private cache: Map<string, Memory>;
    
    async retrieveWithCache(query: MemoryQuery): Promise<Memory[]> {
        // Check cache first
        const cached = this.checkCache(query);
        if (cached) return cached;
        
        // Perform actual search
        const results = await this.retrieveMemories(query);
        
        // Update cache
        this.updateCache(query, results);
        
        return results;
    }
}
```

### Troubleshooting

#### Common Issues

1. **Memory Leaks**
```typescript
// Implement memory cleanup
async cleanupMemory(): Promise<void> {
    const oldMemories = this.shortTermMemory.filter(
        m => Date.now() - m.createdAt > this.memoryTTL
    );
    
    await Promise.all(
        oldMemories.map(m => this.archiveMemory(m))
    );
}
```

2. **Task Timeouts**
```typescript
// Handle task timeouts
async handleTaskTimeout(task: Task): Promise<void> {
    await this.updateTaskStatus(task, TaskStatus.TIMEOUT);
    await this.retryTask(task);
}
```

3. **State Inconsistencies**
```typescript
// Verify state consistency
async verifyState(): Promise<void> {
    const stored = await this.runtime.stateManager.loadState(this.id);
    if (!this.isStateConsistent(stored)) {
        await this.reconcileState(stored);
    }
}
```

[Rest of the documentation remains unchanged...]

## Plugin System

The Eliza plugin system provides a modular way to extend core functionality with additional features, actions, evaluators, and providers.

### Core Plugin Structure
```typescript
interface Plugin {
    name: string;           // Unique identifier
    description: string;    // Plugin functionality description
    actions?: Action[];     // Custom actions
    evaluators?: Evaluator[]; // Custom evaluators
    providers?: Provider[]; // Context providers
    services?: Service[];   // Additional services
}
```

### Installation and Setup

#### Basic Installation
```bash
# Install desired plugin
pnpm add @elizaos/plugin-[name]
```

#### Plugin Registration
```typescript
import { bootstrapPlugin } from "@eliza/plugin-bootstrap";
import { imageGenerationPlugin } from "@eliza/plugin-image-generation";

const character = {
    // ... other character config
    plugins: [bootstrapPlugin, imageGenerationPlugin],
};
```

### Available Plugins

#### 1. Bootstrap Plugin (`@eliza/plugin-bootstrap`)
Provides essential baseline functionality:

**Actions:**
- `continue` - Continue conversation flow
- `followRoom` - Follow room for updates
- `unfollowRoom` - Unfollow room
- `ignore` - Ignore specific messages
- `muteRoom` - Mute room notifications
- `unmuteRoom` - Unmute room notifications

**Evaluators:**
- `fact` - Evaluate factual accuracy
- `goal` - Assess goal completion

**Providers:**
- `boredom` - Manages engagement levels
- `time` - Provides temporal context
- `facts` - Supplies factual information

#### 2. Image Generation Plugin (`@eliza/plugin-image-generation`)
Enables AI image generation capabilities:

**Actions:**
- `GENERATE_IMAGE` - Create images from text descriptions
- Supports multiple services (Anthropic, Together)
- Auto-generates image captions

#### 3. Node Plugin (`@eliza/plugin-node`)
Provides core Node.js-based services:

**Services:**
- `BrowserService` - Web browsing capabilities
- `ImageDescriptionService` - Image analysis
- `LlamaService` - LLM integration
- `PdfService` - PDF processing
- `SpeechService` - Text-to-speech
- `TranscriptionService` - Speech-to-text
- `VideoService` - Video processing

#### 4. Solana Plugin (`@eliza/plugin-solana`)
Integrates Solana blockchain functionality:

**Evaluators:**
- `trustEvaluator` - Assess transaction trust scores

**Providers:**
- `walletProvider` - Wallet management
- `trustScoreProvider` - Transaction trust metrics

#### 5. Coinbase Commerce Plugin (`@eliza/plugin-coinbase`)
Enables cryptocurrency payment processing:

**Actions:**
- `CREATE_CHARGE` - Create payment charges
- `GET_ALL_CHARGES` - Fetch payment charges
- `GET_CHARGE_DETAILS` - Get specific charge details

#### 6. Coinbase MassPayments Plugin
Facilitates cryptocurrency mass payouts:

**Actions:**
```typescript
{
    "receivingAddresses": [
        "0xA0ba2ACB5846A54834173fB0DD9444F756810f06",
        "0xF14F2c49aa90BaFA223EE074C1C33b59891826bF"
    ],
    "transferAmount": 5000000000000000,
    "assetId": "ETH",
    "network": "eth"
}
```

#### 7. TEE Plugin (`@eliza/plugin-tee`)
Enables Trusted Execution Environment support:

**Configuration:**
```bash
# Optional simulator for testing
DSTACK_SIMULATOR_ENDPOINT="http://host.docker.internal:8090"
WALLET_SECRET_SALT=your-secret-salt
```

#### 8. Webhook Plugin (`@eliza/plugin-coinbase-webhooks`)
Manages Coinbase webhook integrations:

**Actions:**
- `CREATE_WEBHOOK` - Create event webhooks
- `GET_WEBHOOKS` - List configured webhooks

#### 9. Fuel Plugin (`@eliza/plugin-fuel`)
Provides Fuel blockchain integration:

**Actions:**
- `TRANSFER_FUEL_ETH` - Transfer ETH on Fuel network

### Creating Custom Plugins

#### Basic Plugin Template
```typescript
import { Plugin, Action, Evaluator, Provider } from "@elizaos/core";

const myCustomPlugin: Plugin = {
    name: "my-custom-plugin",
    description: "Adds custom functionality",
    actions: [
        /* custom actions */
    ],
    evaluators: [
        /* custom evaluators */
    ],
    providers: [
        /* custom providers */
    ],
    services: [
        /* custom services */
    ],
};
```

### Best Practices

1. **Modularity**
   - Keep plugins focused on specific functionality
   - Clearly document dependencies
   - Implement robust error handling
   - Provide clear documentation

2. **Development Guidelines**
   - Follow interface contracts
   - Include comprehensive tests
   - Handle errors gracefully
   - Document all components

3. **Plugin Loading**
```typescript
// Check plugin loading
if (character.plugins) {
    console.log("Loading plugins:", character.plugins);
    const importedPlugins = await Promise.all(
        character.plugins.map(async (plugin) => {
            const importedPlugin = await import(plugin);
            return importedPlugin;
        }),
    );
    character.plugins = importedPlugins;
}
```

4. **Service Registration**
```typescript
// Proper service registration
registerService(service: Service): void {
    const serviceType = (service as typeof Service).serviceType;
    if (this.services.has(serviceType)) {
        console.warn(`Service ${serviceType} is already registered`);
        return;
    }
    this.services.set(serviceType, service);
}
```

### Troubleshooting

#### Common Issues

1. **Plugin Loading Failures**
```typescript
try {
    await loadPlugin(plugin);
} catch (error) {
    if (error.code === "MODULE_NOT_FOUND") {
        console.error(`Plugin ${plugin.name} not found`);
    } else {
        console.error(`Failed to load plugin: ${error.message}`);
    }
}
```

2. **Service Conflicts**
```typescript
// Handle service conflicts
if (this.services.has(serviceType)) {
    const existing = this.services.get(serviceType);
    if (existing.priority > service.priority) {
        return; // Keep existing service
    }
}
```

3. **Resource Management**
```typescript
class PluginManager {
    private async cleanup(): Promise<void> {
        for (const plugin of this.activePlugins) {
            await plugin.dispose();
        }
        this.activePlugins.clear();
    }
}
```

### Future Extensions

The plugin system is designed for extensibility, supporting future additions like:
- Database adapters
- Authentication providers
- Custom model providers
- External API integrations
- Workflow automation
- Custom UI components

