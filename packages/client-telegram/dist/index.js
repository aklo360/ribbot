// src/index.ts
import { elizaLogger as elizaLogger3 } from "@elizaos/core";

// src/telegramClient.ts
import { Telegraf as Telegraf2 } from "telegraf";
import { message } from "telegraf/filters";
import { elizaLogger as elizaLogger2 } from "@elizaos/core";

// src/messageManager.ts
import { composeContext, elizaLogger, ServiceType, composeRandomUser } from "@elizaos/core";
import { getEmbeddingZeroVector } from "@elizaos/core";
import {
  ModelClass
} from "@elizaos/core";
import { stringToUuid } from "@elizaos/core";
import { generateMessageResponse, generateShouldRespond } from "@elizaos/core";
import { messageCompletionFooter, shouldRespondFooter } from "@elizaos/core";

// src/utils.ts
function cosineSimilarity(text1, text2, text3) {
  const preprocessText = (text) => text.toLowerCase().replace(/[^\w\s'_-]/g, " ").replace(/\s+/g, " ").trim();
  const getWords = (text) => {
    return text.split(" ").filter((word) => word.length > 1);
  };
  const words1 = getWords(preprocessText(text1));
  const words2 = getWords(preprocessText(text2));
  const words3 = text3 ? getWords(preprocessText(text3)) : [];
  const freq1 = {};
  const freq2 = {};
  const freq3 = {};
  words1.forEach((word) => freq1[word] = (freq1[word] || 0) + 1);
  words2.forEach((word) => freq2[word] = (freq2[word] || 0) + 1);
  if (words3.length) {
    words3.forEach((word) => freq3[word] = (freq3[word] || 0) + 1);
  }
  const uniqueWords = /* @__PURE__ */ new Set([...Object.keys(freq1), ...Object.keys(freq2), ...words3.length ? Object.keys(freq3) : []]);
  let dotProduct = 0;
  let magnitude1 = 0;
  let magnitude2 = 0;
  let magnitude3 = 0;
  uniqueWords.forEach((word) => {
    const val1 = freq1[word] || 0;
    const val2 = freq2[word] || 0;
    const val3 = freq3[word] || 0;
    if (words3.length) {
      const sim12 = val1 * val2;
      const sim23 = val2 * val3;
      const sim13 = val1 * val3;
      dotProduct += Math.max(sim12, sim23, sim13);
    } else {
      dotProduct += val1 * val2;
    }
    magnitude1 += val1 * val1;
    magnitude2 += val2 * val2;
    if (words3.length) {
      magnitude3 += val3 * val3;
    }
  });
  magnitude1 = Math.sqrt(magnitude1);
  magnitude2 = Math.sqrt(magnitude2);
  magnitude3 = words3.length ? Math.sqrt(magnitude3) : 1;
  if (magnitude1 === 0 || magnitude2 === 0 || words3.length && magnitude3 === 0) return 0;
  if (!words3.length) {
    return dotProduct / (magnitude1 * magnitude2);
  }
  const maxMagnitude = Math.max(
    magnitude1 * magnitude2,
    magnitude2 * magnitude3,
    magnitude1 * magnitude3
  );
  return dotProduct / maxMagnitude;
}
function escapeMarkdown(text) {
  if (text.startsWith("```") && text.endsWith("```")) {
    return text;
  }
  const parts = text.split(/(```[\s\S]*?```)/g);
  return parts.map((part, index) => {
    if (index % 2 === 1) {
      return part;
    }
    return part.replace(/`.*?`/g, (match) => match).replace(/([*_`\\])/g, "\\$1");
  }).join("");
}

// src/constants.ts
var MESSAGE_CONSTANTS = {
  MAX_MESSAGES: 50,
  RECENT_MESSAGE_COUNT: 5,
  CHAT_HISTORY_COUNT: 10,
  DEFAULT_SIMILARITY_THRESHOLD: 0.6,
  DEFAULT_SIMILARITY_THRESHOLD_FOLLOW_UPS: 0.4,
  INTEREST_DECAY_TIME: 5 * 60 * 1e3,
  // 5 minutes
  PARTIAL_INTEREST_DECAY: 3 * 60 * 1e3
  // 3 minutes
};
var TIMING_CONSTANTS = {
  TEAM_MEMBER_DELAY: 1500,
  // 1.5 seconds
  TEAM_MEMBER_DELAY_MIN: 1e3,
  // 1 second
  TEAM_MEMBER_DELAY_MAX: 3e3,
  // 3 seconds
  LEADER_DELAY_MIN: 2e3,
  // 2 seconds
  LEADER_DELAY_MAX: 4e3
  // 4 seconds
};
var RESPONSE_CHANCES = {
  AFTER_LEADER: 0.5
  // 50% chance to respond after leader
};
var TEAM_COORDINATION = {
  KEYWORDS: [
    "team",
    "everyone",
    "all agents",
    "team update",
    "gm team",
    "hello team",
    "hey team",
    "hi team",
    "morning team",
    "evening team",
    "night team",
    "update team"
  ]
};

// src/messageManager.ts
import fs from "fs";
var MAX_MESSAGE_LENGTH = 4096;
var telegramShouldRespondTemplate = `# About {{agentName}}:
{{bio}}

# RESPONSE EXAMPLES
{{user1}}: I just saw a really great movie
{{user2}}: Oh? Which movie?
Result: [IGNORE]

{{agentName}}: Oh, this is my favorite scene
{{user1}}: sick
{{user2}}: wait, why is it your favorite scene
Result: [RESPOND]

{{user1}}: stfu bot
Result: [STOP]

{{user1}}: Hey {{agent}}, can you help me with something
Result: [RESPOND]

{{user1}}: {{agentName}} stfu plz
Result: [STOP]

{{user1}}: i need help
{{agentName}}: how can I help you?
{{user1}}: no. i need help from someone else
Result: [IGNORE]

{{user1}}: Hey {{agent}}, can I ask you a question
{{agentName}}: Sure, what is it
{{user1}}: can you ask claude to create a basic react module that demonstrates a counter
Result: [RESPOND]

{{user1}}: {{agentName}} can you tell me a story
{{agentName}}: uhhh...
{{user1}}: please do it
{{agentName}}: okay
{{agentName}}: once upon a time, in a quaint little village, there was a curious girl named elara
{{user1}}: I'm loving it, keep going
Result: [RESPOND]

{{user1}}: {{agentName}} stop responding plz
Result: [STOP]

{{user1}}: okay, i want to test something. {{agentName}}, can you say marco?
{{agentName}}: marco
{{user1}}: great. okay, now do it again
Result: [RESPOND]

Response options are [RESPOND], [IGNORE] and [STOP].

{{agentName}} is in a room with other users and should only respond when they are being addressed, and should not respond if they are continuing a conversation that is very long.

Respond with [RESPOND] to messages that are directed at {{agentName}}, or participate in conversations that are interesting or relevant to their background.
If a message is not interesting, relevant, or does not directly address {{agentName}}, respond with [IGNORE]

Also, respond with [IGNORE] to messages that are very short or do not contain much information.

If a user asks {{agentName}} to be quiet, respond with [STOP]
If {{agentName}} concludes a conversation and isn't part of the conversation anymore, respond with [STOP]

IMPORTANT: {{agentName}} is particularly sensitive about being annoying, so if there is any doubt, it is better to respond with [IGNORE].
If {{agentName}} is conversing with a user and they have not asked to stop, it is better to respond with [RESPOND].

The goal is to decide whether {{agentName}} should respond to the last message.

{{recentMessages}}

Thread of Tweets You Are Replying To:

{{formattedConversation}}

# INSTRUCTIONS: Choose the option that best describes {{agentName}}'s response to the last message. Ignore messages if they are addressed to someone else.
` + shouldRespondFooter;
var telegramMessageHandlerTemplate = (
  // {{goals}}
  `# Action Examples
{{actionExamples}}
(Action examples are for reference only. Do not use the information from them in your response.)

# Knowledge
{{knowledge}}

# Task: Generate dialog and actions for the character {{agentName}}.
About {{agentName}}:
{{bio}}
{{lore}}

Examples of {{agentName}}'s dialog and actions:
{{characterMessageExamples}}

{{providers}}

{{attachments}}

{{actions}}

# Capabilities
Note that {{agentName}} is capable of reading/seeing/hearing various forms of media, including images, videos, audio, plaintext and PDFs. Recent attachments have been included above under the "Attachments" section.

{{messageDirections}}

{{recentMessages}}

# Task: Generate a post/reply in the voice, style and perspective of {{agentName}} (@{{twitterUserName}}) while using the thread of tweets as additional context:
Current Post:
{{currentPost}}
Thread of Tweets You Are Replying To:

{{formattedConversation}}
` + messageCompletionFooter
);
var MessageManager = class {
  bot;
  runtime;
  interestChats = {};
  teamMemberUsernames = /* @__PURE__ */ new Map();
  constructor(bot, runtime) {
    this.bot = bot;
    this.runtime = runtime;
    this._initializeTeamMemberUsernames().catch(
      (error) => elizaLogger.error(
        "Error initializing team member usernames:",
        error
      )
    );
  }
  async _initializeTeamMemberUsernames() {
    if (!this.runtime.character.clientConfig?.telegram?.isPartOfTeam)
      return;
    const teamAgentIds = this.runtime.character.clientConfig.telegram.teamAgentIds || [];
    for (const id of teamAgentIds) {
      try {
        const chat = await this.bot.telegram.getChat(id);
        if ("username" in chat && chat.username) {
          this.teamMemberUsernames.set(id, chat.username);
          elizaLogger.info(
            `Cached username for team member ${id}: ${chat.username}`
          );
        }
      } catch (error) {
        elizaLogger.error(
          `Error getting username for team member ${id}:`,
          error
        );
      }
    }
  }
  _getTeamMemberUsername(id) {
    return this.teamMemberUsernames.get(id);
  }
  _getNormalizedUserId(id) {
    return id.toString().replace(/[^0-9]/g, "");
  }
  _isTeamMember(userId) {
    const teamConfig = this.runtime.character.clientConfig?.telegram;
    if (!teamConfig?.isPartOfTeam || !teamConfig.teamAgentIds) return false;
    const normalizedUserId = this._getNormalizedUserId(userId);
    return teamConfig.teamAgentIds.some(
      (teamId) => this._getNormalizedUserId(teamId) === normalizedUserId
    );
  }
  _isTeamLeader() {
    return this.bot.botInfo?.id.toString() === this.runtime.character.clientConfig?.telegram?.teamLeaderId;
  }
  _isTeamCoordinationRequest(content) {
    const contentLower = content.toLowerCase();
    return TEAM_COORDINATION.KEYWORDS?.some(
      (keyword) => contentLower.includes(keyword.toLowerCase())
    );
  }
  _isRelevantToTeamMember(content, chatId, lastAgentMemory = null) {
    const teamConfig = this.runtime.character.clientConfig?.telegram;
    if (this._isTeamLeader() && lastAgentMemory?.content.text) {
      const timeSinceLastMessage = Date.now() - lastAgentMemory.createdAt;
      if (timeSinceLastMessage > MESSAGE_CONSTANTS.INTEREST_DECAY_TIME) {
        return false;
      }
      const similarity = cosineSimilarity(
        content.toLowerCase(),
        lastAgentMemory.content.text.toLowerCase()
      );
      return similarity >= MESSAGE_CONSTANTS.DEFAULT_SIMILARITY_THRESHOLD_FOLLOW_UPS;
    }
    if (!teamConfig?.teamMemberInterestKeywords?.length) {
      return false;
    }
    return teamConfig.teamMemberInterestKeywords.some(
      (keyword) => content.toLowerCase().includes(keyword.toLowerCase())
    );
  }
  async _analyzeContextSimilarity(currentMessage, previousContext, agentLastMessage) {
    if (!previousContext) return 1;
    const timeDiff = Date.now() - previousContext.timestamp;
    const timeWeight = Math.max(0, 1 - timeDiff / (5 * 60 * 1e3));
    const similarity = cosineSimilarity(
      currentMessage.toLowerCase(),
      previousContext.content.toLowerCase(),
      agentLastMessage?.toLowerCase()
    );
    return similarity * timeWeight;
  }
  async _shouldRespondBasedOnContext(message2, chatState) {
    const messageText = "text" in message2 ? message2.text : "caption" in message2 ? message2.caption : "";
    if (!messageText) return false;
    if (this._isMessageForMe(message2)) return true;
    if (chatState?.currentHandler !== this.bot.botInfo?.id.toString())
      return false;
    if (!chatState.messages?.length) return false;
    const lastUserMessage = [...chatState.messages].reverse().find(
      (m, index) => index > 0 && // Skip first message (current)
      m.userId !== this.runtime.agentId
    );
    if (!lastUserMessage) return false;
    const lastSelfMemories = await this.runtime.messageManager.getMemories({
      roomId: stringToUuid(
        message2.chat.id.toString() + "-" + this.runtime.agentId
      ),
      unique: false,
      count: 5
    });
    const lastSelfSortedMemories = lastSelfMemories?.filter((m) => m.userId === this.runtime.agentId).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    const contextSimilarity = await this._analyzeContextSimilarity(
      messageText,
      {
        content: lastUserMessage.content.text || "",
        timestamp: Date.now()
      },
      lastSelfSortedMemories?.[0]?.content?.text
    );
    const similarityThreshold = this.runtime.character.clientConfig?.telegram?.messageSimilarityThreshold || chatState.contextSimilarityThreshold || MESSAGE_CONSTANTS.DEFAULT_SIMILARITY_THRESHOLD;
    return contextSimilarity >= similarityThreshold;
  }
  _isMessageForMe(message2) {
    const botUsername = this.bot.botInfo?.username;
    if (!botUsername) return false;
    const messageText = "text" in message2 ? message2.text : "caption" in message2 ? message2.caption : "";
    if (!messageText) return false;
    const isReplyToBot = message2.reply_to_message?.from?.is_bot === true && message2.reply_to_message?.from?.username === botUsername;
    const isMentioned = messageText.includes(`@${botUsername}`);
    const hasUsername = messageText.toLowerCase().includes(botUsername.toLowerCase());
    return isReplyToBot || isMentioned || !this.runtime.character.clientConfig?.telegram?.shouldRespondOnlyToMentions && hasUsername;
  }
  _checkInterest(chatId) {
    const chatState = this.interestChats[chatId];
    if (!chatState) return false;
    const lastMessage = chatState.messages[chatState.messages.length - 1];
    const timeSinceLastMessage = Date.now() - chatState.lastMessageSent;
    if (timeSinceLastMessage > MESSAGE_CONSTANTS.INTEREST_DECAY_TIME) {
      delete this.interestChats[chatId];
      return false;
    } else if (timeSinceLastMessage > MESSAGE_CONSTANTS.PARTIAL_INTEREST_DECAY) {
      return this._isRelevantToTeamMember(
        lastMessage?.content.text || "",
        chatId
      );
    }
    if (this._isTeamLeader() && chatState.messages.length > 0) {
      if (!this._isRelevantToTeamMember(
        lastMessage?.content.text || "",
        chatId
      )) {
        const recentTeamResponses = chatState.messages.slice(-3).some(
          (m) => m.userId !== this.runtime.agentId && this._isTeamMember(m.userId.toString())
        );
        if (recentTeamResponses) {
          delete this.interestChats[chatId];
          return false;
        }
      }
    }
    return true;
  }
  // Process image messages and generate descriptions
  async processImage(message2) {
    try {
      let imageUrl = null;
      elizaLogger.info(`Telegram Message: ${message2}`);
      if ("photo" in message2 && message2.photo?.length > 0) {
        const photo = message2.photo[message2.photo.length - 1];
        const fileLink = await this.bot.telegram.getFileLink(
          photo.file_id
        );
        imageUrl = fileLink.toString();
      } else if ("document" in message2 && message2.document?.mime_type?.startsWith("image/")) {
        const fileLink = await this.bot.telegram.getFileLink(
          message2.document.file_id
        );
        imageUrl = fileLink.toString();
      }
      if (imageUrl) {
        const imageDescriptionService = this.runtime.getService(
          ServiceType.IMAGE_DESCRIPTION
        );
        const { title, description } = await imageDescriptionService.describeImage(imageUrl);
        return { description: `[Image: ${title}
${description}]` };
      }
    } catch (error) {
      console.error("\u274C Error processing image:", error);
    }
    return null;
  }
  // Decide if the bot should respond to the message
  async _shouldRespond(message2, state) {
    const messageText = "text" in message2 ? message2.text : "caption" in message2 && typeof message2.caption === "string" ? message2.caption : "";
    if (!messageText || !messageText.toLowerCase().startsWith("@sbf_ribbot")) {
      return false;
    }
    if (this.runtime.character.clientConfig?.telegram?.shouldRespondOnlyToMentions) {
      return this._isMessageForMe(message2);
    }
    if ("text" in message2 && message2.text?.includes(`@${this.bot.botInfo?.username}`)) {
      elizaLogger.info(`Bot mentioned`);
      return true;
    }
    if (message2.chat.type === "private") {
      return true;
    }
    if ("photo" in message2 || "document" in message2 && typeof message2.document === "object" && message2.document && "mime_type" in message2.document && typeof message2.document.mime_type === "string" && message2.document.mime_type.startsWith("image/")) {
      return false;
    }
    const chatId = message2.chat.id.toString();
    const chatState = this.interestChats[chatId];
    if (this.runtime.character.clientConfig?.discord?.isPartOfTeam && !this._isTeamLeader() && this._isRelevantToTeamMember(messageText, chatId)) {
      return true;
    }
    if (this.runtime.character.clientConfig?.telegram?.isPartOfTeam) {
      if (this._isTeamCoordinationRequest(messageText)) {
        if (this._isTeamLeader()) {
          return true;
        } else {
          const randomDelay = Math.floor(
            Math.random() * (TIMING_CONSTANTS.TEAM_MEMBER_DELAY_MAX - TIMING_CONSTANTS.TEAM_MEMBER_DELAY_MIN)
          ) + TIMING_CONSTANTS.TEAM_MEMBER_DELAY_MIN;
          await new Promise(
            (resolve) => setTimeout(resolve, randomDelay)
          );
          return true;
        }
      }
      if (!this._isTeamLeader() && this._isRelevantToTeamMember(messageText, chatId)) {
        await new Promise(
          (resolve) => setTimeout(resolve, TIMING_CONSTANTS.TEAM_MEMBER_DELAY)
        );
        if (chatState.messages?.length) {
          const recentMessages = chatState.messages.slice(
            -MESSAGE_CONSTANTS.RECENT_MESSAGE_COUNT
          );
          const leaderResponded = recentMessages.some(
            (m) => m.userId === this.runtime.character.clientConfig?.telegram?.teamLeaderId && Date.now() - chatState.lastMessageSent < 3e3
          );
          if (leaderResponded) {
            return Math.random() > RESPONSE_CHANCES.AFTER_LEADER;
          }
        }
        return true;
      }
      if (this._isTeamLeader() && !this._isRelevantToTeamMember(messageText, chatId)) {
        const randomDelay = Math.floor(
          Math.random() * (TIMING_CONSTANTS.LEADER_DELAY_MAX - TIMING_CONSTANTS.LEADER_DELAY_MIN)
        ) + TIMING_CONSTANTS.LEADER_DELAY_MIN;
        await new Promise(
          (resolve) => setTimeout(resolve, randomDelay)
        );
        if (chatState?.messages?.length) {
          const recentResponses = chatState.messages.slice(
            -MESSAGE_CONSTANTS.RECENT_MESSAGE_COUNT
          );
          const otherTeamMemberResponded = recentResponses.some(
            (m) => m.userId !== this.runtime.agentId && this._isTeamMember(m.userId)
          );
          if (otherTeamMemberResponded) {
            return false;
          }
        }
      }
      if (this._isMessageForMe(message2)) {
        const channelState = this.interestChats[chatId];
        if (channelState) {
          channelState.currentHandler = this.bot.botInfo?.id.toString();
          channelState.lastMessageSent = Date.now();
        }
        return true;
      }
      if (chatState?.currentHandler) {
        if (chatState.currentHandler !== this.bot.botInfo?.id.toString() && this._isTeamMember(chatState.currentHandler)) {
          return false;
        }
      }
      if (!this._isMessageForMe(message2) && this.interestChats[chatId]) {
        const recentMessages = this.interestChats[chatId].messages.slice(-MESSAGE_CONSTANTS.CHAT_HISTORY_COUNT);
        const ourMessageCount = recentMessages.filter(
          (m) => m.userId === this.runtime.agentId
        ).length;
        if (ourMessageCount > 2) {
          const responseChance = Math.pow(0.5, ourMessageCount - 2);
          if (Math.random() > responseChance) {
            return;
          }
        }
      }
    }
    if (chatState?.currentHandler) {
      const shouldRespondContext = await this._shouldRespondBasedOnContext(message2, chatState);
      if (!shouldRespondContext) {
        return false;
      }
    }
    if ("text" in message2 || "caption" in message2 && typeof message2.caption === "string") {
      const shouldRespondContext = composeContext({
        state,
        template: this.runtime.character.templates?.telegramShouldRespondTemplate || this.runtime.character?.templates?.shouldRespondTemplate || composeRandomUser(telegramShouldRespondTemplate, 2)
      });
      const response = await generateShouldRespond({
        runtime: this.runtime,
        context: shouldRespondContext,
        modelClass: ModelClass.SMALL
      });
      return response === "RESPOND";
    }
    return false;
  }
  // Send long messages in chunks
  async sendMessageInChunks(ctx, content, replyToMessageId) {
    if (content.attachments && content.attachments.length > 0) {
      content.attachments.map(async (attachment) => {
        if (attachment.contentType.startsWith("image")) {
          this.sendImage(ctx, attachment.url, attachment.description);
        }
      });
    } else {
      const chunks = this.splitMessage(content.text);
      const sentMessages = [];
      for (let i = 0; i < chunks.length; i++) {
        const chunk = escapeMarkdown(chunks[i]);
        const sentMessage = await ctx.telegram.sendMessage(
          ctx.chat.id,
          chunk,
          {
            reply_parameters: i === 0 && replyToMessageId ? { message_id: replyToMessageId } : void 0,
            parse_mode: "Markdown"
          }
        );
        sentMessages.push(sentMessage);
      }
      return sentMessages;
    }
  }
  async sendImage(ctx, imagePath, caption) {
    try {
      if (/^(http|https):\/\//.test(imagePath)) {
        await ctx.telegram.sendPhoto(ctx.chat.id, imagePath, {
          caption
        });
      } else {
        if (!fs.existsSync(imagePath)) {
          throw new Error(`File not found: ${imagePath}`);
        }
        const fileStream = fs.createReadStream(imagePath);
        await ctx.telegram.sendPhoto(
          ctx.chat.id,
          {
            source: fileStream
          },
          {
            caption
          }
        );
      }
      elizaLogger.info(`Image sent successfully: ${imagePath}`);
    } catch (error) {
      elizaLogger.error("Error sending image:", error);
    }
  }
  // Split message into smaller parts
  splitMessage(text) {
    const chunks = [];
    let currentChunk = "";
    const lines = text.split("\n");
    for (const line of lines) {
      if (currentChunk.length + line.length + 1 <= MAX_MESSAGE_LENGTH) {
        currentChunk += (currentChunk ? "\n" : "") + line;
      } else {
        if (currentChunk) chunks.push(currentChunk);
        currentChunk = line;
      }
    }
    if (currentChunk) chunks.push(currentChunk);
    return chunks;
  }
  // Generate a response using AI
  async _generateResponse(message2, _state, context) {
    const { userId, roomId } = message2;
    const response = await generateMessageResponse({
      runtime: this.runtime,
      context,
      modelClass: ModelClass.LARGE
    });
    if (!response) {
      console.error("\u274C No response from generateMessageResponse");
      return null;
    }
    await this.runtime.databaseAdapter.log({
      body: { message: message2, context, response },
      userId,
      roomId,
      type: "response"
    });
    return response;
  }
  // Main handler for incoming messages
  async handleMessage(ctx) {
    if (!ctx.message || !ctx.from) {
      return;
    }
    if (this.runtime.character.clientConfig?.telegram?.shouldIgnoreBotMessages && ctx.from.is_bot) {
      return;
    }
    if (this.runtime.character.clientConfig?.telegram?.shouldIgnoreDirectMessages && ctx.chat?.type === "private") {
      return;
    }
    const message2 = ctx.message;
    const chatId = ctx.chat?.id.toString();
    const messageText = "text" in message2 ? message2.text : "caption" in message2 ? message2.caption : "";
    if (this.runtime.character.clientConfig?.telegram?.isPartOfTeam && !this.runtime.character.clientConfig?.telegram?.shouldRespondOnlyToMentions) {
      const isDirectlyMentioned = this._isMessageForMe(message2);
      const hasInterest = this._checkInterest(chatId);
      if (!this._isTeamLeader() && this._isRelevantToTeamMember(messageText, chatId)) {
        this.interestChats[chatId] = {
          currentHandler: this.bot.botInfo?.id.toString(),
          lastMessageSent: Date.now(),
          messages: []
        };
      }
      const isTeamRequest = this._isTeamCoordinationRequest(messageText);
      const isLeader = this._isTeamLeader();
      if (hasInterest && !isDirectlyMentioned) {
        const lastSelfMemories = await this.runtime.messageManager.getMemories({
          roomId: stringToUuid(
            chatId + "-" + this.runtime.agentId
          ),
          unique: false,
          count: 5
        });
        const lastSelfSortedMemories = lastSelfMemories?.filter((m) => m.userId === this.runtime.agentId).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        const isRelevant = this._isRelevantToTeamMember(
          messageText,
          chatId,
          lastSelfSortedMemories?.[0]
        );
        if (!isRelevant) {
          delete this.interestChats[chatId];
          return;
        }
      }
      if (isTeamRequest) {
        if (isLeader) {
          this.interestChats[chatId] = {
            currentHandler: this.bot.botInfo?.id.toString(),
            lastMessageSent: Date.now(),
            messages: []
          };
        } else {
          this.interestChats[chatId] = {
            currentHandler: this.bot.botInfo?.id.toString(),
            lastMessageSent: Date.now(),
            messages: []
          };
          if (!isDirectlyMentioned) {
            this.interestChats[chatId].lastMessageSent = 0;
          }
        }
      }
      const otherTeamMembers = this.runtime.character.clientConfig.telegram.teamAgentIds.filter(
        (id) => id !== this.bot.botInfo?.id.toString()
      );
      const mentionedTeamMember = otherTeamMembers.find((id) => {
        const username = this._getTeamMemberUsername(id);
        return username && messageText?.includes(`@${username}`);
      });
      if (mentionedTeamMember) {
        if (hasInterest || this.interestChats[chatId]?.currentHandler === this.bot.botInfo?.id.toString()) {
          delete this.interestChats[chatId];
          if (!isDirectlyMentioned) {
            return;
          }
        }
      }
      if (isDirectlyMentioned) {
        this.interestChats[chatId] = {
          currentHandler: this.bot.botInfo?.id.toString(),
          lastMessageSent: Date.now(),
          messages: []
        };
      } else if (!isTeamRequest && !hasInterest) {
        return;
      }
      if (this.interestChats[chatId]) {
        this.interestChats[chatId].messages.push({
          userId: stringToUuid(ctx.from.id.toString()),
          userName: ctx.from.username || ctx.from.first_name || "Unknown User",
          content: { text: messageText, source: "telegram" }
        });
        if (this.interestChats[chatId].messages.length > MESSAGE_CONSTANTS.MAX_MESSAGES) {
          this.interestChats[chatId].messages = this.interestChats[chatId].messages.slice(-MESSAGE_CONSTANTS.MAX_MESSAGES);
        }
      }
    }
    try {
      const userId = stringToUuid(ctx.from.id.toString());
      const userName = ctx.from.username || ctx.from.first_name || "Unknown User";
      const chatId2 = stringToUuid(
        ctx.chat?.id.toString() + "-" + this.runtime.agentId
      );
      const agentId = this.runtime.agentId;
      const roomId = chatId2;
      await this.runtime.ensureConnection(
        userId,
        roomId,
        userName,
        userName,
        "telegram"
      );
      const messageId = stringToUuid(
        message2.message_id.toString() + "-" + this.runtime.agentId
      );
      const imageInfo = await this.processImage(message2);
      let messageText2 = "";
      if ("text" in message2) {
        messageText2 = message2.text;
      } else if ("caption" in message2 && message2.caption) {
        messageText2 = message2.caption;
      }
      const fullText = imageInfo ? `${messageText2} ${imageInfo.description}` : messageText2;
      if (!fullText) {
        return;
      }
      const content = {
        text: fullText,
        source: "telegram",
        inReplyTo: "reply_to_message" in message2 && message2.reply_to_message ? stringToUuid(
          message2.reply_to_message.message_id.toString() + "-" + this.runtime.agentId
        ) : void 0
      };
      const memory = {
        id: messageId,
        agentId,
        userId,
        roomId,
        content,
        createdAt: message2.date * 1e3,
        embedding: getEmbeddingZeroVector()
      };
      await this.runtime.messageManager.createMemory(memory);
      let state = await this.runtime.composeState(memory);
      state = await this.runtime.updateRecentMessageState(state);
      const shouldRespond = await this._shouldRespond(message2, state);
      if (shouldRespond) {
        const context = composeContext({
          state,
          template: this.runtime.character.templates?.telegramMessageHandlerTemplate || this.runtime.character?.templates?.messageHandlerTemplate || telegramMessageHandlerTemplate
        });
        const responseContent = await this._generateResponse(
          memory,
          state,
          context
        );
        if (!responseContent || !responseContent.text) return;
        const callback = async (content2) => {
          const sentMessages = await this.sendMessageInChunks(
            ctx,
            content2,
            message2.message_id
          );
          if (sentMessages) {
            const memories = [];
            for (let i = 0; i < sentMessages.length; i++) {
              const sentMessage = sentMessages[i];
              const isLastMessage = i === sentMessages.length - 1;
              const memory2 = {
                id: stringToUuid(
                  sentMessage.message_id.toString() + "-" + this.runtime.agentId
                ),
                agentId,
                userId: agentId,
                roomId,
                content: {
                  ...content2,
                  text: sentMessage.text,
                  inReplyTo: messageId
                },
                createdAt: sentMessage.date * 1e3,
                embedding: getEmbeddingZeroVector()
              };
              memory2.content.action = !isLastMessage ? "CONTINUE" : content2.action;
              await this.runtime.messageManager.createMemory(
                memory2
              );
              memories.push(memory2);
            }
            return memories;
          }
        };
        const responseMessages = await callback(responseContent);
        state = await this.runtime.updateRecentMessageState(state);
        await this.runtime.processActions(
          memory,
          responseMessages,
          state,
          callback
        );
      }
      await this.runtime.evaluate(memory, state, shouldRespond);
    } catch (error) {
      elizaLogger.error("\u274C Error handling message:", error);
      elizaLogger.error("Error sending message:", error);
    }
  }
};

// src/getOrCreateRecommenderInBe.ts
async function getOrCreateRecommenderInBe(recommenderId, username, backendToken, backend, retries = 3, delayMs = 2e3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(
        `${backend}/api/updaters/getOrCreateRecommender`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${backendToken}`
          },
          body: JSON.stringify({
            recommenderId,
            username
          })
        }
      );
      const data = await response.json();
      return data;
    } catch (error) {
      console.error(
        `Attempt ${attempt} failed: Error getting or creating recommender in backend`,
        error
      );
      if (attempt < retries) {
        console.log(`Retrying in ${delayMs} ms...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      } else {
        console.error("All attempts failed.");
      }
    }
  }
}

// src/trading/config.ts
var truthy = /* @__PURE__ */ new Set(["1", "true", "yes", "on"]);
var falsy = /* @__PURE__ */ new Set(["0", "false", "no", "off"]);
function parseBoolean(value, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return fallback;
  const normalized = value.trim().toLowerCase();
  if (truthy.has(normalized)) return true;
  if (falsy.has(normalized)) return false;
  return fallback;
}
function getSetting(runtime, key) {
  const value = runtime.getSetting(key) || process.env[key];
  return typeof value === "string" && value.trim() ? value.trim() : void 0;
}
function getNumberSetting(runtime, key, fallback) {
  const raw = getSetting(runtime, key);
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}
function getBoundedIntegerSetting(runtime, key, fallback, min, max) {
  const parsed = getNumberSetting(runtime, key, fallback);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}
function loadTradingConfig(runtime) {
  const tgTrader = parseBoolean(getSetting(runtime, "TG_TRADER"), false);
  const tradingEnabled = parseBoolean(
    getSetting(runtime, "RIBBOT_TRADING_ENABLED"),
    false
  );
  return {
    tgTrader,
    spotEnabled: parseBoolean(
      getSetting(runtime, "RIBBOT_SPOT_ENABLED"),
      false
    ),
    nftTradingEnabled: parseBoolean(
      getSetting(runtime, "RIBBOT_NFT_TRADING_ENABLED"),
      false
    ),
    tradingEnabled,
    dryRun: parseBoolean(
      getSetting(runtime, "RIBBOT_TRADING_DRY_RUN"),
      true
    ),
    quotePreviewsEnabled: parseBoolean(
      getSetting(runtime, "RIBBOT_QUOTE_PREVIEWS_ENABLED"),
      true
    ),
    confirmTrades: parseBoolean(
      getSetting(runtime, "RIBBOT_TRADING_CONFIRM_TRADES"),
      true
    ),
    activityAlertsEnabled: parseBoolean(
      getSetting(runtime, "RIBBOT_ACTIVITY_ALERTS_ENABLED"),
      false
    ),
    activityAlertPollIntervalMs: getBoundedIntegerSetting(
      runtime,
      "RIBBOT_ACTIVITY_ALERT_POLL_INTERVAL_MS",
      3e4,
      1e4,
      3e5
    ),
    activityAlertMaxUsersPerPoll: getBoundedIntegerSetting(
      runtime,
      "RIBBOT_ACTIVITY_ALERT_MAX_USERS_PER_POLL",
      25,
      1,
      100
    ),
    activityAlertMaxEventsPerMessage: getBoundedIntegerSetting(
      runtime,
      "RIBBOT_ACTIVITY_ALERT_MAX_EVENTS_PER_MESSAGE",
      5,
      1,
      10
    ),
    frogxApiBaseUrl: getSetting(runtime, "FROGX_API_BASE_URL") || "https://frogx-api.aklo.workers.dev",
    ftxApiToken: getSetting(runtime, "RIBBOT_FTX_API_TOKEN"),
    stateFile: getSetting(runtime, "RIBBOT_TRADING_STATE_FILE") || ".state/ribbot-trading.json",
    defaultBuySol: getNumberSetting(runtime, "RIBBOT_DEFAULT_BUY_SOL", 0.1),
    slippageBps: getNumberSetting(
      runtime,
      "RIBBOT_TRADING_SLIPPAGE_BPS",
      500
    ),
    priorityFeeLamports: getNumberSetting(
      runtime,
      "RIBBOT_TRADING_PRIORITY_FEE_LAMPORTS",
      0
    )
  };
}

// src/trading/TradingBot.ts
import { Markup } from "telegraf";

// src/trading/logger.ts
var logger = {
  info: (...values) => console.info(...values),
  warn: (...values) => console.warn(...values),
  error: (...values) => console.error(...values)
};

// src/trading/frogx.ts
var WRAPPED_SOL_MINT = "So11111111111111111111111111111111111111112";
async function provisionTradingWallet(input) {
  const headers = {
    "Content-Type": "application/json"
  };
  if (input.ftxApiToken) {
    headers.Authorization = `Bearer ${input.ftxApiToken}`;
  }
  const response = await fetch(
    `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/trading-bot/wallet`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        telegramUserId: input.telegramUserId,
        username: input.username,
        externalAddress: input.externalAddress,
        action: input.action,
        walletId: input.walletId
      })
    }
  );
  if (!response.ok && response.status !== 503) {
    throw new Error(
      `FrogX wallet setup failed with status ${response.status}`
    );
  }
  return await response.json();
}
async function fetchTradingAccount(input) {
  const headers = {};
  if (input.ftxApiToken) {
    headers.Authorization = `Bearer ${input.ftxApiToken}`;
  }
  const response = await fetch(
    `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/trading-bot/account?telegramUserId=${encodeURIComponent(input.telegramUserId)}`,
    { headers }
  );
  if (!response.ok && response.status !== 503 && response.status !== 404 && response.status !== 409) {
    throw new Error(
      `FrogX account fetch failed with status ${response.status}`
    );
  }
  return await response.json();
}
async function fetchActivity(input) {
  const headers = {};
  if (input.ftxApiToken) {
    headers.Authorization = `Bearer ${input.ftxApiToken}`;
  }
  const params = new URLSearchParams({
    telegramUserId: input.telegramUserId
  });
  if (input.limit) {
    params.set("limit", String(input.limit));
  }
  const response = await fetch(
    `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/trading-bot/activity?${params.toString()}`,
    { headers }
  );
  if (!response.ok && response.status !== 503) {
    throw new Error(
      `FrogX activity fetch failed with status ${response.status}`
    );
  }
  return await response.json();
}
async function fetchPerpsStatus(input) {
  const headers = {};
  if (input.ftxApiToken) {
    headers.Authorization = `Bearer ${input.ftxApiToken}`;
  }
  const response = await fetch(
    `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/trading-bot/perps/status?telegramUserId=${encodeURIComponent(input.telegramUserId)}`,
    { headers }
  );
  if (response.status === 409) {
    return {
      status: "imperial_reconnect",
      telegramUserId: input.telegramUserId
    };
  }
  if (!response.ok && response.status !== 503 && response.status !== 404) {
    throw new Error(
      `FrogX Perps status fetch failed with status ${response.status}`
    );
  }
  return await response.json();
}
async function previewDeltaNeutral(input) {
  const response = await postDeltaNeutralRequest(input, "preview");
  const data = await response.json().catch(() => null);
  const unavailable = deltaNeutralUnavailableResult(response, data);
  if (unavailable) return unavailable;
  const record = objectRecord(data);
  const preview = deltaNeutralPreview(record?.preview);
  if (!response.ok || record?.status !== "ready" || record.defaultStrategy !== "delta_neutral" || record.defaultPreset !== "low" || typeof record.liveExecutionEnabled !== "boolean" || !preview) {
    throw new Error(
      "FrogX Delta Neutral preview returned a malformed response"
    );
  }
  return {
    status: "ready",
    defaultStrategy: "delta_neutral",
    defaultPreset: "low",
    preview,
    liveExecutionEnabled: record.liveExecutionEnabled
  };
}
async function startDeltaNeutral(input) {
  const response = await postDeltaNeutralRequest(input, "start", {
    idempotencyKey: input.idempotencyKey,
    confirmLive: input.confirmLive
  });
  const data = await response.json().catch(() => null);
  const unavailable = deltaNeutralUnavailableResult(response, data);
  if (unavailable) return unavailable;
  const record = objectRecord(data);
  const run = deltaNeutralRun(record?.run);
  if (!response.ok || typeof record?.status !== "string" || typeof record.idempotent !== "boolean" || !run) {
    throw new Error(
      "FrogX Delta Neutral start returned a malformed response"
    );
  }
  return {
    status: record.status,
    idempotent: record.idempotent,
    run
  };
}
async function fetchDeltaNeutralStatus(input) {
  const response = await postDeltaNeutralRequest(input, "status");
  const data = await response.json().catch(() => null);
  const unavailable = deltaNeutralUnavailableResult(response, data);
  if (unavailable) return unavailable;
  const record = objectRecord(data);
  const run = record?.run === null ? null : deltaNeutralRun(record?.run);
  if (!response.ok || record?.status !== "ready" || record.defaultStrategy !== "delta_neutral" || record.defaultPreset !== "low" || typeof record.configured !== "boolean" || typeof record.enabled !== "boolean" || typeof record.liveExecutionEnabled !== "boolean" || run === void 0) {
    throw new Error(
      "FrogX Delta Neutral status returned a malformed response"
    );
  }
  return {
    status: "ready",
    defaultStrategy: "delta_neutral",
    defaultPreset: "low",
    configured: record.configured,
    enabled: record.enabled,
    liveExecutionEnabled: record.liveExecutionEnabled,
    run
  };
}
async function stopDeltaNeutral(input) {
  const response = await postDeltaNeutralRequest(input, "stop");
  const data = await response.json().catch(() => null);
  const unavailable = deltaNeutralUnavailableResult(response, data);
  if (unavailable) return unavailable;
  const record = objectRecord(data);
  const run = deltaNeutralRunStatus(record?.run);
  if (!response.ok || typeof record?.status !== "string" || !run) {
    throw new Error(
      "FrogX Delta Neutral stop returned a malformed response"
    );
  }
  return { status: record.status, run };
}
async function postDeltaNeutralRequest(input, action, body = {}) {
  const headers = {
    "Content-Type": "application/json"
  };
  if (input.ftxApiToken) {
    headers.Authorization = `Bearer ${input.ftxApiToken}`;
  }
  return fetch(
    `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/trading-bot/perps/delta-neutral/${action}`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        telegramUserId: input.telegramUserId,
        ...body
      })
    }
  );
}
async function fetchReferralSummary(input) {
  const headers = {};
  if (input.ftxApiToken) {
    headers.Authorization = `Bearer ${input.ftxApiToken}`;
  }
  const response = await fetch(
    `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/trading-bot/referrals?telegramUserId=${encodeURIComponent(input.telegramUserId)}`,
    { headers }
  );
  if (!response.ok && response.status !== 503 && response.status !== 404) {
    throw new Error(
      `FrogX referral summary failed with status ${response.status}`
    );
  }
  return await response.json();
}
async function applyReferralCode(input) {
  const headers = {
    "Content-Type": "application/json"
  };
  if (input.ftxApiToken) {
    headers.Authorization = `Bearer ${input.ftxApiToken}`;
  }
  const response = await fetch(
    `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/trading-bot/referrals`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        telegramUserId: input.telegramUserId,
        username: input.username,
        referralCode: input.referralCode
      })
    }
  );
  if (!response.ok && response.status !== 503 && response.status !== 404 && response.status !== 409) {
    throw new Error(
      `FrogX referral apply failed with status ${response.status}`
    );
  }
  return await response.json();
}
async function requestControlCode(input) {
  const headers = {
    "Content-Type": "application/json"
  };
  if (input.ftxApiToken) {
    headers.Authorization = `Bearer ${input.ftxApiToken}`;
  }
  const response = await fetch(
    `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/trading-bot/control/code`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        telegramUserId: input.telegramUserId,
        username: input.username
      })
    }
  );
  if (!response.ok && response.status !== 503) {
    throw new Error(
      `FrogX control code request failed with status ${response.status}`
    );
  }
  return await response.json();
}
async function resetTradingSetup(input) {
  const headers = {
    "Content-Type": "application/json"
  };
  if (input.ftxApiToken) {
    headers.Authorization = `Bearer ${input.ftxApiToken}`;
  }
  const response = await fetch(
    `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/trading-bot/setup/reset`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        telegramUserId: input.telegramUserId
      })
    }
  );
  if (!response.ok && response.status !== 503) {
    throw new Error(
      `FrogX setup reset failed with status ${response.status}`
    );
  }
  return await response.json();
}
async function executeSwapTransaction(input) {
  const headers = {
    "Content-Type": "application/json"
  };
  if (input.ftxApiToken) {
    headers.Authorization = `Bearer ${input.ftxApiToken}`;
  }
  const response = await fetch(
    `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/trading-bot/execute`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        orderId: input.orderId,
        telegramUserId: input.telegramUserId,
        userPublicKey: input.userPublicKey,
        inMint: input.inMint,
        outMint: input.outMint,
        amountIn: input.amountIn,
        slippageBps: input.slippageBps,
        priorityFee: input.priorityFeeLamports,
        executionMode: input.executionMode
      })
    }
  );
  const data = await response.json();
  if (data.status === "not_configured") {
    return data;
  }
  if (data.status === "pending_reconciliation" && data.referenceId) {
    return data;
  }
  if (data.status === "not_executable") {
    return data;
  }
  if (response.ok && data.status === "executed" && typeof data.signature === "string" && data.signature.length > 0) {
    return data;
  }
  return {
    status: "not_executable",
    error: data.error ?? `FTX/FrogX rejected swap execution with status ${response.status}`
  };
}
async function fetchSwapExecutionStatus(input) {
  return fetchDirectExecutionStatus(
    `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/trading-bot/execute/status`,
    input.ftxApiToken,
    {
      orderId: input.orderId,
      telegramUserId: input.telegramUserId,
      userPublicKey: input.userPublicKey,
      inMint: input.inMint,
      outMint: input.outMint,
      amountIn: input.amountIn,
      slippageBps: input.slippageBps,
      priorityFee: input.priorityFeeLamports
    }
  );
}
async function storeScheduledOrder(input) {
  const headers = {
    "Content-Type": "application/json"
  };
  if (input.ftxApiToken) {
    headers.Authorization = `Bearer ${input.ftxApiToken}`;
  }
  const response = await fetch(
    `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/trading-bot/orders`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        telegramUserId: input.telegramUserId,
        userPublicKey: input.userPublicKey,
        kind: input.kind,
        side: input.side,
        mint: input.mint,
        inMint: input.inMint,
        outMint: input.outMint,
        amountIn: input.amountIn,
        amountLabel: input.amountLabel,
        slippageBps: input.slippageBps,
        priorityFee: input.priorityFeeLamports,
        triggerPrice: input.triggerPrice,
        triggerDirection: input.triggerDirection,
        orderCount: input.orderCount,
        intervalMinutes: input.intervalMinutes,
        trailingBps: input.trailingBps
      })
    }
  );
  if (!response.ok && response.status !== 503) {
    throw new Error(
      `FrogX order storage failed with status ${response.status}`
    );
  }
  return await response.json();
}
async function fetchScheduledOrders(input) {
  const headers = {};
  if (input.ftxApiToken) {
    headers.Authorization = `Bearer ${input.ftxApiToken}`;
  }
  const response = await fetch(
    `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/trading-bot/orders?telegramUserId=${encodeURIComponent(input.telegramUserId)}`,
    { headers }
  );
  if (!response.ok && response.status !== 503) {
    throw new Error(
      `FrogX order list failed with status ${response.status}`
    );
  }
  return await response.json();
}
async function cancelStoredScheduledOrder(input) {
  const headers = {
    "Content-Type": "application/json"
  };
  if (input.ftxApiToken) {
    headers.Authorization = `Bearer ${input.ftxApiToken}`;
  }
  const response = await fetch(
    `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/trading-bot/orders/cancel`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        telegramUserId: input.telegramUserId,
        orderId: input.orderId
      })
    }
  );
  if (!response.ok && response.status !== 503 && response.status !== 404 && response.status !== 409) {
    throw new Error(
      `FrogX order cancel failed with status ${response.status}`
    );
  }
  if (response.status === 404 || response.status === 409) {
    const data = await response.json();
    return {
      status: response.status === 404 ? "not_found" : "not_cancellable",
      error: data.error
    };
  }
  return await response.json();
}
async function validateWithdrawal(input) {
  const headers = {
    "Content-Type": "application/json"
  };
  if (input.ftxApiToken) {
    headers.Authorization = `Bearer ${input.ftxApiToken}`;
  }
  const response = await fetch(
    `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/trading-bot/withdrawals/validate`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        telegramUserId: input.telegramUserId,
        userPublicKey: input.userPublicKey,
        mint: input.mint,
        amountIn: input.amountIn,
        amountLabel: input.amountLabel,
        destinationAddress: input.destinationAddress
      })
    }
  );
  if (!response.ok && response.status !== 503) {
    throw new Error(
      `FrogX withdrawal validation failed with status ${response.status}`
    );
  }
  return await response.json();
}
async function executeWithdrawal(input) {
  const headers = {
    "Content-Type": "application/json"
  };
  if (input.ftxApiToken) {
    headers.Authorization = `Bearer ${input.ftxApiToken}`;
  }
  const response = await fetch(
    `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/trading-bot/withdrawals/execute`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        withdrawalId: input.withdrawalId,
        telegramUserId: input.telegramUserId,
        userPublicKey: input.userPublicKey,
        mint: input.mint,
        amountIn: input.amountIn,
        amountLabel: input.amountLabel,
        destinationAddress: input.destinationAddress
      })
    }
  );
  const data = await response.json();
  if (data.status === "not_configured") {
    return data;
  }
  if (data.status === "pending_reconciliation" && data.referenceId) {
    return data;
  }
  if (data.status === "not_executable") {
    return data;
  }
  if (response.ok && data.status === "executed" && typeof data.signature === "string" && data.signature.length > 0) {
    return data;
  }
  return {
    status: "not_executable",
    error: data.error ?? `FTX/FrogX rejected withdrawal execution with status ${response.status}`
  };
}
async function fetchWithdrawalExecutionStatus(input) {
  return fetchDirectExecutionStatus(
    `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/trading-bot/withdrawals/status`,
    input.ftxApiToken,
    {
      withdrawalId: input.withdrawalId,
      telegramUserId: input.telegramUserId,
      userPublicKey: input.userPublicKey,
      mint: input.mint,
      amountIn: input.amountIn,
      amountLabel: input.amountLabel,
      destinationAddress: input.destinationAddress
    }
  );
}
async function fetchDirectExecutionStatus(url, ftxApiToken, body) {
  const headers = {
    "Content-Type": "application/json"
  };
  if (ftxApiToken) {
    headers.Authorization = `Bearer ${ftxApiToken}`;
  }
  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body)
  });
  let data;
  try {
    data = await response.json();
  } catch {
    return {
      status: "lookup_error",
      error: `FTX/FrogX returned an unreadable execution-status response (${response.status})`
    };
  }
  if (data.status === "not_configured") {
    return data;
  }
  if (data.status === "executed" && typeof data.signature === "string" && data.signature.length > 0 && typeof data.executedAt === "string") {
    return data;
  }
  if (data.status === "lookup_error" || data.status === "not_found" || data.status === "not_executable" || data.status === "mismatch" || data.status === "pending" || data.status === "failed") {
    return data;
  }
  return {
    status: "lookup_error",
    error: data.error ?? `FTX/FrogX returned an unexpected execution-status response (${response.status})`
  };
}
async function storeCopyTradeConfig(input) {
  const headers = {
    "Content-Type": "application/json"
  };
  if (input.ftxApiToken) {
    headers.Authorization = `Bearer ${input.ftxApiToken}`;
  }
  const response = await fetch(
    `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/trading-bot/copytrade`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        telegramUserId: input.telegramUserId,
        userPublicKey: input.userPublicKey,
        tag: input.tag,
        targetWallet: input.targetWallet,
        buyMode: input.buyMode,
        buyPercentageBps: input.buyPercentageBps,
        maxBuyAmountIn: input.maxBuyAmountIn,
        amountLabel: input.amountLabel,
        slippageBps: input.slippageBps,
        priorityFee: input.priorityFeeLamports,
        sellPriorityFee: input.sellPriorityFeeLamports,
        copySells: input.copySells,
        duplicateBuys: input.duplicateBuys,
        onlyRenounced: input.onlyRenounced,
        excludePumpFunTokens: input.excludePumpFunTokens,
        minTargetBuyAmountIn: input.minTargetBuyAmountIn,
        minLiquidityUsd: input.minLiquidityUsd,
        minMarketCapUsd: input.minMarketCapUsd,
        maxMarketCapUsd: input.maxMarketCapUsd,
        blacklistMints: input.blacklistMints
      })
    }
  );
  if (!response.ok && response.status !== 503) {
    throw new Error(
      `FrogX copytrade storage failed with status ${response.status}`
    );
  }
  return await response.json();
}
async function fetchCopyTradeConfigs(input) {
  const headers = {};
  if (input.ftxApiToken) {
    headers.Authorization = `Bearer ${input.ftxApiToken}`;
  }
  const response = await fetch(
    `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/trading-bot/copytrade?telegramUserId=${encodeURIComponent(input.telegramUserId)}`,
    { headers }
  );
  if (!response.ok && response.status !== 503) {
    throw new Error(
      `FrogX copytrade list failed with status ${response.status}`
    );
  }
  return await response.json();
}
async function fetchCopyTradeExecutionStatus(input) {
  return fetchAdvancedAutomationExecutionStatus(
    input,
    "copytrade"
  );
}
async function cancelStoredCopyTradeConfig(input) {
  const headers = {
    "Content-Type": "application/json"
  };
  if (input.ftxApiToken) {
    headers.Authorization = `Bearer ${input.ftxApiToken}`;
  }
  const response = await fetch(
    `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/trading-bot/copytrade/cancel`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        telegramUserId: input.telegramUserId,
        configId: input.configId
      })
    }
  );
  if (!response.ok && response.status !== 503 && response.status !== 404 && response.status !== 409) {
    throw new Error(
      `FrogX copytrade cancel failed with status ${response.status}`
    );
  }
  if (response.status === 404) {
    const data = await response.json();
    return { status: "not_found", error: data.error };
  }
  if (response.status === 409) {
    const data = await response.json();
    return {
      status: "not_cancellable",
      error: data.error,
      config: data.config
    };
  }
  return await response.json();
}
async function controlStoredCopyTradeConfig(input) {
  const headers = {
    "Content-Type": "application/json"
  };
  if (input.ftxApiToken) {
    headers.Authorization = `Bearer ${input.ftxApiToken}`;
  }
  const response = await fetch(
    `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/trading-bot/copytrade/control`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        telegramUserId: input.telegramUserId,
        configId: input.configId,
        action: input.action
      })
    }
  );
  if (!response.ok && response.status !== 503 && response.status !== 404 && response.status !== 409) {
    throw new Error(
      `FrogX copytrade control failed with status ${response.status}`
    );
  }
  if (response.status === 404) {
    const data = await response.json();
    return { status: "not_found", error: data.error };
  }
  if (response.status === 409) {
    const data = await response.json();
    return {
      status: "not_controllable",
      error: data.error,
      config: data.config
    };
  }
  return await response.json();
}
async function updateStoredCopyTradeConfig(input) {
  const headers = {
    "Content-Type": "application/json"
  };
  if (input.ftxApiToken) {
    headers.Authorization = `Bearer ${input.ftxApiToken}`;
  }
  const response = await fetch(
    `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/trading-bot/copytrade/update`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        configId: input.configId,
        telegramUserId: input.telegramUserId,
        userPublicKey: input.userPublicKey,
        tag: input.tag,
        targetWallet: input.targetWallet,
        buyMode: input.buyMode,
        buyPercentageBps: input.buyPercentageBps,
        maxBuyAmountIn: input.maxBuyAmountIn,
        amountLabel: input.amountLabel,
        slippageBps: input.slippageBps,
        priorityFee: input.priorityFeeLamports,
        sellPriorityFee: input.sellPriorityFeeLamports,
        copySells: input.copySells,
        duplicateBuys: input.duplicateBuys,
        onlyRenounced: input.onlyRenounced,
        excludePumpFunTokens: input.excludePumpFunTokens,
        minTargetBuyAmountIn: input.minTargetBuyAmountIn,
        minLiquidityUsd: input.minLiquidityUsd,
        minMarketCapUsd: input.minMarketCapUsd,
        maxMarketCapUsd: input.maxMarketCapUsd,
        blacklistMints: input.blacklistMints
      })
    }
  );
  if (!response.ok && response.status !== 503 && response.status !== 404 && response.status !== 409) {
    throw new Error(
      `FrogX copytrade update failed with status ${response.status}`
    );
  }
  if (response.status === 404) {
    const data = await response.json();
    return { status: "not_found", error: data.error };
  }
  if (response.status === 409) {
    const data = await response.json();
    return {
      status: "not_updatable",
      error: data.error,
      config: data.config
    };
  }
  return await response.json();
}
async function duplicateStoredCopyTradeConfig(input) {
  const headers = {
    "Content-Type": "application/json"
  };
  if (input.ftxApiToken) {
    headers.Authorization = `Bearer ${input.ftxApiToken}`;
  }
  const response = await fetch(
    `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/trading-bot/copytrade/duplicate`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        telegramUserId: input.telegramUserId,
        configId: input.configId,
        tag: input.tag
      })
    }
  );
  if (!response.ok && response.status !== 503 && response.status !== 404 && response.status !== 409) {
    throw new Error(
      `FrogX copytrade duplicate failed with status ${response.status}`
    );
  }
  if (response.status === 404) {
    const data = await response.json();
    return { status: "not_found", error: data.error };
  }
  if (response.status === 409) {
    const data = await response.json();
    return {
      status: "not_duplicable",
      error: data.error,
      config: data.config
    };
  }
  return await response.json();
}
async function storeSniperConfig(input) {
  const headers = {
    "Content-Type": "application/json"
  };
  if (input.ftxApiToken) {
    headers.Authorization = `Bearer ${input.ftxApiToken}`;
  }
  const response = await fetch(
    `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/trading-bot/sniper`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        telegramUserId: input.telegramUserId,
        userPublicKey: input.userPublicKey,
        source: input.source,
        maxBuyAmountIn: input.maxBuyAmountIn,
        amountLabel: input.amountLabel,
        slippageBps: input.slippageBps,
        priorityFee: input.priorityFeeLamports,
        minLiquidityUsd: input.minLiquidityUsd,
        maxMarketCapUsd: input.maxMarketCapUsd,
        maxSnipes: input.maxSnipes
      })
    }
  );
  if (!response.ok && response.status !== 503) {
    throw new Error(
      `FrogX sniper storage failed with status ${response.status}`
    );
  }
  return await response.json();
}
async function fetchSniperConfigs(input) {
  const headers = {};
  if (input.ftxApiToken) {
    headers.Authorization = `Bearer ${input.ftxApiToken}`;
  }
  const response = await fetch(
    `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/trading-bot/sniper?telegramUserId=${encodeURIComponent(input.telegramUserId)}`,
    { headers }
  );
  if (!response.ok && response.status !== 503) {
    throw new Error(
      `FrogX sniper list failed with status ${response.status}`
    );
  }
  return await response.json();
}
async function fetchSniperExecutionStatus(input) {
  return fetchAdvancedAutomationExecutionStatus(
    input,
    "sniper"
  );
}
async function cancelStoredSniperConfig(input) {
  const headers = {
    "Content-Type": "application/json"
  };
  if (input.ftxApiToken) {
    headers.Authorization = `Bearer ${input.ftxApiToken}`;
  }
  const response = await fetch(
    `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/trading-bot/sniper/cancel`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        telegramUserId: input.telegramUserId,
        configId: input.configId
      })
    }
  );
  if (!response.ok && response.status !== 503 && response.status !== 404 && response.status !== 409) {
    throw new Error(
      `FrogX sniper cancel failed with status ${response.status}`
    );
  }
  if (response.status === 404) {
    const data = await response.json();
    return { status: "not_found", error: data.error };
  }
  if (response.status === 409) {
    const data = await response.json();
    return {
      status: "not_cancellable",
      error: data.error,
      config: data.config
    };
  }
  return await response.json();
}
async function storeAutoBuyConfig(input) {
  const headers = {
    "Content-Type": "application/json"
  };
  if (input.ftxApiToken) {
    headers.Authorization = `Bearer ${input.ftxApiToken}`;
  }
  const response = await fetch(
    `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/trading-bot/auto-buy`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        telegramUserId: input.telegramUserId,
        userPublicKey: input.userPublicKey,
        mint: input.mint,
        maxBuyAmountIn: input.maxBuyAmountIn,
        amountLabel: input.amountLabel,
        slippageBps: input.slippageBps,
        priorityFee: input.priorityFeeLamports,
        minLiquidityUsd: input.minLiquidityUsd,
        maxMarketCapUsd: input.maxMarketCapUsd
      })
    }
  );
  if (!response.ok && response.status !== 503) {
    throw new Error(
      `FrogX auto-buy storage failed with status ${response.status}`
    );
  }
  return await response.json();
}
async function fetchAutoBuyConfigs(input) {
  const headers = {};
  if (input.ftxApiToken) {
    headers.Authorization = `Bearer ${input.ftxApiToken}`;
  }
  const response = await fetch(
    `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/trading-bot/auto-buy?telegramUserId=${encodeURIComponent(input.telegramUserId)}`,
    { headers }
  );
  if (!response.ok && response.status !== 503) {
    throw new Error(
      `FrogX auto-buy list failed with status ${response.status}`
    );
  }
  return await response.json();
}
async function fetchAutoBuyExecutionStatus(input) {
  return fetchAdvancedAutomationExecutionStatus(
    input,
    "auto-buy"
  );
}
async function cancelStoredAutoBuyConfig(input) {
  const headers = {
    "Content-Type": "application/json"
  };
  if (input.ftxApiToken) {
    headers.Authorization = `Bearer ${input.ftxApiToken}`;
  }
  const response = await fetch(
    `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/trading-bot/auto-buy/cancel`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        telegramUserId: input.telegramUserId,
        configId: input.configId
      })
    }
  );
  if (!response.ok && response.status !== 503 && response.status !== 404 && response.status !== 409) {
    throw new Error(
      `FrogX auto-buy cancel failed with status ${response.status}`
    );
  }
  if (response.status === 404) {
    const data = await response.json();
    return { status: "not_found", error: data.error };
  }
  if (response.status === 409) {
    const data = await response.json();
    return {
      status: "not_cancellable",
      error: data.error,
      config: data.config
    };
  }
  return await response.json();
}
async function storeBundleBuyConfig(input) {
  const headers = {
    "Content-Type": "application/json"
  };
  if (input.ftxApiToken) {
    headers.Authorization = `Bearer ${input.ftxApiToken}`;
  }
  const response = await fetch(
    `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/trading-bot/bundle-buy`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        telegramUserId: input.telegramUserId,
        userPublicKey: input.userPublicKey,
        items: input.items,
        amountLabel: input.amountLabel,
        slippageBps: input.slippageBps,
        priorityFee: input.priorityFeeLamports,
        minLiquidityUsd: input.minLiquidityUsd,
        maxMarketCapUsd: input.maxMarketCapUsd
      })
    }
  );
  if (!response.ok && response.status !== 503) {
    throw new Error(
      `FrogX bundle-buy storage failed with status ${response.status}`
    );
  }
  return await response.json();
}
async function fetchBundleBuyConfigs(input) {
  const headers = {};
  if (input.ftxApiToken) {
    headers.Authorization = `Bearer ${input.ftxApiToken}`;
  }
  const response = await fetch(
    `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/trading-bot/bundle-buy?telegramUserId=${encodeURIComponent(input.telegramUserId)}`,
    { headers }
  );
  if (!response.ok && response.status !== 503) {
    throw new Error(
      `FrogX bundle-buy list failed with status ${response.status}`
    );
  }
  return await response.json();
}
async function cancelStoredBundleBuyConfig(input) {
  const headers = {
    "Content-Type": "application/json"
  };
  if (input.ftxApiToken) {
    headers.Authorization = `Bearer ${input.ftxApiToken}`;
  }
  const response = await fetch(
    `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/trading-bot/bundle-buy/cancel`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        telegramUserId: input.telegramUserId,
        configId: input.configId
      })
    }
  );
  if (!response.ok && response.status !== 503 && response.status !== 404 && response.status !== 409) {
    throw new Error(
      `FrogX bundle-buy cancel failed with status ${response.status}`
    );
  }
  if (response.status === 404 || response.status === 409) {
    const data = await response.json();
    return {
      status: response.status === 404 ? "not_found" : "not_cancellable",
      error: data.error
    };
  }
  return await response.json();
}
async function executeStoredBundleBuyConfig(input) {
  const headers = {
    "Content-Type": "application/json"
  };
  if (input.ftxApiToken) {
    headers.Authorization = `Bearer ${input.ftxApiToken}`;
  }
  const response = await fetch(
    `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/trading-bot/bundle-buy/execute`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        telegramUserId: input.telegramUserId,
        userPublicKey: input.userPublicKey,
        configId: input.configId
      })
    }
  );
  const data = await response.json();
  if (data.status === "not_configured") {
    return data;
  }
  if (data.status === "not_found") {
    return data;
  }
  if (data.status === "pending_reconciliation" && data.configId) {
    return data;
  }
  if (data.status === "not_executable") {
    return data;
  }
  if (response.ok && data.status === "executed" && typeof data.configId === "string" && Array.isArray(data.executions)) {
    return data;
  }
  return {
    status: "not_executable",
    error: data.error ?? `FTX/FrogX rejected bundle-buy execution with status ${response.status}`
  };
}
async function fetchStoredBundleBuyExecutionStatus(input) {
  const headers = {
    "Content-Type": "application/json"
  };
  if (input.ftxApiToken) {
    headers.Authorization = `Bearer ${input.ftxApiToken}`;
  }
  const response = await fetch(
    `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/trading-bot/bundle-buy/status`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        telegramUserId: input.telegramUserId,
        userPublicKey: input.userPublicKey,
        configId: input.configId
      })
    }
  );
  let data;
  try {
    data = await response.json();
  } catch {
    return {
      status: "lookup_error",
      error: `FTX/FrogX returned an unreadable bundle status response (${response.status})`
    };
  }
  if (data.status === "not_configured") {
    return data;
  }
  if (data.status === "executed" && typeof data.configId === "string" && typeof data.executedAt === "string" && Array.isArray(data.executions)) {
    return data;
  }
  if (data.status === "not_found" || data.status === "not_started" || data.status === "pending_reconciliation" || data.status === "failed" || data.status === "mismatch" || data.status === "lookup_error") {
    return data;
  }
  return {
    status: "lookup_error",
    error: data.error ?? `FTX/FrogX returned an unexpected bundle status response (${response.status})`
  };
}
async function storeAutoSellConfig(input) {
  const headers = {
    "Content-Type": "application/json"
  };
  if (input.ftxApiToken) {
    headers.Authorization = `Bearer ${input.ftxApiToken}`;
  }
  const response = await fetch(
    `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/trading-bot/auto-sell`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        telegramUserId: input.telegramUserId,
        userPublicKey: input.userPublicKey,
        mint: input.mint,
        sellBps: input.sellBps,
        amountLabel: input.amountLabel,
        slippageBps: input.slippageBps,
        priorityFee: input.priorityFeeLamports,
        triggerPrice: input.triggerPrice,
        triggerDirection: input.triggerDirection
      })
    }
  );
  if (!response.ok && response.status !== 503) {
    throw new Error(
      `FrogX auto-sell storage failed with status ${response.status}`
    );
  }
  return await response.json();
}
async function fetchAutoSellConfigs(input) {
  const headers = {};
  if (input.ftxApiToken) {
    headers.Authorization = `Bearer ${input.ftxApiToken}`;
  }
  const response = await fetch(
    `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/trading-bot/auto-sell?telegramUserId=${encodeURIComponent(input.telegramUserId)}`,
    { headers }
  );
  if (!response.ok && response.status !== 503) {
    throw new Error(
      `FrogX auto-sell list failed with status ${response.status}`
    );
  }
  return await response.json();
}
async function fetchAutoSellExecutionStatus(input) {
  return fetchAdvancedAutomationExecutionStatus(
    input,
    "auto-sell"
  );
}
async function cancelStoredAutoSellConfig(input) {
  const headers = {
    "Content-Type": "application/json"
  };
  if (input.ftxApiToken) {
    headers.Authorization = `Bearer ${input.ftxApiToken}`;
  }
  const response = await fetch(
    `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/trading-bot/auto-sell/cancel`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        telegramUserId: input.telegramUserId,
        configId: input.configId
      })
    }
  );
  if (!response.ok && response.status !== 503 && response.status !== 404 && response.status !== 409) {
    throw new Error(
      `FrogX auto-sell cancel failed with status ${response.status}`
    );
  }
  if (response.status === 404) {
    const data = await response.json();
    return { status: "not_found", error: data.error };
  }
  if (response.status === 409) {
    const data = await response.json();
    return {
      status: "not_cancellable",
      error: data.error,
      config: data.config
    };
  }
  return await response.json();
}
async function validatePreferences(input) {
  const headers = {
    "Content-Type": "application/json"
  };
  if (input.ftxApiToken) {
    headers.Authorization = `Bearer ${input.ftxApiToken}`;
  }
  const response = await fetch(
    `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/trading-bot/preferences/validate`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        telegramUserId: input.telegramUserId,
        userPublicKey: input.userPublicKey,
        kind: input.kind,
        action: input.action,
        mint: input.mint,
        slippageBps: input.slippageBps,
        priorityFee: input.priorityFeeLamports,
        sellPriorityFee: input.sellPriorityFeeLamports,
        defaultBuyAmountIn: input.defaultBuyAmountIn,
        buyPresetAmountsIn: input.buyPresetAmountsIn,
        sellPresetBps: input.sellPresetBps,
        botMode: input.botMode,
        confirmTrades: input.confirmTrades,
        sellProtection: input.sellProtection,
        autoBuyEnabled: input.autoBuyEnabled,
        instantAutoBuyEnabled: input.instantAutoBuyEnabled,
        instantAutoBuyAmountIn: input.instantAutoBuyAmountIn,
        instantAutoBuyMinLiquidityUsd: input.instantAutoBuyMinLiquidityUsd,
        instantAutoBuyMaxMarketCapUsd: input.instantAutoBuyMaxMarketCapUsd,
        autoSellEnabled: input.autoSellEnabled,
        sniperEnabled: input.sniperEnabled,
        mevProtection: input.mevProtection
      })
    }
  );
  if (!response.ok && response.status !== 503) {
    throw new Error(
      `FrogX preference validation failed with status ${response.status}`
    );
  }
  return await response.json();
}
async function fetchPositions(input) {
  const headers = {
    "Content-Type": "application/json"
  };
  if (input.ftxApiToken) {
    headers.Authorization = `Bearer ${input.ftxApiToken}`;
  }
  const response = await fetch(
    `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/trading-bot/positions`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        telegramUserId: input.telegramUserId,
        userPublicKey: input.userPublicKey
      })
    }
  );
  if (!response.ok && response.status !== 503) {
    throw new Error(
      `FrogX positions failed with status ${response.status}`
    );
  }
  return await response.json();
}
async function fetchTokenCleanup(input) {
  const headers = {
    "Content-Type": "application/json"
  };
  if (input.ftxApiToken) {
    headers.Authorization = `Bearer ${input.ftxApiToken}`;
  }
  const response = await fetch(
    `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/trading-bot/token-cleanup/review`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        telegramUserId: input.telegramUserId,
        userPublicKey: input.userPublicKey,
        hiddenTokens: input.hiddenTokens,
        dustUsdThreshold: input.dustUsdThreshold
      })
    }
  );
  if (!response.ok && response.status !== 503) {
    throw new Error(
      `FrogX token cleanup failed with status ${response.status}`
    );
  }
  return await response.json();
}
async function fetchTokenSafety(input) {
  const headers = {
    "Content-Type": "application/json"
  };
  if (input.ftxApiToken) {
    headers.Authorization = `Bearer ${input.ftxApiToken}`;
  }
  const response = await fetch(
    `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/trading-bot/token-safety`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        telegramUserId: input.telegramUserId,
        mint: input.mint
      })
    }
  );
  if (!response.ok && response.status !== 503) {
    throw new Error(
      `FrogX token safety failed with status ${response.status}`
    );
  }
  return await response.json();
}
async function fetchMarketRisk(input) {
  const headers = {
    "Content-Type": "application/json"
  };
  if (input.ftxApiToken) {
    headers.Authorization = `Bearer ${input.ftxApiToken}`;
  }
  const response = await fetch(
    `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/trading-bot/market-risk`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        telegramUserId: input.telegramUserId,
        userPublicKey: input.userPublicKey,
        mint: input.mint,
        amountIn: input.amountIn,
        slippageBps: input.slippageBps,
        priorityFeeLamports: input.priorityFeeLamports,
        minLiquidityUsd: input.minLiquidityUsd,
        maxMarketCapUsd: input.maxMarketCapUsd,
        maxPriceImpactBps: input.maxPriceImpactBps
      })
    }
  );
  if (!response.ok && response.status !== 503) {
    throw new Error(
      `FrogX market risk failed with status ${response.status}`
    );
  }
  return await response.json();
}
async function fetchPnl(input) {
  const headers = {};
  if (input.ftxApiToken) {
    headers.Authorization = `Bearer ${input.ftxApiToken}`;
  }
  const params = new URLSearchParams({
    telegramUserId: input.telegramUserId
  });
  const response = await fetch(
    `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/trading-bot/pnl?${params.toString()}`,
    { headers }
  );
  if (!response.ok && response.status !== 503 && response.status !== 404 && response.status !== 409) {
    throw new Error(`FrogX PNL failed with status ${response.status}`);
  }
  return await response.json();
}
async function fetchNftHoldings(input) {
  const headers = {};
  if (input.ftxApiToken) {
    headers.Authorization = `Bearer ${input.ftxApiToken}`;
  }
  const params = new URLSearchParams({
    telegramUserId: input.telegramUserId,
    page: String(input.page ?? 1),
    limit: String(input.limit ?? 5)
  });
  const response = await fetch(
    `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/trading-bot/nfts?${params.toString()}`,
    { headers }
  );
  if (!response.ok && response.status !== 503 && response.status !== 502 && response.status !== 404) {
    throw new Error(
      `FrogX NFT holdings failed with status ${response.status}`
    );
  }
  return await response.json();
}
function tradingBotHeaders(ftxApiToken) {
  return {
    "Content-Type": "application/json",
    ...ftxApiToken ? { Authorization: `Bearer ${ftxApiToken}` } : {}
  };
}
async function readFrogTradeResponse(response) {
  let body;
  try {
    body = await response.json();
  } catch {
    throw new Error(`Frog NFT trade failed with status ${response.status}`);
  }
  if (!response.ok && !body.status) {
    return {
      status: "failed",
      error: body.error || `Frog NFT trade failed (${response.status})`,
      code: body.code
    };
  }
  return body;
}
async function fetchFrogMarket(input) {
  const response = await fetch(
    `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/trading-bot/frogs/market`,
    {
      method: "POST",
      headers: tradingBotHeaders(input.ftxApiToken),
      body: JSON.stringify({
        telegramUserId: input.telegramUserId,
        walletAddress: input.walletAddress
      })
    }
  );
  const body = await response.json();
  if (!response.ok) {
    return {
      status: "unavailable",
      code: body.code,
      error: body.error || "Magic Eden market data is unavailable."
    };
  }
  return body;
}
async function executeFrogBuy(input) {
  const response = await fetch(
    `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/trading-bot/frogs/execute-buy`,
    {
      method: "POST",
      headers: tradingBotHeaders(input.ftxApiToken),
      body: JSON.stringify({
        telegramUserId: input.telegramUserId,
        walletAddress: input.walletAddress,
        executionId: input.executionId,
        maximumPaymentLamports: input.maximumPaymentLamports,
        ...input.expectedMint ? { expectedMint: input.expectedMint } : {}
      })
    }
  );
  return readFrogTradeResponse(response);
}
async function fetchFrogBuyExecutionStatus(input) {
  const response = await fetch(
    `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/trading-bot/frogs/execute-buy/status`,
    {
      method: "POST",
      headers: tradingBotHeaders(input.ftxApiToken),
      body: JSON.stringify({
        telegramUserId: input.telegramUserId,
        walletAddress: input.walletAddress,
        executionId: input.executionId,
        maximumPaymentLamports: input.maximumPaymentLamports,
        ...input.expectedMint ? { expectedMint: input.expectedMint } : {}
      })
    }
  );
  return readFrogTradeResponse(response);
}
async function executeFrogSell(input) {
  const response = await fetch(
    `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/magic-eden/execute-sell`,
    {
      method: "POST",
      headers: tradingBotHeaders(input.ftxApiToken),
      body: JSON.stringify({
        telegramUserId: input.telegramUserId,
        walletAddress: input.walletAddress,
        executionId: input.executionId,
        mint: input.mint,
        minimumPaymentLamports: input.minimumPaymentLamports
      })
    }
  );
  return readFrogTradeResponse(response);
}
async function fetchFrogSellExecutionStatus(input) {
  const response = await fetch(
    `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/magic-eden/execute-sell/status`,
    {
      method: "POST",
      headers: tradingBotHeaders(input.ftxApiToken),
      body: JSON.stringify({
        telegramUserId: input.telegramUserId,
        walletAddress: input.walletAddress,
        executionId: input.executionId,
        mint: input.mint,
        minimumPaymentLamports: input.minimumPaymentLamports
      })
    }
  );
  return readFrogTradeResponse(response);
}
async function fetchBuyQuote(input) {
  return fetchQuote({
    frogxApiBaseUrl: input.frogxApiBaseUrl,
    inMint: WRAPPED_SOL_MINT,
    outMint: input.outMint,
    amountIn: solToLamports(input.amountSol),
    userPublicKey: input.userPublicKey,
    slippageBps: input.slippageBps,
    priorityFeeLamports: input.priorityFeeLamports
  });
}
async function fetchQuote(input) {
  const response = await fetch(
    `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/quotes`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        inMint: input.inMint,
        outMint: input.outMint,
        amountIn: input.amountIn,
        slippageBps: input.slippageBps,
        priorityFee: input.priorityFeeLamports,
        userPublicKey: input.userPublicKey
      })
    }
  );
  if (!response.ok) {
    throw new Error(`FrogX quote failed with status ${response.status}`);
  }
  const raw = await response.json();
  return {
    amountOut: raw.amountOut,
    priceImpactBps: raw.priceImpactBps,
    routers: raw.routers.map(
      (router) => typeof router === "string" ? router : router.name ?? router.id ?? "unknown-router"
    ),
    executable: raw.executable,
    updatedAt: raw.updatedAt,
    provider: raw.provider,
    routeId: raw.routeId,
    transactionBase64: raw.transactionBase64
  };
}
function solToLamports(amountSol) {
  return Math.max(0, Math.round(amountSol * 1e9)).toString();
}
function formatQuoteLines(quote) {
  const route = quote.routers.length > 0 ? quote.routers.join(" -> ") : "unknown";
  return [
    `Estimated output: ${quote.amountOut} raw token units`,
    `Price impact: ${(quote.priceImpactBps / 100).toFixed(2)}%`,
    `Route: ${route}`,
    `Executable: ${quote.executable ? "yes" : "no"}`,
    `Updated: ${quote.updatedAt}`
  ];
}
async function fetchAdvancedAutomationExecutionStatus(input, segment) {
  const headers = {
    "Content-Type": "application/json"
  };
  if (input.ftxApiToken) {
    headers.Authorization = `Bearer ${input.ftxApiToken}`;
  }
  const response = await fetch(
    `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/trading-bot/${segment}/status`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        telegramUserId: input.telegramUserId,
        userPublicKey: input.userPublicKey,
        configId: input.configId
      })
    }
  );
  const data = await response.json();
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error(
      `FrogX ${segment} status returned a malformed response`
    );
  }
  const record = data;
  const status = record.status;
  if (status === "not_configured") {
    return {
      status,
      required: Array.isArray(record.required) ? record.required.filter(
        (value) => typeof value === "string"
      ) : void 0
    };
  }
  if (status === "not_found" || status === "lookup_error" || status === "mismatch") {
    return {
      status,
      error: typeof record.error === "string" ? record.error : void 0
    };
  }
  const lifecycleStatuses = /* @__PURE__ */ new Set([
    "monitoring",
    "pending_reconciliation",
    "executed",
    "failed",
    "cancelled"
  ]);
  const expectedKind = segment === "copytrade" ? "copytrade" : segment === "sniper" ? "sniper" : segment === "auto-buy" ? "auto_buy" : "auto_sell";
  const config = record.config;
  if (typeof status !== "string" || !lifecycleStatuses.has(status) || record.kind !== expectedKind || record.configId !== input.configId || typeof record.checkedAt !== "string" || !config || typeof config !== "object" || Array.isArray(config)) {
    throw new Error(
      `FrogX ${segment} status returned a malformed response`
    );
  }
  return data;
}
function deltaNeutralUnavailableResult(response, value) {
  const record = objectRecord(value);
  if (record?.status === "not_configured") {
    const required = stringArray(record.required);
    if (record.required !== void 0 && !required) {
      throw new Error(
        "FrogX Delta Neutral returned malformed configuration requirements"
      );
    }
    return {
      status: "not_configured",
      ...required ? { required } : {}
    };
  }
  if (response.ok && record?.status !== "blocked" && record?.status !== "pending_reconciliation") {
    return null;
  }
  if (typeof record?.error !== "string" || !record.error.trim()) {
    throw new Error(
      "FrogX Delta Neutral returned a malformed error response"
    );
  }
  const status = record.status === "blocked" || record.status === "pending_reconciliation" ? record.status : "unavailable";
  const run = deltaNeutralRun(record.run);
  return {
    status,
    error: record.error,
    ...typeof record.retryable === "boolean" ? { retryable: record.retryable } : {},
    ...typeof record.runId === "string" ? { runId: record.runId } : {},
    ...run ? { run } : {}
  };
}
function deltaNeutralPreview(value) {
  const record = objectRecord(value);
  const blockers = stringArray(record?.blockers);
  if (record?.strategy !== "delta_neutral" || record.preset !== "low" || typeof record.wallet !== "string" || !record.wallet || record.profileIndex !== 1 || !(record.profileAddress === null || typeof record.profileAddress === "string") || !isFiniteNonNegativeNumber(record.profileUsdc) || record.minimumProfileUsdc !== 50 || typeof record.profileFunded !== "boolean" || typeof record.liveReady !== "boolean" || record.liveEntryCapUsd !== 60 || record.maxCycles !== 1 || !blockers) {
    return null;
  }
  return {
    strategy: "delta_neutral",
    preset: "low",
    wallet: record.wallet,
    profileIndex: 1,
    profileAddress: record.profileAddress,
    profileUsdc: record.profileUsdc,
    minimumProfileUsdc: 50,
    profileFunded: record.profileFunded,
    liveReady: record.liveReady,
    liveEntryCapUsd: 60,
    maxCycles: 1,
    blockers
  };
}
function deltaNeutralRun(value) {
  return deltaNeutralRunStatus(value) ?? deltaNeutralStoredRunStatus(value);
}
function deltaNeutralRunStatus(value) {
  const record = objectRecord(value);
  if (record?.strategy !== "delta_neutral" || record.preset !== "low" || typeof record.wallet !== "string" || !record.wallet || !(record.runId === null || typeof record.runId === "string" && record.runId) || typeof record.launching !== "boolean" || typeof record.running !== "boolean" || typeof record.stopRequested !== "boolean" || !isNonNegativeSafeInteger(record.completedCycles) || record.maxCycles !== 1 || record.dailyBudgetUsd !== 5 || !isFiniteNonNegativeNumber(record.estimatedRunCostUsd) || !isFiniteNonNegativeNumber(record.completedVolumeUsd) || !isNullableSafeInteger(record.startedAtUnix) || !isNullableSafeInteger(record.stoppedAtUnix) || !(record.lastMessage === null || typeof record.lastMessage === "string") || typeof record.failed !== "boolean") {
    return null;
  }
  return {
    strategy: "delta_neutral",
    preset: "low",
    wallet: record.wallet,
    runId: record.runId,
    launching: record.launching,
    running: record.running,
    stopRequested: record.stopRequested,
    completedCycles: record.completedCycles,
    maxCycles: 1,
    dailyBudgetUsd: 5,
    estimatedRunCostUsd: record.estimatedRunCostUsd,
    completedVolumeUsd: record.completedVolumeUsd,
    startedAtUnix: record.startedAtUnix,
    stoppedAtUnix: record.stoppedAtUnix,
    lastMessage: record.lastMessage,
    failed: record.failed
  };
}
function deltaNeutralStoredRunStatus(value) {
  const record = objectRecord(value);
  if (record?.strategy !== "delta_neutral" || record.preset !== "low" || typeof record.wallet !== "string" || !record.wallet || typeof record.runId !== "string" || !record.runId || typeof record.status !== "string" || !record.status || typeof record.createdAt !== "string" || typeof record.updatedAt !== "string") {
    return null;
  }
  return {
    strategy: "delta_neutral",
    preset: "low",
    wallet: record.wallet,
    runId: record.runId,
    status: record.status,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}
function objectRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}
function stringArray(value) {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string") ? value : null;
}
function isFiniteNonNegativeNumber(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}
function isNonNegativeSafeInteger(value) {
  return Number.isSafeInteger(value) && Number(value) >= 0;
}
function isNullableSafeInteger(value) {
  return value === null || Number.isSafeInteger(value);
}
function cleanBaseUrl(url) {
  return url.replace(/\/+$/, "");
}

// src/trading/activityAlerts.ts
var SOL_MINT = "So11111111111111111111111111111111111111112";
var ACTIVITY_FETCH_LIMIT = 100;
var MAX_DELIVERY_BACKOFF_MS = 60 * 60 * 1e3;
var RECENT_ONBOARDING_EVENT_MAX_AGE_MS = 15 * 60 * 1e3;
var TRADE_ALERT_EVENT_TYPES = /* @__PURE__ */ new Set([
  "swap_executed",
  "swap_execution_failed",
  "withdrawal_executed",
  "withdrawal_execution_failed",
  "automation_order_executed",
  "automation_order_failed",
  "automation_order_reconciliation_required",
  "automation_order_reconciled",
  "advanced_automation_config_executed",
  "advanced_automation_config_failed",
  "advanced_automation_config_reconciled",
  "execution_reconciliation_required"
]);
var REVIEW_ALERT_EVENT_TYPES = /* @__PURE__ */ new Set([
  "execution_manual_review_required",
  "execution_manual_review_acknowledged",
  "execution_manual_review_resolved"
]);
var ONBOARDING_ALERT_EVENT_TYPES = /* @__PURE__ */ new Set([
  "imperial_connected",
  "imperial_deposit_confirmed"
]);
function buildActivityAlertBatch(events, seenEventIds, maxEvents) {
  const seen = new Set(seenEventIds);
  const unseen = events.filter(
    (event, index, all) => !seen.has(event.eventId) && all.findIndex(
      (candidate) => candidate.eventId === event.eventId
    ) === index
  );
  const ignoredEventIds = unseen.filter((event) => !alertFamily(event)).map((event) => event.eventId);
  const groups = groupAlertEvents(
    unseen.filter((event) => Boolean(alertFamily(event)))
  ).sort((a, b) => groupCreatedAt(a).localeCompare(groupCreatedAt(b)));
  const selected = groups.slice(0, Math.max(0, maxEvents));
  const notifications = selected.map(projectAlertGroup);
  const consumedEventIds = uniqueStrings([
    ...ignoredEventIds,
    ...selected.flatMap(
      (group) => group.events.map((event) => event.eventId)
    )
  ]);
  if (notifications.length === 0) {
    return { consumedEventIds, notifications };
  }
  const onboardingOnly = selected.every(
    (group) => group.family === "onboarding"
  );
  if (onboardingOnly) {
    const depositEvent = selected.flatMap((group) => group.events).filter((event) => event.eventType === "imperial_deposit_confirmed").sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    if (depositEvent) {
      const amount = plainValue(depositEvent.metadata?.uiAmountString);
      return {
        consumedEventIds,
        notifications,
        messageKind: "onboarding",
        text: [
          amount ? `Deposit received: ${amount} USDC` : "Deposit received.",
          "",
          "Your Imperial Perps Wallet is funded.",
          "",
          "Next: Ribbot will message you when farming is ready."
        ].join("\n")
      };
    }
    const connectionEvent = selected.flatMap((group) => group.events).filter((event) => event.eventType === "imperial_connected").sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    if (!plainValue(connectionEvent?.metadata?.profileAddress)) {
      return {
        consumedEventIds,
        notifications,
        messageKind: "onboarding",
        text: [
          "Ribbot setup is almost ready.",
          "",
          "Next: tap /status."
        ].join("\n")
      };
    }
    return {
      consumedEventIds,
      notifications,
      messageKind: "onboarding",
      text: [
        "Ribbot is ready.",
        "",
        ...notifications.map(
          (notification) => notification.detail ?? notification.title
        ),
        "",
        "Next: send at least 50 USDC on Solana to the wallet above."
      ].join("\n")
    };
  }
  const lines = [
    notifications.length === 1 ? "FTX trade update" : `FTX trade updates (${notifications.length})`,
    ""
  ];
  notifications.forEach((notification, index) => {
    lines.push(`${index + 1}. ${notification.title}`);
    if (notification.detail) lines.push(`   ${notification.detail}`);
    lines.push(`   ${notification.createdAt}`);
  });
  return {
    consumedEventIds,
    notifications,
    messageKind: "activity",
    text: lines.join("\n")
  };
}
var ActivityAlertPoller = class {
  options;
  timer;
  activePoll;
  userOffset = 0;
  constructor(options) {
    this.options = options;
  }
  start() {
    if (!this.isConfigured() || this.timer) return false;
    void this.pollOnce();
    this.timer = setInterval(
      () => void this.pollOnce(),
      this.options.pollIntervalMs
    );
    this.options.logger?.info(
      `FTX activity alerts enabled with a ${this.options.pollIntervalMs}ms poll interval`
    );
    return true;
  }
  async stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = void 0;
    }
    const activePoll = this.activePoll;
    if (activePoll) {
      await activePoll.catch(() => void 0);
    }
  }
  isRunning() {
    return Boolean(this.timer);
  }
  async pollOnce() {
    if (!this.isConfigured()) return emptyPollResult("disabled");
    if (this.activePoll) return emptyPollResult("skipped_in_flight");
    const poll = this.performPoll();
    this.activePoll = poll;
    try {
      return await poll;
    } finally {
      if (this.activePoll === poll) this.activePoll = void 0;
    }
  }
  isConfigured() {
    return Boolean(
      this.options.enabled && this.options.tgTrader && this.options.ftxApiToken
    );
  }
  async performPoll() {
    const result = emptyPollResult("completed");
    const users = this.options.store.listUsers();
    if (users.length === 0) return result;
    const usersToPoll = selectUsers(
      users,
      this.userOffset,
      this.options.maxUsersPerPoll
    );
    this.userOffset = (this.userOffset + usersToPoll.length) % users.length;
    for (const user of usersToPoll) {
      const now = (this.options.now ?? (() => /* @__PURE__ */ new Date()))();
      let cursor = this.options.store.getActivityAlertCursor(user);
      if (isDeliveryBackoffActive(cursor, now)) continue;
      result.usersChecked += 1;
      let activity;
      try {
        activity = await (this.options.fetchActivity ?? fetchActivity)({
          frogxApiBaseUrl: this.options.frogxApiBaseUrl,
          ftxApiToken: this.options.ftxApiToken,
          telegramUserId: user.telegramUserId,
          limit: ACTIVITY_FETCH_LIMIT
        });
      } catch (error) {
        result.backendFailures += 1;
        this.options.logger?.warn(
          "FTX activity alert fetch failed",
          error
        );
        continue;
      }
      if (activity.status !== "ready") {
        result.backendFailures += 1;
        continue;
      }
      const observedAt = now.toISOString();
      if (!cursor) {
        const recentOnboardingIds = new Set(
          activity.events.filter((event) => isRecentOnboardingEvent(event, now)).map((event) => event.eventId)
        );
        cursor = this.options.store.initializeActivityAlertCursor(
          user,
          activity.events.filter(
            (event) => !recentOnboardingIds.has(event.eventId)
          ).map((event) => event.eventId),
          observedAt
        );
        result.usersBaselined += 1;
        if (recentOnboardingIds.size === 0) continue;
      }
      const batch = buildActivityAlertBatch(
        activity.events,
        cursor.seenEventIds,
        this.options.maxEventsPerMessage
      );
      if (!batch.text) {
        if (batch.consumedEventIds.length > 0) {
          this.options.store.markActivityAlertEventsSeen(
            user,
            batch.consumedEventIds,
            observedAt
          );
        }
        continue;
      }
      try {
        await this.options.sendMessage(
          user.telegramUserId,
          batch.text,
          batch.messageKind ?? "activity"
        );
        this.options.store.markActivityAlertsDelivered(
          user,
          batch.consumedEventIds,
          observedAt
        );
        result.messagesSent += 1;
      } catch (error) {
        result.deliveryFailures += 1;
        const nextAttemptAt = new Date(
          now.getTime() + deliveryBackoffMs(
            cursor.consecutiveFailures ?? 0,
            this.options.pollIntervalMs
          )
        ).toISOString();
        this.options.store.markActivityAlertDeliveryFailed(
          user,
          observedAt,
          nextAttemptAt
        );
        this.options.logger?.warn(
          "Telegram activity alert delivery failed",
          error
        );
      }
    }
    return result;
  }
};
function emptyPollResult(status) {
  return {
    status,
    usersChecked: 0,
    usersBaselined: 0,
    messagesSent: 0,
    backendFailures: 0,
    deliveryFailures: 0
  };
}
function selectUsers(users, offset, limit) {
  const count = Math.min(users.length, Math.max(0, limit));
  return Array.from(
    { length: count },
    (_, index) => users[(offset + index) % users.length]
  );
}
function isDeliveryBackoffActive(cursor, now) {
  if (!cursor?.nextAttemptAt) return false;
  const nextAttempt = Date.parse(cursor.nextAttemptAt);
  return Number.isFinite(nextAttempt) && nextAttempt > now.getTime();
}
function deliveryBackoffMs(previousFailures, pollIntervalMs) {
  const base = Math.max(3e4, pollIntervalMs);
  return Math.min(
    base * 2 ** Math.min(Math.max(previousFailures, 0), 7),
    MAX_DELIVERY_BACKOFF_MS
  );
}
function alertFamily(event) {
  if (TRADE_ALERT_EVENT_TYPES.has(event.eventType)) return "trade";
  if (REVIEW_ALERT_EVENT_TYPES.has(event.eventType)) return "review";
  if (ONBOARDING_ALERT_EVENT_TYPES.has(event.eventType)) return "onboarding";
  return void 0;
}
function isRecentOnboardingEvent(event, now) {
  if (!ONBOARDING_ALERT_EVENT_TYPES.has(event.eventType)) return false;
  const createdAt = Date.parse(event.createdAt);
  if (!Number.isFinite(createdAt)) return false;
  const age = now.getTime() - createdAt;
  return age >= 0 && age <= RECENT_ONBOARDING_EVENT_MAX_AGE_MS;
}
function groupAlertEvents(events) {
  const groups = [];
  for (const event of events) {
    const family = alertFamily(event);
    if (!family) continue;
    const identifiers = alertIdentifiers(event, family);
    const matchingIndexes = groups.map(
      (group, index) => setsIntersect(group.identifiers, identifiers) ? index : -1
    ).filter((index) => index >= 0);
    if (matchingIndexes.length === 0) {
      groups.push({ family, identifiers, events: [event] });
      continue;
    }
    const primary = groups[matchingIndexes[0]];
    primary.events.push(event);
    identifiers.forEach(
      (identifier) => primary.identifiers.add(identifier)
    );
    for (const index of matchingIndexes.slice(1).reverse()) {
      const merged = groups[index];
      primary.events.push(...merged.events);
      merged.identifiers.forEach(
        (identifier) => primary.identifiers.add(identifier)
      );
      groups.splice(index, 1);
    }
  }
  return groups;
}
function alertIdentifiers(event, family) {
  const metadata = event.metadata ?? {};
  if (family === "onboarding") {
    const profileAddress = plainValue(metadata.profileAddress);
    return /* @__PURE__ */ new Set([
      profileAddress ? `onboarding:${profileAddress}` : `onboarding:${event.eventId}`
    ]);
  }
  if (family === "review") {
    const caseId = plainValue(metadata.caseId);
    const referenceId = plainValue(metadata.referenceId);
    const values2 = [
      caseId ? `review:${caseId}` : void 0,
      referenceId ? `execution:${referenceId}` : void 0
    ].filter((value) => Boolean(value));
    return new Set(
      values2.length > 0 ? values2 : [`review:${event.eventId}`]
    );
  }
  const executionId = plainValue(metadata.executionId);
  const values = [
    plainValue(metadata.referenceId),
    plainValue(metadata.signature),
    plainValue(metadata.transactionId),
    executionId,
    executionId ? void 0 : plainValue(metadata.orderId)
  ].filter((value) => Boolean(value));
  return new Set(
    values.length > 0 ? values.map((value) => `execution:${value}`) : [`execution:${event.eventId}`]
  );
}
function setsIntersect(a, b) {
  for (const value of a) {
    if (b.has(value)) return true;
  }
  return false;
}
function groupCreatedAt(group) {
  return group.events.reduce(
    (latest, event) => event.createdAt.localeCompare(latest) > 0 ? event.createdAt : latest,
    group.events[0]?.createdAt ?? ""
  );
}
function projectAlertGroup(group) {
  const event = [...group.events].sort((a, b) => {
    const priority = alertPriority(b) - alertPriority(a);
    return priority || b.createdAt.localeCompare(a.createdAt);
  })[0];
  return {
    eventIds: uniqueStrings(group.events.map((item) => item.eventId)),
    createdAt: event.createdAt,
    title: alertTitle(event),
    detail: alertDetail(event)
  };
}
function alertPriority(event) {
  const priorities = {
    imperial_deposit_confirmed: 160,
    imperial_connected: 150,
    advanced_automation_config_reconciled: 140,
    automation_order_reconciled: 135,
    advanced_automation_config_failed: 130,
    advanced_automation_config_executed: 130,
    automation_order_failed: 125,
    automation_order_executed: 125,
    withdrawal_execution_failed: 120,
    withdrawal_executed: 120,
    swap_execution_failed: 115,
    swap_executed: 115,
    execution_manual_review_resolved: 110,
    execution_manual_review_acknowledged: 100,
    execution_manual_review_required: 95,
    automation_order_reconciliation_required: 60,
    execution_reconciliation_required: 55
  };
  return priorities[event.eventType] ?? 0;
}
function alertTitle(event) {
  const metadata = event.metadata ?? {};
  const resolution = plainValue(metadata.resolution);
  if (event.eventType === "imperial_connected") {
    return "Ribbot connected";
  }
  if (event.eventType === "imperial_deposit_confirmed") {
    const amount = plainValue(metadata.uiAmountString);
    return amount ? `Deposit received: ${amount} USDC` : "Deposit received";
  }
  if (event.eventType === "execution_manual_review_required") {
    return "Execution needs manual review";
  }
  if (event.eventType === "execution_manual_review_acknowledged") {
    return "Manual review acknowledged";
  }
  if (event.eventType === "execution_manual_review_resolved") {
    return resolution === "executed" ? "Manual review confirmed execution" : "Manual review confirmed failure";
  }
  if (event.eventType === "execution_reconciliation_required") {
    const kind = plainValue(metadata.executionKind) || "execution";
    return `${titleCase(kind)} status uncertain`;
  }
  if (event.eventType.startsWith("automation_order_")) {
    const subject = `${scheduledKindLabel(metadata.kind)} order`;
    if (event.eventType.endsWith("reconciliation_required")) {
      return `${subject} status uncertain`;
    }
    if (event.eventType.endsWith("reconciled")) {
      return `${subject} ${resolution === "failed" ? "failed" : "confirmed"}`;
    }
    return `${subject} ${event.eventType.endsWith("failed") ? "failed" : "executed"}`;
  }
  if (event.eventType.startsWith("advanced_automation_config_")) {
    const subject = advancedKindLabel(metadata.kind);
    if (event.eventType.endsWith("reconciled")) {
      return `${subject} ${resolution === "failed" ? "failed" : "confirmed"}`;
    }
    return `${subject} ${event.eventType.endsWith("failed") ? "failed" : "executed"}`;
  }
  if (event.eventType.startsWith("withdrawal_")) {
    return event.eventType.endsWith("failed") ? "Withdrawal failed" : "Withdrawal executed";
  }
  const side = swapSide(metadata);
  return `${titleCase(side)} ${event.eventType.endsWith("failed") ? "failed" : "executed"}`;
}
function alertDetail(event) {
  const metadata = event.metadata ?? {};
  if (event.eventType === "imperial_connected") {
    const authorityWalletAddress = plainValue(
      metadata.authorityWalletAddress
    );
    const profileAddress = plainValue(metadata.profileAddress);
    return authorityWalletAddress && profileAddress ? [
      "SPOT/NFT Wallet (Privy):",
      authorityWalletAddress,
      "",
      "Imperial Perps Wallet:",
      profileAddress
    ].join("\n") : profileAddress ? `Imperial Perps Wallet:
${profileAddress}` : "Imperial Perps Wallet not available.";
  }
  if (event.eventType === "imperial_deposit_confirmed") {
    return "Your Imperial Perps Wallet is funded.";
  }
  const side = activityEventSide(event);
  const mint = tradeMint(metadata, side);
  const amount = tradeAmount(metadata, side);
  const sellBps = numericValue(metadata.sellBps);
  const parts = [
    side ? titleCase(side) : void 0,
    mint ? `token ${shortValue(mint)}` : void 0,
    amount,
    sellBps !== void 0 ? `${formatPercentBps(sellBps)} sold` : void 0,
    plainValue(metadata.providerStatus) ? `provider ${plainValue(metadata.providerStatus)}` : void 0,
    plainValue(metadata.signature) ? `sig ${shortValue(plainValue(metadata.signature))}` : void 0,
    plainValue(metadata.reason) ? truncate(plainValue(metadata.reason), 160) : void 0
  ].filter((value) => Boolean(value));
  return parts.length > 0 ? parts.join(" | ") : void 0;
}
function activityEventSide(event) {
  const metadata = event.metadata ?? {};
  const explicit = plainValue(metadata.side ?? metadata.copyTradeSide);
  if (explicit) return explicit;
  if (event.eventType.startsWith("swap_")) return swapSide(metadata);
  const kind = plainValue(metadata.kind);
  if (kind === "auto_buy" || kind === "sniper" || kind === "bundle_buy") {
    return "buy";
  }
  return kind === "auto_sell" ? "sell" : void 0;
}
function swapSide(metadata) {
  const explicit = plainValue(metadata.side ?? metadata.copyTradeSide);
  if (explicit) return explicit;
  const inMint = plainValue(metadata.inMint);
  const outMint = plainValue(metadata.outMint);
  if (inMint === SOL_MINT) return "buy";
  if (outMint === SOL_MINT) return "sell";
  return "swap";
}
function tradeMint(metadata, side) {
  const direct = plainValue(metadata.mint);
  if (direct) return direct;
  return side === "sell" ? plainValue(metadata.inMint) : plainValue(metadata.outMint);
}
function tradeAmount(metadata, side) {
  const label = plainValue(metadata.amountLabel);
  if (label) return label;
  const amountIn = plainValue(metadata.amountIn);
  const inMint = plainValue(metadata.inMint);
  if (!amountIn || !/^\d+$/.test(amountIn)) return void 0;
  if (inMint !== SOL_MINT && side !== "buy") return void 0;
  const lamports = Number(amountIn);
  if (!Number.isSafeInteger(lamports)) return void 0;
  return `${formatDecimal(lamports / 1e9)} SOL`;
}
function advancedKindLabel(value) {
  const labels = {
    copytrade: "Copy trade",
    sniper: "Sniper buy",
    auto_buy: "Auto-buy",
    auto_sell: "Auto-sell",
    bundle_buy: "Bundle buy"
  };
  const kind = plainValue(value) || "automation";
  return labels[kind] ?? titleCase(kind);
}
function scheduledKindLabel(value) {
  const kind = plainValue(value) || "scheduled";
  return kind === "dca" ? "DCA" : titleCase(kind);
}
function plainValue(value) {
  if (typeof value !== "string" && typeof value !== "number") {
    return void 0;
  }
  const clean = String(value).replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  return clean || void 0;
}
function numericValue(value) {
  if (typeof value !== "number" && (typeof value !== "string" || !value.trim())) {
    return void 0;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : void 0;
}
function shortValue(value) {
  return value.length <= 14 ? value : `${value.slice(0, 6)}...${value.slice(-4)}`;
}
function truncate(value, limit) {
  return value.length <= limit ? value : `${value.slice(0, limit - 3)}...`;
}
function titleCase(value) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}
function formatPercentBps(bps) {
  return `${formatDecimal(bps / 100)}%`;
}
function formatDecimal(value) {
  return value.toLocaleString("en-US", {
    maximumFractionDigits: 9,
    useGrouping: false
  });
}
function uniqueStrings(values) {
  return [...new Set(values)];
}

// src/trading/autoBuyCommand.ts
var SOL_MINT2 = "So11111111111111111111111111111111111111112";
var SOLANA_ADDRESS_PATTERN = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
var positiveNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : void 0;
};
var toggleValue = (value) => {
  const normalized = value?.toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized ?? "")) return true;
  if (["0", "false", "no", "off"].includes(normalized ?? "")) return false;
  return void 0;
};
var mintValue = (values) => values.find(
  (value) => SOLANA_ADDRESS_PATTERN.test(value) && value !== SOL_MINT2
);
function parseAutoBuyIntent(args) {
  if (args[0]?.toLowerCase() === "instant") {
    const numbers2 = args.slice(2).map(positiveNumber).filter((value) => value !== void 0);
    return {
      kind: "autoBuy",
      action: "instant",
      enabled: toggleValue(args[1]),
      maxBuySol: numbers2[0],
      minLiquidityUsd: numbers2[1],
      maxMarketCapUsd: numbers2[2]
    };
  }
  if (args[0]?.toLowerCase() !== "add") {
    return { kind: "autoBuy", action: "list" };
  }
  const mint = mintValue(args.slice(1));
  const start = mint ? args.indexOf(mint) + 1 : 1;
  const numbers = args.slice(start).map(positiveNumber).filter((value) => value !== void 0);
  return {
    kind: "autoBuy",
    action: "add",
    mint,
    maxBuySol: numbers[0],
    minLiquidityUsd: numbers[1],
    maxMarketCapUsd: numbers[2]
  };
}

// src/trading/copyTradeCommand.ts
var SOLANA_ADDRESS_PATTERN2 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
function parseCopyTradeCommand(args) {
  const action = args[0]?.toLowerCase();
  if (action === "pause" || action === "resume") {
    return { action, configId: args[1] };
  }
  if (action === "duplicate") {
    const parsed = parseNamedOptions(args.slice(2), ["tag"]);
    return {
      action,
      configId: args[1],
      tag: parsed.values.get("tag"),
      invalidOptions: parsed.invalid
    };
  }
  if (action === "edit") {
    return parseCopyTradeEdit(args);
  }
  if (action !== "add") return { action: "list" };
  const targetWallet = args.slice(1).find(isSolanaAddress);
  const targetIndex = targetWallet ? args.indexOf(targetWallet) : -1;
  const strategy = args[targetIndex + 1]?.toLowerCase();
  const enhanced = strategy === "fixed" || strategy === "percent";
  const positional = (enhanced ? args.slice(targetIndex + 2) : args.slice(Math.max(targetIndex + 1, 0))).map(positiveNumber2).filter((value) => value !== void 0);
  const option = (key) => args.find((entry) => entry.toLowerCase().startsWith(`${key}=`))?.slice(key.length + 1);
  const blacklist = option("blacklist");
  return {
    action: "add",
    tag: option("tag"),
    targetWallet,
    buyMode: strategy === "fixed" ? "fixed" : "percentage",
    buyPercentage: strategy === "percent" ? positional[0] : 100,
    maxBuySol: strategy === "percent" ? positional[1] : positional[0],
    minLiquidityUsd: strategy === "percent" ? positional[2] : positional[1],
    minTargetBuySol: optionalPositiveNumber(option("minbuy")),
    minMarketCapUsd: optionalPositiveNumber(option("minmcap")),
    maxMarketCapUsd: optionalPositiveNumber(option("maxmcap")) ?? (!enhanced ? positional[2] : void 0),
    copySells: args.some(
      (entry) => ["copy-sells", "copysells", "sells"].includes(entry.toLowerCase())
    ),
    duplicateBuys: toggleValue2(option("duplicate") ?? "off"),
    onlyRenounced: toggleValue2(option("renounced") ?? "off"),
    excludePumpFunTokens: toggleValue2(option("excludepump") ?? "off"),
    blacklistMints: blacklist ? blacklist.split(",").filter(Boolean) : []
  };
}
function parseCopyTradeEdit(args) {
  const parsed = parseNamedOptions(args.slice(2), [
    "tag",
    "target",
    "mode",
    "percent",
    "max",
    "minbuy",
    "minliq",
    "minmcap",
    "maxmcap",
    "sells",
    "duplicate",
    "renounced",
    "excludepump",
    "blacklist",
    "slippage",
    "buyfee",
    "sellfee"
  ]);
  const invalid = [...parsed.invalid];
  const optionalNumber = (key, clearable = false, nonNegative = false) => {
    const raw = parsed.values.get(key);
    if (raw === void 0) return void 0;
    if (clearable && raw.toLowerCase() === "none") return null;
    const value = nonNegative ? nonNegativeNumber(raw) : positiveNumber2(raw);
    if (value === void 0) invalid.push(key);
    return value;
  };
  const optionalToggle = (key) => {
    const raw = parsed.values.get(key);
    if (raw === void 0) return void 0;
    const value = toggleValue2(raw);
    if (value === void 0) invalid.push(key);
    return value;
  };
  const modeValue = parsed.values.get("mode")?.toLowerCase();
  const buyMode = modeValue === "fixed" ? "fixed" : modeValue === "percent" || modeValue === "percentage" ? "percentage" : void 0;
  if (modeValue && !buyMode) invalid.push("mode");
  const tag = parsed.values.get("tag");
  const blacklist = parsed.values.get("blacklist");
  const slippage = optionalNumber("slippage", false, true);
  return {
    action: "edit",
    configId: args[1],
    tag: tag?.toLowerCase() === "none" ? null : tag,
    targetWallet: parsed.values.get("target"),
    buyMode,
    buyPercentage: optionalNumber("percent"),
    maxBuySol: optionalNumber("max"),
    minTargetBuySol: optionalNumber("minbuy", true),
    minLiquidityUsd: optionalNumber("minliq"),
    minMarketCapUsd: optionalNumber("minmcap", true),
    maxMarketCapUsd: optionalNumber("maxmcap", true),
    copySells: optionalToggle("sells"),
    duplicateBuys: optionalToggle("duplicate"),
    onlyRenounced: optionalToggle("renounced"),
    excludePumpFunTokens: optionalToggle("excludepump"),
    blacklistMints: blacklist === void 0 ? void 0 : blacklist.toLowerCase() === "none" ? [] : blacklist.split(",").filter(Boolean),
    slippageBps: slippage === void 0 || slippage === null ? void 0 : Math.round(slippage * 100),
    priorityFeeLamports: optionalNumber("buyfee", false, true),
    sellPriorityFeeLamports: optionalNumber("sellfee", false, true),
    invalidOptions: [...new Set(invalid)]
  };
}
function parseNamedOptions(entries, allowed) {
  const allowedKeys = new Set(allowed);
  const values = /* @__PURE__ */ new Map();
  const invalid = [];
  for (const entry of entries) {
    const separator = entry.indexOf("=");
    const key = entry.slice(0, separator).toLowerCase();
    const value = separator >= 0 ? entry.slice(separator + 1) : "";
    if (separator <= 0 || !allowedKeys.has(key) || !value || values.has(key)) {
      invalid.push(entry);
      continue;
    }
    values.set(key, value);
  }
  return { values, invalid };
}
function optionalPositiveNumber(value) {
  return value === void 0 ? void 0 : positiveNumber2(value);
}
function positiveNumber2(value) {
  const parsed = Number(value.replace(/%$/, ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : void 0;
}
function nonNegativeNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : void 0;
}
function toggleValue2(value) {
  const normalized = value.toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return void 0;
}
function isSolanaAddress(value) {
  return SOLANA_ADDRESS_PATTERN2.test(value);
}

// src/trading/tradePolicy.ts
function requiresTradeConfirmation(settings, side, sellPercent) {
  if (side === "sell" && settings.sellProtection && (sellPercent ?? 0) > 75) {
    return true;
  }
  return settings.botMode === "advanced" && settings.confirmTrades;
}

// src/trading/marketRiskMessaging.ts
function marketRiskQuoteBlockingReason(quoteProbe) {
  if (quoteProbe.status === "ready") return void 0;
  if (quoteProbe.status === "not_configured") {
    const required = (quoteProbe.required ?? []).join(", ") || "quote credentials";
    return `FTX/FrogX did not verify liquidity or price impact because ${required} is not configured. This is not a safety pass.`;
  }
  return `FTX/FrogX did not verify liquidity or price impact: ${quoteProbe.reason} This is not a safety pass.`;
}

// src/trading/walletCommand.ts
var SOLANA_ADDRESS_PATTERN3 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
function parseWalletCommand(args) {
  const selection = args[0]?.toLowerCase() === "select" ? Number(args[1]) : NaN;
  return {
    kind: "wallet",
    address: args.find((value) => SOLANA_ADDRESS_PATTERN3.test(value)),
    selection: Number.isInteger(selection) && selection > 0 ? selection : void 0
  };
}

// src/trading/positionView.ts
var POSITION_PAGE_SIZE = 5;
function buildPositionPage(tokens, requestedPage = 0, pageSize = POSITION_PAGE_SIZE) {
  const safePageSize = Math.max(1, Math.floor(pageSize));
  const visible = tokens.filter(
    (token) => !token.hidden && isPositiveIntegerString(token.amount)
  );
  const totalPages = Math.max(1, Math.ceil(visible.length / safePageSize));
  const page = Math.min(
    Math.max(
      0,
      Math.floor(Number.isFinite(requestedPage) ? requestedPage : 0)
    ),
    totalPages - 1
  );
  const startIndex = page * safePageSize;
  return {
    items: visible.slice(startIndex, startIndex + safePageSize),
    page,
    totalPages,
    totalItems: visible.length,
    startIndex
  };
}
function parsePositionPageIndex(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
}
function positionCallbackData(mint, page) {
  return `ribbot:position:${mint}:${Math.max(0, Math.floor(page))}`;
}
function positionVisibilityCallbackData(mint, page, visibility) {
  return `ribbot:pv:${mint}:${Math.max(0, Math.floor(page))}:${visibility}`;
}
function isPositiveIntegerString(value) {
  if (!/^\d+$/.test(value)) return false;
  try {
    return BigInt(value) > 0n;
  } catch {
    return false;
  }
}

// src/trading/state.ts
import fs2 from "fs";
import path from "path";
var ACTIVITY_ALERT_CURSOR_EVENT_LIMIT = 250;
var defaultStore = () => ({ users: {} });
var TradingStateStore = class {
  filePath;
  state = null;
  constructor(filePath) {
    this.filePath = path.resolve(process.cwd(), filePath);
  }
  getOrCreateUser(telegramUserId, username, defaults) {
    const state = this.load();
    const existing = state.users[telegramUserId];
    const now = (/* @__PURE__ */ new Date()).toISOString();
    if (existing) {
      existing.username = username;
      existing.updatedAt = now;
      if ((!existing.wallets || existing.wallets.length === 0) && existing.walletSource && existing.solanaWalletAddress) {
        const walletId = existing.walletSource === "privy" && existing.privyWalletId ? existing.privyWalletId : `external:${existing.solanaWalletAddress}`;
        existing.wallets = [
          {
            walletId,
            label: existing.walletSource === "privy" ? "SPOT/NFT Wallet (Privy)" : "Portfolio Wallet (Read only)",
            walletSource: existing.walletSource,
            ...existing.privyUserId ? { privyUserId: existing.privyUserId } : {},
            ...existing.privyWalletId ? { privyWalletId: existing.privyWalletId } : {},
            solanaWalletAddress: existing.solanaWalletAddress,
            createdAt: existing.createdAt
          }
        ];
        existing.activeWalletId = walletId;
      }
      existing.wallets = cleanAccountWallets(existing.wallets ?? []);
      const managedWallet = existing.wallets.find(
        (wallet) => wallet.walletSource === "privy"
      );
      if (managedWallet) {
        existing.walletSource = "privy";
        existing.privyUserId = managedWallet.privyUserId;
        existing.privyWalletId = managedWallet.privyWalletId;
        existing.solanaWalletAddress = managedWallet.solanaWalletAddress;
        existing.activeWalletId = managedWallet.walletId;
      }
      existing.watchlist ??= [];
      existing.hiddenTokens ??= [];
      existing.referralSummary ??= existing.referralCode ? {
        referralCode: existing.referralCode,
        referredByCode: existing.referredByCode,
        referredByTelegramUserId: existing.referredByTelegramUserId,
        referredUsers: 0,
        rewardStatus: "tracking_only",
        claimableRewards: [],
        updatedAt: existing.updatedAt,
        warnings: []
      } : void 0;
      existing.pendingOrders ??= {};
      existing.automationOrders ??= {};
      existing.withdrawalTickets ??= {};
      existing.copyTradeConfigs ??= {};
      for (const config of Object.values(existing.copyTradeConfigs)) {
        config.buyMode ??= "percentage";
        config.buyPercentageBps ??= 1e4;
        config.sellPriorityFeeLamports ??= config.priorityFeeLamports;
        config.duplicateBuys ??= true;
        config.onlyRenounced ??= false;
        config.excludePumpFunTokens ??= false;
        config.blacklistMints = Array.isArray(config.blacklistMints) ? [
          ...new Set(
            config.blacklistMints.filter(
              (mint) => typeof mint === "string"
            )
          )
        ].slice(0, 20) : [];
      }
      existing.sniperConfigs ??= {};
      existing.autoBuyConfigs ??= {};
      existing.bundleBuyConfigs ??= {};
      existing.autoSellConfigs ??= {};
      existing.frogTradeTickets ??= {};
      if (existing.activityAlertCursor) {
        existing.activityAlertCursor.seenEventIds = cleanActivityAlertEventIds(
          existing.activityAlertCursor.seenEventIds
        );
        existing.activityAlertCursor.consecutiveFailures = cleanNonNegativeInteger(
          existing.activityAlertCursor.consecutiveFailures
        );
      }
      existing.settings ??= {
        botMode: "advanced",
        confirmTrades: defaults.confirmTrades,
        defaultBuySol: defaults.defaultBuySol,
        buyPresetsSol: defaultBuyPresets(defaults.defaultBuySol),
        sellPresetsPercent: [25, 50, 75, 100],
        slippageBps: defaults.slippageBps,
        priorityFeeLamports: defaults.priorityFeeLamports,
        sellPriorityFeeLamports: defaults.priorityFeeLamports,
        sellProtection: true,
        mevProtection: true,
        autoBuyEnabled: false,
        instantAutoBuyEnabled: false,
        instantAutoBuyAmountSol: defaults.defaultBuySol,
        instantAutoBuyMinLiquidityUsd: 1e3,
        autoSellEnabled: false,
        sniperEnabled: false
      };
      existing.settings.botMode ??= "advanced";
      existing.settings.buyPresetsSol = cleanBuyPresets(
        existing.settings.buyPresetsSol,
        defaults.defaultBuySol
      );
      existing.settings.sellPresetsPercent = cleanSellPresets(
        existing.settings.sellPresetsPercent
      );
      existing.settings.sellPriorityFeeLamports ??= existing.settings.priorityFeeLamports;
      existing.settings.sellProtection ??= true;
      if (existing.settings.botMode === "simple") {
        existing.settings.confirmTrades = false;
      }
      existing.settings.mevProtection ??= true;
      existing.settings.autoBuyEnabled ??= false;
      existing.settings.instantAutoBuyEnabled ??= false;
      existing.settings.instantAutoBuyAmountSol ??= existing.settings.defaultBuySol;
      existing.settings.instantAutoBuyMinLiquidityUsd ??= 1e3;
      existing.settings.autoSellEnabled ??= false;
      existing.settings.sniperEnabled ??= false;
      this.persist();
      return existing;
    }
    const user = {
      telegramUserId,
      username,
      createdAt: now,
      updatedAt: now,
      watchlist: [],
      hiddenTokens: [],
      pendingOrders: {},
      automationOrders: {},
      withdrawalTickets: {},
      copyTradeConfigs: {},
      sniperConfigs: {},
      autoBuyConfigs: {},
      bundleBuyConfigs: {},
      autoSellConfigs: {},
      frogTradeTickets: {},
      settings: {
        botMode: "advanced",
        confirmTrades: defaults.confirmTrades,
        defaultBuySol: defaults.defaultBuySol,
        buyPresetsSol: defaultBuyPresets(defaults.defaultBuySol),
        sellPresetsPercent: [25, 50, 75, 100],
        slippageBps: defaults.slippageBps,
        priorityFeeLamports: defaults.priorityFeeLamports,
        sellPriorityFeeLamports: defaults.priorityFeeLamports,
        sellProtection: true,
        mevProtection: true,
        autoBuyEnabled: false,
        instantAutoBuyEnabled: false,
        instantAutoBuyAmountSol: defaults.defaultBuySol,
        instantAutoBuyMinLiquidityUsd: 1e3,
        autoSellEnabled: false,
        sniperEnabled: false
      }
    };
    state.users[telegramUserId] = user;
    this.persist();
    return user;
  }
  createFrogTradeTicket(user, ticket) {
    const state = this.load();
    const current = state.users[user.telegramUserId] || user;
    const now = /* @__PURE__ */ new Date();
    const value = {
      ...ticket,
      id: createOrderId("frog"),
      status: "pending_confirmation",
      completed: 0,
      signatures: [],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + 2 * 60 * 1e3).toISOString()
    };
    current.frogTradeTickets ??= {};
    current.frogTradeTickets[value.id] = value;
    current.updatedAt = value.updatedAt;
    state.users[user.telegramUserId] = current;
    this.persist();
    return value;
  }
  getFrogTradeTicket(user, ticketId) {
    const state = this.load();
    const current = state.users[user.telegramUserId] || user;
    return current.frogTradeTickets?.[ticketId];
  }
  updateFrogTradeTicket(user, ticketId, update) {
    const state = this.load();
    const current = state.users[user.telegramUserId] || user;
    const ticket = current.frogTradeTickets?.[ticketId];
    if (!ticket) return void 0;
    Object.assign(ticket, update, { updatedAt: (/* @__PURE__ */ new Date()).toISOString() });
    current.updatedAt = ticket.updatedAt;
    state.users[user.telegramUserId] = current;
    this.persist();
    return ticket;
  }
  addToWatchlist(user, mint) {
    const state = this.load();
    const current = state.users[user.telegramUserId] || user;
    if (!current.watchlist.includes(mint)) {
      current.watchlist.push(mint);
      current.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
      state.users[user.telegramUserId] = current;
      this.persist();
    }
    return current;
  }
  removeFromWatchlist(user, mint) {
    const state = this.load();
    const current = state.users[user.telegramUserId] || user;
    current.watchlist = current.watchlist.filter((entry) => entry !== mint);
    current.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    state.users[user.telegramUserId] = current;
    this.persist();
    return current;
  }
  addHiddenToken(user, mint) {
    const state = this.load();
    const current = state.users[user.telegramUserId] || user;
    if (!current.hiddenTokens.includes(mint)) {
      current.hiddenTokens.push(mint);
    }
    current.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    state.users[user.telegramUserId] = current;
    this.persist();
    return current;
  }
  removeHiddenToken(user, mint) {
    const state = this.load();
    const current = state.users[user.telegramUserId] || user;
    current.hiddenTokens = current.hiddenTokens.filter(
      (entry) => entry !== mint
    );
    current.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    state.users[user.telegramUserId] = current;
    this.persist();
    return current;
  }
  updateSettings(user, settings) {
    const state = this.load();
    const current = state.users[user.telegramUserId] || user;
    const cleanSettings = Object.fromEntries(
      Object.entries(settings).filter(([, value]) => value !== void 0)
    );
    current.settings = {
      ...current.settings,
      ...cleanSettings
    };
    current.settings.buyPresetsSol = cleanBuyPresets(
      current.settings.buyPresetsSol,
      current.settings.defaultBuySol
    );
    current.settings.sellPresetsPercent = cleanSellPresets(
      current.settings.sellPresetsPercent
    );
    if (current.settings.botMode === "simple") {
      current.settings.confirmTrades = false;
    }
    current.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    state.users[user.telegramUserId] = current;
    this.persist();
    return current;
  }
  syncAccountSnapshot(user, account) {
    const state = this.load();
    const current = state.users[user.telegramUserId] || user;
    current.username = account.username || current.username;
    current.walletSource = account.walletSource ?? current.walletSource;
    if (account.walletSource === "external") {
      delete current.privyUserId;
      delete current.privyWalletId;
    } else {
      current.privyUserId = account.privyUserId ?? current.privyUserId;
      current.privyWalletId = account.privyWalletId ?? current.privyWalletId;
    }
    current.solanaWalletAddress = account.solanaWalletAddress ?? current.solanaWalletAddress;
    current.activeWalletId = account.activeWalletId ?? current.activeWalletId;
    if (account.wallets) {
      current.wallets = cleanAccountWallets(account.wallets);
      const managedWallet = current.wallets.find(
        (wallet) => wallet.walletSource === "privy"
      );
      if (managedWallet) {
        current.walletSource = "privy";
        current.privyUserId = managedWallet.privyUserId;
        current.privyWalletId = managedWallet.privyWalletId;
        current.solanaWalletAddress = managedWallet.solanaWalletAddress;
        current.activeWalletId = managedWallet.walletId;
      }
    }
    current.walletClaimRequestedAt = account.walletClaimRequestedAt ?? current.walletClaimRequestedAt;
    current.walletExportRequestedAt = account.walletExportRequestedAt ?? current.walletExportRequestedAt;
    current.botAccessRevokedAt = account.botAccessRevokedAt ?? current.botAccessRevokedAt;
    current.watchlist = cleanTokenList(
      account.watchlist ?? current.watchlist
    );
    current.hiddenTokens = cleanTokenList(
      account.hiddenTokens ?? current.hiddenTokens
    );
    current.referralCode = account.referralCode ?? current.referralCode;
    current.referredByCode = account.referredByCode ?? current.referredByCode;
    current.referredByTelegramUserId = account.referredByTelegramUserId ?? current.referredByTelegramUserId;
    if (current.referralCode) {
      current.referralSummary = {
        referralCode: current.referralCode,
        referredByCode: current.referredByCode,
        referredByTelegramUserId: current.referredByTelegramUserId,
        referredUsers: current.referralSummary?.referredUsers ?? 0,
        rewardStatus: "tracking_only",
        claimableRewards: [],
        updatedAt: account.updatedAt,
        warnings: current.referralSummary?.warnings ?? []
      };
    }
    if (account.settings) {
      current.settings = {
        ...current.settings,
        slippageBps: account.settings.slippageBps ?? current.settings.slippageBps,
        priorityFeeLamports: account.settings.priorityFee ?? current.settings.priorityFeeLamports,
        sellPriorityFeeLamports: account.settings.sellPriorityFee ?? current.settings.sellPriorityFeeLamports,
        defaultBuySol: account.settings.defaultBuyAmountIn ? solFromLamports(
          account.settings.defaultBuyAmountIn,
          current.settings.defaultBuySol
        ) : current.settings.defaultBuySol,
        buyPresetsSol: account.settings.buyPresetAmountsIn ? cleanBuyPresets(
          account.settings.buyPresetAmountsIn.map(
            (amount) => solFromLamports(amount, 0)
          ),
          current.settings.defaultBuySol
        ) : current.settings.buyPresetsSol,
        sellPresetsPercent: account.settings.sellPresetBps ? cleanSellPresets(
          account.settings.sellPresetBps.map((bps) => bps / 100)
        ) : current.settings.sellPresetsPercent,
        botMode: account.settings.botMode ?? current.settings.botMode,
        confirmTrades: account.settings.confirmTrades ?? current.settings.confirmTrades,
        sellProtection: account.settings.sellProtection ?? current.settings.sellProtection,
        autoBuyEnabled: account.settings.autoBuyEnabled ?? current.settings.autoBuyEnabled,
        instantAutoBuyEnabled: account.settings.instantAutoBuyEnabled ?? current.settings.instantAutoBuyEnabled,
        instantAutoBuyAmountSol: account.settings.instantAutoBuyAmountIn ? solFromLamports(
          account.settings.instantAutoBuyAmountIn,
          current.settings.instantAutoBuyAmountSol
        ) : current.settings.instantAutoBuyAmountSol,
        instantAutoBuyMinLiquidityUsd: account.settings.instantAutoBuyMinLiquidityUsd ?? current.settings.instantAutoBuyMinLiquidityUsd,
        instantAutoBuyMaxMarketCapUsd: account.settings.instantAutoBuyMaxMarketCapUsd,
        autoSellEnabled: account.settings.autoSellEnabled ?? current.settings.autoSellEnabled,
        sniperEnabled: account.settings.sniperEnabled ?? current.settings.sniperEnabled,
        mevProtection: account.settings.mevProtection ?? current.settings.mevProtection
      };
      if (current.settings.botMode === "simple") {
        current.settings.confirmTrades = false;
      }
    }
    current.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    state.users[user.telegramUserId] = current;
    this.persist();
    return current;
  }
  syncReferralSummary(user, summary) {
    const state = this.load();
    const current = state.users[user.telegramUserId] || user;
    current.referralCode = summary.referralCode;
    current.referredByCode = summary.referredByCode;
    current.referredByTelegramUserId = summary.referredByTelegramUserId;
    current.referralSummary = summary;
    current.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    state.users[user.telegramUserId] = current;
    this.persist();
    return current;
  }
  setExternalWallet(user, address) {
    const state = this.load();
    const current = state.users[user.telegramUserId] || user;
    const walletId = `external:${address}`;
    current.wallets = mergeAccountWallet(current.wallets, {
      walletId,
      label: "Portfolio Wallet (Read only)",
      walletSource: "external",
      solanaWalletAddress: address,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    const managedWallet = current.wallets.find(
      (wallet) => wallet.walletSource === "privy"
    );
    if (!managedWallet) {
      current.walletSource = "external";
      current.solanaWalletAddress = address;
      current.activeWalletId = walletId;
    }
    current.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    state.users[user.telegramUserId] = current;
    this.persist();
    return current;
  }
  setPrivyWallet(user, wallet) {
    const state = this.load();
    const current = state.users[user.telegramUserId] || user;
    current.walletSource = "privy";
    current.privyUserId = wallet.privyUserId;
    current.privyWalletId = wallet.privyWalletId;
    current.solanaWalletAddress = wallet.solanaWalletAddress;
    current.activeWalletId = wallet.privyWalletId;
    current.wallets = cleanAccountWallets([
      {
        walletId: wallet.privyWalletId,
        label: "SPOT/NFT Wallet (Privy)",
        walletSource: "privy",
        privyUserId: wallet.privyUserId,
        privyWalletId: wallet.privyWalletId,
        solanaWalletAddress: wallet.solanaWalletAddress,
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      },
      ...(current.wallets ?? []).filter(
        (entry) => entry.walletSource === "external"
      )
    ]);
    current.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    state.users[user.telegramUserId] = current;
    this.persist();
    return current;
  }
  toggleConfirmTrades(user) {
    const state = this.load();
    const current = state.users[user.telegramUserId] || user;
    current.settings.confirmTrades = current.settings.botMode === "simple" ? false : !current.settings.confirmTrades;
    current.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    state.users[user.telegramUserId] = current;
    this.persist();
    return current;
  }
  createPendingOrder(user, order) {
    const state = this.load();
    const current = state.users[user.telegramUserId] || user;
    const now = /* @__PURE__ */ new Date();
    const pendingOrder = {
      ...order,
      id: createOrderId(),
      status: "pending_confirmation",
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + 2 * 60 * 1e3).toISOString()
    };
    current.pendingOrders ??= {};
    current.pendingOrders[pendingOrder.id] = pendingOrder;
    current.updatedAt = now.toISOString();
    state.users[user.telegramUserId] = current;
    this.persist();
    return pendingOrder;
  }
  getPendingOrder(user, orderId) {
    const state = this.load();
    const current = state.users[user.telegramUserId] || user;
    return current.pendingOrders?.[orderId];
  }
  listPendingOrders(user) {
    const state = this.load();
    const current = state.users[user.telegramUserId] || user;
    return Object.values(current.pendingOrders ?? {}).sort(
      (a, b) => b.createdAt.localeCompare(a.createdAt)
    );
  }
  cancelPendingOrder(user, orderId) {
    const state = this.load();
    const current = state.users[user.telegramUserId] || user;
    const order = current.pendingOrders?.[orderId];
    if (!order) return void 0;
    if (order.status === "execution_pending" || order.status === "executed") {
      return void 0;
    }
    order.status = "cancelled";
    current.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    state.users[user.telegramUserId] = current;
    this.persist();
    return order;
  }
  createAutomationOrder(user, order) {
    const state = this.load();
    const current = state.users[user.telegramUserId] || user;
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const automationOrder = {
      ...order,
      id: createOrderId("a"),
      status: "staged",
      createdAt: now,
      updatedAt: now
    };
    current.automationOrders ??= {};
    current.automationOrders[automationOrder.id] = automationOrder;
    current.updatedAt = now;
    state.users[user.telegramUserId] = current;
    this.persist();
    return automationOrder;
  }
  upsertAutomationOrder(user, order) {
    const state = this.load();
    const current = state.users[user.telegramUserId] || user;
    current.automationOrders ??= {};
    current.automationOrders[order.id] = order;
    current.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    state.users[user.telegramUserId] = current;
    this.persist();
    return order;
  }
  listAutomationOrders(user) {
    const state = this.load();
    const current = state.users[user.telegramUserId] || user;
    return Object.values(current.automationOrders ?? {}).sort(
      (a, b) => b.createdAt.localeCompare(a.createdAt)
    );
  }
  cancelAutomationOrder(user, orderId) {
    const state = this.load();
    const current = state.users[user.telegramUserId] || user;
    const order = current.automationOrders?.[orderId];
    if (!order) return void 0;
    order.status = "cancelled";
    order.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    current.updatedAt = order.updatedAt;
    state.users[user.telegramUserId] = current;
    this.persist();
    return order;
  }
  createWithdrawalTicket(user, ticket) {
    const state = this.load();
    const current = state.users[user.telegramUserId] || user;
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const withdrawalTicket = {
      ...ticket,
      id: createOrderId("w"),
      status: "staged",
      createdAt: now,
      updatedAt: now
    };
    current.withdrawalTickets ??= {};
    current.withdrawalTickets[withdrawalTicket.id] = withdrawalTicket;
    current.updatedAt = now;
    state.users[user.telegramUserId] = current;
    this.persist();
    return withdrawalTicket;
  }
  listWithdrawalTickets(user) {
    const state = this.load();
    const current = state.users[user.telegramUserId] || user;
    return Object.values(current.withdrawalTickets ?? {}).sort(
      (a, b) => b.createdAt.localeCompare(a.createdAt)
    );
  }
  getWithdrawalTicket(user, ticketId) {
    const state = this.load();
    const current = state.users[user.telegramUserId] || user;
    return current.withdrawalTickets?.[ticketId];
  }
  cancelWithdrawalTicket(user, ticketId) {
    const state = this.load();
    const current = state.users[user.telegramUserId] || user;
    const ticket = current.withdrawalTickets?.[ticketId];
    if (!ticket) return void 0;
    if (ticket.status === "execution_pending" || ticket.status === "executed") {
      return void 0;
    }
    ticket.status = "cancelled";
    ticket.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    current.updatedAt = ticket.updatedAt;
    state.users[user.telegramUserId] = current;
    this.persist();
    return ticket;
  }
  markWithdrawalExecuted(user, ticketId, execution) {
    const state = this.load();
    const current = state.users[user.telegramUserId] || user;
    const ticket = current.withdrawalTickets?.[ticketId];
    if (!ticket) return void 0;
    ticket.status = "executed";
    ticket.execution = execution;
    delete ticket.reconciliation;
    ticket.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    current.updatedAt = ticket.updatedAt;
    state.users[user.telegramUserId] = current;
    this.persist();
    return ticket;
  }
  markWithdrawalExecutionPending(user, ticketId, reconciliation) {
    return this.updateWithdrawalExecutionState(
      user,
      ticketId,
      "execution_pending",
      reconciliation
    );
  }
  markWithdrawalExecutionFailed(user, ticketId, reconciliation) {
    return this.updateWithdrawalExecutionState(
      user,
      ticketId,
      "execution_failed",
      reconciliation
    );
  }
  updateWithdrawalExecutionState(user, ticketId, status, reconciliation) {
    const state = this.load();
    const current = state.users[user.telegramUserId] || user;
    const ticket = current.withdrawalTickets?.[ticketId];
    if (!ticket || ticket.status === "executed") return void 0;
    ticket.status = status;
    ticket.reconciliation = reconciliation;
    ticket.updatedAt = reconciliation.checkedAt;
    current.updatedAt = reconciliation.checkedAt;
    state.users[user.telegramUserId] = current;
    this.persist();
    return ticket;
  }
  createCopyTradeConfig(user, config) {
    const state = this.load();
    const current = state.users[user.telegramUserId] || user;
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const copyTradeConfig = {
      ...config,
      id: createOrderId("c"),
      status: "staged",
      createdAt: now,
      updatedAt: now
    };
    current.copyTradeConfigs ??= {};
    current.copyTradeConfigs[copyTradeConfig.id] = copyTradeConfig;
    current.updatedAt = now;
    state.users[user.telegramUserId] = current;
    this.persist();
    return copyTradeConfig;
  }
  listCopyTradeConfigs(user) {
    const state = this.load();
    const current = state.users[user.telegramUserId] || user;
    return Object.values(current.copyTradeConfigs ?? {}).sort(
      (a, b) => b.createdAt.localeCompare(a.createdAt)
    );
  }
  upsertCopyTradeConfig(user, config) {
    const state = this.load();
    const current = state.users[user.telegramUserId] || user;
    current.copyTradeConfigs ??= {};
    current.copyTradeConfigs[config.id] = config;
    current.updatedAt = config.updatedAt;
    state.users[user.telegramUserId] = current;
    this.persist();
    return config;
  }
  cancelCopyTradeConfig(user, configId) {
    const state = this.load();
    const current = state.users[user.telegramUserId] || user;
    const config = current.copyTradeConfigs?.[configId];
    if (!config) return void 0;
    if (config.status === "executing" || config.status === "executed") {
      return void 0;
    }
    config.status = "cancelled";
    config.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    current.updatedAt = config.updatedAt;
    state.users[user.telegramUserId] = current;
    this.persist();
    return config;
  }
  createSniperConfig(user, config) {
    const state = this.load();
    const current = state.users[user.telegramUserId] || user;
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const sniperConfig = {
      ...config,
      id: createOrderId("s"),
      status: "staged",
      createdAt: now,
      updatedAt: now
    };
    current.sniperConfigs ??= {};
    current.sniperConfigs[sniperConfig.id] = sniperConfig;
    current.updatedAt = now;
    state.users[user.telegramUserId] = current;
    this.persist();
    return sniperConfig;
  }
  listSniperConfigs(user) {
    const state = this.load();
    const current = state.users[user.telegramUserId] || user;
    return Object.values(current.sniperConfigs ?? {}).sort(
      (a, b) => b.createdAt.localeCompare(a.createdAt)
    );
  }
  upsertSniperConfig(user, config) {
    const state = this.load();
    const current = state.users[user.telegramUserId] || user;
    current.sniperConfigs ??= {};
    current.sniperConfigs[config.id] = config;
    current.updatedAt = config.updatedAt;
    state.users[user.telegramUserId] = current;
    this.persist();
    return config;
  }
  cancelSniperConfig(user, configId) {
    const state = this.load();
    const current = state.users[user.telegramUserId] || user;
    const config = current.sniperConfigs?.[configId];
    if (!config) return void 0;
    if (config.status === "executing" || config.status === "executed") {
      return void 0;
    }
    config.status = "cancelled";
    config.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    current.updatedAt = config.updatedAt;
    state.users[user.telegramUserId] = current;
    this.persist();
    return config;
  }
  createAutoBuyConfig(user, config) {
    const state = this.load();
    const current = state.users[user.telegramUserId] || user;
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const autoBuyConfig = {
      ...config,
      id: createOrderId("ab"),
      status: "staged",
      createdAt: now,
      updatedAt: now
    };
    current.autoBuyConfigs ??= {};
    current.autoBuyConfigs[autoBuyConfig.id] = autoBuyConfig;
    current.updatedAt = now;
    state.users[user.telegramUserId] = current;
    this.persist();
    return autoBuyConfig;
  }
  listAutoBuyConfigs(user) {
    const state = this.load();
    const current = state.users[user.telegramUserId] || user;
    return Object.values(current.autoBuyConfigs ?? {}).sort(
      (a, b) => b.createdAt.localeCompare(a.createdAt)
    );
  }
  upsertAutoBuyConfig(user, config) {
    const state = this.load();
    const current = state.users[user.telegramUserId] || user;
    current.autoBuyConfigs ??= {};
    current.autoBuyConfigs[config.id] = config;
    current.updatedAt = config.updatedAt;
    state.users[user.telegramUserId] = current;
    this.persist();
    return config;
  }
  cancelAutoBuyConfig(user, configId) {
    const state = this.load();
    const current = state.users[user.telegramUserId] || user;
    const config = current.autoBuyConfigs?.[configId];
    if (!config) return void 0;
    if (config.status === "executing" || config.status === "executed") {
      return void 0;
    }
    config.status = "cancelled";
    config.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    current.updatedAt = config.updatedAt;
    state.users[user.telegramUserId] = current;
    this.persist();
    return config;
  }
  createBundleBuyConfig(user, config) {
    const state = this.load();
    const current = state.users[user.telegramUserId] || user;
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const bundleBuyConfig = {
      ...config,
      id: createOrderId("bb"),
      status: "staged",
      createdAt: now,
      updatedAt: now
    };
    current.bundleBuyConfigs ??= {};
    current.bundleBuyConfigs[bundleBuyConfig.id] = bundleBuyConfig;
    current.updatedAt = now;
    state.users[user.telegramUserId] = current;
    this.persist();
    return bundleBuyConfig;
  }
  listBundleBuyConfigs(user) {
    const state = this.load();
    const current = state.users[user.telegramUserId] || user;
    return Object.values(current.bundleBuyConfigs ?? {}).sort(
      (a, b) => b.createdAt.localeCompare(a.createdAt)
    );
  }
  upsertBundleBuyConfig(user, config) {
    const state = this.load();
    const current = state.users[user.telegramUserId] || user;
    current.bundleBuyConfigs ??= {};
    current.bundleBuyConfigs[config.id] = config;
    current.updatedAt = config.updatedAt;
    state.users[user.telegramUserId] = current;
    this.persist();
    return config;
  }
  updateBundleBuyExecution(user, configId, status, execution) {
    const state = this.load();
    const current = state.users[user.telegramUserId] || user;
    const config = current.bundleBuyConfigs?.[configId];
    if (!config) return void 0;
    config.status = status;
    config.execution = execution;
    config.updatedAt = execution.checkedAt;
    current.updatedAt = execution.checkedAt;
    state.users[user.telegramUserId] = current;
    this.persist();
    return config;
  }
  cancelBundleBuyConfig(user, configId) {
    const state = this.load();
    const current = state.users[user.telegramUserId] || user;
    const config = current.bundleBuyConfigs?.[configId];
    if (!config) return void 0;
    if (config.status === "executing" || config.status === "executed") {
      return void 0;
    }
    config.status = "cancelled";
    config.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    current.updatedAt = config.updatedAt;
    state.users[user.telegramUserId] = current;
    this.persist();
    return config;
  }
  createAutoSellConfig(user, config) {
    const state = this.load();
    const current = state.users[user.telegramUserId] || user;
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const autoSellConfig = {
      ...config,
      id: createOrderId("as"),
      status: "staged",
      createdAt: now,
      updatedAt: now
    };
    current.autoSellConfigs ??= {};
    current.autoSellConfigs[autoSellConfig.id] = autoSellConfig;
    current.updatedAt = now;
    state.users[user.telegramUserId] = current;
    this.persist();
    return autoSellConfig;
  }
  listAutoSellConfigs(user) {
    const state = this.load();
    const current = state.users[user.telegramUserId] || user;
    return Object.values(current.autoSellConfigs ?? {}).sort(
      (a, b) => b.createdAt.localeCompare(a.createdAt)
    );
  }
  upsertAutoSellConfig(user, config) {
    const state = this.load();
    const current = state.users[user.telegramUserId] || user;
    current.autoSellConfigs ??= {};
    current.autoSellConfigs[config.id] = config;
    current.updatedAt = config.updatedAt;
    state.users[user.telegramUserId] = current;
    this.persist();
    return config;
  }
  cancelAutoSellConfig(user, configId) {
    const state = this.load();
    const current = state.users[user.telegramUserId] || user;
    const config = current.autoSellConfigs?.[configId];
    if (!config) return void 0;
    if (config.status === "executing" || config.status === "executed") {
      return void 0;
    }
    config.status = "cancelled";
    config.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    current.updatedAt = config.updatedAt;
    state.users[user.telegramUserId] = current;
    this.persist();
    return config;
  }
  markSwapBuilt(user, orderId, swapBuild) {
    const state = this.load();
    const current = state.users[user.telegramUserId] || user;
    const order = current.pendingOrders?.[orderId];
    if (!order) return void 0;
    order.status = "swap_built";
    order.swapBuild = swapBuild;
    current.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    state.users[user.telegramUserId] = current;
    this.persist();
    return order;
  }
  markExecuted(user, orderId, execution) {
    const state = this.load();
    const current = state.users[user.telegramUserId] || user;
    const order = current.pendingOrders?.[orderId];
    if (!order) return void 0;
    order.status = "executed";
    order.execution = execution;
    delete order.reconciliation;
    current.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    state.users[user.telegramUserId] = current;
    this.persist();
    return order;
  }
  markExecutionPending(user, orderId, reconciliation) {
    return this.updatePendingOrderExecutionState(
      user,
      orderId,
      "execution_pending",
      reconciliation
    );
  }
  markExecutionFailed(user, orderId, reconciliation) {
    return this.updatePendingOrderExecutionState(
      user,
      orderId,
      "execution_failed",
      reconciliation
    );
  }
  markDryRun(user, orderId) {
    const state = this.load();
    const current = state.users[user.telegramUserId] || user;
    const order = current.pendingOrders?.[orderId];
    if (!order) return void 0;
    order.status = "dry_run";
    current.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    state.users[user.telegramUserId] = current;
    this.persist();
    return order;
  }
  listUsers() {
    return Object.values(this.load().users).sort(
      (a, b) => a.telegramUserId.localeCompare(b.telegramUserId)
    );
  }
  getActivityAlertCursor(user) {
    const current = this.load().users[user.telegramUserId] || user;
    return current.activityAlertCursor;
  }
  initializeActivityAlertCursor(user, eventIds, initializedAt) {
    const state = this.load();
    const current = state.users[user.telegramUserId] || user;
    if (current.activityAlertCursor) {
      return current.activityAlertCursor;
    }
    current.activityAlertCursor = {
      initializedAt,
      seenEventIds: cleanActivityAlertEventIds(eventIds)
    };
    current.updatedAt = initializedAt;
    state.users[user.telegramUserId] = current;
    this.persist();
    return current.activityAlertCursor;
  }
  markActivityAlertEventsSeen(user, eventIds, observedAt) {
    return this.updateActivityAlertCursor(user, eventIds, observedAt);
  }
  markActivityAlertsDelivered(user, eventIds, deliveredAt) {
    return this.updateActivityAlertCursor(user, eventIds, deliveredAt, {
      lastDeliveredAt: deliveredAt,
      consecutiveFailures: 0
    });
  }
  markActivityAlertDeliveryFailed(user, failedAt, nextAttemptAt) {
    const state = this.load();
    const current = state.users[user.telegramUserId] || user;
    const cursor = current.activityAlertCursor ?? {
      initializedAt: failedAt,
      seenEventIds: []
    };
    cursor.consecutiveFailures = (cursor.consecutiveFailures ?? 0) + 1;
    cursor.lastFailureAt = failedAt;
    cursor.nextAttemptAt = nextAttemptAt;
    current.activityAlertCursor = cursor;
    current.updatedAt = failedAt;
    state.users[user.telegramUserId] = current;
    this.persist();
    return cursor;
  }
  updateActivityAlertCursor(user, eventIds, updatedAt, delivery) {
    const state = this.load();
    const current = state.users[user.telegramUserId] || user;
    const cursor = current.activityAlertCursor ?? {
      initializedAt: updatedAt,
      seenEventIds: []
    };
    cursor.seenEventIds = cleanActivityAlertEventIds([
      ...eventIds,
      ...cursor.seenEventIds
    ]);
    if (delivery) {
      cursor.lastDeliveredAt = delivery.lastDeliveredAt;
      cursor.consecutiveFailures = delivery.consecutiveFailures;
      delete cursor.lastFailureAt;
      delete cursor.nextAttemptAt;
    }
    current.activityAlertCursor = cursor;
    current.updatedAt = updatedAt;
    state.users[user.telegramUserId] = current;
    this.persist();
    return cursor;
  }
  updatePendingOrderExecutionState(user, orderId, status, reconciliation) {
    const state = this.load();
    const current = state.users[user.telegramUserId] || user;
    const order = current.pendingOrders?.[orderId];
    if (!order || order.status === "executed") return void 0;
    order.status = status;
    order.reconciliation = reconciliation;
    current.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    state.users[user.telegramUserId] = current;
    this.persist();
    return order;
  }
  load() {
    if (this.state) return this.state;
    try {
      const raw = fs2.readFileSync(this.filePath, "utf8");
      this.state = JSON.parse(raw);
    } catch {
      this.state = defaultStore();
    }
    return this.state;
  }
  persist() {
    const state = this.load();
    fs2.mkdirSync(path.dirname(this.filePath), { recursive: true });
    fs2.writeFileSync(this.filePath, `${JSON.stringify(state, null, 2)}
`, {
      mode: 384
    });
  }
};
function createOrderId(prefix = "o") {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${timestamp}_${random}`;
}
function cleanActivityAlertEventIds(value) {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(
      value.filter(
        (eventId) => typeof eventId === "string" && eventId.length > 0
      )
    )
  ].slice(0, ACTIVITY_ALERT_CURSOR_EVENT_LIMIT);
}
function cleanNonNegativeInteger(value) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : 0;
}
function solFromLamports(value, fallback) {
  const lamports = Number(value);
  return Number.isFinite(lamports) && lamports >= 0 ? lamports / 1e9 : fallback;
}
function defaultBuyPresets(defaultBuySol) {
  return [.../* @__PURE__ */ new Set([defaultBuySol, 0.25, 0.5, 1])].filter((value) => Number.isFinite(value) && value > 0).slice(0, 4);
}
function cleanBuyPresets(value, defaultBuySol) {
  const presets = Array.isArray(value) ? [
    ...new Set(
      value.filter(
        (entry) => typeof entry === "number" && Number.isFinite(entry) && entry > 0
      )
    )
  ].slice(0, 4) : [];
  return presets.length >= 2 ? presets : defaultBuyPresets(defaultBuySol);
}
function cleanSellPresets(value) {
  const presets = Array.isArray(value) ? [
    ...new Set(
      value.filter(
        (entry) => typeof entry === "number" && Number.isFinite(entry) && entry > 0 && entry <= 100
      )
    )
  ].slice(0, 4) : [];
  return presets.length >= 2 ? presets : [25, 50, 75, 100];
}
function cleanTokenList(values) {
  return [...new Set(values.filter((value) => typeof value === "string"))];
}
function cleanAccountWallets(value) {
  if (!Array.isArray(value)) return [];
  const addressPattern = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  const wallets = [];
  let hasManagedWallet = false;
  for (const entry of value) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry))
      continue;
    const wallet = entry;
    if (!wallet.walletId || !wallet.walletSource || !wallet.solanaWalletAddress || !addressPattern.test(wallet.solanaWalletAddress) || wallet.walletSource === "privy" && (!wallet.privyUserId || !wallet.privyWalletId) || wallet.walletSource === "privy" && hasManagedWallet || wallets.some(
      (current) => current.walletId === wallet.walletId || current.solanaWalletAddress === wallet.solanaWalletAddress
    )) {
      continue;
    }
    wallets.push({
      walletId: wallet.walletId,
      label: wallet.walletSource === "privy" ? "SPOT/NFT Wallet (Privy)" : "Portfolio Wallet (Read only)",
      walletSource: wallet.walletSource,
      ...wallet.privyUserId ? { privyUserId: wallet.privyUserId } : {},
      ...wallet.privyWalletId ? { privyWalletId: wallet.privyWalletId } : {},
      solanaWalletAddress: wallet.solanaWalletAddress,
      createdAt: wallet.createdAt || (/* @__PURE__ */ new Date()).toISOString()
    });
    if (wallet.walletSource === "privy") hasManagedWallet = true;
    if (wallets.length >= 10) break;
  }
  return wallets;
}
function mergeAccountWallet(current, wallet) {
  const wallets = cleanAccountWallets(current ?? []);
  const existing = wallets.find(
    (entry) => entry.walletId === wallet.walletId || entry.solanaWalletAddress === wallet.solanaWalletAddress
  );
  if (existing) {
    return wallets.map(
      (entry) => entry.walletId === existing.walletId ? {
        ...wallet,
        label: existing.label,
        createdAt: existing.createdAt
      } : entry
    );
  }
  return [...wallets, wallet].slice(0, 10);
}

// src/trading/TradingBot.ts
var SOL_MINT3 = "So11111111111111111111111111111111111111112";
var SOLANA_ADDRESS_PATTERN4 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
var RIBBOT_BETA_INTRO = [
  "Gribbit, nice to meet you. \u{1F438}",
  "",
  "This is Ribbot, your trading assistant for the Frog Trading Exchange, brought to you by the Solana Business Frogs.",
  "",
  "One account for:",
  "",
  "SPOT/NFT trading on Frog Trading Exchange",
  "",
  "Delta Neutral Perps Points Farmer, powered by Imperial",
  "",
  "Connect Telegram to begin.",
  "",
  "Privy secures your account and wallet key."
].join("\n");
var TradingBot = class {
  bot;
  config;
  store;
  activityAlertPoller;
  constructor(bot, runtime) {
    this.bot = bot;
    this.config = loadTradingConfig(runtime);
    this.store = new TradingStateStore(this.config.stateFile);
    this.activityAlertPoller = new ActivityAlertPoller({
      enabled: this.config.activityAlertsEnabled,
      tgTrader: this.config.tgTrader,
      frogxApiBaseUrl: this.config.frogxApiBaseUrl,
      ftxApiToken: this.config.ftxApiToken,
      pollIntervalMs: this.config.activityAlertPollIntervalMs,
      maxUsersPerPoll: this.config.activityAlertMaxUsersPerPoll,
      maxEventsPerMessage: this.config.activityAlertMaxEventsPerMessage,
      store: this.store,
      logger: {
        info: (...values) => logger.info(...values),
        warn: (...values) => logger.warn(...values)
      },
      sendMessage: (telegramUserId, text, messageKind) => messageKind === "onboarding" ? this.bot.telegram.sendMessage(telegramUserId, text) : this.bot.telegram.sendMessage(
        telegramUserId,
        text,
        Markup.inlineKeyboard([
          [
            Markup.button.callback(
              "Activity",
              "ribbot:activity"
            )
          ],
          [Markup.button.callback("Menu", "ribbot:menu")]
        ])
      )
    });
  }
  isEnabled() {
    return this.config.tgTrader;
  }
  startActivityAlerts() {
    return this.activityAlertPoller.start();
  }
  async stopActivityAlerts() {
    await this.activityAlertPoller.stop();
  }
  async handleMessage(ctx) {
    if (!this.isEnabled() || !ctx.message || !ctx.from) return false;
    const text = this.getText(ctx);
    if (!text) return false;
    const intent = this.parseIntent(text);
    if (!intent) return false;
    const user = this.getUser(ctx);
    if (!this.config.spotEnabled && !isBetaIntent(intent)) {
      await this.replyBetaUnavailable(ctx);
      return true;
    }
    switch (intent.kind) {
      case "onboarding":
        if (intent.referralCode) {
          await this.replyReferral(ctx, user, {
            kind: "referral",
            action: "apply",
            referralCode: intent.referralCode
          });
        }
        await this.replyStart(ctx, user);
        return true;
      case "menu":
        await this.replyMainMenu(ctx, user);
        return true;
      case "farm":
        await this.replyFarmerHome(ctx);
        return true;
      case "perpsStatus":
        await this.replyPerpsStatus(ctx, user);
        return true;
      case "deltaNeutral":
        await this.replyDeltaNeutralStatus(ctx, user);
        return true;
      case "deltaNeutralStop":
        await this.replyDeltaNeutralStopReview(ctx, user);
        return true;
      case "spotComingSoon":
        await this.replyBetaUnavailable(ctx);
        return true;
      case "wallet":
        await this.replyWallet(
          ctx,
          user,
          intent.address,
          intent.selection
        );
        return true;
      case "account":
        await this.replyAccount(ctx, user);
        return true;
      case "control":
        await this.replyControl(ctx, user);
        return true;
      case "reset":
        await this.replyResetSetup(ctx, user);
        return true;
      case "referral":
        await this.replyReferral(ctx, user, intent);
        return true;
      case "activity":
        await this.replyActivity(ctx, user);
        return true;
      case "settings":
        await this.replySettings(ctx, user, intent);
        return true;
      case "positions":
        if (intent.mint) {
          await this.replyPosition(
            ctx,
            user,
            intent.mint,
            intent.page
          );
        } else {
          await this.replyPositions(ctx, user, intent.page);
        }
        return true;
      case "nfts":
        await this.replyNftHoldings(ctx, user, intent.page);
        return true;
      case "frogBuy":
        await this.replyFrogBuyReview(ctx, user, 1, intent.maximumSol);
        return true;
      case "frogSweep":
        await this.replyFrogBuyReview(
          ctx,
          user,
          intent.quantity,
          intent.maximumSol
        );
        return true;
      case "frogSell":
        await this.replyFrogSellReview(
          ctx,
          user,
          intent.mint,
          intent.minimumSol
        );
        return true;
      case "pnl":
        await this.replyPnl(ctx, user);
        return true;
      case "cleanup":
        await this.replyTokenCleanup(ctx, user);
        return true;
      case "safety":
        await this.replyTokenSafety(ctx, user, intent.mint);
        return true;
      case "scan":
        await this.replyMarketRisk(
          ctx,
          user,
          intent.mint,
          intent.amountSol
        );
        return true;
      case "orders":
        await this.replyOrders(ctx, user);
        return true;
      case "withdrawals":
        await this.replyWithdrawals(ctx, user);
        return true;
      case "withdraw":
        await this.replyWithdraw(ctx, user, intent);
        return true;
      case "limit":
        await this.replyLimitOrder(ctx, user, intent);
        return true;
      case "dca":
        await this.replyDcaOrder(ctx, user, intent);
        return true;
      case "stop":
        await this.replyStopOrder(ctx, user, intent);
        return true;
      case "trailing":
        await this.replyTrailingOrder(ctx, user, intent);
        return true;
      case "watchlist":
        await this.replyWatchlist(ctx, user, intent);
        return true;
      case "hidden":
        await this.replyHiddenTokens(ctx, user, intent);
        return true;
      case "copytrade":
        await this.replyCopyTrade(ctx, user, intent);
        return true;
      case "sniper":
        await this.replySniper(ctx, user, intent);
        return true;
      case "autoBuy":
        await this.replyAutoBuy(ctx, user, intent);
        return true;
      case "bundleBuy":
        await this.replyBundleBuy(ctx, user, intent);
        return true;
      case "autoSell":
        await this.replyAutoSell(ctx, user, intent);
        return true;
      case "buy":
        await this.replyBuy(ctx, user, intent.mint, intent.amountSol);
        return true;
      case "sell":
        await this.replySell(ctx, user, intent.mint, intent.percentage);
        return true;
      case "token":
        await this.replyToken(ctx, user, intent.mint);
        return true;
      case "help":
        await this.replyHelp(ctx);
        return true;
      case "unknown":
        await this.replyUnknownCommand(ctx, intent.command);
        return true;
      default:
        return false;
    }
  }
  async handleCallbackQuery(ctx) {
    if (!this.isEnabled() || !ctx.callbackQuery || !ctx.from) return false;
    const data = "data" in ctx.callbackQuery ? ctx.callbackQuery.data : "";
    if (!data?.startsWith("ribbot:")) return false;
    const user = this.getUser(ctx);
    await ctx.answerCbQuery();
    const [, action, ...rest] = data.split(":");
    if (action === "menu") {
      await this.replyMainMenu(ctx, user);
      return true;
    }
    if (action === "help") {
      await this.replyHelp(ctx);
      return true;
    }
    if (action === "farm") {
      await this.replyFarmSetup(ctx, user);
      return true;
    }
    if (action === "farmer-home") {
      await this.replyFarmerHome(ctx);
      return true;
    }
    if (action === "farmer-how") {
      await this.replyFarmerHowItWorks(ctx);
      return true;
    }
    if (action === "perps-status") {
      await this.replyPerpsStatus(ctx, user);
      return true;
    }
    if (action === "delta-neutral-review") {
      await this.replyDeltaNeutralReview(ctx, user);
      return true;
    }
    if (action === "delta-neutral-start") {
      await this.replyDeltaNeutralStart(ctx, user);
      return true;
    }
    if (action === "delta-neutral-status") {
      await this.replyDeltaNeutralStatus(ctx, user);
      return true;
    }
    if (action === "delta-neutral-stop-review") {
      await this.replyDeltaNeutralStopReview(ctx, user);
      return true;
    }
    if (action === "delta-neutral-stop-confirm") {
      await this.replyDeltaNeutralStopConfirmed(ctx, user);
      return true;
    }
    if (action === "spot") {
      await this.replyBetaUnavailable(ctx);
      return true;
    }
    if (action === "account") {
      await this.replyAccount(ctx, user);
      return true;
    }
    if (action === "control") {
      await this.replyControl(ctx, user);
      return true;
    }
    if (action === "reset") {
      await this.replyResetSetup(ctx, user);
      return true;
    }
    if (action === "reset-confirm") {
      await this.replyResetSetup(ctx, user);
      return true;
    }
    if (action === "reset-cancel") {
      await ctx.reply(
        "Reset cancelled.",
        Markup.inlineKeyboard([
          [Markup.button.callback("Menu", "ribbot:menu")]
        ])
      );
      return true;
    }
    if (action === "referrals") {
      await this.replyReferral(ctx, user);
      return true;
    }
    if (action === "nfts") {
      await this.replyNftHoldings(
        ctx,
        user,
        parsePositionPageIndex(rest[0])
      );
      return true;
    }
    if (action === "frog-buy") {
      await this.replyFrogBuyReview(ctx, user, 1);
      return true;
    }
    if (action === "frog-sweep") {
      await this.replyFrogBuyReview(ctx, user, Number(rest[0]));
      return true;
    }
    if (action === "frog-sell") {
      await this.replyFrogSellReview(ctx, user, rest[0]);
      return true;
    }
    if (action === "frog-confirm") {
      await this.replyFrogTradeConfirmed(ctx, user, rest[0]);
      return true;
    }
    if (action === "frog-check") {
      await this.replyFrogTradeStatus(ctx, user, rest[0]);
      return true;
    }
    if (action === "frog-cancel") {
      await this.replyFrogTradeCancelled(ctx, user, rest[0]);
      return true;
    }
    if (!this.config.spotEnabled) {
      await this.replyBetaUnavailable(ctx);
      return true;
    }
    if (action === "wallet") {
      await this.replyWallet(ctx, user);
      return true;
    }
    if (action === "wallet-select") {
      const index = Number(rest[0]);
      await this.replyWallet(
        ctx,
        user,
        void 0,
        Number.isInteger(index) && index >= 0 ? index + 1 : void 0
      );
      return true;
    }
    if (action === "activity") {
      await this.replyActivity(ctx, user);
      return true;
    }
    if (action === "settings") {
      await this.replySettings(ctx, user);
      return true;
    }
    if (action === "positions") {
      await this.replyPositions(
        ctx,
        user,
        parsePositionPageIndex(rest[0])
      );
      return true;
    }
    if (action === "position") {
      const [mint, page] = rest;
      if (isSolanaMint(mint)) {
        await this.replyPosition(
          ctx,
          user,
          mint,
          parsePositionPageIndex(page)
        );
      } else {
        await this.replyUnknownAction(ctx);
      }
      return true;
    }
    if (action === "pv") {
      const [mint, page, visibility] = rest;
      if (!isSolanaMint(mint) || visibility !== "hide" && visibility !== "show") {
        await this.replyUnknownAction(ctx);
        return true;
      }
      await this.applyTokenPreference(ctx, user, {
        kind: "hiddenToken",
        action: visibility === "hide" ? "add" : "remove",
        mint
      });
      await this.replyPositions(ctx, user, parsePositionPageIndex(page));
      return true;
    }
    if (action === "pnl") {
      await this.replyPnl(ctx, user);
      return true;
    }
    if (action === "cleanup") {
      await this.replyTokenCleanup(ctx, user);
      return true;
    }
    if (action === "orders") {
      await this.replyOrders(ctx, user);
      return true;
    }
    if (action === "withdrawals") {
      await this.replyWithdrawals(ctx, user);
      return true;
    }
    if (action === "cancel-auto") {
      await this.replyCancelAutomationOrder(ctx, user, rest[0]);
      return true;
    }
    if (action === "cancel-withdrawal") {
      await this.replyCancelWithdrawal(ctx, user, rest[0]);
      return true;
    }
    if (action === "execute-withdrawal") {
      await this.replyExecuteWithdrawal(ctx, user, rest[0]);
      return true;
    }
    if (action === "check-withdrawal") {
      await this.replyCheckWithdrawalStatus(ctx, user, rest[0]);
      return true;
    }
    if (action === "watchlist") {
      await this.replyWatchlist(ctx, user);
      return true;
    }
    if (action === "hidden") {
      await this.replyHiddenTokens(ctx, user);
      return true;
    }
    if (action === "copytrade") {
      await this.replyCopyTrade(ctx, user);
      return true;
    }
    if (action === "sniper") {
      await this.replySniper(ctx, user);
      return true;
    }
    if (action === "autobuy") {
      await this.replyAutoBuy(ctx, user);
      return true;
    }
    if (action === "bundle") {
      await this.replyBundleBuy(ctx, user);
      return true;
    }
    if (action === "autosell") {
      await this.replyAutoSell(ctx, user);
      return true;
    }
    if (action === "cancel-copytrade") {
      await this.replyCancelCopyTrade(ctx, user, rest[0]);
      return true;
    }
    if (action === "pause-copytrade" || action === "resume-copytrade") {
      await this.replyControlCopyTrade(
        ctx,
        user,
        rest[0],
        action === "pause-copytrade" ? "pause" : "resume"
      );
      return true;
    }
    if (action === "edit-copytrade") {
      await this.replyCopyTradeEditHelp(ctx, user, rest[0]);
      return true;
    }
    if (action === "duplicate-copytrade") {
      await this.replyDuplicateCopyTrade(ctx, user, rest[0]);
      return true;
    }
    if (action === "check-copytrade") {
      await this.replyCheckCopyTradeStatus(ctx, user, rest[0]);
      return true;
    }
    if (action === "cancel-sniper") {
      await this.replyCancelSniper(ctx, user, rest[0]);
      return true;
    }
    if (action === "check-sniper") {
      await this.replyCheckSniperStatus(ctx, user, rest[0]);
      return true;
    }
    if (action === "cancel-autobuy") {
      await this.replyCancelAutoBuy(ctx, user, rest[0]);
      return true;
    }
    if (action === "check-autobuy") {
      await this.replyCheckAutoBuyStatus(ctx, user, rest[0]);
      return true;
    }
    if (action === "cancel-bundle") {
      await this.replyCancelBundleBuy(ctx, user, rest[0]);
      return true;
    }
    if (action === "execute-bundle") {
      await this.replyExecuteBundleBuy(ctx, user, rest[0]);
      return true;
    }
    if (action === "check-bundle") {
      await this.replyCheckBundleBuyStatus(ctx, user, rest[0]);
      return true;
    }
    if (action === "cancel-autosell") {
      await this.replyCancelAutoSell(ctx, user, rest[0]);
      return true;
    }
    if (action === "check-autosell") {
      await this.replyCheckAutoSellStatus(ctx, user, rest[0]);
      return true;
    }
    if (action === "toggle-confirm") {
      await this.applySettingsPreference(ctx, user, {
        confirmTrades: !user.settings.confirmTrades
      });
      return true;
    }
    if (action === "set-mode") {
      const botMode = rest[0];
      if (botMode === "simple" || botMode === "advanced") {
        await this.applySettingsPreference(ctx, user, {
          botMode,
          ...botMode === "simple" ? { confirmTrades: false } : {}
        });
      } else {
        await this.replyUnknownAction(ctx);
      }
      return true;
    }
    if (action === "toggle-sell-protection") {
      await this.applySettingsPreference(ctx, user, {
        sellProtection: !user.settings.sellProtection
      });
      return true;
    }
    if (action === "confirm") {
      await this.replyConfirmOrder(ctx, user, rest[0]);
      return true;
    }
    if (action === "check-order") {
      await this.replyCheckOrderStatus(ctx, user, rest[0]);
      return true;
    }
    if (action === "cancel") {
      await this.replyCancelOrder(ctx, user, rest[0]);
      return true;
    }
    if (action === "watch") {
      const mint = rest[0];
      if (isSolanaMint(mint)) {
        await this.applyTokenPreference(ctx, user, {
          kind: "watchlist",
          action: "add",
          mint
        });
      } else {
        await this.replyUnknownAction(ctx);
      }
      return true;
    }
    if (action === "safety") {
      await this.replyTokenSafety(ctx, user, rest[0]);
      return true;
    }
    if (action === "scan") {
      await this.replyMarketRisk(ctx, user, rest[0]);
      return true;
    }
    if (action === "buy") {
      const [mint, amount] = rest;
      await this.replyBuy(ctx, user, mint, Number(amount));
      return true;
    }
    if (action === "sell") {
      const [mint, percentage] = rest;
      await this.replySell(ctx, user, mint, Number(percentage));
      return true;
    }
    if (action === "cleanup-hide") {
      const mint = rest[0];
      if (isSolanaMint(mint)) {
        await this.applyTokenPreference(ctx, user, {
          kind: "hiddenToken",
          action: "add",
          mint
        });
      } else {
        await this.replyUnknownAction(ctx);
      }
      return true;
    }
    if (action === "cleanup-sell") {
      const mint = rest[0];
      await this.replySell(ctx, user, mint, 100);
      return true;
    }
    await this.replyUnknownAction(ctx);
    return true;
  }
  parseIntent(text) {
    const normalized = text.trim();
    const [commandRaw, ...args] = normalized.split(/\s+/);
    const [command, commandMention] = commandRaw.toLowerCase().split("@");
    if (commandMention && !this.isOwnBotMention(commandMention)) {
      return null;
    }
    if (command === "/start") {
      return {
        kind: "onboarding",
        referralCode: isReferralCode(args[0]) ? args[0].toUpperCase() : void 0
      };
    }
    if (["/menu", "/trading"].includes(command)) {
      return { kind: "menu" };
    }
    if (["/farm", "/farming", "/perps"].includes(command)) {
      return { kind: "farm" };
    }
    if (["/farmer", "/strategy", "/deltaneutral", "/routedarb"].includes(
      command
    )) {
      return { kind: "deltaNeutral" };
    }
    if (["/stopfarming", "/stopfarmer"].includes(command)) {
      return { kind: "deltaNeutralStop" };
    }
    if (command === "/spot") {
      return { kind: "spotComingSoon" };
    }
    if (command === "/wallet") {
      return parseWalletCommand(args);
    }
    if (["/status", "/balance", "/deposit", "/sync"].includes(command)) {
      return { kind: "perpsStatus" };
    }
    if (command === "/account") {
      return { kind: "account" };
    }
    if (["/control", "/manage"].includes(command)) {
      return { kind: "control" };
    }
    if (command === "/reset") {
      return { kind: "reset" };
    }
    if (["/referral", "/referrals", "/rewards", "/reward"].includes(command)) {
      return {
        kind: "referral",
        action: isReferralCode(args[0]) ? "apply" : "show",
        referralCode: isReferralCode(args[0]) ? args[0].toUpperCase() : void 0
      };
    }
    if (["/activity", "/history", "/trades", "/events"].includes(command)) {
      return { kind: "activity" };
    }
    if (command === "/settings") return parseSettingsIntent(args);
    if (["/positions", "/position"].includes(command)) {
      const mint2 = findMint(args);
      const pageValue = mint2 ? void 0 : Number(args[0]);
      return {
        kind: "positions",
        mint: mint2,
        page: Number.isInteger(pageValue) && pageValue > 0 ? pageValue - 1 : 0
      };
    }
    if (["/nfts", "/collectibles", "/frogs"].includes(command)) {
      const pageValue = Number(args[0]);
      return {
        kind: "nfts",
        page: Number.isInteger(pageValue) && pageValue > 0 ? pageValue - 1 : 0
      };
    }
    if (["/buyfrog", "/frogfloor"].includes(command)) {
      return { kind: "frogBuy", maximumSol: positiveNumber3(args[0]) };
    }
    if (["/sweepfrogs", "/sweepfrog"].includes(command)) {
      return {
        kind: "frogSweep",
        quantity: positiveInteger(args[0]),
        maximumSol: positiveNumber3(args[1])
      };
    }
    if (["/sellfrog", "/frogsell"].includes(command)) {
      return {
        kind: "frogSell",
        mint: findMint(args),
        minimumSol: positiveNumber3(
          args.find((arg) => !isSolanaMint(arg))
        )
      };
    }
    if (["/pnl", "/profit", "/profits"].includes(command)) {
      return { kind: "pnl" };
    }
    if (["/cleanup", "/clean"].includes(command)) {
      return { kind: "cleanup" };
    }
    if (["/safety", "/safe", "/risk", "/rugcheck"].includes(command)) {
      return { kind: "safety", mint: findMint(args) };
    }
    if (["/scan", "/market", "/liquidity"].includes(command)) {
      return {
        kind: "scan",
        mint: findMint(args),
        amountSol: findNumber(args)
      };
    }
    if (["/withdrawals", "/withdraws"].includes(command)) {
      return { kind: "withdrawals" };
    }
    if (command === "/withdraw") {
      return parseWithdrawalIntent(args);
    }
    if (command === "/orders") {
      return { kind: "orders" };
    }
    if (command === "/limit") {
      const triggerDirection = findTriggerDirection(args);
      return {
        kind: "limit",
        side: parseOrderSide(args[0]) ?? "buy",
        mint: findMint(args),
        amount: findAmountBeforeTrigger(args, triggerDirection),
        triggerDirection,
        triggerPrice: findTriggerPrice(args, triggerDirection)
      };
    }
    if (command === "/dca") {
      const mint2 = findMint(args);
      const numbers = findNumbersAfterMint(args, mint2);
      return {
        kind: "dca",
        side: parseOrderSide(args[0]) ?? "buy",
        mint: mint2,
        totalSol: numbers[0],
        orderCount: numbers[1],
        intervalMinutes: numbers[2]
      };
    }
    if (["/stop", "/stoploss", "/sl"].includes(command)) {
      const triggerDirection = findTriggerDirection(args);
      return {
        kind: "stop",
        mint: findMint(args),
        percentage: findAmountBeforeTrigger(args, triggerDirection),
        triggerDirection,
        triggerPrice: findTriggerPrice(args, triggerDirection)
      };
    }
    if (["/trailing", "/trail", "/trailingstop"].includes(command)) {
      const mint2 = findMint(args);
      const numbers = findNumbersAfterMint(args, mint2);
      return {
        kind: "trailing",
        mint: mint2,
        percentage: numbers[0],
        trailingPercent: numbers[1]
      };
    }
    if (["/watchlist", "/watch"].includes(command)) {
      return parseWatchlistIntent(command, args);
    }
    if (command === "/hidden") {
      return { kind: "hidden", action: "list" };
    }
    if (command === "/hide") {
      return { kind: "hidden", action: "add", mint: findMint(args) };
    }
    if (command === "/unhide") {
      return { kind: "hidden", action: "remove", mint: findMint(args) };
    }
    if (["/copytrade", "/copy"].includes(command)) {
      return { kind: "copytrade", ...parseCopyTradeCommand(args) };
    }
    if (["/sniper", "/snipe"].includes(command)) {
      return parseSniperIntent(args);
    }
    if (["/autobuy", "/auto-buy"].includes(command)) {
      return parseAutoBuyIntent(args);
    }
    if (["/bundle", "/bundlebuy", "/bundle-buy"].includes(command)) {
      return parseBundleBuyIntent(args);
    }
    if (["/autosell", "/auto-sell"].includes(command)) {
      return parseAutoSellIntent(args);
    }
    if (["/help", "/commands"].includes(command)) {
      return { kind: "help" };
    }
    if (["/buy", "/ape"].includes(command)) {
      return {
        kind: "buy",
        mint: findMint(args),
        amountSol: findNumber(args)
      };
    }
    if (["/sell"].includes(command)) {
      return {
        kind: "sell",
        mint: findMint(args),
        percentage: findNumber(args)
      };
    }
    const mint = findMint(normalized.split(/\s+/));
    if (mint && normalized === mint) {
      return { kind: "token", mint };
    }
    if (isBotCommand(command)) {
      return { kind: "unknown", command };
    }
    return null;
  }
  isOwnBotMention(mention) {
    const username = this.bot.botInfo?.username?.toLowerCase();
    if (!username) return true;
    return mention === username;
  }
  getUser(ctx) {
    const telegramUserId = ctx.from?.id.toString() || "unknown";
    const username = ctx.from?.username || ctx.from?.first_name || "Unknown";
    return this.store.getOrCreateUser(telegramUserId, username, {
      confirmTrades: this.config.confirmTrades,
      defaultBuySol: this.config.defaultBuySol,
      slippageBps: this.config.slippageBps,
      priorityFeeLamports: this.config.priorityFeeLamports
    });
  }
  getText(ctx) {
    const message2 = ctx.message;
    if (!message2) return "";
    if ("text" in message2 && typeof message2.text === "string") {
      return message2.text;
    }
    if ("caption" in message2 && typeof message2.caption === "string") {
      return message2.caption;
    }
    return "";
  }
  async replyMainMenu(ctx, user) {
    if (!this.config.spotEnabled) {
      await ctx.reply(
        RIBBOT_BETA_INTRO,
        Markup.inlineKeyboard([
          [Markup.button.callback("Connect Account", "ribbot:farm")],
          [
            Markup.button.callback(
              "Perps Farmer",
              "ribbot:perps-status"
            ),
            ...this.config.nftTradingEnabled ? [Markup.button.callback("Frogs", "ribbot:nfts:0")] : []
          ],
          [Markup.button.callback("Help", "ribbot:help")]
        ])
      );
      return;
    }
    const currentUser = await this.refreshAccountSnapshot(user);
    const walletLine = currentUser.solanaWalletAddress ? `Wallet: ${shortAddress(currentUser.solanaWalletAddress)}` : "Wallet: not linked yet";
    const interfaceMode = currentUser.settings.botMode === "simple" ? "Simple" : "Advanced";
    const keyboard = currentUser.settings.botMode === "simple" ? [
      [
        Markup.button.callback("Wallet", "ribbot:wallet"),
        Markup.button.callback(
          "Positions",
          "ribbot:positions"
        )
      ],
      [
        Markup.button.callback("NFTs", "ribbot:nfts:0"),
        Markup.button.callback("PNL", "ribbot:pnl")
      ],
      [
        Markup.button.callback(
          "Watchlist",
          "ribbot:watchlist"
        ),
        Markup.button.callback("Activity", "ribbot:activity")
      ],
      [
        Markup.button.callback("Settings", "ribbot:settings"),
        Markup.button.callback("Account", "ribbot:account")
      ],
      [
        Markup.button.callback(
          "Withdrawals",
          "ribbot:withdrawals"
        )
      ]
    ] : [
      [
        Markup.button.callback("Wallet", "ribbot:wallet"),
        Markup.button.callback("Account", "ribbot:account")
      ],
      [
        Markup.button.callback("Control", "ribbot:control"),
        Markup.button.callback("Settings", "ribbot:settings")
      ],
      [
        Markup.button.callback(
          "Positions",
          "ribbot:positions"
        ),
        Markup.button.callback("NFTs", "ribbot:nfts:0")
      ],
      [
        Markup.button.callback("PNL", "ribbot:pnl"),
        Markup.button.callback("Cleanup", "ribbot:cleanup")
      ],
      [
        Markup.button.callback("Orders", "ribbot:orders"),
        Markup.button.callback("Rewards", "ribbot:referrals")
      ],
      [Markup.button.callback("Activity", "ribbot:activity")],
      [
        Markup.button.callback(
          "Watchlist",
          "ribbot:watchlist"
        ),
        Markup.button.callback("Hidden", "ribbot:hidden")
      ],
      [
        Markup.button.callback(
          "Withdrawals",
          "ribbot:withdrawals"
        ),
        Markup.button.callback(
          "Copy Trade",
          "ribbot:copytrade"
        )
      ],
      [
        Markup.button.callback("Sniper", "ribbot:sniper"),
        Markup.button.callback("Basket Buy", "ribbot:bundle")
      ],
      [
        Markup.button.callback("Auto Buy", "ribbot:autobuy"),
        Markup.button.callback(
          "Auto Sell",
          "ribbot:autosell"
        )
      ]
    ];
    await ctx.reply(
      [
        "Ribbot Trading",
        "Backend: FTX/FrogX",
        walletLine,
        `Interface: ${interfaceMode}`,
        `Execution: ${this.executionModeLabel()}`,
        "",
        "Paste a Solana token mint to open a trade panel, or use the buttons below."
      ].join("\n"),
      Markup.inlineKeyboard(keyboard)
    );
  }
  async replyWallet(ctx, user, externalAddress, selection) {
    const currentUser = await this.refreshAccountSnapshot(user);
    if (selection !== void 0) {
      const wallet = currentUser.wallets?.[selection - 1];
      if (!wallet) {
        await ctx.reply(
          `Wallet ${selection} is not available. Run /wallet to refresh the FTX wallet list.`,
          this.walletKeyboard(currentUser)
        );
        return;
      }
      if (wallet.walletSource !== "privy") {
        await ctx.reply(
          "Portfolio wallets are read only. Your SPOT/NFT wallet remains active.",
          this.walletKeyboard(currentUser)
        );
        return;
      }
      if (wallet.walletId === currentUser.activeWalletId) {
        await ctx.reply(
          [
            `${wallet.label} is already active.`,
            ...this.walletInventoryLines(currentUser)
          ].join("\n"),
          this.walletKeyboard(currentUser)
        );
        return;
      }
      try {
        const selected = await provisionTradingWallet({
          frogxApiBaseUrl: this.config.frogxApiBaseUrl,
          ftxApiToken: this.config.ftxApiToken,
          telegramUserId: currentUser.telegramUserId,
          username: currentUser.username,
          action: "select",
          walletId: wallet.walletId
        });
        if (selected.status === "not_configured" || !selected.account) {
          await ctx.reply(
            "FTX account storage is required to select a trading wallet.",
            this.walletKeyboard(currentUser)
          );
          return;
        }
        const updated = this.store.syncAccountSnapshot(
          currentUser,
          selected.account
        );
        await ctx.reply(
          [
            `${wallet.label} is now active through FTX/FrogX.`,
            ...this.walletInventoryLines(updated)
          ].join("\n"),
          this.walletKeyboard(updated)
        );
      } catch (error) {
        logger.error("FTX/FrogX wallet selection failed", error);
        await ctx.reply(
          "FTX/FrogX could not confirm the active-wallet change. The prior wallet remains selected.",
          this.walletKeyboard(currentUser)
        );
      }
      return;
    }
    if (currentUser.solanaWalletAddress && !externalAddress) {
      await ctx.reply(
        [
          ...this.walletInventoryLines(currentUser),
          "",
          currentUser.walletSource === "privy" ? "Fund it with SOL before trading. Keep enough SOL for swaps and network fees." : "Run /wallet again after FTX wallet provisioning is enabled to create a managed trading wallet.",
          (currentUser.wallets?.filter(
            (wallet) => wallet.walletSource === "privy"
          ).length ?? 0) > 1 ? "Use /wallet select <number> or the buttons below to change the active wallet." : ""
        ].join("\n"),
        this.walletKeyboard(currentUser)
      );
      return;
    }
    try {
      const wallet = await provisionTradingWallet({
        frogxApiBaseUrl: this.config.frogxApiBaseUrl,
        ftxApiToken: this.config.ftxApiToken,
        telegramUserId: currentUser.telegramUserId,
        username: currentUser.username,
        externalAddress
      });
      if (wallet.status === "not_configured") {
        await ctx.reply(
          [
            "FTX/FrogX wallet service is not configured yet.",
            "",
            "No private keys are stored in Ribbot state.",
            "",
            "For quote-only previews during development, run /wallet <your Solana address>."
          ].join("\n"),
          this.menuKeyboard()
        );
        return;
      }
      if (wallet.walletSource === "external") {
        let updated2 = this.store.setExternalWallet(
          currentUser,
          wallet.solanaWalletAddress
        );
        if (wallet.account) {
          updated2 = this.store.syncAccountSnapshot(
            updated2,
            wallet.account
          );
        }
        await ctx.reply(
          [
            "Quote-only wallet linked through FTX/FrogX.",
            updated2.solanaWalletAddress,
            "",
            "This lets Ribbot fetch FrogX quotes for previews. It does not grant signing access and cannot execute trades."
          ].join("\n"),
          this.walletKeyboard(updated2)
        );
        return;
      }
      let updated = this.store.setPrivyWallet(currentUser, wallet);
      if (wallet.account) {
        updated = this.store.syncAccountSnapshot(
          updated,
          wallet.account
        );
      }
      await ctx.reply(
        [
          "Your FTX/FrogX-managed Ribbot trading wallet is ready.",
          updated.solanaWalletAddress,
          "",
          wallet.signerConfigured ? "Signer config is present in FTX. Live trading still requires execution gates and quote/swap validation." : "FTX signer config is missing, so Ribbot cannot execute trades yet."
        ].join("\n"),
        this.walletKeyboard(updated)
      );
    } catch (error) {
      logger.error("FTX/FrogX wallet setup failed", error);
      await ctx.reply(
        "Wallet setup failed through FTX/FrogX. No private key was created or shown by Ribbot.",
        this.menuKeyboard()
      );
    }
  }
  walletInventoryLines(user) {
    const wallets = user.wallets ?? [];
    if (wallets.length === 0) {
      return [
        user.walletSource === "privy" ? "Your FTX/FrogX-managed trading wallet" : "Your FTX/FrogX quote-only wallet",
        user.solanaWalletAddress ?? "not linked"
      ];
    }
    return [
      "FTX/FrogX wallets",
      ...wallets.map(
        (wallet, index) => `${index + 1}. ${wallet.walletId === user.activeWalletId ? "[ACTIVE] " : ""}${wallet.label} (${wallet.walletSource}) ${shortAddress(wallet.solanaWalletAddress)}`
      )
    ];
  }
  walletKeyboard(user) {
    const managedWallets = (user?.wallets ?? []).filter(
      (wallet) => wallet.walletSource === "privy"
    );
    const walletRows = managedWallets.length > 1 ? chunkButtons(
      managedWallets.map(
        (wallet, index) => Markup.button.callback(
          `${wallet.walletId === user?.activeWalletId ? "Active" : "Use"} ${index + 1}`,
          `ribbot:wallet-select:${index}`
        )
      )
    ) : [];
    return Markup.inlineKeyboard([
      ...walletRows,
      [
        Markup.button.callback("Account", "ribbot:account"),
        Markup.button.callback("Positions", "ribbot:positions")
      ],
      [Markup.button.callback("Menu", "ribbot:menu")]
    ]);
  }
  menuKeyboard() {
    return Markup.inlineKeyboard([
      [Markup.button.callback("Menu", "ribbot:menu")]
    ]);
  }
  orderExecutionKeyboard(orderId, pending) {
    return Markup.inlineKeyboard([
      ...pending ? [
        [
          Markup.button.callback(
            "Check Status",
            `ribbot:check-order:${orderId}`
          ),
          Markup.button.callback("Activity", "ribbot:activity")
        ]
      ] : [
        [
          Markup.button.callback("Activity", "ribbot:activity"),
          Markup.button.callback(
            "Positions",
            "ribbot:positions"
          )
        ]
      ],
      [Markup.button.callback("Menu", "ribbot:menu")]
    ]);
  }
  withdrawalExecutionKeyboard(ticketId, pending) {
    return Markup.inlineKeyboard([
      ...pending ? [
        [
          Markup.button.callback(
            "Check Status",
            `ribbot:check-withdrawal:${ticketId}`
          ),
          Markup.button.callback("Activity", "ribbot:activity")
        ]
      ] : [
        [
          Markup.button.callback(
            "Withdrawals",
            "ribbot:withdrawals"
          ),
          Markup.button.callback("Activity", "ribbot:activity")
        ]
      ],
      [Markup.button.callback("Menu", "ribbot:menu")]
    ]);
  }
  bundleExecutionKeyboard(configId, pending) {
    return Markup.inlineKeyboard([
      ...pending ? [
        [
          Markup.button.callback(
            "Check Status",
            `ribbot:check-bundle:${configId}`
          ),
          Markup.button.callback("Activity", "ribbot:activity")
        ]
      ] : [
        [
          Markup.button.callback("Basket Buy", "ribbot:bundle"),
          Markup.button.callback("Activity", "ribbot:activity")
        ]
      ],
      [Markup.button.callback("Menu", "ribbot:menu")]
    ]);
  }
  reconciliationRecord(result, status) {
    return {
      status,
      referenceId: result.referenceId,
      transactionId: result.transactionId,
      signature: result.signature,
      solscanUrl: result.solscanUrl,
      executionStartedAt: result.executionStartedAt,
      checkedAt: result.checkedAt ?? (/* @__PURE__ */ new Date()).toISOString(),
      error: result.error,
      manualReviewRequired: result.manualReviewRequired,
      manualReviewAfter: result.manualReviewAfter,
      manualReviewRequiredAt: result.manualReviewRequiredAt,
      manualReviewReason: result.manualReviewReason
    };
  }
  async replyAccount(ctx, user) {
    if (!this.config.spotEnabled) {
      await this.replyFarmSetup(ctx, user);
      return;
    }
    if (!this.config.ftxApiToken) {
      await ctx.reply(
        [
          "FTX/FrogX account sync is not configured in Ribbot yet.",
          "",
          "Ribbot needs RIBBOT_FTX_API_TOKEN to read the FTX account snapshot.",
          "Privy app secrets and signer keys still belong only in FTX.",
          "",
          ...this.accountDashboardLines(user, "local cache only")
        ].join("\n"),
        Markup.inlineKeyboard([
          [Markup.button.callback("Wallet", "ribbot:wallet")],
          [Markup.button.callback("Menu", "ribbot:menu")]
        ])
      );
      return;
    }
    try {
      const result = await fetchTradingAccount({
        frogxApiBaseUrl: this.config.frogxApiBaseUrl,
        ftxApiToken: this.config.ftxApiToken,
        telegramUserId: user.telegramUserId
      });
      if (result.status === "not_configured") {
        await ctx.reply(
          [
            "FTX/FrogX account storage is not configured yet.",
            `Missing: ${(result.required ?? []).join(", ") || "unknown"}`,
            "",
            "No account snapshot was loaded from FTX.",
            "",
            ...this.accountDashboardLines(user, "local cache only")
          ].join("\n"),
          Markup.inlineKeyboard([
            [Markup.button.callback("Wallet", "ribbot:wallet")],
            [Markup.button.callback("Menu", "ribbot:menu")]
          ])
        );
        return;
      }
      if (result.status === "not_found") {
        await ctx.reply(
          [
            "No FTX/FrogX account snapshot exists for this Telegram user yet.",
            "Run /wallet to create or recover the FTX-routed wallet record.",
            "",
            ...this.accountDashboardLines(user, "local cache only")
          ].join("\n"),
          Markup.inlineKeyboard([
            [Markup.button.callback("Wallet", "ribbot:wallet")],
            [Markup.button.callback("Menu", "ribbot:menu")]
          ])
        );
        return;
      }
      const updated = this.store.syncAccountSnapshot(
        user,
        result.account
      );
      await ctx.reply(
        [
          ...this.accountDashboardLines(
            updated,
            "FTX/FrogX account snapshot",
            result.account.updatedAt
          ),
          "",
          "This view is non-secret account metadata. It does not read keys, sign, broadcast, or trade."
        ].join("\n"),
        Markup.inlineKeyboard([
          [
            Markup.button.callback("Refresh", "ribbot:account"),
            Markup.button.callback("Control", "ribbot:control")
          ],
          [
            Markup.button.callback("Wallet", "ribbot:wallet"),
            Markup.button.callback("Menu", "ribbot:menu")
          ]
        ])
      );
    } catch (error) {
      logger.warn("FTX/FrogX account fetch failed", error);
      await ctx.reply(
        [
          "FTX/FrogX account sync is unavailable right now.",
          "Ribbot did not change account state.",
          "",
          ...this.accountDashboardLines(user, "local cache only")
        ].join("\n"),
        Markup.inlineKeyboard([
          [Markup.button.callback("Menu", "ribbot:menu")]
        ])
      );
    }
  }
  async replyFarmerHome(ctx) {
    await ctx.reply(
      [
        "Delta Neutral Farmer",
        "Powered by Imperial",
        "",
        "Runs one matched perps cycle to generate Imperial + Phoenix activity while reducing market-direction exposure.",
        "",
        "Beta controls are fixed. You review and confirm every cycle before it starts."
      ].join("\n"),
      Markup.inlineKeyboard([
        [
          Markup.button.callback(
            "Review & Start",
            "ribbot:delta-neutral-review"
          )
        ],
        [
          Markup.button.callback("How It Works", "ribbot:farmer-how"),
          Markup.button.callback(
            "Wallet Status",
            "ribbot:perps-status"
          )
        ],
        [
          Markup.button.callback(
            "Run Status",
            "ribbot:delta-neutral-status"
          )
        ]
      ])
    );
  }
  async replyFarmerHowItWorks(ctx) {
    await ctx.reply(
      [
        "How One Cycle Works",
        "",
        "1. Ribbot places a small perpetual order on Phoenix through Imperial.",
        "2. It opens a matching opposite hedge through an Imperial-supported route.",
        "3. Both legs are intended to generate eligible Imperial + Phoenix activity while offsetting most market-direction exposure.",
        "4. Ribbot closes both legs and verifies the Imperial profile is flat before the cycle ends.",
        "",
        "What to expect",
        "- One confirmation runs one cycle.",
        "- A cycle can take several minutes.",
        "- Two positions may appear briefly.",
        "- If the first order does not fill, Ribbot cancels it. If only one leg fills, recovery closes the exposure before another cycle.",
        "- The strategy trades against USDC in your Imperial profile. It does not move funds to a Ribbot-owned wallet.",
        "",
        "Fixed beta limits",
        "- Low preset",
        "- $60 max entry",
        "- 1 cycle per confirmation",
        "- $5 daily cost budget",
        "",
        "Risk",
        "Delta neutral reduces directional exposure; it is not risk-free. Orders execute separately, so temporary exposure is possible. Fees, spread, slippage, funding, liquidation, venue, API, and smart-contract risk remain. Points and rewards depend on Imperial and Phoenix rules and are not guaranteed."
      ].join("\n"),
      Markup.inlineKeyboard([
        [
          Markup.button.callback(
            "Review & Start",
            "ribbot:delta-neutral-review"
          )
        ],
        [Markup.button.callback("Back", "ribbot:farmer-home")]
      ])
    );
  }
  async replyPerpsStatus(ctx, user) {
    if (!this.config.ftxApiToken) {
      await ctx.reply("Perps status is unavailable. Try again soon.");
      return;
    }
    try {
      const result = await fetchPerpsStatus({
        frogxApiBaseUrl: this.config.frogxApiBaseUrl,
        ftxApiToken: this.config.ftxApiToken,
        telegramUserId: user.telegramUserId
      });
      if (result.status === "not_configured") {
        await ctx.reply("Perps status is unavailable. Try again soon.");
        return;
      }
      if (result.status === "imperial_reconnect") {
        await ctx.reply(
          [
            "Reconnect Imperial to open your farmer.",
            "",
            "Next: tap Reconnect Imperial."
          ].join("\n"),
          Markup.inlineKeyboard([
            [
              Markup.button.callback(
                "Reconnect Imperial",
                "ribbot:farm"
              )
            ]
          ])
        );
        return;
      }
      if (result.status !== "ready") {
        await ctx.reply(
          [
            "Imperial setup is not complete.",
            "",
            "Next: run /start to finish setup."
          ].join("\n"),
          Markup.inlineKeyboard([
            [
              Markup.button.callback(
                "Connect Account",
                "ribbot:farm"
              )
            ]
          ])
        );
        return;
      }
      if (!result.profileAddress || !result.imperialProfileVerified) {
        await ctx.reply(
          [
            "Imperial setup needs attention.",
            "",
            "Next: run /start to reconnect Imperial."
          ].join("\n"),
          Markup.inlineKeyboard([
            [
              Markup.button.callback(
                "Connect Account",
                "ribbot:farm"
              )
            ]
          ])
        );
        return;
      }
      const lines = [
        "Imperial Perps Wallet",
        result.profileAddress,
        "",
        `Balance: ${formatUsdc(result.profileUsdc)} USDC`,
        `Minimum: ${result.minimumProfileUsdc} USDC`,
        `Status: ${result.funded ? "Deposit confirmed" : "Deposit required"}`
      ];
      if (!result.funded) {
        lines.push(
          "",
          `Next: send at least ${result.minimumProfileUsdc} USDC on Solana to the wallet above.`
        );
        await ctx.reply(
          lines.join("\n"),
          Markup.inlineKeyboard([
            [
              Markup.button.callback(
                "Refresh",
                "ribbot:perps-status"
              ),
              Markup.button.callback("Menu", "ribbot:menu")
            ]
          ])
        );
        return;
      }
      lines.push(
        "",
        "Delta Neutral / Routed Arb (Default)",
        `Status: ${perpsStrategyStatus(result.strategyReady, result.liveExecutionEnabled)}`,
        "",
        perpsStrategyNextStep(
          result.strategyReady,
          result.liveExecutionEnabled
        )
      );
      const keyboard = [
        [
          Markup.button.callback(
            "Review Strategy",
            "ribbot:delta-neutral-review"
          )
        ]
      ];
      keyboard.push([
        Markup.button.callback("Refresh", "ribbot:perps-status"),
        Markup.button.callback("Farmer", "ribbot:farmer-home")
      ]);
      await ctx.reply(lines.join("\n"), Markup.inlineKeyboard(keyboard));
    } catch (error) {
      logger.warn("FrogX Perps status fetch failed", error);
      await ctx.reply("Perps status is unavailable. Try again soon.");
    }
  }
  async replyDeltaNeutralReview(ctx, user) {
    if (!this.config.ftxApiToken) {
      await ctx.reply("Delta Neutral is unavailable. Try again soon.");
      return;
    }
    try {
      const result = await previewDeltaNeutral({
        frogxApiBaseUrl: this.config.frogxApiBaseUrl,
        ftxApiToken: this.config.ftxApiToken,
        telegramUserId: user.telegramUserId
      });
      if (result.status !== "ready") {
        await this.replyDeltaNeutralUnavailable(ctx);
        return;
      }
      const preview = result.preview;
      const ready = preview.liveReady && result.liveExecutionEnabled;
      const lines = [
        "Review Delta Neutral",
        "",
        "Strategy: Delta Neutral / Routed Arb",
        "Preset: Low",
        "Imperial Perps Wallet",
        deltaNeutralPerpsWalletLabel(preview),
        `Balance: ${formatUsdc(preview.profileUsdc)} USDC`,
        `Max Entry: $${preview.liveEntryCapUsd}`,
        `Cycles: ${preview.maxCycles}`,
        "Daily Cost Budget: $5",
        "",
        ready ? "This places live perpetual orders. Tap Start 1 Cycle to confirm." : deltaNeutralPreviewNextStep(
          preview,
          result.liveExecutionEnabled
        )
      ];
      const keyboard = ready ? [
        [
          Markup.button.callback(
            "Start 1 Cycle",
            "ribbot:delta-neutral-start"
          )
        ],
        [
          Markup.button.callback(
            "How It Works",
            "ribbot:farmer-how"
          ),
          Markup.button.callback(
            "Cancel",
            "ribbot:farmer-home"
          )
        ]
      ] : [
        [
          Markup.button.callback(
            "Refresh",
            "ribbot:delta-neutral-review"
          ),
          Markup.button.callback(
            "How It Works",
            "ribbot:farmer-how"
          )
        ],
        [Markup.button.callback("Farmer", "ribbot:farmer-home")]
      ];
      await ctx.reply(lines.join("\n"), Markup.inlineKeyboard(keyboard));
    } catch (error) {
      logger.warn("FrogX Delta Neutral review failed", error);
      await this.replyDeltaNeutralUnavailable(ctx);
    }
  }
  async replyDeltaNeutralStart(ctx, user) {
    if (!this.config.ftxApiToken) {
      await ctx.reply("Delta Neutral is unavailable. Try again soon.");
      return;
    }
    try {
      const preview = await previewDeltaNeutral({
        frogxApiBaseUrl: this.config.frogxApiBaseUrl,
        ftxApiToken: this.config.ftxApiToken,
        telegramUserId: user.telegramUserId
      });
      if (preview.status !== "ready" || !preview.preview.liveReady || !preview.liveExecutionEnabled) {
        await ctx.reply(
          "Delta Neutral is not ready to start. Check your status first.",
          Markup.inlineKeyboard([
            [
              Markup.button.callback(
                "Check Status",
                "ribbot:perps-status"
              )
            ]
          ])
        );
        return;
      }
      const result = await startDeltaNeutral({
        frogxApiBaseUrl: this.config.frogxApiBaseUrl,
        ftxApiToken: this.config.ftxApiToken,
        telegramUserId: user.telegramUserId,
        idempotencyKey: `delta-neutral:${user.telegramUserId}:${crypto.randomUUID()}`,
        confirmLive: true
      });
      if (!("idempotent" in result)) {
        if (result.status === "pending_reconciliation") {
          await ctx.reply(
            "Delta Neutral is checking the start request. Check Status before trying again.",
            Markup.inlineKeyboard([
              [
                Markup.button.callback(
                  "Check Status",
                  "ribbot:delta-neutral-status"
                )
              ]
            ])
          );
          return;
        }
        await ctx.reply(
          "Delta Neutral could not start. Check your status and try again.",
          Markup.inlineKeyboard([
            [
              Markup.button.callback(
                "Check Status",
                "ribbot:perps-status"
              )
            ]
          ])
        );
        return;
      }
      await this.replyDeltaNeutralRun(ctx, result.run);
    } catch (error) {
      logger.warn("FrogX Delta Neutral start failed", error);
      await ctx.reply(
        "Delta Neutral could not start. Check Status before trying again.",
        Markup.inlineKeyboard([
          [
            Markup.button.callback(
              "Check Status",
              "ribbot:delta-neutral-status"
            )
          ]
        ])
      );
    }
  }
  async replyDeltaNeutralStatus(ctx, user) {
    if (!this.config.ftxApiToken) {
      await ctx.reply("Delta Neutral is unavailable. Try again soon.");
      return;
    }
    try {
      const result = await fetchDeltaNeutralStatus({
        frogxApiBaseUrl: this.config.frogxApiBaseUrl,
        ftxApiToken: this.config.ftxApiToken,
        telegramUserId: user.telegramUserId
      });
      if (result.status !== "ready") {
        await this.replyDeltaNeutralUnavailable(ctx);
        return;
      }
      if (!result.run) {
        await ctx.reply(
          [
            "Delta Neutral / Routed Arb",
            "Status: Not started",
            "",
            "Next: review the strategy to start one cycle."
          ].join("\n"),
          Markup.inlineKeyboard([
            [
              Markup.button.callback(
                "Review Strategy",
                "ribbot:delta-neutral-review"
              )
            ],
            [Markup.button.callback("Menu", "ribbot:menu")]
          ])
        );
        return;
      }
      await this.replyDeltaNeutralRun(ctx, result.run);
    } catch (error) {
      logger.warn("FrogX Delta Neutral status failed", error);
      await this.replyDeltaNeutralUnavailable(ctx);
    }
  }
  async replyDeltaNeutralStopReview(ctx, user) {
    if (!this.config.ftxApiToken) {
      await ctx.reply("Delta Neutral is unavailable. Try again soon.");
      return;
    }
    try {
      const result = await fetchDeltaNeutralStatus({
        frogxApiBaseUrl: this.config.frogxApiBaseUrl,
        ftxApiToken: this.config.ftxApiToken,
        telegramUserId: user.telegramUserId
      });
      if (result.status !== "ready" || !result.run || !deltaNeutralRunIsActive(result.run)) {
        await ctx.reply(
          "Delta Neutral has no active run.",
          Markup.inlineKeyboard([
            [
              Markup.button.callback(
                "Check Status",
                "ribbot:delta-neutral-status"
              )
            ]
          ])
        );
        return;
      }
      await ctx.reply(
        [
          "Stop Delta Neutral?",
          "",
          "Ribbot will stop new activity and clean up any open strategy position."
        ].join("\n"),
        Markup.inlineKeyboard([
          [
            Markup.button.callback(
              "Stop Strategy",
              "ribbot:delta-neutral-stop-confirm"
            )
          ],
          [
            Markup.button.callback(
              "Keep Running",
              "ribbot:delta-neutral-status"
            )
          ]
        ])
      );
    } catch (error) {
      logger.warn("FrogX Delta Neutral stop review failed", error);
      await this.replyDeltaNeutralUnavailable(ctx);
    }
  }
  async replyDeltaNeutralStopConfirmed(ctx, user) {
    if (!this.config.ftxApiToken) {
      await ctx.reply("Delta Neutral is unavailable. Try again soon.");
      return;
    }
    try {
      const result = await stopDeltaNeutral({
        frogxApiBaseUrl: this.config.frogxApiBaseUrl,
        ftxApiToken: this.config.ftxApiToken,
        telegramUserId: user.telegramUserId
      });
      if (!("run" in result) || "error" in result) {
        await this.replyDeltaNeutralUnavailable(ctx);
        return;
      }
      await this.replyDeltaNeutralRun(ctx, result.run);
    } catch (error) {
      logger.warn("FrogX Delta Neutral stop failed", error);
      await ctx.reply(
        "Delta Neutral could not confirm the stop request. Check Status before trying again.",
        Markup.inlineKeyboard([
          [
            Markup.button.callback(
              "Check Status",
              "ribbot:delta-neutral-status"
            )
          ]
        ])
      );
    }
  }
  async replyDeltaNeutralRun(ctx, run) {
    const active = deltaNeutralRunIsActive(run);
    const lines = [
      "Delta Neutral / Routed Arb",
      `Status: ${deltaNeutralRunLabel(run)}`,
      `Wallet: ${run.wallet}`
    ];
    if ("completedCycles" in run) {
      lines.push(
        `Cycles: ${run.completedCycles} / ${run.maxCycles}`,
        `Volume: $${formatUsdc(run.completedVolumeUsd)}`,
        `Estimated Cost: $${formatUsdc(run.estimatedRunCostUsd)}`
      );
      if (run.lastMessage) lines.push("", run.lastMessage);
    }
    const keyboard = [
      [
        Markup.button.callback(
          "Refresh",
          "ribbot:delta-neutral-status"
        ),
        Markup.button.callback("Menu", "ribbot:menu")
      ]
    ];
    if (active) {
      keyboard.unshift([
        Markup.button.callback(
          "Stop",
          "ribbot:delta-neutral-stop-review"
        )
      ]);
    } else {
      keyboard.unshift([
        Markup.button.callback(
          "Review New Cycle",
          "ribbot:delta-neutral-review"
        )
      ]);
    }
    await ctx.reply(lines.join("\n"), Markup.inlineKeyboard(keyboard));
  }
  async replyDeltaNeutralUnavailable(ctx) {
    await ctx.reply(
      "Delta Neutral is unavailable right now. Check again soon.",
      Markup.inlineKeyboard([
        [
          Markup.button.callback(
            "Check Status",
            "ribbot:perps-status"
          ),
          Markup.button.callback("Menu", "ribbot:menu")
        ]
      ])
    );
  }
  async replyControl(ctx, user) {
    await this.replyFarmSetup(ctx, user);
  }
  async replyResetSetup(ctx, user) {
    if (!this.config.ftxApiToken) {
      await ctx.reply("Reset is unavailable. Try again soon.");
      return;
    }
    try {
      const result = await resetTradingSetup({
        frogxApiBaseUrl: this.config.frogxApiBaseUrl,
        ftxApiToken: this.config.ftxApiToken,
        telegramUserId: user.telegramUserId
      });
      if (result.status === "not_configured") {
        await ctx.reply("Reset is unavailable. Try again soon.");
        return;
      }
      await ctx.reply(
        [
          "Ribbot reset.",
          "",
          "Your wallet is unchanged.",
          "",
          "Next: /start"
        ].join("\n")
      );
    } catch (error) {
      logger.warn("FrogX setup reset failed", error);
      await ctx.reply("Reset failed. Try again.");
    }
  }
  async replyFarmSetup(ctx, user) {
    if (!this.config.ftxApiToken) {
      await ctx.reply(
        [
          "Frog Trading Exchange account setup is not configured in Ribbot yet.",
          "",
          "Ribbot needs its Frog Trading Exchange connection before it can create an account session."
        ].join("\n")
      );
      return;
    }
    try {
      const wallet = await provisionTradingWallet({
        frogxApiBaseUrl: this.config.frogxApiBaseUrl,
        ftxApiToken: this.config.ftxApiToken,
        telegramUserId: user.telegramUserId,
        username: user.username
      });
      if (wallet.status === "not_configured") {
        await ctx.reply("Setup is unavailable. Try again soon.");
        return;
      }
      if (wallet.walletSource !== "privy") {
        await ctx.reply("Setup is unavailable. Try again soon.");
        return;
      }
      let updatedUser = this.store.setPrivyWallet(user, wallet);
      if (wallet.account) {
        updatedUser = this.store.syncAccountSnapshot(
          updatedUser,
          wallet.account
        );
      }
      const result = await requestControlCode({
        frogxApiBaseUrl: this.config.frogxApiBaseUrl,
        ftxApiToken: this.config.ftxApiToken,
        telegramUserId: updatedUser.telegramUserId,
        username: updatedUser.username
      });
      if (result.status === "not_configured") {
        await ctx.reply(
          [
            "Frog Trading Exchange account setup is not configured yet.",
            `Missing: ${(result.required ?? []).join(", ") || "unknown"}`,
            "",
            "No Frog Trading Exchange account session was created."
          ].join("\n")
        );
        return;
      }
      const controlHref = result.controlUrl ? controlUrlWithSession(
        result.controlUrl,
        result.telegramUserId,
        result.code
      ) : void 0;
      const lines = controlHref ? [RIBBOT_BETA_INTRO] : [
        RIBBOT_BETA_INTRO,
        "",
        "Enter this code on Frog Trading Exchange:",
        `Code: ${result.code}`,
        `Expires: ${result.expiresAt}`
      ];
      if (controlHref) {
        await ctx.reply(
          lines.join("\n"),
          Markup.inlineKeyboard([
            [Markup.button.url("Connect Account", controlHref)]
          ])
        );
        return;
      }
      await ctx.reply(
        lines.join("\n"),
        Markup.inlineKeyboard([
          [Markup.button.callback("Menu", "ribbot:menu")]
        ])
      );
    } catch (error) {
      logger.warn("FTX/FrogX control code request failed", error);
      await ctx.reply("Setup failed. Try again.");
    }
  }
  async replyStart(ctx, user) {
    if (this.config.ftxApiToken) {
      try {
        const result = await fetchTradingAccount({
          frogxApiBaseUrl: this.config.frogxApiBaseUrl,
          ftxApiToken: this.config.ftxApiToken,
          telegramUserId: user.telegramUserId
        });
        if (result.status === "ready") {
          if (result.setup?.complete !== true) {
            await this.replyFarmSetup(ctx, user);
            return;
          }
          const readyLines = [
            "Ribbot is ready.",
            "",
            "/farm - open your Delta Neutral farmer",
            "Powered by Imperial",
            ...this.config.nftTradingEnabled ? [
              "",
              "/frogs - view and trade Solana Business Frogs",
              "Powered by Magic Eden"
            ] : []
          ];
          await ctx.reply(
            readyLines.join("\n"),
            Markup.inlineKeyboard([
              [
                Markup.button.callback(
                  "Farm",
                  "ribbot:farmer-home"
                ),
                ...this.config.nftTradingEnabled ? [
                  Markup.button.callback(
                    "Frogs",
                    "ribbot:nfts:0"
                  )
                ] : []
              ]
            ])
          );
          return;
        }
      } catch (error) {
        logger.warn("FrogX start status check failed", error);
      }
    }
    await this.replyFarmSetup(ctx, user);
  }
  async replyReferral(ctx, user, intent) {
    if (!this.config.ftxApiToken) {
      await ctx.reply(
        [
          "FTX/FrogX referral tracking is not configured in Ribbot yet.",
          "",
          "Ribbot needs RIBBOT_FTX_API_TOKEN so FTX can store referral metadata.",
          "No fee-share, payout, signing, or transfer is active from Ribbot."
        ].join("\n")
      );
      return;
    }
    try {
      const result = intent?.action === "apply" && intent.referralCode ? await applyReferralCode({
        frogxApiBaseUrl: this.config.frogxApiBaseUrl,
        ftxApiToken: this.config.ftxApiToken,
        telegramUserId: user.telegramUserId,
        username: user.username,
        referralCode: intent.referralCode
      }) : await fetchReferralSummary({
        frogxApiBaseUrl: this.config.frogxApiBaseUrl,
        ftxApiToken: this.config.ftxApiToken,
        telegramUserId: user.telegramUserId,
        username: user.username
      });
      if ("error" in result) {
        await ctx.reply(
          `FTX/FrogX referral update failed: ${result.error}`
        );
        return;
      }
      if (result.status === "not_configured") {
        await ctx.reply(
          [
            "FTX/FrogX referral tracking is not configured yet.",
            `Missing: ${(result.required ?? []).join(", ") || "unknown"}`,
            "",
            "No referral metadata was changed."
          ].join("\n")
        );
        return;
      }
      const updated = this.store.syncReferralSummary(
        user,
        result.summary
      );
      const prefix = result.status === "accepted" ? result.applied ? "Referral code applied through FTX/FrogX." : "Referral code was already linked in FTX/FrogX." : "Ribbot referral tracking";
      await ctx.reply(
        [prefix, "", ...this.referralSummaryLines(updated)].join("\n"),
        Markup.inlineKeyboard([
          [Markup.button.callback("Menu", "ribbot:menu")]
        ])
      );
    } catch (error) {
      logger.warn("FTX/FrogX referral request failed", error);
      await ctx.reply(
        "FTX/FrogX could not load referral tracking right now. No referral metadata was changed."
      );
    }
  }
  async replySettings(ctx, user, intent) {
    if (intent?.field) {
      await this.replyUpdateSettings(ctx, user, intent);
      return;
    }
    const syncedUser = await this.refreshAccountSnapshot(user);
    const settings = syncedUser.settings;
    await ctx.reply(
      [
        "Trading settings",
        `Interface: ${settings.botMode}`,
        `Confirm trades: ${settings.confirmTrades ? "on" : "off"}`,
        `Sell protection (>75%): ${settings.sellProtection ? "on" : "off"}`,
        `Default buy: ${settings.defaultBuySol} SOL`,
        `Buy presets: ${settings.buyPresetsSol.join(", ")} SOL`,
        `Sell presets: ${settings.sellPresetsPercent.join(", ")}%`,
        `Slippage: ${settings.slippageBps / 100}%`,
        `Priority fee: ${settings.priorityFeeLamports} lamports`,
        `Sell priority fee: ${settings.sellPriorityFeeLamports} lamports`,
        `MEV protection: ${settings.mevProtection ? "on" : "off"}`,
        `Auto buy: ${settings.autoBuyEnabled ? "on" : "off"}`,
        `Instant CA buy: ${settings.instantAutoBuyEnabled ? `${settings.instantAutoBuyAmountSol} SOL` : "off"}`,
        `Auto sell: ${settings.autoSellEnabled ? "on" : "off"}`,
        `Sniper: ${settings.sniperEnabled ? "on" : "off"}`,
        "",
        "Usage:",
        "/settings mode simple|advanced",
        "/settings slippage <percent>",
        "/settings priority <lamports>",
        "/settings sellpriority <lamports>",
        "/settings defaultbuy <SOL>",
        "/settings buypresets <SOL> <SOL> [SOL] [SOL]",
        "/settings sellpresets <percent> <percent> [percent] [percent]",
        "/settings confirm on|off",
        "/settings sellprotection on|off",
        "/settings mev on|off",
        "/settings autobuy on|off",
        "/settings autosell on|off",
        "/settings sniper on|off"
      ].join("\n"),
      Markup.inlineKeyboard([
        [
          Markup.button.callback(
            settings.botMode === "simple" ? "Simple selected" : "Simple",
            "ribbot:set-mode:simple"
          ),
          Markup.button.callback(
            settings.botMode === "advanced" ? "Advanced selected" : "Advanced",
            "ribbot:set-mode:advanced"
          )
        ],
        [
          Markup.button.callback(
            settings.botMode === "simple" ? "Confirm locked off" : "Toggle Confirm",
            "ribbot:toggle-confirm"
          ),
          Markup.button.callback(
            "Toggle Sell Protection",
            "ribbot:toggle-sell-protection"
          )
        ],
        [Markup.button.callback("Menu", "ribbot:menu")]
      ])
    );
  }
  async replyUpdateSettings(ctx, user, intent) {
    const update = settingsUpdateFromIntent(intent);
    if (!update) {
      await ctx.reply(
        [
          "Usage:",
          "/settings mode simple|advanced",
          "/settings slippage <percent>",
          "/settings priority <lamports>",
          "/settings sellpriority <lamports>",
          "/settings defaultbuy <SOL>",
          "/settings buypresets <SOL> <SOL> [SOL] [SOL]",
          "/settings sellpresets <percent> <percent> [percent] [percent]",
          "/settings confirm on|off",
          "/settings sellprotection on|off",
          "/settings mev on|off",
          "/settings autobuy on|off",
          "/settings autosell on|off",
          "/settings sniper on|off"
        ].join("\n")
      );
      return;
    }
    await this.applySettingsPreference(ctx, user, update);
  }
  async replyNftHoldings(ctx, user, requestedPage = 0) {
    try {
      const holdings = await fetchNftHoldings({
        frogxApiBaseUrl: this.config.frogxApiBaseUrl,
        ftxApiToken: this.config.ftxApiToken,
        telegramUserId: user.telegramUserId,
        page: Math.max(0, requestedPage) + 1,
        limit: 5
      });
      if (holdings.status !== "ready") {
        if (holdings.status === "not_configured") {
          await ctx.reply(
            [
              "FTX/FrogX NFT holdings are not configured yet.",
              `Missing: ${(holdings.required ?? []).join(", ") || "unknown"}`
            ].join("\n"),
            this.menuKeyboard()
          );
        } else if (holdings.status === "wallet_required") {
          await ctx.reply(
            "No active FTX wallet is linked for this Telegram account. Run /wallet first.",
            this.linkWalletKeyboard()
          );
        } else {
          await ctx.reply(
            holdings.error ?? "NFT holdings are unavailable from FTX/FrogX right now.",
            this.menuKeyboard()
          );
        }
        return;
      }
      const totalPages = Math.max(
        1,
        Math.ceil(Math.max(holdings.total, 1) / holdings.limit)
      );
      const pageIndex = Math.max(0, holdings.page - 1);
      if (holdings.total > 0 && pageIndex >= totalPages) {
        await this.replyNftHoldings(ctx, user, totalPages - 1);
        return;
      }
      const itemLines = holdings.items.length > 0 ? holdings.items.flatMap(
        (nft, index) => this.nftHoldingLines(
          nft,
          pageIndex * holdings.limit + index + 1,
          holdings.walletAddress
        )
      ) : ["No NFTs are held by this active wallet."];
      const navigationButtons = [
        ...pageIndex > 0 ? [
          Markup.button.callback(
            "Prev",
            `ribbot:nfts:${pageIndex - 1}`
          )
        ] : [],
        ...pageIndex < totalPages - 1 ? [
          Markup.button.callback(
            "Next",
            `ribbot:nfts:${pageIndex + 1}`
          )
        ] : []
      ];
      const keyboard = Markup.inlineKeyboard([
        ...this.config.nftTradingEnabled ? [
          [
            Markup.button.callback(
              "Buy Floor",
              "ribbot:frog-buy"
            ),
            Markup.button.callback(
              "Sweep 2",
              "ribbot:frog-sweep:2"
            ),
            Markup.button.callback(
              "Sweep 5",
              "ribbot:frog-sweep:5"
            )
          ],
          ...holdings.items.filter(
            (nft) => nft.owner === holdings.walletAddress
          ).map((nft) => [
            Markup.button.callback(
              `Sell ${frogDisplayName(nft.name)}`,
              `ribbot:frog-sell:${nft.mint}`
            )
          ])
        ] : [],
        ...navigationButtons.length ? [navigationButtons] : [],
        [
          Markup.button.callback(
            "Refresh",
            `ribbot:nfts:${pageIndex}`
          ),
          Markup.button.callback("Account", "ribbot:account")
        ],
        [Markup.button.callback("Menu", "ribbot:menu")]
      ]);
      const text = [
        `Solana Business Frogs \xB7 ${pageIndex + 1}/${totalPages}`,
        `Embedded wallets: ${holdings.walletAddresses.length}`,
        `Total: ${holdings.total}`,
        "",
        ...itemLines
      ].join("\n");
      const previewImage = holdings.items.find((nft) => nft.image)?.image;
      if (previewImage) {
        try {
          await ctx.replyWithPhoto(
            { url: previewImage },
            { caption: text, ...keyboard }
          );
          return;
        } catch (error) {
          logger.warn(
            "Telegram rejected the NFT preview image; using text",
            error
          );
        }
      }
      await ctx.reply(text, keyboard);
    } catch (error) {
      logger.warn("FTX/FrogX NFT holdings failed", error);
      await ctx.reply(
        "NFT holdings are unavailable from FTX/FrogX right now.",
        this.menuKeyboard()
      );
    }
  }
  nftHoldingLines(nft, index, managedWalletAddress) {
    return [
      `${index}. ${frogDisplayName(nft.name)}`,
      `   ${nft.owner === managedWalletAddress ? "SPOT/NFT wallet" : "read only"}${nft.compressed ? " \xB7 compressed" : ""}`
    ];
  }
  async replyFrogBuyReview(ctx, user, requestedQuantity = 1, maximumSol) {
    if (!this.config.nftTradingEnabled) {
      await ctx.reply(
        "Frog trading is not enabled yet.",
        this.menuKeyboard()
      );
      return;
    }
    const quantity = Number.isInteger(requestedQuantity) ? Math.min(Math.max(requestedQuantity, 1), 10) : 1;
    const currentUser = await this.refreshAccountSnapshot(user);
    const walletAddress = currentUser.solanaWalletAddress;
    if (!walletAddress || currentUser.walletSource !== "privy") {
      await ctx.reply(
        "Connect your Frog Trading Exchange account first.",
        this.linkWalletKeyboard()
      );
      return;
    }
    try {
      const market = await fetchFrogMarket({
        frogxApiBaseUrl: this.config.frogxApiBaseUrl,
        ftxApiToken: this.config.ftxApiToken,
        telegramUserId: currentUser.telegramUserId,
        walletAddress
      });
      if (market.status !== "ready") {
        await ctx.reply(market.error, this.menuKeyboard());
        return;
      }
      const maximumPaymentLamports = maximumSol ? solToLamports(maximumSol) : market.floor.priceLamports;
      if (BigInt(maximumPaymentLamports) < BigInt(market.floor.priceLamports)) {
        await ctx.reply(
          `Floor is ${formatSol(market.floor.priceSol)} SOL, above your ${formatSol(maximumSol ?? 0)} SOL limit.`,
          this.menuKeyboard()
        );
        return;
      }
      const ticket = this.store.createFrogTradeTicket(currentUser, {
        side: quantity === 1 ? "buy" : "sweep",
        walletAddress,
        quantity,
        maximumPaymentLamports,
        ...quantity === 1 ? { expectedMint: market.floor.mint } : {}
      });
      const caption = [
        quantity === 1 ? `Buy Frog ${frogDisplayName(market.floor.name)}?` : `Sweep ${quantity} Frogs?`,
        `Live floor: ${formatSol(market.floor.priceSol)} SOL`,
        `Maximum per Frog: ${formatLamportsAsSol(maximumPaymentLamports)} SOL`,
        "",
        quantity === 1 ? "Ribbot buys this exact Frog or stops if it is no longer the live floor." : `Pictured: current floor ${frogDisplayName(market.floor.name)}. Ribbot buys from the live floor one at a time.`
      ].join("\n");
      const keyboard = this.frogConfirmationKeyboard(ticket.id);
      if (market.floor.image) {
        try {
          await ctx.replyWithPhoto(
            { url: market.floor.image },
            { caption, ...keyboard }
          );
          return;
        } catch (error) {
          logger.warn(
            "Telegram rejected the floor Frog image; using text",
            error
          );
        }
      }
      await ctx.reply(caption, keyboard);
    } catch (error) {
      logger.warn("Magic Eden Frog buy review failed", error);
      await ctx.reply(
        "The live Frog floor is unavailable. Try again.",
        this.menuKeyboard()
      );
    }
  }
  async replyFrogSellReview(ctx, user, mint, minimumSol) {
    if (!this.config.nftTradingEnabled) {
      await ctx.reply(
        "Frog trading is not enabled yet.",
        this.menuKeyboard()
      );
      return;
    }
    if (!mint || !isSolanaMint(mint)) {
      await ctx.reply(
        "Choose a Frog from /frogs or use /sellfrog <mint>.",
        this.menuKeyboard()
      );
      return;
    }
    const currentUser = await this.refreshAccountSnapshot(user);
    const walletAddress = currentUser.solanaWalletAddress;
    if (!walletAddress || currentUser.walletSource !== "privy") {
      await ctx.reply(
        "Connect your Frog Trading Exchange account first.",
        this.linkWalletKeyboard()
      );
      return;
    }
    try {
      const [market, holdings] = await Promise.all([
        fetchFrogMarket({
          frogxApiBaseUrl: this.config.frogxApiBaseUrl,
          ftxApiToken: this.config.ftxApiToken,
          telegramUserId: currentUser.telegramUserId,
          walletAddress
        }),
        fetchNftHoldings({
          frogxApiBaseUrl: this.config.frogxApiBaseUrl,
          ftxApiToken: this.config.ftxApiToken,
          telegramUserId: currentUser.telegramUserId,
          page: 1,
          limit: 50
        })
      ]);
      if (holdings.status !== "ready") {
        await ctx.reply(
          "Frog ownership could not be verified.",
          this.menuKeyboard()
        );
        return;
      }
      if (!holdings.items.some(
        (nft) => nft.mint === mint && nft.owner === walletAddress
      )) {
        await ctx.reply(
          "That Frog is not in your managed SPOT/NFT wallet.",
          this.menuKeyboard()
        );
        return;
      }
      if (market.status !== "ready" || !market.offer) {
        await ctx.reply(
          market.status === "ready" ? "No live Magic Eden offer is available." : market.error,
          this.menuKeyboard()
        );
        return;
      }
      const minimumPaymentLamports = minimumSol ? solToLamports(minimumSol) : market.offer.minimumPaymentLamports;
      if (BigInt(market.offer.minimumPaymentLamports) < BigInt(minimumPaymentLamports)) {
        await ctx.reply(
          `Top offer is ${formatSol(market.offer.minimumPaymentSol)} SOL, below your ${formatSol(minimumSol ?? 0)} SOL minimum.`,
          this.menuKeyboard()
        );
        return;
      }
      const ticket = this.store.createFrogTradeTicket(currentUser, {
        side: "sell",
        walletAddress,
        quantity: 1,
        minimumPaymentLamports,
        mint
      });
      await ctx.reply(
        [
          "Sell Frog into the top Magic Eden offer?",
          `Frog: ${mint}`,
          `You receive at least: ${formatLamportsAsSol(minimumPaymentLamports)} SOL`,
          "",
          "Ribbot verifies the live offer and ownership again before signing."
        ].join("\n"),
        this.frogConfirmationKeyboard(ticket.id)
      );
    } catch (error) {
      logger.warn("Magic Eden Frog sell review failed", error);
      await ctx.reply(
        "The top Magic Eden offer is unavailable. Try again.",
        this.menuKeyboard()
      );
    }
  }
  frogConfirmationKeyboard(ticketId) {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback(
          "Confirm",
          `ribbot:frog-confirm:${ticketId}`
        ),
        Markup.button.callback(
          "Cancel",
          `ribbot:frog-cancel:${ticketId}`
        )
      ]
    ]);
  }
  frogStatusKeyboard(ticketId) {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback(
          "Check Status",
          `ribbot:frog-check:${ticketId}`
        ),
        Markup.button.callback("Frogs", "ribbot:nfts:0")
      ]
    ]);
  }
  async replyFrogTradeConfirmed(ctx, user, ticketId) {
    if (!this.config.nftTradingEnabled || !ticketId) {
      await this.replyUnknownAction(ctx);
      return;
    }
    const ticket = this.store.getFrogTradeTicket(user, ticketId);
    if (!ticket) {
      await ctx.reply(
        "Frog trade ticket not found.",
        this.menuKeyboard()
      );
      return;
    }
    if (ticket.status !== "pending_confirmation") {
      await ctx.reply(
        "This Frog trade was already handled.",
        ticket.status === "execution_pending" || ticket.status === "partially_executed" ? this.frogStatusKeyboard(ticket.id) : this.menuKeyboard()
      );
      return;
    }
    if (Date.parse(ticket.expiresAt) <= Date.now()) {
      this.store.updateFrogTradeTicket(user, ticket.id, {
        status: "cancelled",
        error: "Confirmation expired"
      });
      await ctx.reply(
        "Quote expired. Open /frogs for a fresh price.",
        this.menuKeyboard()
      );
      return;
    }
    await this.submitFrogTrade(ctx, user, ticket);
  }
  async submitFrogTrade(ctx, user, ticket) {
    const executionId = `${ticket.id}-${ticket.completed + 1}`;
    this.store.updateFrogTradeTicket(user, ticket.id, {
      status: ticket.completed > 0 ? "partially_executed" : "execution_pending",
      currentExecutionId: executionId,
      error: void 0
    });
    try {
      const result = ticket.side === "sell" ? await executeFrogSell({
        frogxApiBaseUrl: this.config.frogxApiBaseUrl,
        ftxApiToken: this.config.ftxApiToken,
        telegramUserId: user.telegramUserId,
        walletAddress: ticket.walletAddress,
        executionId,
        mint: ticket.mint,
        minimumPaymentLamports: ticket.minimumPaymentLamports
      }) : await executeFrogBuy({
        frogxApiBaseUrl: this.config.frogxApiBaseUrl,
        ftxApiToken: this.config.ftxApiToken,
        telegramUserId: user.telegramUserId,
        walletAddress: ticket.walletAddress,
        executionId,
        maximumPaymentLamports: ticket.maximumPaymentLamports,
        expectedMint: ticket.expectedMint
      });
      if (frogExecutionWasSubmitted(result)) {
        this.store.updateFrogTradeTicket(user, ticket.id, {
          signatures: result.signature ? [...ticket.signatures, result.signature] : ticket.signatures,
          error: result.error
        });
        await ctx.reply(
          [
            ticket.side === "sell" ? "Sale submitted." : `Purchase ${ticket.completed + 1}/${ticket.quantity} submitted.`,
            "Ribbot will not continue until this transaction is confirmed."
          ].join("\n"),
          this.frogStatusKeyboard(ticket.id)
        );
        return;
      }
      this.store.updateFrogTradeTicket(user, ticket.id, {
        status: ticket.completed > 0 ? "partially_executed" : "failed",
        error: frogExecutionError(result)
      });
      if (result.code === "RIBBOT_ACCESS_REQUIRED") {
        await this.replyRibbotAccessRequired(ctx, user);
        return;
      }
      await ctx.reply(frogExecutionError(result), this.menuKeyboard());
    } catch (error) {
      logger.warn("Magic Eden Frog execution failed", error);
      this.store.updateFrogTradeTicket(user, ticket.id, {
        status: ticket.completed > 0 ? "partially_executed" : "failed",
        error: "Frog trade request failed"
      });
      await ctx.reply(
        "Frog trade request failed. No retry was sent.",
        this.menuKeyboard()
      );
    }
  }
  async replyRibbotAccessRequired(ctx, user) {
    try {
      const result = await requestControlCode({
        frogxApiBaseUrl: this.config.frogxApiBaseUrl,
        ftxApiToken: this.config.ftxApiToken,
        telegramUserId: user.telegramUserId,
        username: user.username
      });
      if (result.status === "ready" && result.controlUrl) {
        const controlHref = controlUrlWithSession(
          result.controlUrl,
          result.telegramUserId,
          result.code
        );
        await ctx.reply(
          [
            "Ribbot access required",
            "",
            "This purchase was not sent.",
            "",
            "Enable Ribbot for your SPOT/NFT Wallet, then open /frogs for a new quote."
          ].join("\n"),
          Markup.inlineKeyboard([
            [Markup.button.url("Enable Ribbot", controlHref)]
          ])
        );
        return;
      }
    } catch (error) {
      logger.warn("Ribbot access recovery link failed", error);
    }
    await ctx.reply(
      [
        "Ribbot access required",
        "",
        "This purchase was not sent.",
        "",
        "Open /control to enable Ribbot, then open /frogs for a new quote."
      ].join("\n"),
      this.menuKeyboard()
    );
  }
  async replyFrogTradeStatus(ctx, user, ticketId) {
    const ticket = ticketId ? this.store.getFrogTradeTicket(user, ticketId) : void 0;
    if (!ticket || !ticket.currentExecutionId) {
      await ctx.reply(
        "Frog trade ticket not found.",
        this.menuKeyboard()
      );
      return;
    }
    if (ticket.status === "executed") {
      await ctx.reply("Frog trade complete.", this.menuKeyboard());
      return;
    }
    try {
      const base = {
        frogxApiBaseUrl: this.config.frogxApiBaseUrl,
        ftxApiToken: this.config.ftxApiToken,
        telegramUserId: user.telegramUserId,
        walletAddress: ticket.walletAddress,
        executionId: ticket.currentExecutionId
      };
      const result = ticket.side === "sell" ? await fetchFrogSellExecutionStatus({
        ...base,
        mint: ticket.mint,
        minimumPaymentLamports: ticket.minimumPaymentLamports
      }) : await fetchFrogBuyExecutionStatus({
        ...base,
        maximumPaymentLamports: ticket.maximumPaymentLamports,
        expectedMint: ticket.expectedMint
      });
      if (result.status === "executed") {
        const completed = ticket.completed + 1;
        const updated = this.store.updateFrogTradeTicket(
          user,
          ticket.id,
          {
            completed,
            signatures: result.signature && !ticket.signatures.includes(result.signature) ? [...ticket.signatures, result.signature] : ticket.signatures,
            status: completed >= ticket.quantity ? "executed" : "partially_executed",
            error: void 0
          }
        );
        if (!updated || completed >= ticket.quantity) {
          await ctx.reply(
            ticket.side === "sell" ? "Frog sold into the top Magic Eden offer." : `${completed} Frog${completed === 1 ? "" : "s"} purchased.`,
            Markup.inlineKeyboard([
              [Markup.button.callback("Frogs", "ribbot:nfts:0")]
            ])
          );
          return;
        }
        await this.submitFrogTrade(ctx, user, updated);
        return;
      }
      if (result.status === "pending" || result.status === "not_found") {
        await ctx.reply(
          "Transaction is still pending. Ribbot did not submit another trade.",
          this.frogStatusKeyboard(ticket.id)
        );
        return;
      }
      this.store.updateFrogTradeTicket(user, ticket.id, {
        status: ticket.completed > 0 ? "partially_executed" : "failed",
        error: frogExecutionError(result)
      });
      await ctx.reply(frogExecutionError(result), this.menuKeyboard());
    } catch (error) {
      logger.warn("Magic Eden Frog reconciliation failed", error);
      await ctx.reply(
        "Status is unavailable. Ribbot did not submit another trade.",
        this.frogStatusKeyboard(ticket.id)
      );
    }
  }
  async replyFrogTradeCancelled(ctx, user, ticketId) {
    const ticket = ticketId ? this.store.getFrogTradeTicket(user, ticketId) : void 0;
    if (!ticket || ticket.status !== "pending_confirmation") {
      await ctx.reply(
        "This Frog trade cannot be cancelled.",
        this.menuKeyboard()
      );
      return;
    }
    this.store.updateFrogTradeTicket(user, ticket.id, {
      status: "cancelled"
    });
    await ctx.reply("Frog trade cancelled.", this.menuKeyboard());
  }
  async replyPositions(ctx, user, requestedPage = 0) {
    const currentUser = await this.refreshAccountSnapshot(user);
    if (!currentUser.solanaWalletAddress) {
      await ctx.reply(
        "Link a wallet with /wallet before positions are available.",
        this.linkWalletKeyboard()
      );
      return;
    }
    try {
      const pnl = await fetchPnl({
        frogxApiBaseUrl: this.config.frogxApiBaseUrl,
        ftxApiToken: this.config.ftxApiToken,
        telegramUserId: currentUser.telegramUserId
      });
      if (pnl.status === "ready") {
        const positionPage = buildPositionPage(
          pnl.tokens,
          requestedPage
        );
        const tokenLines = positionPage.items.length > 0 ? positionPage.items.flatMap((token, index) => [
          `${positionPage.startIndex + index + 1}. ${shortAddress(token.mint)}`,
          `   ${token.uiAmountString} \xB7 ${formatUsd(token.currentValueUsd)} \xB7 PNL ${formatSignedUsd(token.unrealizedPnlUsd)} (${formatSignedPct(token.unrealizedPnlPct)})`
        ]) : ["No visible SPL token positions."];
        const tokenButtons = positionPage.items.map((token, index) => [
          Markup.button.callback(
            `${positionPage.startIndex + index + 1}. ${shortAddress(token.mint)} \xB7 ${formatUsd(token.currentValueUsd)}`,
            positionCallbackData(token.mint, positionPage.page)
          )
        ]);
        const navigationButtons = [
          ...positionPage.page > 0 ? [
            Markup.button.callback(
              "Prev",
              `ribbot:positions:${positionPage.page - 1}`
            )
          ] : [],
          ...positionPage.page < positionPage.totalPages - 1 ? [
            Markup.button.callback(
              "Next",
              `ribbot:positions:${positionPage.page + 1}`
            )
          ] : []
        ];
        const hiddenCount = pnl.tokens.filter(
          (token) => token.hidden
        ).length;
        await ctx.reply(
          [
            `Positions \xB7 ${positionPage.page + 1}/${positionPage.totalPages}`,
            `Wallet: ${shortAddress(pnl.walletAddress)}`,
            `Portfolio: ${formatUsd(pnl.totals.currentPortfolioValueUsd)}`,
            `SOL: ${pnl.totals.solUiAmount.toFixed(6)} (${formatUsd(pnl.totals.solValueUsd)})`,
            `Visible: ${positionPage.totalItems} \xB7 Hidden: ${hiddenCount}`,
            "",
            ...tokenLines
          ].join("\n"),
          Markup.inlineKeyboard([
            ...tokenButtons,
            ...navigationButtons.length > 0 ? [navigationButtons] : [],
            [
              Markup.button.callback(
                "Refresh",
                `ribbot:positions:${positionPage.page}`
              ),
              Markup.button.callback("PNL", "ribbot:pnl")
            ],
            [
              Markup.button.callback("Hidden", "ribbot:hidden"),
              Markup.button.callback("Menu", "ribbot:menu")
            ]
          ])
        );
        return;
      }
    } catch (error) {
      logger.warn(
        "FTX/FrogX valued positions unavailable; using balances",
        error
      );
    }
    try {
      const positions = await fetchPositions({
        frogxApiBaseUrl: this.config.frogxApiBaseUrl,
        ftxApiToken: this.config.ftxApiToken,
        telegramUserId: currentUser.telegramUserId,
        userPublicKey: currentUser.solanaWalletAddress
      });
      if ("status" in positions) {
        await ctx.reply(
          [
            "FTX/FrogX positions are not configured yet.",
            `Missing: ${(positions.required ?? []).join(", ") || "unknown"}`
          ].join("\n")
        );
        return;
      }
      const positionPage = buildPositionPage(
        positions.tokens.map((token) => ({
          ...token,
          hidden: currentUser.hiddenTokens.includes(token.mint)
        })),
        requestedPage
      );
      const tokenLines = positionPage.items.length > 0 ? positionPage.items.map(
        (token, index) => `${positionPage.startIndex + index + 1}. ${shortAddress(token.mint)} \xB7 ${formatTokenBalance(token)}`
      ) : ["No visible SPL token positions."];
      const tokenButtons = positionPage.items.map((token, index) => [
        Markup.button.callback(
          `${positionPage.startIndex + index + 1}. ${shortAddress(token.mint)}`,
          positionCallbackData(token.mint, positionPage.page)
        )
      ]);
      const navigationButtons = [
        ...positionPage.page > 0 ? [
          Markup.button.callback(
            "Prev",
            `ribbot:positions:${positionPage.page - 1}`
          )
        ] : [],
        ...positionPage.page < positionPage.totalPages - 1 ? [
          Markup.button.callback(
            "Next",
            `ribbot:positions:${positionPage.page + 1}`
          )
        ] : []
      ];
      await ctx.reply(
        [
          `Positions \xB7 ${positionPage.page + 1}/${positionPage.totalPages}`,
          `Wallet: ${shortAddress(positions.walletAddress)}`,
          `SOL: ${positions.sol.uiAmount.toFixed(6)}`,
          `Visible: ${positionPage.totalItems} \xB7 Hidden: ${positions.tokens.filter((token) => currentUser.hiddenTokens.includes(token.mint)).length}`,
          "Values and PNL are unavailable; showing FTX balances.",
          "",
          ...tokenLines
        ].filter(Boolean).join("\n"),
        Markup.inlineKeyboard([
          ...tokenButtons,
          ...navigationButtons.length > 0 ? [navigationButtons] : [],
          [
            Markup.button.callback(
              "Refresh",
              `ribbot:positions:${positionPage.page}`
            ),
            Markup.button.callback("PNL", "ribbot:pnl")
          ],
          [
            Markup.button.callback("Hidden", "ribbot:hidden"),
            Markup.button.callback("Menu", "ribbot:menu")
          ]
        ])
      );
    } catch (error) {
      logger.warn("FTX/FrogX positions failed", error);
      await ctx.reply(
        "Positions are unavailable from FTX/FrogX right now.",
        this.menuKeyboard()
      );
    }
  }
  async replyPosition(ctx, user, mint, page = 0) {
    const currentUser = await this.refreshAccountSnapshot(user);
    if (!currentUser.solanaWalletAddress) {
      await ctx.reply(
        "Link a wallet with /wallet before positions are available.",
        this.linkWalletKeyboard()
      );
      return;
    }
    try {
      const pnl = await fetchPnl({
        frogxApiBaseUrl: this.config.frogxApiBaseUrl,
        ftxApiToken: this.config.ftxApiToken,
        telegramUserId: currentUser.telegramUserId
      });
      if (pnl.status === "ready") {
        const token = pnl.tokens.find((entry) => entry.mint === mint);
        if (token) {
          await ctx.reply(
            [
              "Position",
              `Token: ${mint}`,
              `Balance: ${token.uiAmountString}`,
              `Value: ${formatUsd(token.currentValueUsd)}`,
              `Price: ${formatUsd(token.usdPrice)}`,
              `24h: ${formatSignedPct(token.priceChange24h)}`,
              `Cost basis: ${formatUsd(token.estimatedCostUsd)}`,
              `Unrealized: ${formatSignedUsd(token.unrealizedPnlUsd)} (${formatSignedPct(token.unrealizedPnlPct)})`,
              `Trades: ${token.buyCount} buys \xB7 ${token.sellCount} sells`,
              `Fills: ${token.confirmedFillCount ?? 0} confirmed \xB7 ${token.estimatedFillCount ?? 0} estimated`,
              `Visibility: ${token.hidden ? "hidden" : "shown"}`
            ].join("\n"),
            this.positionKeyboard(
              currentUser,
              mint,
              page,
              token.hidden
            )
          );
          return;
        }
      }
    } catch (error) {
      logger.warn(
        "FTX/FrogX position PNL unavailable; using balance",
        error
      );
    }
    try {
      const positions = await fetchPositions({
        frogxApiBaseUrl: this.config.frogxApiBaseUrl,
        ftxApiToken: this.config.ftxApiToken,
        telegramUserId: currentUser.telegramUserId,
        userPublicKey: currentUser.solanaWalletAddress
      });
      if (!("status" in positions)) {
        const token = positions.tokens.find(
          (entry) => entry.mint === mint
        );
        if (token) {
          const hidden = currentUser.hiddenTokens.includes(mint);
          await ctx.reply(
            [
              "Position",
              `Token: ${mint}`,
              `Balance: ${formatTokenBalance(token)}`,
              "Value and PNL are unavailable.",
              `Visibility: ${hidden ? "hidden" : "shown"}`
            ].join("\n"),
            this.positionKeyboard(currentUser, mint, page, hidden)
          );
          return;
        }
      }
    } catch (error) {
      logger.warn("FTX/FrogX position detail failed", error);
    }
    await ctx.reply(
      "That position is no longer available in FTX/FrogX.",
      Markup.inlineKeyboard([
        [
          Markup.button.callback(
            "Positions",
            `ribbot:positions:${page}`
          ),
          Markup.button.callback("Menu", "ribbot:menu")
        ]
      ])
    );
  }
  positionKeyboard(user, mint, page, hidden) {
    return Markup.inlineKeyboard([
      ...this.tradePresetRows(user, mint),
      [
        Markup.button.callback("Scan", `ribbot:scan:${mint}`),
        Markup.button.callback("Safety", `ribbot:safety:${mint}`)
      ],
      [
        Markup.button.callback(
          hidden ? "Unhide" : "Hide",
          positionVisibilityCallbackData(
            mint,
            page,
            hidden ? "show" : "hide"
          )
        ),
        Markup.button.callback("Positions", `ribbot:positions:${page}`)
      ],
      [Markup.button.callback("Menu", "ribbot:menu")]
    ]);
  }
  linkWalletKeyboard() {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback("Wallet", "ribbot:wallet"),
        Markup.button.callback("Menu", "ribbot:menu")
      ]
    ]);
  }
  async replyPnl(ctx, user) {
    if (!user.solanaWalletAddress) {
      await ctx.reply(
        "Link a wallet with /wallet before PNL is available.",
        this.linkWalletKeyboard()
      );
      return;
    }
    try {
      const pnl = await fetchPnl({
        frogxApiBaseUrl: this.config.frogxApiBaseUrl,
        ftxApiToken: this.config.ftxApiToken,
        telegramUserId: user.telegramUserId
      });
      if (pnl.status === "not_configured") {
        await ctx.reply(
          [
            "FTX/FrogX PNL is not configured yet.",
            `Missing: ${(pnl.required ?? []).join(", ") || "unknown"}`
          ].join("\n")
        );
        return;
      }
      if (pnl.status !== "ready") {
        await ctx.reply(
          "FTX/FrogX does not have a trading wallet snapshot for PNL yet. Run /wallet first.",
          this.linkWalletKeyboard()
        );
        return;
      }
      const tokenLines = pnl.tokens.length > 0 ? pnl.tokens.filter((token) => !token.hidden).slice(0, 5).map(
        (token, index) => this.pnlTokenLine(token, index)
      ) : ["No SPL token positions found."];
      const warnings = pnl.warnings.slice(0, 2).map((warning) => `Warning: ${warning}`);
      const confirmedFillCount = pnl.executionAccounting?.confirmedFillCount ?? pnl.totals.confirmedFillCount ?? 0;
      const estimatedFillCount = pnl.executionAccounting?.estimatedFillCount ?? pnl.totals.estimatedFillCount ?? 0;
      await ctx.reply(
        [
          "PNL",
          `Wallet: ${shortAddress(pnl.walletAddress)}`,
          `Portfolio: ${formatUsd(pnl.totals.currentPortfolioValueUsd)}`,
          `Tokens: ${formatUsd(pnl.totals.currentTokenValueUsd)}`,
          `SOL: ${pnl.totals.solUiAmount.toFixed(6)} (${formatUsd(pnl.totals.solValueUsd)})`,
          `Cost basis: ${formatUsd(pnl.totals.estimatedCostUsd)}`,
          `Unrealized: ${formatSignedUsd(pnl.totals.unrealizedPnlUsd)} (${formatSignedPct(pnl.totals.unrealizedPnlPct)})`,
          `Priced: ${pnl.totals.pricedPositionCount}/${pnl.tokens.length}`,
          `Executions: ${pnl.totals.executionEventCount}`,
          `Fills: ${confirmedFillCount} confirmed / ${estimatedFillCount} estimated`,
          "",
          ...tokenLines,
          warnings.length ? "" : void 0,
          ...warnings,
          "",
          "Fill reconciliation is read-only. USD PNL remains net-flow based, not realized/FIFO tax-lot accounting."
        ].filter(Boolean).join("\n"),
        Markup.inlineKeyboard([
          [
            Markup.button.callback("Refresh", "ribbot:pnl"),
            Markup.button.callback("Positions", "ribbot:positions")
          ],
          [Markup.button.callback("Menu", "ribbot:menu")]
        ])
      );
    } catch (error) {
      logger.warn("FTX/FrogX PNL failed", error);
      await ctx.reply(
        "PNL is unavailable from FTX/FrogX right now.",
        this.menuKeyboard()
      );
    }
  }
  pnlTokenLine(token, index) {
    return [
      `${index + 1}. ${shortAddress(token.mint)}`,
      `${formatUsd(token.currentValueUsd)}`,
      `PNL ${formatSignedUsd(token.unrealizedPnlUsd)}`,
      `(${formatSignedPct(token.unrealizedPnlPct)})`,
      token.costBasisStatus === "estimated" ? void 0 : token.costBasisStatus.replace(/_/g, " ")
    ].filter(Boolean).join(" ");
  }
  async replyActivity(ctx, user) {
    try {
      const activity = await fetchActivity({
        frogxApiBaseUrl: this.config.frogxApiBaseUrl,
        ftxApiToken: this.config.ftxApiToken,
        telegramUserId: user.telegramUserId,
        limit: 10
      });
      if (activity.status === "not_configured") {
        await ctx.reply(
          [
            "FTX/FrogX activity history is not configured yet.",
            `Missing: ${(activity.required ?? []).join(", ") || "unknown"}`
          ].join("\n")
        );
        return;
      }
      const eventLines = activity.events.length > 0 ? activity.events.flatMap(
        (event, index) => this.activityEventLines(event, index)
      ) : ["No FTX/FrogX account events have been recorded yet."];
      const warnings = activity.warnings.slice(0, 2).map((warning) => `Warning: ${warning}`);
      await ctx.reply(
        [
          "Activity",
          `Events shown: ${activity.events.length}`,
          activity.summary.latestEventAt ? `Latest: ${activity.summary.latestEventAt}` : void 0,
          "",
          ...eventLines,
          warnings.length ? "" : void 0,
          ...warnings
        ].filter(Boolean).join("\n"),
        Markup.inlineKeyboard([
          [Markup.button.callback("Refresh", "ribbot:activity")],
          [Markup.button.callback("Menu", "ribbot:menu")]
        ])
      );
    } catch (error) {
      logger.warn("FTX/FrogX activity fetch failed", error);
      await ctx.reply(
        "Activity history is unavailable from FTX/FrogX right now."
      );
    }
  }
  async replyTokenCleanup(ctx, user) {
    if (!user.solanaWalletAddress) {
      await ctx.reply(
        "Link a wallet with /wallet before token cleanup is available.",
        this.linkWalletKeyboard()
      );
      return;
    }
    try {
      const cleanup = await fetchTokenCleanup({
        frogxApiBaseUrl: this.config.frogxApiBaseUrl,
        ftxApiToken: this.config.ftxApiToken,
        telegramUserId: user.telegramUserId,
        userPublicKey: user.solanaWalletAddress,
        hiddenTokens: user.hiddenTokens
      });
      if (cleanup.status === "not_configured") {
        await ctx.reply(
          [
            "FTX/FrogX token cleanup is not configured yet.",
            `Missing: ${(cleanup.required ?? []).join(", ") || "unknown"}`
          ].join("\n")
        );
        return;
      }
      const candidateLines = cleanup.candidates.length > 0 ? cleanup.candidates.slice(0, 8).map(
        (candidate, index) => this.tokenCleanupLine(candidate, index)
      ) : ["No cleanup candidates found."];
      const warnings = cleanup.warnings.slice(0, 2).map((warning) => `Warning: ${warning}`);
      const actionRows = cleanup.candidates.slice(0, 5).map((candidate, index) => {
        const buttons = [];
        if (candidate.suggestedActions.includes("hide")) {
          buttons.push(
            Markup.button.callback(
              `Hide ${index + 1}`,
              `ribbot:cleanup-hide:${candidate.mint}`
            )
          );
        }
        if (candidate.suggestedActions.includes("sell")) {
          buttons.push(
            Markup.button.callback(
              `Sell ${index + 1}`,
              `ribbot:cleanup-sell:${candidate.mint}`
            )
          );
        }
        return buttons;
      }).filter((row) => row.length > 0);
      await ctx.reply(
        [
          "Token cleanup",
          `Wallet: ${shortAddress(cleanup.walletAddress)}`,
          `Candidates: ${cleanup.summary.cleanupCandidates}/${cleanup.summary.totalTokens}`,
          `Dust threshold: ${formatUsd(cleanup.summary.dustUsdThreshold)}`,
          `Dust value: ${formatUsd(cleanup.summary.dustValueUsd)}`,
          `Hidden positions: ${cleanup.summary.hiddenPositions}`,
          "",
          ...candidateLines,
          warnings.length ? "" : void 0,
          ...warnings
        ].filter(Boolean).join("\n"),
        Markup.inlineKeyboard([
          ...actionRows,
          [
            Markup.button.callback("Positions", "ribbot:positions"),
            Markup.button.callback("Menu", "ribbot:menu")
          ]
        ])
      );
    } catch (error) {
      logger.warn("FTX/FrogX token cleanup failed", error);
      await ctx.reply(
        "Token cleanup is unavailable from FTX/FrogX right now."
      );
    }
  }
  tokenCleanupLine(candidate, index) {
    return [
      `${index + 1}. ${shortAddress(candidate.mint)}`,
      candidate.cleanupReason,
      formatUsd(candidate.currentValueUsd),
      formatTokenBalance(candidate),
      candidate.hidden ? "hidden" : void 0
    ].filter(Boolean).join(" ");
  }
  async replyTokenSafety(ctx, user, mint) {
    if (!mint || !isSolanaMint(mint)) {
      await ctx.reply("Usage: /safety <token mint>");
      return;
    }
    try {
      const safety = await fetchTokenSafety({
        frogxApiBaseUrl: this.config.frogxApiBaseUrl,
        ftxApiToken: this.config.ftxApiToken,
        telegramUserId: user.telegramUserId,
        mint
      });
      if (safety.status === "not_configured") {
        await ctx.reply(
          [
            "FTX/FrogX token safety is not configured yet.",
            `Missing: ${(safety.required ?? []).join(", ") || "unknown"}`
          ].join("\n")
        );
        return;
      }
      if (safety.status === "not_found") {
        await ctx.reply(
          [
            "Token safety",
            `Token: ${shortAddress(mint)}`,
            "Risk: unknown",
            "",
            ...safety.warnings.map(
              (warning) => `Warning: ${warning}`
            )
          ].join("\n"),
          Markup.inlineKeyboard([
            [
              Markup.button.callback(
                "Watch",
                `ribbot:watch:${mint}`
              ),
              Markup.button.callback("Menu", "ribbot:menu")
            ]
          ])
        );
        return;
      }
      const notableFlags = safety.risk.flags.filter((flag) => flag.severity !== "info").slice(0, 5);
      const flagLines = notableFlags.length > 0 ? notableFlags.map((flag) => this.tokenSafetyFlagLine(flag)) : ["No mint/freeze authority warnings from FTX/FrogX."];
      await ctx.reply(
        [
          "Token safety",
          `Token: ${shortAddress(safety.mint)}`,
          `Risk: ${safety.risk.level.toUpperCase()} (${safety.risk.score}/100)`,
          `Price: ${formatUsd(safety.pricing.usdPrice)}`,
          `Supply: ${formatRawTokenAmount(safety.mintAccount.supply, safety.mintAccount.decimals ?? 0)}`,
          `Mint auth: ${formatAuthority(safety.mintAccount.mintAuthority)}`,
          `Freeze auth: ${formatAuthority(safety.mintAccount.freezeAuthority)}`,
          "",
          ...flagLines,
          "",
          "Review only. FTX/FrogX did not build, sign, or broadcast a trade."
        ].join("\n"),
        Markup.inlineKeyboard([
          [
            Markup.button.callback(
              `Buy ${user.settings.defaultBuySol} SOL`,
              `ribbot:buy:${mint}:${user.settings.defaultBuySol}`
            ),
            Markup.button.callback("Watch", `ribbot:watch:${mint}`)
          ],
          [Markup.button.callback("Menu", "ribbot:menu")]
        ])
      );
    } catch (error) {
      logger.warn("FTX/FrogX token safety failed", error);
      await ctx.reply(
        "Token safety is unavailable from FTX/FrogX right now."
      );
    }
  }
  async replyMarketRisk(ctx, user, mint, amountSol) {
    if (!mint || !isSolanaMint(mint)) {
      await ctx.reply("Usage: /scan <token mint> [SOL amount]");
      return;
    }
    const probeSol = amountSol && amountSol > 0 ? amountSol : user.settings.defaultBuySol;
    const amountIn = solToLamports(probeSol);
    try {
      const review = await fetchMarketRisk({
        frogxApiBaseUrl: this.config.frogxApiBaseUrl,
        ftxApiToken: this.config.ftxApiToken,
        telegramUserId: user.telegramUserId,
        userPublicKey: user.solanaWalletAddress,
        mint,
        amountIn,
        slippageBps: user.settings.slippageBps,
        priorityFeeLamports: user.settings.priorityFeeLamports,
        minLiquidityUsd: 1e3,
        maxPriceImpactBps: Math.max(user.settings.slippageBps, 1500)
      });
      if (review.status === "not_configured") {
        await ctx.reply(
          [
            "FTX/FrogX market scan is not configured yet.",
            `Missing: ${(review.required ?? []).join(", ") || "unknown"}`
          ].join("\n")
        );
        return;
      }
      const notableFlags = review.risk.flags.filter((flag) => flag.severity !== "info").slice(0, 6);
      const flagLines = notableFlags.length > 0 ? notableFlags.map((flag) => this.tokenSafetyFlagLine(flag)) : ["No market-risk warnings from FTX/FrogX."];
      await ctx.reply(
        [
          "Token scan",
          `Token: ${shortAddress(review.mint)}`,
          `Risk: ${review.risk.level.toUpperCase()} (${review.risk.score}/100)`,
          `Market cap: ${formatUsd(review.marketCap.usd)}`,
          `SOL price: ${formatUsd(review.pricing.solUsdPrice)}`,
          this.marketRiskQuoteLine(review.quoteProbe),
          "",
          ...flagLines,
          "",
          "Review only. FTX/FrogX did not build, sign, or broadcast a trade."
        ].join("\n"),
        Markup.inlineKeyboard([
          [
            Markup.button.callback(
              `Buy ${user.settings.defaultBuySol} SOL`,
              `ribbot:buy:${mint}:${user.settings.defaultBuySol}`
            ),
            Markup.button.callback(
              "Safety",
              `ribbot:safety:${mint}`
            )
          ],
          [
            Markup.button.callback("Watch", `ribbot:watch:${mint}`),
            Markup.button.callback("Menu", "ribbot:menu")
          ]
        ])
      );
    } catch (error) {
      logger.warn("FTX/FrogX market scan failed", error);
      await ctx.reply(
        "Market scan is unavailable from FTX/FrogX right now."
      );
    }
  }
  marketRiskQuoteLine(quoteProbe) {
    if (quoteProbe.status === "ready") {
      const solAmount = lamportsToSol(quoteProbe.amountIn).toFixed(4);
      const impact = quoteProbe.priceImpactBps === null || quoteProbe.priceImpactBps === void 0 ? "unknown" : formatBps(quoteProbe.priceImpactBps);
      return `Liquidity probe: ${solAmount} SOL (${formatUsd(quoteProbe.amountInUsd)}) impact ${impact}`;
    }
    if (quoteProbe.status === "not_configured") {
      return `Liquidity probe: NOT RUN. ${marketRiskQuoteBlockingReason(quoteProbe)}`;
    }
    return `Liquidity probe: NOT RUN. ${marketRiskQuoteBlockingReason(quoteProbe)}`;
  }
  tokenSafetyFlagLine(flag) {
    const label = flag.severity === "danger" ? "Danger" : "Warning";
    return `${label}: ${flag.message}`;
  }
  async replyOrders(ctx, user) {
    let storageWarning;
    try {
      const stored = await fetchScheduledOrders({
        frogxApiBaseUrl: this.config.frogxApiBaseUrl,
        ftxApiToken: this.config.ftxApiToken,
        telegramUserId: user.telegramUserId
      });
      if (stored.status === "ready") {
        for (const order of stored.orders) {
          this.syncStoredAutomationOrder(user, order);
        }
      } else {
        storageWarning = `FTX/FrogX order storage missing ${(stored.required ?? []).join(", ") || "required config"}. Showing Ribbot cache only.`;
      }
    } catch (error) {
      logger.warn("FTX/FrogX order list failed", error);
      storageWarning = "FTX/FrogX order storage is unavailable right now. Showing Ribbot cache only.";
    }
    const orders = this.store.listAutomationOrders(user).filter((order) => order.status !== "cancelled");
    const marketTickets = this.store.listPendingOrders(user).filter((order) => order.status !== "cancelled").slice(0, 5);
    const cancellableOrders = orders.filter(
      (order) => order.status === "staged"
    );
    if (orders.length === 0 && marketTickets.length === 0) {
      await ctx.reply(
        [
          "Orders",
          storageWarning,
          "No active or recent limit, stop, trailing, or DCA orders.",
          "",
          "Usage:",
          "/limit buy <mint> <SOL> below <price>",
          "/limit sell <mint> <percent> above <price>",
          "/stop <mint> <percent> below <price>",
          "/trailing <mint> <sell percent> <trail percent>",
          "/dca buy <mint> <total SOL> <orders> <interval minutes>",
          "",
          "FTX/FrogX stores every order definition before Ribbot caches it."
        ].filter(Boolean).join("\n"),
        this.menuKeyboard()
      );
      return;
    }
    const lines = [
      "Orders",
      storageWarning,
      ...marketTickets.length > 0 ? [
        "",
        "Market tickets (Ribbot cache)",
        ...marketTickets.flatMap((order, index) => [
          `${index + 1}. ${order.side.toUpperCase()} ${shortAddress(order.mint)}`,
          ...this.orderSummaryLines(order)
        ])
      ] : [],
      ...orders.length > 0 ? ["", "Scheduled orders (FTX)"] : [],
      ...orders.slice(0, 10).flatMap((order, index) => [
        "",
        `${index + 1}. ${this.automationOrderTitle(order)}`,
        ...this.automationOrderSummaryLines(order)
      ]),
      orders.length > 10 ? `
...and ${orders.length - 10} more` : ""
    ].filter(Boolean);
    const buttons = cancellableOrders.slice(0, 5).map((order) => [
      Markup.button.callback(
        `Cancel ${order.id}`,
        `ribbot:cancel-auto:${order.id}`
      )
    ]);
    for (const order of marketTickets) {
      if (order.status === "execution_pending") {
        buttons.unshift([
          Markup.button.callback(
            `Check ${order.id}`,
            `ribbot:check-order:${order.id}`
          )
        ]);
      }
    }
    buttons.push([Markup.button.callback("Menu", "ribbot:menu")]);
    await ctx.reply(lines.join("\n"), Markup.inlineKeyboard(buttons));
  }
  async replyWithdrawals(ctx, user) {
    const tickets = this.store.listWithdrawalTickets(user).filter((ticket) => ticket.status !== "cancelled");
    if (tickets.length === 0) {
      await ctx.reply(
        [
          "Withdrawals",
          "No withdrawals are staged.",
          "",
          "Usage:",
          "/withdraw sol <amount SOL> <destination>",
          "/withdraw <token mint> <percent|all> <destination>",
          "",
          "FTX/FrogX validates withdrawal details before Ribbot stores a staged ticket."
        ].join("\n"),
        this.menuKeyboard()
      );
      return;
    }
    const lines = [
      "Withdrawals",
      ...tickets.slice(0, 10).flatMap((ticket, index) => [
        "",
        `${index + 1}. ${ticket.assetType.toUpperCase()} withdrawal`,
        ...this.withdrawalTicketSummaryLines(ticket),
        ticket.execution?.signature ? `Signature: ${ticket.execution.signature}` : void 0,
        ticket.execution?.solscanUrl ? `Solscan: ${ticket.execution.solscanUrl}` : void 0
      ]),
      tickets.length > 10 ? `
...and ${tickets.length - 10} more` : ""
    ].filter(Boolean);
    const stagedButtons = tickets.filter((ticket) => ticket.status === "staged").slice(0, 5).map((ticket) => [
      Markup.button.callback(
        `Send ${ticket.id}`,
        `ribbot:execute-withdrawal:${ticket.id}`
      ),
      Markup.button.callback(
        `Cancel ${ticket.id}`,
        `ribbot:cancel-withdrawal:${ticket.id}`
      )
    ]);
    const pendingButtons = tickets.filter((ticket) => ticket.status === "execution_pending").slice(0, 5).map((ticket) => [
      Markup.button.callback(
        `Check ${ticket.id}`,
        `ribbot:check-withdrawal:${ticket.id}`
      )
    ]);
    const buttons = [...pendingButtons, ...stagedButtons];
    buttons.push([Markup.button.callback("Menu", "ribbot:menu")]);
    await ctx.reply(lines.join("\n"), Markup.inlineKeyboard(buttons));
  }
  async replyWithdraw(ctx, user, intent) {
    if (!intent.asset || !intent.amount || !intent.destinationAddress || !isSolanaAddress2(intent.destinationAddress)) {
      await ctx.reply(
        [
          "Usage:",
          "/withdraw sol <amount SOL> <destination>",
          "/withdraw <token mint> <percent|all> <destination>"
        ].join("\n")
      );
      return;
    }
    if (!user.solanaWalletAddress) {
      await ctx.reply(
        "Link or create a wallet with /wallet before staging withdrawals."
      );
      return;
    }
    if (intent.destinationAddress === user.solanaWalletAddress) {
      await ctx.reply(
        "Withdrawal destination must be different from your trading wallet."
      );
      return;
    }
    let mint;
    let amountIn;
    let amountLabel;
    if (isSolAlias(intent.asset)) {
      const amountSol = numberFromValue(intent.amount);
      if (!amountSol) {
        await ctx.reply(
          "Usage: /withdraw sol <amount SOL> <destination>"
        );
        return;
      }
      mint = SOL_MINT3;
      amountIn = solToLamports(amountSol);
      amountLabel = `${amountSol} SOL`;
    } else if (isSolanaMint(intent.asset)) {
      mint = intent.asset;
      try {
        const token = await this.findPositionToken(user, mint);
        if (!token || token.amount === "0") {
          await ctx.reply(
            [
              "No position found for that mint.",
              `Token: ${shortAddress(mint)}`,
              "",
              "Run /positions to refresh balances."
            ].join("\n")
          );
          return;
        }
        const percent = intent.amount.toLowerCase() === "all" ? 100 : numberFromValue(intent.amount);
        if (!percent || percent <= 0) {
          await ctx.reply(
            "Usage: /withdraw <token mint> <percent|all> <destination>"
          );
          return;
        }
        const clampedPercent = Math.min(percent, 100);
        amountIn = applyPercentage(token.amount, clampedPercent);
        if (amountIn === "0") {
          await ctx.reply(
            "Withdrawal amount rounds to zero for this position."
          );
          return;
        }
        amountLabel = intent.amount.toLowerCase() === "all" ? `all (${formatRawTokenAmount(amountIn, token.decimals)})` : `${clampedPercent}% (${formatRawTokenAmount(amountIn, token.decimals)})`;
      } catch (error) {
        logger.warn(
          "FTX/FrogX withdrawal position lookup failed",
          error
        );
        await ctx.reply(
          "Token withdrawals need a fresh FTX/FrogX position snapshot, but positions are unavailable right now."
        );
        return;
      }
    } else {
      await ctx.reply(
        [
          "Usage:",
          "/withdraw sol <amount SOL> <destination>",
          "/withdraw <token mint> <percent|all> <destination>"
        ].join("\n")
      );
      return;
    }
    try {
      const validation = await validateWithdrawal({
        frogxApiBaseUrl: this.config.frogxApiBaseUrl,
        ftxApiToken: this.config.ftxApiToken,
        telegramUserId: user.telegramUserId,
        userPublicKey: user.solanaWalletAddress,
        mint,
        amountIn,
        amountLabel,
        destinationAddress: intent.destinationAddress
      });
      if (validation.status === "not_configured") {
        await ctx.reply(
          [
            "FTX/FrogX withdrawal validation is not configured for Ribbot yet.",
            `Missing: ${(validation.required ?? []).join(", ") || "unknown"}`,
            "",
            "Ribbot did not store this withdrawal."
          ].join("\n")
        );
        return;
      }
      const normalized = validation.normalized;
      const ticket = this.store.createWithdrawalTicket(user, {
        mint: normalized.mint,
        assetType: normalized.assetType,
        amountIn: normalized.amountIn,
        amountLabel: normalized.amountLabel ?? amountLabel,
        walletAddress: normalized.userPublicKey,
        destinationAddress: normalized.destinationAddress,
        validation: {
          validatedAt: validation.validatedAt,
          warnings: validation.warnings
        }
      });
      await ctx.reply(
        [
          "Withdrawal staged through FTX/FrogX validation.",
          ...this.withdrawalTicketSummaryLines(ticket),
          "",
          ...validation.warnings.map(
            (warning) => `Warning: ${warning}`
          ),
          "",
          "Tap Send to ask FTX/FrogX to execute through Privy when live gates are enabled."
        ].join("\n"),
        Markup.inlineKeyboard([
          [
            Markup.button.callback(
              "Send",
              `ribbot:execute-withdrawal:${ticket.id}`
            ),
            Markup.button.callback(
              "Withdrawals",
              "ribbot:withdrawals"
            )
          ],
          [
            Markup.button.callback(
              "Cancel",
              `ribbot:cancel-withdrawal:${ticket.id}`
            )
          ]
        ])
      );
    } catch (error) {
      logger.warn("FTX/FrogX withdrawal validation failed", error);
      await ctx.reply(
        "FTX/FrogX could not validate this withdrawal. Ribbot did not store it."
      );
    }
  }
  async replyLimitOrder(ctx, user, intent) {
    if (!intent.side || !intent.mint || !isSolanaMint(intent.mint) || !intent.amount || intent.amount <= 0 || !intent.triggerDirection || !intent.triggerPrice) {
      await ctx.reply(
        [
          "Usage:",
          "/limit buy <mint> <SOL> below <price>",
          "/limit sell <mint> <percent> above <price>"
        ].join("\n")
      );
      return;
    }
    if (!user.solanaWalletAddress) {
      await ctx.reply(
        "Link or create a wallet with /wallet before staging limit orders."
      );
      return;
    }
    const mint = intent.mint;
    let amountIn;
    let amountLabel;
    let inMint;
    let outMint;
    if (intent.side === "buy") {
      amountIn = solToLamports(intent.amount);
      amountLabel = `${intent.amount} SOL`;
      inMint = SOL_MINT3;
      outMint = mint;
    } else {
      const percent = Math.min(intent.amount, 100);
      try {
        const token = await this.findPositionToken(user, mint);
        if (!token || token.amount === "0") {
          await ctx.reply(
            [
              "No position found for that mint.",
              `Token: ${shortAddress(mint)}`,
              "",
              "Run /positions to refresh balances."
            ].join("\n")
          );
          return;
        }
        amountIn = applyPercentage(token.amount, percent);
        if (amountIn === "0") {
          await ctx.reply(
            "Limit sell amount rounds to zero for this position."
          );
          return;
        }
        amountLabel = `${percent}% (${formatRawTokenAmount(amountIn, token.decimals)})`;
        inMint = mint;
        outMint = SOL_MINT3;
      } catch (error) {
        logger.warn(
          "FTX/FrogX limit sell position lookup failed",
          error
        );
        await ctx.reply(
          "Limit sell setup needs a fresh FTX/FrogX position snapshot, but positions are unavailable right now."
        );
        return;
      }
    }
    await this.validateAndStoreAutomationOrder(ctx, user, {
      kind: "limit",
      side: intent.side,
      mint,
      inMint,
      outMint,
      amountIn,
      amountLabel,
      triggerDirection: intent.triggerDirection,
      triggerPrice: intent.triggerPrice
    });
  }
  async replyDcaOrder(ctx, user, intent) {
    if (intent.side !== "buy" || !intent.mint || !isSolanaMint(intent.mint) || !intent.totalSol || intent.totalSol <= 0 || !intent.orderCount || !Number.isInteger(intent.orderCount) || !intent.intervalMinutes || !Number.isInteger(intent.intervalMinutes)) {
      await ctx.reply(
        [
          "Usage:",
          "/dca buy <mint> <total SOL> <orders> <interval minutes>",
          "",
          "Example: /dca buy <mint> 1 5 30"
        ].join("\n")
      );
      return;
    }
    if (!user.solanaWalletAddress) {
      await ctx.reply(
        "Link or create a wallet with /wallet before staging DCA orders."
      );
      return;
    }
    await this.validateAndStoreAutomationOrder(ctx, user, {
      kind: "dca",
      side: "buy",
      mint: intent.mint,
      inMint: SOL_MINT3,
      outMint: intent.mint,
      amountIn: solToLamports(intent.totalSol),
      amountLabel: `${intent.totalSol} SOL total`,
      orderCount: intent.orderCount,
      intervalMinutes: intent.intervalMinutes
    });
  }
  async replyStopOrder(ctx, user, intent) {
    if (!intent.mint || !isSolanaMint(intent.mint) || !intent.percentage || intent.percentage <= 0 || intent.triggerDirection !== "below" || !intent.triggerPrice) {
      await ctx.reply(
        [
          "Usage:",
          "/stop <mint> <percent> below <price>",
          "",
          "Example: /stop <mint> 50 below 0.008"
        ].join("\n")
      );
      return;
    }
    if (!user.solanaWalletAddress) {
      await ctx.reply(
        "Link or create a wallet with /wallet before staging stop-loss orders."
      );
      return;
    }
    const sellAmount = await this.resolvePositionSellAmount(
      ctx,
      user,
      intent.mint,
      intent.percentage,
      "Stop-loss"
    );
    if (!sellAmount) return;
    await this.validateAndStoreAutomationOrder(ctx, user, {
      kind: "stop",
      side: "sell",
      mint: intent.mint,
      inMint: intent.mint,
      outMint: SOL_MINT3,
      amountIn: sellAmount.amountIn,
      amountLabel: sellAmount.amountLabel,
      triggerDirection: "below",
      triggerPrice: intent.triggerPrice
    });
  }
  async replyTrailingOrder(ctx, user, intent) {
    if (!intent.mint || !isSolanaMint(intent.mint) || !intent.percentage || intent.percentage <= 0 || !intent.trailingPercent || intent.trailingPercent <= 0) {
      await ctx.reply(
        [
          "Usage:",
          "/trailing <mint> <sell percent> <trail percent>",
          "",
          "Example: /trailing <mint> 50 12.5"
        ].join("\n")
      );
      return;
    }
    if (!user.solanaWalletAddress) {
      await ctx.reply(
        "Link or create a wallet with /wallet before staging trailing stops."
      );
      return;
    }
    const trailingBps = Math.round(intent.trailingPercent * 100);
    if (!Number.isInteger(trailingBps) || trailingBps < 1 || trailingBps > 1e4) {
      await ctx.reply(
        "Trailing percent must be greater than 0 and no more than 100."
      );
      return;
    }
    const sellAmount = await this.resolvePositionSellAmount(
      ctx,
      user,
      intent.mint,
      intent.percentage,
      "Trailing stop"
    );
    if (!sellAmount) return;
    await this.validateAndStoreAutomationOrder(ctx, user, {
      kind: "trailing",
      side: "sell",
      mint: intent.mint,
      inMint: intent.mint,
      outMint: SOL_MINT3,
      amountIn: sellAmount.amountIn,
      amountLabel: sellAmount.amountLabel,
      trailingBps
    });
  }
  async resolvePositionSellAmount(ctx, user, mint, percentage, label) {
    const percent = Math.min(percentage, 100);
    try {
      const token = await this.findPositionToken(user, mint);
      if (!token || token.amount === "0") {
        await ctx.reply(
          [
            "No position found for that mint.",
            `Token: ${shortAddress(mint)}`,
            "",
            "Run /positions to refresh balances."
          ].join("\n")
        );
        return void 0;
      }
      const amountIn = applyPercentage(token.amount, percent);
      if (amountIn === "0") {
        await ctx.reply(
          `${label} amount rounds to zero for this position.`
        );
        return void 0;
      }
      return {
        amountIn,
        amountLabel: `${percent}% (${formatRawTokenAmount(amountIn, token.decimals)})`
      };
    } catch (error) {
      logger.warn(
        `FTX/FrogX ${label.toLowerCase()} position lookup failed`,
        error
      );
      await ctx.reply(
        `${label} setup needs a fresh FTX/FrogX position snapshot, but positions are unavailable right now.`
      );
      return void 0;
    }
  }
  async validateAndStoreAutomationOrder(ctx, user, input) {
    if (!user.solanaWalletAddress) return;
    try {
      const storage = await storeScheduledOrder({
        frogxApiBaseUrl: this.config.frogxApiBaseUrl,
        ftxApiToken: this.config.ftxApiToken,
        telegramUserId: user.telegramUserId,
        userPublicKey: user.solanaWalletAddress,
        kind: input.kind,
        side: input.side,
        mint: input.mint,
        inMint: input.inMint,
        outMint: input.outMint,
        amountIn: input.amountIn,
        amountLabel: input.amountLabel,
        slippageBps: user.settings.slippageBps,
        priorityFeeLamports: input.side === "sell" ? user.settings.sellPriorityFeeLamports : user.settings.priorityFeeLamports,
        triggerPrice: input.triggerPrice,
        triggerDirection: input.triggerDirection,
        orderCount: input.orderCount,
        intervalMinutes: input.intervalMinutes,
        trailingBps: input.trailingBps
      });
      if (storage.status === "not_configured") {
        await ctx.reply(
          [
            "FTX/FrogX order storage is not configured for Ribbot yet.",
            `Missing: ${(storage.required ?? []).join(", ") || "unknown"}`,
            "",
            "Ribbot did not store this order."
          ].join("\n")
        );
        return;
      }
      const order = this.syncStoredAutomationOrder(user, storage.order);
      await ctx.reply(
        [
          `${automationKindLabel(input.kind)} order stored through FTX/FrogX.`,
          ...this.automationOrderSummaryLines(order),
          "",
          ...storage.warnings.map((warning) => `Warning: ${warning}`),
          "",
          "No transaction was built, signed, broadcast, or scheduled."
        ].join("\n"),
        Markup.inlineKeyboard([
          [
            Markup.button.callback("Orders", "ribbot:orders"),
            Markup.button.callback(
              "Cancel",
              `ribbot:cancel-auto:${order.id}`
            )
          ]
        ])
      );
    } catch (error) {
      logger.warn("FTX/FrogX order validation failed", error);
      await ctx.reply(
        "FTX/FrogX could not validate this order. Ribbot did not store it."
      );
    }
  }
  async findPositionToken(user, mint) {
    if (!user.solanaWalletAddress) return void 0;
    const positions = await fetchPositions({
      frogxApiBaseUrl: this.config.frogxApiBaseUrl,
      ftxApiToken: this.config.ftxApiToken,
      telegramUserId: user.telegramUserId,
      userPublicKey: user.solanaWalletAddress
    });
    if ("status" in positions) {
      throw new Error(
        `FTX/FrogX positions missing ${(positions.required ?? []).join(", ")}`
      );
    }
    return positions.tokens.find((entry) => entry.mint === mint);
  }
  async replyCancelAutomationOrder(ctx, user, orderId) {
    if (!orderId) {
      await ctx.reply("Order id missing.");
      return;
    }
    try {
      const cancelled = await cancelStoredScheduledOrder({
        frogxApiBaseUrl: this.config.frogxApiBaseUrl,
        ftxApiToken: this.config.ftxApiToken,
        telegramUserId: user.telegramUserId,
        orderId
      });
      if (cancelled.status === "cancelled") {
        const order = this.syncStoredAutomationOrder(
          user,
          cancelled.order
        );
        await ctx.reply(
          [
            "Staged order cancelled through FTX/FrogX.",
            ...this.automationOrderSummaryLines(order)
          ].join("\n")
        );
        return;
      }
      if (cancelled.status === "not_configured") {
        logger.warn(
          `FTX/FrogX order cancel missing ${(cancelled.required ?? []).join(", ")}`
        );
        await ctx.reply(
          "FTX/FrogX order storage is not configured, so the order was not cancelled."
        );
        return;
      }
      if (cancelled.status === "not_found") {
        logger.warn(
          `FTX/FrogX order ${orderId} not found for cancellation`
        );
        await ctx.reply(
          "FTX/FrogX no longer has this order. Refresh /orders before taking another action."
        );
        return;
      }
      if (cancelled.status === "not_cancellable") {
        await ctx.reply(
          cancelled.error ?? "FTX/FrogX did not cancel this order because its execution state has changed.",
          Markup.inlineKeyboard([
            [Markup.button.callback("Orders", "ribbot:orders")]
          ])
        );
        return;
      }
    } catch (error) {
      logger.warn("FTX/FrogX order cancel failed", error);
      await ctx.reply(
        "FTX/FrogX could not confirm cancellation, so Ribbot left the order unchanged."
      );
    }
  }
  async replyExecuteWithdrawal(ctx, user, ticketId) {
    if (!ticketId) {
      await ctx.reply("Withdrawal ticket id missing.");
      return;
    }
    const ticket = this.store.getWithdrawalTicket(user, ticketId);
    if (!ticket) {
      await ctx.reply("Withdrawal ticket not found.");
      return;
    }
    if (ticket.status === "cancelled") {
      await ctx.reply("Withdrawal ticket was already cancelled.");
      return;
    }
    if (ticket.status === "executed") {
      await ctx.reply(
        [
          "Withdrawal was already executed.",
          ...this.withdrawalTicketSummaryLines(ticket),
          ticket.execution?.signature ? `Signature: ${ticket.execution.signature}` : void 0,
          ticket.execution?.solscanUrl ? `Solscan: ${ticket.execution.solscanUrl}` : void 0
        ].filter(Boolean).join("\n")
      );
      return;
    }
    if (ticket.status === "execution_pending") {
      await this.replyCheckWithdrawalStatus(ctx, user, ticket.id);
      return;
    }
    if (ticket.status === "execution_failed") {
      await ctx.reply(
        [
          "This withdrawal attempt ended in a terminal failure.",
          ...this.withdrawalTicketSummaryLines(ticket),
          ticket.reconciliation?.error,
          "Create a fresh withdrawal ticket before trying again."
        ].filter(Boolean).join("\n"),
        Markup.inlineKeyboard([
          [
            Markup.button.callback(
              "Withdrawals",
              "ribbot:withdrawals"
            )
          ],
          [Markup.button.callback("Menu", "ribbot:menu")]
        ])
      );
      return;
    }
    if (!this.config.tradingEnabled || this.config.dryRun) {
      await ctx.reply(
        [
          "Dry-run withdrawal confirmation recorded.",
          ...this.withdrawalTicketSummaryLines(ticket),
          "",
          "No transfer transaction was built, signed, or broadcast. Ribbot's live gates are off, so this Send was not forwarded to FTX/FrogX."
        ].join("\n"),
        this.menuKeyboard()
      );
      return;
    }
    try {
      const execution = await executeWithdrawal({
        frogxApiBaseUrl: this.config.frogxApiBaseUrl,
        ftxApiToken: this.config.ftxApiToken,
        withdrawalId: ticket.id,
        telegramUserId: user.telegramUserId,
        userPublicKey: ticket.walletAddress,
        mint: ticket.mint,
        amountIn: ticket.amountIn,
        amountLabel: ticket.amountLabel,
        destinationAddress: ticket.destinationAddress
      });
      if (execution.status === "not_configured") {
        await ctx.reply(
          [
            "FTX/FrogX live withdrawal execution is not configured for Ribbot yet.",
            `Missing: ${(execution.required ?? []).join(", ") || "unknown"}`,
            "",
            "No transfer transaction was signed or broadcast."
          ].join("\n"),
          this.withdrawalExecutionKeyboard(ticket.id, false)
        );
        return;
      }
      if (execution.status === "not_executable") {
        await ctx.reply(
          [
            "FTX/FrogX could not execute this withdrawal.",
            ...this.withdrawalTicketSummaryLines(ticket),
            "",
            execution.error ?? "No transfer transaction was signed or broadcast."
          ].join("\n"),
          this.withdrawalExecutionKeyboard(ticket.id, false)
        );
        return;
      }
      if (execution.status === "pending_reconciliation") {
        const reconciliation = this.store.markWithdrawalExecutionPending(user, ticket.id, {
          status: "pending",
          referenceId: execution.referenceId,
          transactionId: execution.transactionId,
          executionStartedAt: execution.executionStartedAt,
          checkedAt: (/* @__PURE__ */ new Date()).toISOString(),
          error: execution.error,
          manualReviewRequired: execution.manualReviewRequired,
          manualReviewAfter: execution.manualReviewAfter,
          manualReviewRequiredAt: execution.manualReviewRequiredAt,
          manualReviewReason: execution.manualReviewReason
        });
        await ctx.reply(
          [
            "Withdrawal status is not confirmed yet.",
            ...this.withdrawalTicketSummaryLines(
              reconciliation ?? ticket
            ),
            "",
            execution.error,
            this.manualReviewRecoveryLine(execution),
            "Do not create or send another withdrawal for this ticket. Check status instead; the check never resends the transfer."
          ].join("\n"),
          this.withdrawalExecutionKeyboard(ticket.id, true)
        );
        return;
      }
      const updated = this.store.markWithdrawalExecuted(user, ticket.id, {
        signature: execution.signature,
        transactionId: execution.transactionId,
        referenceId: execution.referenceId,
        solscanUrl: execution.solscanUrl,
        executedAt: execution.executedAt
      });
      await ctx.reply(
        [
          "FTX/FrogX executed the withdrawal through Privy.",
          ...this.withdrawalTicketSummaryLines(updated ?? ticket),
          `Signature: ${execution.signature}`,
          execution.solscanUrl ? `Solscan: ${execution.solscanUrl}` : void 0,
          execution.transactionId ? `Privy tx: ${execution.transactionId}` : void 0
        ].filter(Boolean).join("\n"),
        this.withdrawalExecutionKeyboard(ticket.id, false)
      );
    } catch (error) {
      logger.warn("FTX/FrogX withdrawal execution failed", error);
      this.store.markWithdrawalExecutionPending(user, ticket.id, {
        status: "lookup_error",
        checkedAt: (/* @__PURE__ */ new Date()).toISOString(),
        error: "Ribbot lost contact with FTX after requesting execution."
      });
      await ctx.reply(
        [
          "Withdrawal status is unknown because Ribbot lost contact with FTX.",
          "Do not send this ticket again. Check status; FTX will query Privy without resending the transfer."
        ].join("\n"),
        this.withdrawalExecutionKeyboard(ticket.id, true)
      );
    }
  }
  async replyCheckWithdrawalStatus(ctx, user, ticketId) {
    if (!ticketId) {
      await ctx.reply(
        "Withdrawal ticket id missing.",
        this.menuKeyboard()
      );
      return;
    }
    const ticket = this.store.getWithdrawalTicket(user, ticketId);
    if (!ticket) {
      await ctx.reply(
        "Withdrawal ticket not found.",
        this.menuKeyboard()
      );
      return;
    }
    try {
      const result = await fetchWithdrawalExecutionStatus({
        frogxApiBaseUrl: this.config.frogxApiBaseUrl,
        ftxApiToken: this.config.ftxApiToken,
        withdrawalId: ticket.id,
        telegramUserId: user.telegramUserId,
        userPublicKey: ticket.walletAddress,
        mint: ticket.mint,
        amountIn: ticket.amountIn,
        amountLabel: ticket.amountLabel,
        destinationAddress: ticket.destinationAddress
      });
      if (result.status === "not_configured") {
        await ctx.reply(
          [
            "FTX withdrawal status lookup is not configured.",
            `Missing: ${(result.required ?? []).join(", ") || "unknown"}`,
            "The ticket remains locked because its execution state is not proven."
          ].join("\n"),
          this.withdrawalExecutionKeyboard(ticket.id, true)
        );
        return;
      }
      if (result.status === "executed") {
        const updated = this.store.markWithdrawalExecuted(
          user,
          ticket.id,
          {
            signature: result.signature,
            transactionId: result.transactionId,
            referenceId: result.referenceId,
            solscanUrl: result.solscanUrl,
            executedAt: result.executedAt
          }
        );
        await ctx.reply(
          [
            "FTX confirmed the withdrawal through Privy.",
            ...this.withdrawalTicketSummaryLines(updated ?? ticket),
            `Provider status: ${result.providerStatus ?? "confirmed"}`,
            `Signature: ${result.signature}`,
            result.solscanUrl ? `Solscan: ${result.solscanUrl}` : void 0
          ].filter(Boolean).join("\n"),
          this.withdrawalExecutionKeyboard(ticket.id, false)
        );
        return;
      }
      if (result.status === "failed") {
        const failed = this.store.markWithdrawalExecutionFailed(
          user,
          ticket.id,
          this.reconciliationRecord(result, "failed")
        );
        await ctx.reply(
          [
            "FTX confirmed this withdrawal failed.",
            ...this.withdrawalTicketSummaryLines(failed ?? ticket),
            `Provider status: ${result.providerStatus ?? "failed"}`,
            result.error,
            "No automatic retry was sent. Create a fresh withdrawal ticket if you still want to transfer."
          ].filter(Boolean).join("\n"),
          this.withdrawalExecutionKeyboard(ticket.id, false)
        );
        return;
      }
      const pendingStatus = result.status === "not_found" ? "not_found" : "lookup_error";
      const pending = this.store.markWithdrawalExecutionPending(
        user,
        ticket.id,
        this.reconciliationRecord(
          result,
          result.status === "pending" ? "pending" : pendingStatus
        )
      );
      await ctx.reply(
        [
          "Withdrawal is still awaiting a terminal Privy status.",
          ...this.withdrawalTicketSummaryLines(pending ?? ticket),
          result.providerStatus ? `Provider status: ${result.providerStatus}` : void 0,
          result.error,
          this.manualReviewRecoveryLine(result),
          "No transaction was resent. Check again later."
        ].filter(Boolean).join("\n"),
        this.withdrawalExecutionKeyboard(ticket.id, true)
      );
    } catch (error) {
      logger.warn("FTX/FrogX withdrawal status lookup failed", error);
      this.store.markWithdrawalExecutionPending(user, ticket.id, {
        status: "lookup_error",
        checkedAt: (/* @__PURE__ */ new Date()).toISOString(),
        error: "Ribbot could not reach FTX for a read-only status check."
      });
      await ctx.reply(
        [
          "Withdrawal status lookup is unavailable.",
          "The ticket remains locked and no transfer was resent."
        ].join("\n"),
        this.withdrawalExecutionKeyboard(ticket.id, true)
      );
    }
  }
  async replyCancelWithdrawal(ctx, user, ticketId) {
    if (!ticketId) {
      await ctx.reply("Withdrawal ticket id missing.");
      return;
    }
    const existing = this.store.getWithdrawalTicket(user, ticketId);
    if (existing?.status === "execution_pending") {
      await ctx.reply(
        "This withdrawal cannot be cancelled while Privy status is unresolved. Check status instead; no transfer will be resent.",
        this.withdrawalExecutionKeyboard(ticketId, true)
      );
      return;
    }
    if (existing?.status === "executed") {
      await ctx.reply(
        "This withdrawal already executed and cannot be cancelled.",
        this.withdrawalExecutionKeyboard(ticketId, false)
      );
      return;
    }
    const ticket = this.store.cancelWithdrawalTicket(user, ticketId);
    if (!ticket) {
      await ctx.reply("Staged withdrawal not found.");
      return;
    }
    await ctx.reply(
      [
        "Staged withdrawal cancelled.",
        ...this.withdrawalTicketSummaryLines(ticket)
      ].join("\n")
    );
  }
  async replyCancelCopyTrade(ctx, user, configId) {
    if (!configId) {
      await ctx.reply("Copy-trade config id missing.");
      return;
    }
    try {
      const result = await cancelStoredCopyTradeConfig({
        frogxApiBaseUrl: this.config.frogxApiBaseUrl,
        ftxApiToken: this.config.ftxApiToken,
        telegramUserId: user.telegramUserId,
        configId
      });
      if (result.status === "cancelled") {
        const config2 = this.syncStoredCopyTradeConfig(
          user,
          result.config
        );
        await ctx.reply(
          [
            "FTX/FrogX copy-trade config cancelled.",
            ...this.copyTradeSummaryLines(config2)
          ].join("\n")
        );
        return;
      }
      if (result.status === "not_cancellable") {
        const config2 = result.config ? this.syncStoredCopyTradeConfig(user, result.config) : void 0;
        await ctx.reply(
          [
            "FTX/FrogX did not cancel this copy-trade config because its execution state is locked.",
            result.error,
            config2 ? this.copyTradeSummaryLines(config2).join("\n") : void 0,
            "Refresh Copy Trade to read the latest FTX status. Ribbot will not submit another trade from this action."
          ].filter(Boolean).join("\n")
        );
        return;
      }
      if (result.status === "not_found") {
        const localConfig = this.store.cancelCopyTradeConfig(
          user,
          configId
        );
        if (localConfig) {
          await ctx.reply(
            [
              "Local cached copy-trade config cancelled.",
              ...this.copyTradeSummaryLines(localConfig)
            ].join("\n")
          );
          return;
        }
        await ctx.reply(
          "Staged copy-trade config not found in FTX/FrogX."
        );
        return;
      }
    } catch (error) {
      logger.warn("FTX/FrogX copytrade cancel failed", error);
      await ctx.reply(
        "FTX/FrogX could not cancel this copy-trade config. Local cache was not changed."
      );
      return;
    }
    const config = this.store.cancelCopyTradeConfig(user, configId);
    if (!config) {
      await ctx.reply("Staged copy-trade config not found.");
      return;
    }
    await ctx.reply(
      [
        "Local cached copy-trade config cancelled.",
        ...this.copyTradeSummaryLines(config)
      ].join("\n")
    );
  }
  async replyCheckCopyTradeStatus(ctx, user, configId) {
    if (!configId) {
      await ctx.reply("Copy-trade config id missing.");
      return;
    }
    const cached = this.store.listCopyTradeConfigs(user).find((config) => config.id === configId);
    const walletAddress = user.solanaWalletAddress ?? cached?.walletAddress;
    if (!walletAddress) {
      await ctx.reply(
        "Link or recover your wallet with /wallet before checking copy-trade status."
      );
      return;
    }
    try {
      const result = await fetchCopyTradeExecutionStatus({
        frogxApiBaseUrl: this.config.frogxApiBaseUrl,
        ftxApiToken: this.config.ftxApiToken,
        telegramUserId: user.telegramUserId,
        userPublicKey: walletAddress,
        configId
      });
      if (result.status === "not_configured") {
        await ctx.reply(
          `FTX copy-trade status lookup is not configured. Missing: ${(result.required ?? []).join(", ") || "unknown"}`
        );
        return;
      }
      if (result.status === "not_found" || result.status === "lookup_error" || result.status === "mismatch") {
        await ctx.reply(
          [
            `Copy-trade status: ${result.status}`,
            result.error,
            "FTX did not resend a trade."
          ].filter(Boolean).join("\n")
        );
        return;
      }
      if (!("config" in result)) {
        await ctx.reply(
          "FTX returned no copy-trade config. The status remains unknown and no trade was resent."
        );
        return;
      }
      const config = this.syncStoredCopyTradeConfig(user, result.config);
      const pending = result.status === "pending_reconciliation";
      await ctx.reply(
        [
          `Copy-trade execution: ${result.status}`,
          ...this.copyTradeSummaryLines(config),
          result.error,
          this.manualReviewRecoveryLine(result),
          pending ? "The attempt remains locked. Check Status only reads Privy and never resends the copied trade." : void 0
        ].filter(Boolean).join("\n"),
        Markup.inlineKeyboard([
          pending ? [
            Markup.button.callback(
              "Check Again",
              `ribbot:check-copytrade:${configId}`
            ),
            Markup.button.callback(
              "Refresh",
              "ribbot:copytrade"
            )
          ] : [
            Markup.button.callback(
              "Refresh",
              "ribbot:copytrade"
            ),
            Markup.button.callback("Menu", "ribbot:menu")
          ],
          ...pending ? [[Markup.button.callback("Menu", "ribbot:menu")]] : []
        ])
      );
    } catch (error) {
      logger.warn("FTX/FrogX copytrade status failed", error);
      await ctx.reply(
        [
          "Copy-trade status lookup is unavailable.",
          "The config remains locked in FTX and Ribbot did not resend a trade."
        ].join("\n")
      );
    }
  }
  async replyControlCopyTrade(ctx, user, configId, action) {
    if (!configId) {
      await ctx.reply("Copy-trade config id missing.");
      return;
    }
    try {
      const result = await controlStoredCopyTradeConfig({
        frogxApiBaseUrl: this.config.frogxApiBaseUrl,
        ftxApiToken: this.config.ftxApiToken,
        telegramUserId: user.telegramUserId,
        configId,
        action
      });
      if (result.status === "paused" || result.status === "resumed") {
        const config = this.syncStoredCopyTradeConfig(
          user,
          result.config
        );
        await ctx.reply(
          [
            `Copy trade ${result.status} through FTX/FrogX.`,
            ...this.copyTradeSummaryLines(config)
          ].join("\n"),
          Markup.inlineKeyboard([
            [
              Markup.button.callback(
                result.status === "paused" ? "Resume" : "Pause",
                `ribbot:${result.status === "paused" ? "resume" : "pause"}-copytrade:${config.id}`
              ),
              Markup.button.callback(
                "Copy Trade",
                "ribbot:copytrade"
              )
            ]
          ])
        );
        return;
      }
      if (result.status === "not_controllable") {
        const config = result.config ? this.syncStoredCopyTradeConfig(user, result.config) : void 0;
        await ctx.reply(
          [
            `FTX/FrogX could not ${action} this copy trade from its current state.`,
            result.error,
            config ? this.copyTradeSummaryLines(config).join("\n") : void 0
          ].filter(Boolean).join("\n")
        );
        return;
      }
      if (result.status === "not_configured") {
        await ctx.reply(
          `FTX/FrogX copy-trade control is not configured. Missing: ${(result.required ?? []).join(", ") || "unknown"}.`
        );
        return;
      }
      await ctx.reply("Copy-trade config not found in FTX/FrogX.");
    } catch (error) {
      logger.warn("FTX/FrogX copytrade control failed", error);
      await ctx.reply(
        `FTX/FrogX could not ${action} this copy trade. Ribbot did not change local state.`
      );
    }
  }
  async replyCopyTradeEditHelp(ctx, user, configId) {
    if (!configId) {
      await ctx.reply("Copy-trade config id missing.");
      return;
    }
    const config = this.store.listCopyTradeConfigs(user).find((entry) => entry.id === configId);
    await ctx.reply(
      [
        "Edit Copy Trade",
        ...config ? this.copyTradeSummaryLines(config) : [],
        "",
        `Use: /copytrade edit ${configId} key=value ...`,
        "Keys: tag target mode percent max minbuy minliq minmcap maxmcap sells duplicate renounced excludepump blacklist slippage buyfee sellfee",
        "Use none to clear tag, minbuy, minmcap, maxmcap, or blacklist.",
        "FTX accepts edits only while the strategy is staged or paused."
      ].join("\n"),
      Markup.inlineKeyboard([
        [
          Markup.button.callback("Copy Trade", "ribbot:copytrade"),
          Markup.button.callback("Menu", "ribbot:menu")
        ]
      ])
    );
  }
  async replyEditCopyTrade(ctx, user, intent) {
    if (!intent.configId) {
      await ctx.reply("Usage: /copytrade edit <config id> key=value ...");
      return;
    }
    if (intent.invalidOptions?.length) {
      await ctx.reply(
        `Invalid copy-trade edit options: ${intent.invalidOptions.join(", ")}`
      );
      return;
    }
    if (!hasCopyTradeEditPatch(intent)) {
      await this.replyCopyTradeEditHelp(ctx, user, intent.configId);
      return;
    }
    let stored;
    try {
      const result = await fetchCopyTradeConfigs({
        frogxApiBaseUrl: this.config.frogxApiBaseUrl,
        ftxApiToken: this.config.ftxApiToken,
        telegramUserId: user.telegramUserId
      });
      if (result.status !== "ready") {
        await ctx.reply(
          "FTX/FrogX copy-trade storage is unavailable. Ribbot did not edit local cache."
        );
        return;
      }
      stored = result.configs.find(
        (config) => config.configId === intent.configId
      );
    } catch (error) {
      logger.warn("FTX/FrogX copytrade edit lookup failed", error);
      await ctx.reply(
        "FTX/FrogX could not load the authoritative strategy. Ribbot did not edit local cache."
      );
      return;
    }
    if (!stored) {
      await ctx.reply("Copy-trade config not found in FTX/FrogX.");
      return;
    }
    const targetWallet = intent.targetWallet ?? stored.targetWallet;
    const buyMode = intent.buyMode ?? stored.buyMode ?? "percentage";
    const buyPercentageBps = intent.buyPercentage !== void 0 ? Math.round(intent.buyPercentage * 100) : stored.buyPercentageBps ?? 1e4;
    const maxBuyAmountIn = intent.maxBuySol !== void 0 ? solToLamports(intent.maxBuySol) : stored.maxBuyAmountIn;
    const minTargetBuyAmountIn = intent.minTargetBuySol === null ? void 0 : intent.minTargetBuySol !== void 0 ? solToLamports(intent.minTargetBuySol) : stored.minTargetBuyAmountIn;
    const minMarketCapUsd = intent.minMarketCapUsd === null ? void 0 : intent.minMarketCapUsd ?? stored.minMarketCapUsd;
    const maxMarketCapUsd = intent.maxMarketCapUsd === null ? void 0 : intent.maxMarketCapUsd ?? stored.maxMarketCapUsd;
    const blacklistMints = intent.blacklistMints ?? [
      ...stored.blacklistMints ?? []
    ];
    const slippageBps = intent.slippageBps ?? stored.slippageBps;
    const priorityFeeLamports = intent.priorityFeeLamports ?? stored.priorityFee;
    const sellPriorityFeeLamports = intent.sellPriorityFeeLamports ?? stored.sellPriorityFee ?? stored.priorityFee;
    if (intent.tag !== void 0 && intent.tag !== null && !isCopyTradeTag(intent.tag) || !isSolanaAddress2(targetWallet) || targetWallet === stored.walletAddress || buyPercentageBps < 1 || buyPercentageBps > 1e4 || !/^[1-9]\d*$/.test(maxBuyAmountIn) || minTargetBuyAmountIn !== void 0 && !/^[1-9]\d*$/.test(minTargetBuyAmountIn) || intent.minLiquidityUsd !== void 0 && intent.minLiquidityUsd <= 0 || minMarketCapUsd !== void 0 && minMarketCapUsd <= 0 || maxMarketCapUsd !== void 0 && maxMarketCapUsd <= 0 || minMarketCapUsd !== void 0 && maxMarketCapUsd !== void 0 && minMarketCapUsd > maxMarketCapUsd || blacklistMints.length > 20 || !blacklistMints.every(isSolanaMint) || !Number.isInteger(slippageBps) || slippageBps < 0 || slippageBps > 1e4 || !Number.isInteger(priorityFeeLamports) || priorityFeeLamports < 0 || !Number.isInteger(sellPriorityFeeLamports) || sellPriorityFeeLamports < 0) {
      await ctx.reply(
        "Copy-trade edit values are invalid. Run /copytrade and use Edit for the accepted keys."
      );
      return;
    }
    try {
      const result = await updateStoredCopyTradeConfig({
        frogxApiBaseUrl: this.config.frogxApiBaseUrl,
        ftxApiToken: this.config.ftxApiToken,
        configId: stored.configId,
        telegramUserId: stored.telegramUserId,
        userPublicKey: stored.walletAddress,
        tag: intent.tag === null ? void 0 : intent.tag ?? stored.tag,
        targetWallet,
        buyMode,
        buyPercentageBps,
        maxBuyAmountIn,
        amountLabel: buyMode === "fixed" ? `${lamportsToSol(maxBuyAmountIn)} SOL fixed` : `${buyPercentageBps / 100}% up to ${lamportsToSol(maxBuyAmountIn)} SOL`,
        slippageBps,
        priorityFeeLamports,
        sellPriorityFeeLamports,
        copySells: intent.copySells ?? stored.copySells,
        duplicateBuys: intent.duplicateBuys ?? stored.duplicateBuys ?? true,
        onlyRenounced: intent.onlyRenounced ?? stored.onlyRenounced ?? false,
        excludePumpFunTokens: intent.excludePumpFunTokens ?? stored.excludePumpFunTokens ?? false,
        minTargetBuyAmountIn,
        minLiquidityUsd: intent.minLiquidityUsd ?? stored.minLiquidityUsd,
        minMarketCapUsd,
        maxMarketCapUsd,
        blacklistMints
      });
      if (result.status === "updated") {
        const config = this.syncStoredCopyTradeConfig(
          user,
          result.config
        );
        await ctx.reply(
          [
            "Copy trade updated through FTX/FrogX.",
            ...this.copyTradeSummaryLines(config),
            ...result.targetChanged ? [
              "Target changed: FTX cleared the old monitor cursor and will establish a no-trade baseline before observing new activity."
            ] : [],
            ...result.warnings.map(
              (warning) => `Warning: ${warning}`
            )
          ].join("\n"),
          Markup.inlineKeyboard([
            [
              Markup.button.callback(
                config.status === "paused" ? "Resume" : "Pause",
                `ribbot:${config.status === "paused" ? "resume" : "pause"}-copytrade:${config.id}`
              ),
              Markup.button.callback(
                "Copy Trade",
                "ribbot:copytrade"
              )
            ]
          ])
        );
        return;
      }
      if (result.status === "not_updatable") {
        if (result.config) {
          this.syncStoredCopyTradeConfig(user, result.config);
        }
        await ctx.reply(
          [
            "FTX/FrogX rejected this edit because the strategy is locked.",
            result.error,
            "Ribbot did not change local strategy fields."
          ].filter(Boolean).join("\n")
        );
        return;
      }
      if (result.status === "not_configured") {
        await ctx.reply(
          `FTX/FrogX copy-trade updates are not configured. Missing: ${(result.required ?? []).join(", ") || "unknown"}.`
        );
        return;
      }
      await ctx.reply("Copy-trade config not found in FTX/FrogX.");
    } catch (error) {
      logger.warn("FTX/FrogX copytrade update failed", error);
      await ctx.reply(
        "FTX/FrogX could not update this copy trade. Ribbot did not change local strategy fields."
      );
    }
  }
  async replyDuplicateCopyTrade(ctx, user, configId, tag) {
    if (!configId) {
      await ctx.reply(
        "Usage: /copytrade duplicate <config id> [tag=name]"
      );
      return;
    }
    if (tag && !isCopyTradeTag(tag)) {
      await ctx.reply("Copy-trade tag must be 1 to 32 safe characters.");
      return;
    }
    try {
      const result = await duplicateStoredCopyTradeConfig({
        frogxApiBaseUrl: this.config.frogxApiBaseUrl,
        ftxApiToken: this.config.ftxApiToken,
        telegramUserId: user.telegramUserId,
        configId,
        tag
      });
      if (result.status === "duplicated") {
        const config = this.syncStoredCopyTradeConfig(
          user,
          result.config
        );
        await ctx.reply(
          [
            `Copy trade duplicated through FTX/FrogX from ${result.sourceConfigId}.`,
            ...this.copyTradeSummaryLines(config),
            "The new strategy is staged with a fresh no-trade monitor baseline."
          ].join("\n"),
          Markup.inlineKeyboard([
            [
              Markup.button.callback(
                "Edit",
                `ribbot:edit-copytrade:${config.id}`
              ),
              Markup.button.callback(
                "Copy Trade",
                "ribbot:copytrade"
              )
            ]
          ])
        );
        return;
      }
      if (result.status === "not_configured") {
        await ctx.reply(
          `FTX/FrogX copy-trade duplication is not configured. Missing: ${(result.required ?? []).join(", ") || "unknown"}.`
        );
        return;
      }
      if (result.config) {
        this.syncStoredCopyTradeConfig(user, result.config);
      }
      await ctx.reply(
        [
          "FTX/FrogX could not duplicate this copy trade.",
          result.error,
          "Ribbot did not create a local-only strategy."
        ].filter(Boolean).join("\n")
      );
    } catch (error) {
      logger.warn("FTX/FrogX copytrade duplicate failed", error);
      await ctx.reply(
        "FTX/FrogX could not duplicate this copy trade. Ribbot did not create a local-only strategy."
      );
    }
  }
  async replyCancelSniper(ctx, user, configId) {
    if (!configId) {
      await ctx.reply("Sniper config id missing.");
      return;
    }
    try {
      const result = await cancelStoredSniperConfig({
        frogxApiBaseUrl: this.config.frogxApiBaseUrl,
        ftxApiToken: this.config.ftxApiToken,
        telegramUserId: user.telegramUserId,
        configId
      });
      if (result.status === "cancelled") {
        const config2 = this.syncStoredSniperConfig(user, result.config);
        await ctx.reply(
          [
            "FTX/FrogX sniper config cancelled.",
            ...this.sniperSummaryLines(config2)
          ].join("\n")
        );
        return;
      }
      if (result.status === "not_cancellable") {
        const config2 = result.config ? this.syncStoredSniperConfig(user, result.config) : void 0;
        await ctx.reply(
          [
            "FTX/FrogX did not cancel this sniper config because its execution state is locked.",
            result.error,
            config2 ? this.sniperSummaryLines(config2).join("\n") : void 0,
            "Refresh Sniper to read the latest FTX status."
          ].filter(Boolean).join("\n")
        );
        return;
      }
      if (result.status === "not_found") {
        const localConfig = this.store.cancelSniperConfig(
          user,
          configId
        );
        if (localConfig) {
          await ctx.reply(
            [
              "Local cached sniper config cancelled.",
              ...this.sniperSummaryLines(localConfig)
            ].join("\n")
          );
          return;
        }
        await ctx.reply("Staged sniper config not found in FTX/FrogX.");
        return;
      }
    } catch (error) {
      logger.warn("FTX/FrogX sniper cancel failed", error);
      await ctx.reply(
        "FTX/FrogX could not cancel this sniper config. Local cache was not changed."
      );
      return;
    }
    const config = this.store.cancelSniperConfig(user, configId);
    if (!config) {
      await ctx.reply("Staged sniper config not found.");
      return;
    }
    await ctx.reply(
      [
        "Local cached sniper config cancelled.",
        ...this.sniperSummaryLines(config)
      ].join("\n")
    );
  }
  async replyCheckSniperStatus(ctx, user, configId) {
    if (!configId) {
      await ctx.reply("Sniper config id missing.");
      return;
    }
    const cached = this.store.listSniperConfigs(user).find((config) => config.id === configId);
    const walletAddress = user.solanaWalletAddress ?? cached?.walletAddress;
    if (!walletAddress) {
      await ctx.reply(
        "Link or recover your wallet with /wallet before checking sniper status."
      );
      return;
    }
    try {
      const result = await fetchSniperExecutionStatus({
        frogxApiBaseUrl: this.config.frogxApiBaseUrl,
        ftxApiToken: this.config.ftxApiToken,
        telegramUserId: user.telegramUserId,
        userPublicKey: walletAddress,
        configId
      });
      if (result.status === "not_configured") {
        await ctx.reply(
          `FTX sniper status lookup is not configured. Missing: ${(result.required ?? []).join(", ") || "unknown"}`
        );
        return;
      }
      if (result.status === "not_found" || result.status === "lookup_error" || result.status === "mismatch") {
        await ctx.reply(
          [
            `Sniper status: ${result.status}`,
            result.error,
            "FTX did not resend a trade."
          ].filter(Boolean).join("\n")
        );
        return;
      }
      if (!("config" in result)) {
        await ctx.reply(
          "FTX returned no sniper config. The status remains unknown and no trade was resent."
        );
        return;
      }
      const config = this.syncStoredSniperConfig(user, result.config);
      const pending = result.status === "pending_reconciliation";
      await ctx.reply(
        [
          `Sniper execution: ${result.status}`,
          ...this.sniperSummaryLines(config),
          result.error,
          this.manualReviewRecoveryLine(result),
          pending ? "The attempt remains locked. Check Status only reads Privy and never submits another snipe." : void 0
        ].filter(Boolean).join("\n"),
        Markup.inlineKeyboard([
          pending ? [
            Markup.button.callback(
              "Check Again",
              `ribbot:check-sniper:${configId}`
            ),
            Markup.button.callback(
              "Refresh",
              "ribbot:sniper"
            )
          ] : [
            Markup.button.callback(
              "Refresh",
              "ribbot:sniper"
            ),
            Markup.button.callback("Menu", "ribbot:menu")
          ],
          ...pending ? [[Markup.button.callback("Menu", "ribbot:menu")]] : []
        ])
      );
    } catch (error) {
      logger.warn("FTX/FrogX sniper status failed", error);
      await ctx.reply(
        [
          "Sniper status lookup is unavailable.",
          "The config remains locked in FTX and Ribbot did not submit another snipe."
        ].join("\n")
      );
    }
  }
  async replyCancelAutoBuy(ctx, user, configId) {
    if (!configId) {
      await ctx.reply("Auto-buy rule id missing.");
      return;
    }
    try {
      const result = await cancelStoredAutoBuyConfig({
        frogxApiBaseUrl: this.config.frogxApiBaseUrl,
        ftxApiToken: this.config.ftxApiToken,
        telegramUserId: user.telegramUserId,
        configId
      });
      if (result.status === "cancelled") {
        const config2 = this.syncStoredAutoBuyConfig(
          user,
          result.config
        );
        await ctx.reply(
          [
            "FTX/FrogX auto-buy rule cancelled.",
            ...this.autoBuySummaryLines(config2)
          ].join("\n")
        );
        return;
      }
      if (result.status === "not_cancellable") {
        const config2 = result.config ? this.syncStoredAutoBuyConfig(user, result.config) : void 0;
        await ctx.reply(
          [
            "FTX/FrogX did not cancel this auto-buy rule because its execution state is locked.",
            result.error,
            config2 ? this.autoBuySummaryLines(config2).join("\n") : void 0,
            "Refresh Auto Buy to read the latest FTX status. Ribbot will not submit another buy from this action."
          ].filter(Boolean).join("\n")
        );
        return;
      }
      if (result.status === "not_found") {
        const localConfig = this.store.cancelAutoBuyConfig(
          user,
          configId
        );
        if (localConfig) {
          await ctx.reply(
            [
              "Local cached auto-buy rule cancelled.",
              ...this.autoBuySummaryLines(localConfig)
            ].join("\n")
          );
          return;
        }
        await ctx.reply("Staged auto-buy rule not found in FTX/FrogX.");
        return;
      }
    } catch (error) {
      logger.warn("FTX/FrogX auto-buy cancel failed", error);
      await ctx.reply(
        "FTX/FrogX could not cancel this auto-buy rule. Local cache was not changed."
      );
      return;
    }
    const config = this.store.cancelAutoBuyConfig(user, configId);
    if (!config) {
      await ctx.reply("Staged auto-buy rule not found.");
      return;
    }
    await ctx.reply(
      [
        "Local cached auto-buy rule cancelled.",
        ...this.autoBuySummaryLines(config)
      ].join("\n")
    );
  }
  async replyCheckAutoBuyStatus(ctx, user, configId) {
    if (!configId) {
      await ctx.reply("Auto-buy rule id missing.");
      return;
    }
    const cached = this.store.listAutoBuyConfigs(user).find((config) => config.id === configId);
    const walletAddress = user.solanaWalletAddress ?? cached?.walletAddress;
    if (!walletAddress) {
      await ctx.reply(
        "Link or recover your wallet with /wallet before checking auto-buy status."
      );
      return;
    }
    try {
      const result = await fetchAutoBuyExecutionStatus({
        frogxApiBaseUrl: this.config.frogxApiBaseUrl,
        ftxApiToken: this.config.ftxApiToken,
        telegramUserId: user.telegramUserId,
        userPublicKey: walletAddress,
        configId
      });
      if (result.status === "not_configured") {
        await ctx.reply(
          `FTX auto-buy status lookup is not configured. Missing: ${(result.required ?? []).join(", ") || "unknown"}`
        );
        return;
      }
      if (result.status === "not_found" || result.status === "lookup_error" || result.status === "mismatch") {
        await ctx.reply(
          [
            `Auto-buy status: ${result.status}`,
            result.error,
            "FTX did not resend a buy."
          ].filter(Boolean).join("\n")
        );
        return;
      }
      if (!("config" in result)) {
        await ctx.reply(
          "FTX returned no auto-buy config. The status remains unknown and no buy was resent."
        );
        return;
      }
      const config = this.syncStoredAutoBuyConfig(user, result.config);
      const pending = result.status === "pending_reconciliation";
      await ctx.reply(
        [
          `Auto-buy execution: ${result.status}`,
          ...this.autoBuySummaryLines(config),
          result.error,
          this.manualReviewRecoveryLine(result),
          pending ? "The rule remains locked. Check Status only reads Privy and never submits another buy." : void 0
        ].filter(Boolean).join("\n"),
        Markup.inlineKeyboard([
          pending ? [
            Markup.button.callback(
              "Check Again",
              `ribbot:check-autobuy:${configId}`
            ),
            Markup.button.callback(
              "Refresh",
              "ribbot:autobuy"
            )
          ] : [
            Markup.button.callback(
              "Refresh",
              "ribbot:autobuy"
            ),
            Markup.button.callback("Menu", "ribbot:menu")
          ],
          ...pending ? [[Markup.button.callback("Menu", "ribbot:menu")]] : []
        ])
      );
    } catch (error) {
      logger.warn("FTX/FrogX auto-buy status failed", error);
      await ctx.reply(
        [
          "Auto-buy status lookup is unavailable.",
          "The rule remains locked in FTX and Ribbot did not submit another buy."
        ].join("\n")
      );
    }
  }
  async replyCancelBundleBuy(ctx, user, configId) {
    if (!configId) {
      await ctx.reply("Bundle-buy basket id missing.");
      return;
    }
    try {
      const result = await cancelStoredBundleBuyConfig({
        frogxApiBaseUrl: this.config.frogxApiBaseUrl,
        ftxApiToken: this.config.ftxApiToken,
        telegramUserId: user.telegramUserId,
        configId
      });
      if (result.status === "cancelled") {
        const config2 = this.syncStoredBundleBuyConfig(
          user,
          result.config
        );
        await ctx.reply(
          [
            "FTX/FrogX bundle-buy basket cancelled.",
            ...this.bundleBuySummaryLines(config2)
          ].join("\n")
        );
        return;
      }
      if (result.status === "not_found") {
        const localConfig = this.store.cancelBundleBuyConfig(
          user,
          configId
        );
        if (localConfig) {
          await ctx.reply(
            [
              "Local cached bundle-buy basket cancelled.",
              ...this.bundleBuySummaryLines(localConfig)
            ].join("\n")
          );
          return;
        }
        await ctx.reply(
          "Staged bundle-buy basket not found in FTX/FrogX."
        );
        return;
      }
      if (result.status === "not_cancellable") {
        await this.replyCheckBundleBuyStatus(ctx, user, configId);
        return;
      }
      if (result.status === "not_configured") {
        await ctx.reply(
          [
            "FTX/FrogX bundle-buy storage is not configured, so the basket was not cancelled.",
            `Missing: ${(result.required ?? []).join(", ") || "unknown"}`
          ].join("\n")
        );
        return;
      }
    } catch (error) {
      logger.warn("FTX/FrogX bundle-buy cancel failed", error);
      await ctx.reply(
        "FTX/FrogX could not cancel this bundle-buy basket. Local cache was not changed."
      );
      return;
    }
    const config = this.store.cancelBundleBuyConfig(user, configId);
    if (!config) {
      await ctx.reply("Staged bundle-buy basket not found.");
      return;
    }
    await ctx.reply(
      [
        "Local cached bundle-buy basket cancelled.",
        ...this.bundleBuySummaryLines(config)
      ].join("\n")
    );
  }
  async replyExecuteBundleBuy(ctx, user, configId) {
    if (!configId) {
      await ctx.reply("Bundle-buy basket id missing.");
      return;
    }
    if (!user.solanaWalletAddress) {
      await ctx.reply(
        "Link or create a wallet with /wallet before executing a basket buy."
      );
      return;
    }
    const cached = this.store.listBundleBuyConfigs(user).find((config) => config.id === configId);
    if (cached?.status === "executing") {
      await this.replyCheckBundleBuyStatus(ctx, user, configId);
      return;
    }
    if (cached?.status === "executed") {
      await ctx.reply(
        "This bundle-buy basket already executed.",
        this.bundleExecutionKeyboard(configId, false)
      );
      return;
    }
    if (cached?.status === "failed") {
      await ctx.reply(
        [
          "This bundle-buy basket ended in failure and cannot be restarted.",
          cached.execution?.error,
          "Create a fresh basket for any remaining items."
        ].filter(Boolean).join("\n"),
        this.bundleExecutionKeyboard(configId, false)
      );
      return;
    }
    try {
      const result = await executeStoredBundleBuyConfig({
        frogxApiBaseUrl: this.config.frogxApiBaseUrl,
        ftxApiToken: this.config.ftxApiToken,
        telegramUserId: user.telegramUserId,
        userPublicKey: user.solanaWalletAddress,
        configId
      });
      if (result.status === "not_configured") {
        await ctx.reply(
          [
            "FTX/FrogX bundle-buy execution is not configured yet.",
            `Missing: ${(result.required ?? []).join(", ") || "unknown"}`
          ].join("\n")
        );
        return;
      }
      if (result.status === "not_found") {
        await ctx.reply("Bundle-buy basket not found in FTX/FrogX.");
        return;
      }
      if (result.status === "not_executable") {
        const partialLines = (result.executions ?? []).slice(0, 5).map(
          (item, index) => this.bundleBuyExecutionLine(item, index)
        );
        if (cached && result.configStatus === "failed") {
          this.store.updateBundleBuyExecution(
            user,
            configId,
            "failed",
            this.bundleExecutionRecord(result, cached.items.length)
          );
        }
        await ctx.reply(
          [
            "FTX/FrogX did not execute this bundle-buy basket.",
            result.error ? `Error: ${result.error}` : void 0,
            partialLines.length ? "" : void 0,
            ...partialLines
          ].filter(Boolean).join("\n"),
          this.bundleExecutionKeyboard(configId, false)
        );
        return;
      }
      if (result.status === "pending_reconciliation") {
        if (cached) {
          this.store.updateBundleBuyExecution(
            user,
            configId,
            "executing",
            this.bundleExecutionRecord(result, cached.items.length)
          );
        }
        await ctx.reply(
          [
            "Bundle-buy execution is awaiting Privy reconciliation.",
            `Basket: ${result.configId}`,
            `Progress: ${result.confirmedItems}/${result.totalItems} confirmed (${result.attemptedItems} attempted)`,
            result.error,
            ...this.manualReviewSummaryLines(result),
            this.manualReviewRecoveryLine(result),
            "FTX stopped the sequence. Check Status never resends an item; interrupted partial baskets will not auto-resume."
          ].filter(Boolean).join("\n"),
          this.bundleExecutionKeyboard(configId, true)
        );
        return;
      }
      if (cached) {
        this.store.updateBundleBuyExecution(
          user,
          configId,
          "executed",
          this.bundleExecutionRecord(result, cached.items.length)
        );
      }
      await ctx.reply(
        [
          "Bundle-buy basket executed through FTX/FrogX.",
          `Basket: ${result.configId}`,
          `Items: ${result.itemCount}`,
          `Max total: ${lamportsToSol(result.totalAmountIn).toFixed(4)} SOL`,
          "",
          ...result.executions.slice(0, 8).map(
            (item, index) => this.bundleBuyExecutionLine(item, index)
          )
        ].join("\n"),
        Markup.inlineKeyboard([
          [Markup.button.callback("Activity", "ribbot:activity")],
          [Markup.button.callback("Menu", "ribbot:menu")]
        ])
      );
    } catch (error) {
      logger.warn("FTX/FrogX bundle-buy execution failed", error);
      if (cached) {
        this.store.updateBundleBuyExecution(
          user,
          configId,
          "executing",
          {
            attemptedItems: cached.execution?.attemptedItems ?? 0,
            confirmedItems: cached.execution?.confirmedItems ?? 0,
            totalItems: cached.items.length,
            checkedAt: (/* @__PURE__ */ new Date()).toISOString(),
            error: "Ribbot lost contact with FTX after requesting bundle execution.",
            executions: cached.execution?.executions ?? []
          }
        );
      }
      await ctx.reply(
        [
          "Bundle-buy status is unknown because Ribbot lost contact with FTX.",
          "Do not execute this basket again. Check Status; FTX will inspect persisted progress and Privy references without resending."
        ].join("\n"),
        this.bundleExecutionKeyboard(configId, true)
      );
    }
  }
  async replyCheckBundleBuyStatus(ctx, user, configId) {
    if (!configId) {
      await ctx.reply(
        "Bundle-buy basket id missing.",
        this.menuKeyboard()
      );
      return;
    }
    if (!user.solanaWalletAddress) {
      await ctx.reply(
        "Link or recover your wallet with /wallet before checking bundle status.",
        this.menuKeyboard()
      );
      return;
    }
    const cached = this.store.listBundleBuyConfigs(user).find((config) => config.id === configId);
    try {
      const result = await fetchStoredBundleBuyExecutionStatus({
        frogxApiBaseUrl: this.config.frogxApiBaseUrl,
        ftxApiToken: this.config.ftxApiToken,
        telegramUserId: user.telegramUserId,
        userPublicKey: user.solanaWalletAddress,
        configId
      });
      if (result.status === "not_configured") {
        await ctx.reply(
          [
            "FTX bundle status lookup is not configured.",
            `Missing: ${(result.required ?? []).join(", ") || "unknown"}`,
            "The basket remains locked because its execution state is not proven."
          ].join("\n"),
          this.bundleExecutionKeyboard(configId, true)
        );
        return;
      }
      if (result.status === "not_started") {
        if (cached) {
          const restored = { ...cached, status: "staged" };
          delete restored.execution;
          this.store.upsertBundleBuyConfig(user, restored);
        }
        await ctx.reply(
          [
            "FTX confirms this bundle-buy execution never started.",
            result.error,
            "The staged basket may be reviewed and executed again explicitly."
          ].filter(Boolean).join("\n"),
          this.bundleExecutionKeyboard(configId, false)
        );
        return;
      }
      if (result.status === "executed") {
        if (cached) {
          this.store.updateBundleBuyExecution(
            user,
            configId,
            "executed",
            this.bundleExecutionRecord(result, cached.items.length)
          );
        }
        await ctx.reply(
          [
            "FTX confirmed the bundle-buy basket executed.",
            `Basket: ${result.configId}`,
            `Items: ${result.itemCount}`,
            ...result.executions.slice(0, 8).map(
              (item, index) => this.bundleBuyExecutionLine(item, index)
            )
          ].join("\n"),
          this.bundleExecutionKeyboard(configId, false)
        );
        return;
      }
      if (result.status === "failed") {
        if (cached) {
          this.store.updateBundleBuyExecution(
            user,
            configId,
            "failed",
            this.bundleExecutionRecord(result, cached.items.length)
          );
        }
        await ctx.reply(
          [
            "FTX confirmed the bundle sequence stopped.",
            `Progress: ${result.confirmedItems ?? 0}/${result.totalItems ?? cached?.items.length ?? 0} confirmed`,
            result.error,
            "No item was resent and FTX will not auto-resume. Create a fresh basket only for any remaining items."
          ].filter(Boolean).join("\n"),
          this.bundleExecutionKeyboard(configId, false)
        );
        return;
      }
      if (result.status === "pending_reconciliation") {
        if (cached) {
          this.store.updateBundleBuyExecution(
            user,
            configId,
            "executing",
            this.bundleExecutionRecord(result, cached.items.length)
          );
        }
        await ctx.reply(
          [
            "Bundle-buy reconciliation is still pending.",
            `Progress: ${result.confirmedItems ?? 0}/${result.totalItems ?? cached?.items.length ?? 0} confirmed (${result.attemptedItems ?? 0} attempted)`,
            result.error,
            ...this.manualReviewSummaryLines(result),
            this.manualReviewRecoveryLine(result),
            "No item was resent. Check again later."
          ].filter(Boolean).join("\n"),
          this.bundleExecutionKeyboard(configId, true)
        );
        return;
      }
      await ctx.reply(
        [
          "FTX could not prove the bundle-buy execution state.",
          result.error,
          "The basket remains locked and no item was resent."
        ].filter(Boolean).join("\n"),
        this.bundleExecutionKeyboard(configId, true)
      );
    } catch (error) {
      logger.warn("FTX/FrogX bundle-buy status lookup failed", error);
      await ctx.reply(
        [
          "Bundle-buy status lookup is unavailable.",
          "The basket remains locked and no item was resent."
        ].join("\n"),
        this.bundleExecutionKeyboard(configId, true)
      );
    }
  }
  async replyCancelAutoSell(ctx, user, configId) {
    if (!configId) {
      await ctx.reply("Auto-sell rule id missing.");
      return;
    }
    try {
      const result = await cancelStoredAutoSellConfig({
        frogxApiBaseUrl: this.config.frogxApiBaseUrl,
        ftxApiToken: this.config.ftxApiToken,
        telegramUserId: user.telegramUserId,
        configId
      });
      if (result.status === "cancelled") {
        const config2 = this.syncStoredAutoSellConfig(
          user,
          result.config
        );
        await ctx.reply(
          [
            "FTX/FrogX auto-sell rule cancelled.",
            ...this.autoSellSummaryLines(config2)
          ].join("\n")
        );
        return;
      }
      if (result.status === "not_cancellable") {
        const config2 = result.config ? this.syncStoredAutoSellConfig(user, result.config) : void 0;
        await ctx.reply(
          [
            "FTX/FrogX did not cancel this auto-sell rule because its execution state is locked.",
            result.error,
            config2 ? this.autoSellSummaryLines(config2).join("\n") : void 0,
            "Refresh Auto Sell to read the latest FTX status. Ribbot will not submit another sell from this action."
          ].filter(Boolean).join("\n")
        );
        return;
      }
      if (result.status === "not_found") {
        const localConfig = this.store.cancelAutoSellConfig(
          user,
          configId
        );
        if (localConfig) {
          await ctx.reply(
            [
              "Local cached auto-sell rule cancelled.",
              ...this.autoSellSummaryLines(localConfig)
            ].join("\n")
          );
          return;
        }
        await ctx.reply(
          "Staged auto-sell rule not found in FTX/FrogX."
        );
        return;
      }
    } catch (error) {
      logger.warn("FTX/FrogX auto-sell cancel failed", error);
      await ctx.reply(
        "FTX/FrogX could not cancel this auto-sell rule. Local cache was not changed."
      );
      return;
    }
    const config = this.store.cancelAutoSellConfig(user, configId);
    if (!config) {
      await ctx.reply("Staged auto-sell rule not found.");
      return;
    }
    await ctx.reply(
      [
        "Local cached auto-sell rule cancelled.",
        ...this.autoSellSummaryLines(config)
      ].join("\n")
    );
  }
  async replyCheckAutoSellStatus(ctx, user, configId) {
    if (!configId) {
      await ctx.reply("Auto-sell rule id missing.");
      return;
    }
    const cached = this.store.listAutoSellConfigs(user).find((config) => config.id === configId);
    const walletAddress = user.solanaWalletAddress ?? cached?.walletAddress;
    if (!walletAddress) {
      await ctx.reply(
        "Link or recover your wallet with /wallet before checking auto-sell status."
      );
      return;
    }
    try {
      const result = await fetchAutoSellExecutionStatus({
        frogxApiBaseUrl: this.config.frogxApiBaseUrl,
        ftxApiToken: this.config.ftxApiToken,
        telegramUserId: user.telegramUserId,
        userPublicKey: walletAddress,
        configId
      });
      if (result.status === "not_configured") {
        await ctx.reply(
          `FTX auto-sell status lookup is not configured. Missing: ${(result.required ?? []).join(", ") || "unknown"}`
        );
        return;
      }
      if (result.status === "not_found" || result.status === "lookup_error" || result.status === "mismatch") {
        await ctx.reply(
          [
            `Auto-sell status: ${result.status}`,
            result.error,
            "FTX did not resend a sell."
          ].filter(Boolean).join("\n")
        );
        return;
      }
      if (!("config" in result)) {
        await ctx.reply(
          "FTX returned no auto-sell config. The status remains unknown and no sell was resent."
        );
        return;
      }
      const config = this.syncStoredAutoSellConfig(user, result.config);
      const pending = result.status === "pending_reconciliation";
      await ctx.reply(
        [
          `Auto-sell execution: ${result.status}`,
          ...this.autoSellSummaryLines(config),
          result.error,
          this.manualReviewRecoveryLine(result),
          pending ? "The rule remains locked. Check Status only reads Privy and never submits another sell." : void 0
        ].filter(Boolean).join("\n"),
        Markup.inlineKeyboard([
          pending ? [
            Markup.button.callback(
              "Check Again",
              `ribbot:check-autosell:${configId}`
            ),
            Markup.button.callback(
              "Refresh",
              "ribbot:autosell"
            )
          ] : [
            Markup.button.callback(
              "Refresh",
              "ribbot:autosell"
            ),
            Markup.button.callback("Menu", "ribbot:menu")
          ],
          ...pending ? [[Markup.button.callback("Menu", "ribbot:menu")]] : []
        ])
      );
    } catch (error) {
      logger.warn("FTX/FrogX auto-sell status failed", error);
      await ctx.reply(
        [
          "Auto-sell status lookup is unavailable.",
          "The rule remains locked in FTX and Ribbot did not submit another sell."
        ].join("\n")
      );
    }
  }
  async applySettingsPreference(ctx, user, update) {
    try {
      const validation = await validatePreferences({
        frogxApiBaseUrl: this.config.frogxApiBaseUrl,
        ftxApiToken: this.config.ftxApiToken,
        telegramUserId: user.telegramUserId,
        userPublicKey: user.solanaWalletAddress,
        kind: "settings",
        action: "set",
        slippageBps: update.slippageBps,
        priorityFeeLamports: update.priorityFeeLamports ?? user.settings.priorityFeeLamports,
        sellPriorityFeeLamports: update.sellPriorityFeeLamports,
        defaultBuyAmountIn: update.defaultBuySol !== void 0 ? solToLamports(update.defaultBuySol) : void 0,
        buyPresetAmountsIn: update.buyPresetsSol?.map(solToLamports),
        sellPresetBps: update.sellPresetsPercent?.map(
          (percent) => Math.round(percent * 100)
        ),
        botMode: update.botMode,
        confirmTrades: update.confirmTrades,
        sellProtection: update.sellProtection,
        autoBuyEnabled: update.autoBuyEnabled,
        instantAutoBuyEnabled: update.instantAutoBuyEnabled,
        instantAutoBuyAmountIn: update.instantAutoBuyAmountSol !== void 0 ? solToLamports(update.instantAutoBuyAmountSol) : void 0,
        instantAutoBuyMinLiquidityUsd: update.instantAutoBuyMinLiquidityUsd,
        instantAutoBuyMaxMarketCapUsd: update.instantAutoBuyMaxMarketCapUsd,
        autoSellEnabled: update.autoSellEnabled,
        sniperEnabled: update.sniperEnabled,
        mevProtection: update.mevProtection
      });
      if (validation.status === "not_configured") {
        await ctx.reply(
          [
            "FTX/FrogX preference validation is not configured for Ribbot yet.",
            `Missing: ${(validation.required ?? []).join(", ") || "unknown"}`,
            "",
            "Ribbot did not update settings."
          ].join("\n")
        );
        return;
      }
      const updated = validation.account ? this.store.syncAccountSnapshot(user, validation.account) : this.applyNormalizedSettings(
        user,
        validation.normalized.settings
      );
      if (!updated) {
        await ctx.reply("FTX/FrogX did not return settings to apply.");
        return;
      }
      await ctx.reply(
        [
          "Settings updated through FTX/FrogX validation.",
          `Interface: ${updated.settings.botMode}`,
          `Confirm trades: ${updated.settings.confirmTrades ? "on" : "off"}`,
          `Sell protection: ${updated.settings.sellProtection ? "on" : "off"}`,
          `Default buy: ${updated.settings.defaultBuySol} SOL`,
          `Buy presets: ${updated.settings.buyPresetsSol.join(", ")} SOL`,
          `Sell presets: ${updated.settings.sellPresetsPercent.join(", ")}%`,
          `Slippage: ${updated.settings.slippageBps / 100}%`,
          `Priority fee: ${updated.settings.priorityFeeLamports} lamports`,
          `Sell priority fee: ${updated.settings.sellPriorityFeeLamports} lamports`,
          `MEV protection: ${updated.settings.mevProtection ? "on" : "off"}`,
          `Auto buy: ${updated.settings.autoBuyEnabled ? "on" : "off"}`,
          `Instant CA buy: ${updated.settings.instantAutoBuyEnabled ? `${updated.settings.instantAutoBuyAmountSol} SOL` : "off"}`,
          `Auto sell: ${updated.settings.autoSellEnabled ? "on" : "off"}`,
          `Sniper: ${updated.settings.sniperEnabled ? "on" : "off"}`,
          "",
          ...validation.warnings.map(
            (warning) => `Warning: ${warning}`
          )
        ].join("\n")
      );
    } catch (error) {
      logger.warn("FTX/FrogX preference validation failed", error);
      await ctx.reply(
        "FTX/FrogX could not validate this settings change. Ribbot did not update settings."
      );
    }
  }
  async applyTokenPreference(ctx, user, input) {
    try {
      const validation = await validatePreferences({
        frogxApiBaseUrl: this.config.frogxApiBaseUrl,
        ftxApiToken: this.config.ftxApiToken,
        telegramUserId: user.telegramUserId,
        userPublicKey: user.solanaWalletAddress,
        kind: input.kind,
        action: input.action,
        mint: input.mint,
        priorityFeeLamports: user.settings.priorityFeeLamports
      });
      if (validation.status === "not_configured") {
        await ctx.reply(
          [
            "FTX/FrogX preference validation is not configured for Ribbot yet.",
            `Missing: ${(validation.required ?? []).join(", ") || "unknown"}`,
            "",
            "Ribbot did not update token preferences."
          ].join("\n")
        );
        return;
      }
      const updated = validation.account ? this.store.syncAccountSnapshot(user, validation.account) : this.applyLocalTokenPreference(user, input);
      const label = input.kind === "watchlist" ? "watchlist" : "hidden tokens";
      await ctx.reply(
        [
          `${label} updated through FTX/FrogX validation.`,
          `Token: ${shortAddress(input.mint)}`,
          `Action: ${input.action}`,
          "",
          input.kind === "watchlist" ? this.watchlistText(updated) : this.hiddenTokensText(updated),
          "",
          ...validation.warnings.map(
            (warning) => `Warning: ${warning}`
          )
        ].join("\n")
      );
    } catch (error) {
      logger.warn("FTX/FrogX token preference validation failed", error);
      await ctx.reply(
        "FTX/FrogX could not validate this token preference change. Ribbot did not update local state."
      );
    }
  }
  applyNormalizedSettings(user, normalized) {
    if (!normalized) return void 0;
    return this.store.updateSettings(user, {
      slippageBps: normalized.slippageBps,
      priorityFeeLamports: normalized.priorityFee,
      sellPriorityFeeLamports: normalized.sellPriorityFee,
      defaultBuySol: normalized.defaultBuyAmountIn ? lamportsToSol(normalized.defaultBuyAmountIn) : void 0,
      buyPresetsSol: normalized.buyPresetAmountsIn?.map(lamportsToSol),
      sellPresetsPercent: normalized.sellPresetBps?.map(
        (bps) => bps / 100
      ),
      botMode: normalized.botMode,
      confirmTrades: normalized.confirmTrades,
      sellProtection: normalized.sellProtection,
      autoBuyEnabled: normalized.autoBuyEnabled,
      instantAutoBuyEnabled: normalized.instantAutoBuyEnabled,
      instantAutoBuyAmountSol: normalized.instantAutoBuyAmountIn ? lamportsToSol(normalized.instantAutoBuyAmountIn) : void 0,
      instantAutoBuyMinLiquidityUsd: normalized.instantAutoBuyMinLiquidityUsd,
      instantAutoBuyMaxMarketCapUsd: normalized.instantAutoBuyMaxMarketCapUsd,
      autoSellEnabled: normalized.autoSellEnabled,
      sniperEnabled: normalized.sniperEnabled,
      mevProtection: normalized.mevProtection
    });
  }
  applyLocalTokenPreference(user, input) {
    if (input.kind === "watchlist" && input.action === "add") {
      return this.store.addToWatchlist(user, input.mint);
    }
    if (input.kind === "watchlist") {
      return this.store.removeFromWatchlist(user, input.mint);
    }
    if (input.action === "add") {
      return this.store.addHiddenToken(user, input.mint);
    }
    return this.store.removeHiddenToken(user, input.mint);
  }
  async refreshAccountSnapshot(user) {
    if (!this.config.ftxApiToken) return user;
    try {
      const result = await fetchTradingAccount({
        frogxApiBaseUrl: this.config.frogxApiBaseUrl,
        ftxApiToken: this.config.ftxApiToken,
        telegramUserId: user.telegramUserId
      });
      if (result.status === "ready") {
        return this.store.syncAccountSnapshot(user, result.account);
      }
    } catch (error) {
      logger.warn("FTX/FrogX account sync failed", error);
    }
    return user;
  }
  async replyWatchlist(ctx, user, intent) {
    if (intent?.action && intent.action !== "list") {
      if (!intent.mint || !isSolanaMint(intent.mint)) {
        await ctx.reply(
          "Usage: /watch <mint>, /watchlist add <mint>, or /watchlist remove <mint>"
        );
        return;
      }
      await this.applyTokenPreference(ctx, user, {
        kind: "watchlist",
        action: intent.action,
        mint: intent.mint
      });
      return;
    }
    const syncedUser = await this.refreshAccountSnapshot(user);
    await ctx.reply(this.watchlistText(syncedUser));
  }
  async replyHiddenTokens(ctx, user, intent) {
    if (intent?.action && intent.action !== "list") {
      if (!intent.mint || !isSolanaMint(intent.mint)) {
        await ctx.reply("Usage: /hide <mint> or /unhide <mint>");
        return;
      }
      await this.applyTokenPreference(ctx, user, {
        kind: "hiddenToken",
        action: intent.action,
        mint: intent.mint
      });
      return;
    }
    const syncedUser = await this.refreshAccountSnapshot(user);
    const unhideButtons = syncedUser.hiddenTokens.slice(0, 8).map((mint) => [
      Markup.button.callback(
        `Unhide ${shortAddress(mint)}`,
        positionVisibilityCallbackData(mint, 0, "show")
      )
    ]);
    await ctx.reply(
      this.hiddenTokensText(syncedUser),
      Markup.inlineKeyboard([
        ...unhideButtons,
        [
          Markup.button.callback("Positions", "ribbot:positions:0"),
          Markup.button.callback("Menu", "ribbot:menu")
        ]
      ])
    );
  }
  async replyCopyTrade(ctx, user, intent) {
    if (intent?.action === "add") {
      await this.replyAddCopyTrade(ctx, user, intent);
      return;
    }
    if (intent?.action === "pause" || intent?.action === "resume") {
      await this.replyControlCopyTrade(
        ctx,
        user,
        intent.configId,
        intent.action
      );
      return;
    }
    if (intent?.action === "edit") {
      await this.replyEditCopyTrade(ctx, user, intent);
      return;
    }
    if (intent?.action === "duplicate") {
      if (intent.invalidOptions?.length) {
        await ctx.reply(
          `Invalid copy-trade duplicate options: ${intent.invalidOptions.join(", ")}`
        );
        return;
      }
      await this.replyDuplicateCopyTrade(
        ctx,
        user,
        intent.configId,
        intent.tag ?? void 0
      );
      return;
    }
    let configs = this.store.listCopyTradeConfigs(user).filter((config) => config.status !== "cancelled");
    let ftxListUnavailable = false;
    try {
      const stored = await fetchCopyTradeConfigs({
        frogxApiBaseUrl: this.config.frogxApiBaseUrl,
        ftxApiToken: this.config.ftxApiToken,
        telegramUserId: user.telegramUserId
      });
      if (stored.status === "ready") {
        configs = stored.configs.map(
          (config) => this.syncStoredCopyTradeConfig(user, config)
        ).filter((config) => config.status !== "cancelled");
      } else {
        ftxListUnavailable = true;
      }
    } catch (error) {
      ftxListUnavailable = true;
      logger.warn("FTX/FrogX copytrade list failed", error);
    }
    if (configs.length === 0) {
      await ctx.reply(
        [
          "Copy Trade",
          "No active copy-trade configs.",
          "",
          "Usage:",
          "/copytrade add <wallet> fixed <SOL> <min liquidity USD> [options]",
          "/copytrade add <wallet> percent <%> <max SOL> <min liquidity USD> [options]",
          "/copytrade pause|resume <config id>",
          "/copytrade edit <config id> key=value ...",
          "/copytrade duplicate <config id> [tag=name]",
          "",
          "Options: tag=name copy-sells duplicate=on|off renounced=on|off excludepump=on|off minbuy=SOL minmcap=USD maxmcap=USD blacklist=mint,mint",
          "FTX/FrogX stores and enforces sizing, fees, and filters before any copied execution.",
          ftxListUnavailable ? "FTX/FrogX storage is unavailable, so only local cached configs can be shown." : ""
        ].join("\n")
      );
      return;
    }
    const lines = [
      "Copy Trade configs",
      ...configs.slice(0, 10).flatMap((config, index) => [
        "",
        `${index + 1}. ${config.tag ?? shortAddress(config.targetWallet)}`,
        ...this.copyTradeSummaryLines(config)
      ]),
      configs.length > 10 ? `
...and ${configs.length - 10} more` : "",
      ftxListUnavailable ? "\nFTX/FrogX storage is unavailable; showing local cache." : ""
    ].filter(Boolean);
    const buttons = configs.slice(0, 5).flatMap((config) => {
      if (config.status === "executing") {
        return [
          [
            Markup.button.callback(
              "Check",
              `ribbot:check-copytrade:${config.id}`
            ),
            Markup.button.callback(
              "Duplicate",
              `ribbot:duplicate-copytrade:${config.id}`
            )
          ]
        ];
      }
      if (config.status === "staged" || config.status === "paused") {
        return [
          [
            Markup.button.callback(
              config.status === "paused" ? "Resume" : "Pause",
              `ribbot:${config.status === "paused" ? "resume" : "pause"}-copytrade:${config.id}`
            ),
            Markup.button.callback(
              "Edit",
              `ribbot:edit-copytrade:${config.id}`
            )
          ],
          [
            Markup.button.callback(
              "Duplicate",
              `ribbot:duplicate-copytrade:${config.id}`
            ),
            Markup.button.callback(
              "Cancel",
              `ribbot:cancel-copytrade:${config.id}`
            )
          ]
        ];
      }
      if (config.status === "failed") {
        return [
          [
            Markup.button.callback(
              "Duplicate",
              `ribbot:duplicate-copytrade:${config.id}`
            ),
            Markup.button.callback(
              "Cancel",
              `ribbot:cancel-copytrade:${config.id}`
            )
          ]
        ];
      }
      if (config.status === "executed") {
        return [
          [
            Markup.button.callback(
              "Duplicate",
              `ribbot:duplicate-copytrade:${config.id}`
            )
          ]
        ];
      }
      return [];
    });
    buttons.push([
      Markup.button.callback("Refresh", "ribbot:copytrade"),
      Markup.button.callback("Menu", "ribbot:menu")
    ]);
    await ctx.reply(lines.join("\n"), Markup.inlineKeyboard(buttons));
  }
  async replyAddCopyTrade(ctx, user, intent) {
    if (typeof intent.tag === "string" && !isCopyTradeTag(intent.tag) || !intent.targetWallet || !isSolanaAddress2(intent.targetWallet) || !intent.buyMode || intent.buyMode === "percentage" && (!intent.buyPercentage || intent.buyPercentage <= 0 || intent.buyPercentage > 100) || !intent.maxBuySol || intent.maxBuySol <= 0 || !intent.minLiquidityUsd || intent.minLiquidityUsd <= 0 || intent.minMarketCapUsd != null && intent.maxMarketCapUsd != null && intent.minMarketCapUsd > intent.maxMarketCapUsd || (intent.blacklistMints?.length ?? 0) > 20 || !(intent.blacklistMints ?? []).every(isSolanaMint)) {
      await ctx.reply(
        [
          "Usage:",
          "/copytrade add <wallet> fixed <SOL> <min liquidity USD> [options]",
          "/copytrade add <wallet> percent <%> <max SOL> <min liquidity USD> [options]",
          "Options: tag=name copy-sells duplicate=on|off renounced=on|off excludepump=on|off minbuy=SOL minmcap=USD maxmcap=USD blacklist=mint,mint"
        ].join("\n")
      );
      return;
    }
    const currentUser = await this.refreshAccountSnapshot(user);
    if (!currentUser.solanaWalletAddress) {
      await ctx.reply(
        "Link or create a wallet with /wallet before staging copy trading."
      );
      return;
    }
    if (intent.targetWallet === currentUser.solanaWalletAddress) {
      await ctx.reply(
        "Copy-trade target must be different from your trading wallet."
      );
      return;
    }
    try {
      const storage = await storeCopyTradeConfig({
        frogxApiBaseUrl: this.config.frogxApiBaseUrl,
        ftxApiToken: this.config.ftxApiToken,
        telegramUserId: currentUser.telegramUserId,
        userPublicKey: currentUser.solanaWalletAddress,
        tag: intent.tag ?? void 0,
        targetWallet: intent.targetWallet,
        buyMode: intent.buyMode,
        buyPercentageBps: Math.round(
          (intent.buyPercentage ?? 100) * 100
        ),
        maxBuyAmountIn: solToLamports(intent.maxBuySol),
        amountLabel: intent.buyMode === "fixed" ? `${intent.maxBuySol} SOL fixed` : `${intent.buyPercentage ?? 100}% up to ${intent.maxBuySol} SOL`,
        slippageBps: currentUser.settings.slippageBps,
        priorityFeeLamports: currentUser.settings.priorityFeeLamports,
        sellPriorityFeeLamports: currentUser.settings.sellPriorityFeeLamports,
        copySells: Boolean(intent.copySells),
        duplicateBuys: Boolean(intent.duplicateBuys),
        onlyRenounced: Boolean(intent.onlyRenounced),
        excludePumpFunTokens: Boolean(intent.excludePumpFunTokens),
        minTargetBuyAmountIn: intent.minTargetBuySol != null ? solToLamports(intent.minTargetBuySol) : void 0,
        minLiquidityUsd: intent.minLiquidityUsd,
        minMarketCapUsd: intent.minMarketCapUsd ?? void 0,
        maxMarketCapUsd: intent.maxMarketCapUsd ?? void 0,
        blacklistMints: intent.blacklistMints
      });
      if (storage.status === "not_configured") {
        await ctx.reply(
          [
            "FTX/FrogX copy-trade storage is not configured for Ribbot yet.",
            `Missing: ${(storage.required ?? []).join(", ") || "unknown"}`,
            "",
            "Ribbot did not store this config."
          ].join("\n")
        );
        return;
      }
      const config = this.syncStoredCopyTradeConfig(
        currentUser,
        storage.config
      );
      await ctx.reply(
        [
          "Copy-trade config stored through FTX/FrogX.",
          ...this.copyTradeSummaryLines(config),
          "",
          ...storage.warnings.map((warning) => `Warning: ${warning}`),
          "",
          "This Telegram request did not start a monitor or execute a trade."
        ].join("\n"),
        Markup.inlineKeyboard([
          [
            Markup.button.callback(
              "Copy Trade",
              "ribbot:copytrade"
            ),
            Markup.button.callback(
              "Cancel",
              `ribbot:cancel-copytrade:${config.id}`
            )
          ]
        ])
      );
    } catch (error) {
      logger.warn("FTX/FrogX copytrade storage failed", error);
      await ctx.reply(
        "FTX/FrogX could not store this copy-trade config. Ribbot did not store it."
      );
    }
  }
  async replySniper(ctx, user, intent) {
    if (intent?.action === "add") {
      await this.replyAddSniper(ctx, user, intent);
      return;
    }
    let configs = this.store.listSniperConfigs(user).filter((config) => config.status !== "cancelled");
    let ftxListUnavailable = false;
    try {
      const stored = await fetchSniperConfigs({
        frogxApiBaseUrl: this.config.frogxApiBaseUrl,
        ftxApiToken: this.config.ftxApiToken,
        telegramUserId: user.telegramUserId
      });
      if (stored.status === "ready") {
        configs = stored.configs.map((config) => this.syncStoredSniperConfig(user, config)).filter((config) => config.status !== "cancelled");
      } else {
        ftxListUnavailable = true;
      }
    } catch (error) {
      ftxListUnavailable = true;
      logger.warn("FTX/FrogX sniper list failed", error);
    }
    if (configs.length === 0) {
      await ctx.reply(
        [
          "Sniper",
          "No active sniper configs.",
          "",
          "Usage:",
          "/sniper add <any|pump|raydium|moonshot> <max SOL per snipe> <min liquidity USD> <max snipes> [max market cap USD]",
          "",
          "FTX/FrogX stores source, max buy, liquidity filter, and max snipes before Ribbot shows the config.",
          "When enabled by an operator, FTX monitors Jupiter recent first pools; live sends still require your Sniper setting plus separate FTX and Privy gates.",
          ftxListUnavailable ? "FTX/FrogX storage is unavailable, so only local cached configs can be shown." : ""
        ].join("\n")
      );
      return;
    }
    const lines = [
      "Sniper configs",
      ...configs.slice(0, 10).flatMap((config, index) => [
        "",
        `${index + 1}. ${config.source}`,
        ...this.sniperSummaryLines(config)
      ]),
      configs.length > 10 ? `
...and ${configs.length - 10} more` : "",
      ftxListUnavailable ? "\nFTX/FrogX storage is unavailable; showing local cache." : ""
    ].filter(Boolean);
    const buttons = configs.filter((config) => config.status !== "executed").slice(0, 5).map(
      (config) => config.status === "executing" ? [
        Markup.button.callback(
          `Check ${config.id}`,
          `ribbot:check-sniper:${config.id}`
        )
      ] : [
        Markup.button.callback(
          `Cancel ${config.id}`,
          `ribbot:cancel-sniper:${config.id}`
        )
      ]
    );
    buttons.push([
      Markup.button.callback("Refresh", "ribbot:sniper"),
      Markup.button.callback("Menu", "ribbot:menu")
    ]);
    await ctx.reply(lines.join("\n"), Markup.inlineKeyboard(buttons));
  }
  async replyAddSniper(ctx, user, intent) {
    if (!intent.source || !intent.maxBuySol || intent.maxBuySol <= 0 || !intent.minLiquidityUsd || intent.minLiquidityUsd <= 0 || !intent.maxSnipes || !Number.isInteger(intent.maxSnipes)) {
      await ctx.reply(
        [
          "Usage:",
          "/sniper add <any|pump|raydium|moonshot> <max SOL per snipe> <min liquidity USD> <max snipes> [max market cap USD]"
        ].join("\n")
      );
      return;
    }
    if (!user.solanaWalletAddress) {
      await ctx.reply(
        "Link or create a wallet with /wallet before staging sniper mode."
      );
      return;
    }
    try {
      const storage = await storeSniperConfig({
        frogxApiBaseUrl: this.config.frogxApiBaseUrl,
        ftxApiToken: this.config.ftxApiToken,
        telegramUserId: user.telegramUserId,
        userPublicKey: user.solanaWalletAddress,
        source: intent.source,
        maxBuyAmountIn: solToLamports(intent.maxBuySol),
        amountLabel: `${intent.maxBuySol} SOL max per snipe`,
        slippageBps: user.settings.slippageBps,
        priorityFeeLamports: user.settings.priorityFeeLamports,
        minLiquidityUsd: intent.minLiquidityUsd,
        maxMarketCapUsd: intent.maxMarketCapUsd,
        maxSnipes: intent.maxSnipes
      });
      if (storage.status === "not_configured") {
        await ctx.reply(
          [
            "FTX/FrogX sniper storage is not configured for Ribbot yet.",
            `Missing: ${(storage.required ?? []).join(", ") || "unknown"}`,
            "",
            "Ribbot did not store this config."
          ].join("\n")
        );
        return;
      }
      const config = this.syncStoredSniperConfig(user, storage.config);
      await ctx.reply(
        [
          "Sniper config stored through FTX/FrogX.",
          ...this.sniperSummaryLines(config),
          "",
          ...storage.warnings.map((warning) => `Warning: ${warning}`),
          "",
          user.settings.sniperEnabled ? "This request only stored the config. FTX monitoring and execution still require disabled-by-default operator gates." : "Sniper account opt-in is off. Use /settings sniper on before any operator-enabled live execution can run."
        ].join("\n"),
        Markup.inlineKeyboard([
          [
            Markup.button.callback("Sniper", "ribbot:sniper"),
            Markup.button.callback(
              "Cancel",
              `ribbot:cancel-sniper:${config.id}`
            )
          ]
        ])
      );
    } catch (error) {
      logger.warn("FTX/FrogX sniper storage failed", error);
      await ctx.reply(
        "FTX/FrogX could not store this sniper config. Ribbot did not store it."
      );
    }
  }
  async replyAutoBuy(ctx, user, intent) {
    if (intent?.action === "instant") {
      await this.replyInstantAutoBuyPreference(ctx, user, intent);
      return;
    }
    if (intent?.action === "add") {
      await this.replyAddAutoBuy(ctx, user, intent);
      return;
    }
    const currentUser = await this.refreshAccountSnapshot(user);
    let configs = this.store.listAutoBuyConfigs(user).filter((config) => config.status !== "cancelled");
    let ftxListUnavailable = false;
    try {
      const stored = await fetchAutoBuyConfigs({
        frogxApiBaseUrl: this.config.frogxApiBaseUrl,
        ftxApiToken: this.config.ftxApiToken,
        telegramUserId: user.telegramUserId
      });
      if (stored.status === "ready") {
        configs = stored.configs.map((config) => this.syncStoredAutoBuyConfig(user, config)).filter((config) => config.status !== "cancelled");
      } else {
        ftxListUnavailable = true;
      }
    } catch (error) {
      ftxListUnavailable = true;
      logger.warn("FTX/FrogX auto-buy list failed", error);
    }
    if (configs.length === 0) {
      await ctx.reply(
        [
          "Auto Buy",
          ...this.instantAutoBuySummaryLines(currentUser),
          "",
          "No active auto-buy rules.",
          "",
          "Usage:",
          "/autobuy instant on <SOL> <min liquidity USD> [max market cap USD]",
          "/autobuy instant off",
          "/autobuy add <mint> <max SOL per buy> <min liquidity USD> [max market cap USD]",
          "",
          "FTX/FrogX stores token, max buy, slippage, and liquidity filters before Ribbot shows the rule.",
          ftxListUnavailable ? "FTX/FrogX storage is unavailable, so only local cached rules can be shown." : ""
        ].join("\n")
      );
      return;
    }
    const lines = [
      "Auto Buy rules",
      ...this.instantAutoBuySummaryLines(currentUser),
      ...configs.slice(0, 10).flatMap((config, index) => [
        "",
        `${index + 1}. ${shortAddress(config.mint)}`,
        ...this.autoBuySummaryLines(config)
      ]),
      configs.length > 10 ? `
...and ${configs.length - 10} more` : "",
      ftxListUnavailable ? "\nFTX/FrogX storage is unavailable; showing local cache." : ""
    ].filter(Boolean);
    const buttons = configs.filter(
      (config) => config.status === "staged" || config.status === "failed" || config.status === "executing"
    ).slice(0, 5).map((config) => [
      Markup.button.callback(
        `${config.status === "executing" ? "Check" : "Cancel"} ${config.id}`,
        config.status === "executing" ? `ribbot:check-autobuy:${config.id}` : `ribbot:cancel-autobuy:${config.id}`
      )
    ]);
    buttons.push([
      Markup.button.callback("Refresh", "ribbot:autobuy"),
      Markup.button.callback("Menu", "ribbot:menu")
    ]);
    await ctx.reply(lines.join("\n"), Markup.inlineKeyboard(buttons));
  }
  async replyInstantAutoBuyPreference(ctx, user, intent) {
    if (intent.enabled === false) {
      await this.applySettingsPreference(ctx, user, {
        instantAutoBuyEnabled: false
      });
      return;
    }
    if (intent.enabled !== true || !intent.maxBuySol || intent.maxBuySol <= 0 || !intent.minLiquidityUsd || intent.minLiquidityUsd <= 0 || intent.maxMarketCapUsd !== void 0 && intent.maxMarketCapUsd <= 0) {
      await ctx.reply(
        [
          "Usage:",
          "/autobuy instant on <SOL> <min liquidity USD> [max market cap USD]",
          "/autobuy instant off"
        ].join("\n")
      );
      return;
    }
    await this.applySettingsPreference(ctx, user, {
      instantAutoBuyEnabled: true,
      instantAutoBuyAmountSol: intent.maxBuySol,
      instantAutoBuyMinLiquidityUsd: intent.minLiquidityUsd,
      instantAutoBuyMaxMarketCapUsd: intent.maxMarketCapUsd
    });
  }
  instantAutoBuySummaryLines(user) {
    return [
      `Instant CA buy: ${user.settings.instantAutoBuyEnabled ? "on" : "off"}`,
      `Instant amount: ${user.settings.instantAutoBuyAmountSol} SOL`,
      `Minimum liquidity: ${formatUsd(user.settings.instantAutoBuyMinLiquidityUsd)}`,
      `Maximum market cap: ${user.settings.instantAutoBuyMaxMarketCapUsd === void 0 ? "none" : formatUsd(user.settings.instantAutoBuyMaxMarketCapUsd)}`
    ];
  }
  async replyAddAutoBuy(ctx, user, intent) {
    if (!intent.mint || !isSolanaMint(intent.mint) || !intent.maxBuySol || intent.maxBuySol <= 0 || !intent.minLiquidityUsd || intent.minLiquidityUsd <= 0) {
      await ctx.reply(
        [
          "Usage:",
          "/autobuy add <mint> <max SOL per buy> <min liquidity USD> [max market cap USD]"
        ].join("\n")
      );
      return;
    }
    if (!user.solanaWalletAddress) {
      await ctx.reply(
        "Link or create a wallet with /wallet before staging auto buy."
      );
      return;
    }
    try {
      const storage = await storeAutoBuyConfig({
        frogxApiBaseUrl: this.config.frogxApiBaseUrl,
        ftxApiToken: this.config.ftxApiToken,
        telegramUserId: user.telegramUserId,
        userPublicKey: user.solanaWalletAddress,
        mint: intent.mint,
        maxBuyAmountIn: solToLamports(intent.maxBuySol),
        amountLabel: `${intent.maxBuySol} SOL max per auto buy`,
        slippageBps: user.settings.slippageBps,
        priorityFeeLamports: user.settings.priorityFeeLamports,
        minLiquidityUsd: intent.minLiquidityUsd,
        maxMarketCapUsd: intent.maxMarketCapUsd
      });
      if (storage.status === "not_configured") {
        await ctx.reply(
          [
            "FTX/FrogX auto-buy storage is not configured for Ribbot yet.",
            `Missing: ${(storage.required ?? []).join(", ") || "unknown"}`,
            "",
            "Ribbot did not store this rule."
          ].join("\n")
        );
        return;
      }
      const config = this.syncStoredAutoBuyConfig(user, storage.config);
      await ctx.reply(
        [
          "Auto-buy rule stored through FTX/FrogX.",
          ...this.autoBuySummaryLines(config),
          "",
          ...storage.warnings.map((warning) => `Warning: ${warning}`),
          "",
          "This Telegram request did not start a monitor or execute a trade."
        ].join("\n"),
        Markup.inlineKeyboard([
          [
            Markup.button.callback("Auto Buy", "ribbot:autobuy"),
            Markup.button.callback(
              "Cancel",
              `ribbot:cancel-autobuy:${config.id}`
            )
          ]
        ])
      );
    } catch (error) {
      logger.warn("FTX/FrogX auto-buy storage failed", error);
      await ctx.reply(
        "FTX/FrogX could not store this auto-buy rule. Ribbot did not store it."
      );
    }
  }
  async replyBundleBuy(ctx, user, intent) {
    if (intent?.action === "add") {
      await this.replyAddBundleBuy(ctx, user, intent);
      return;
    }
    let configs = this.store.listBundleBuyConfigs(user).filter((config) => config.status !== "cancelled");
    let ftxListUnavailable = false;
    try {
      const stored = await fetchBundleBuyConfigs({
        frogxApiBaseUrl: this.config.frogxApiBaseUrl,
        ftxApiToken: this.config.ftxApiToken,
        telegramUserId: user.telegramUserId
      });
      if (stored.status === "ready") {
        configs = stored.configs.map(
          (config) => this.syncStoredBundleBuyConfig(user, config)
        ).filter((config) => config.status !== "cancelled");
      } else {
        ftxListUnavailable = true;
      }
    } catch (error) {
      ftxListUnavailable = true;
      logger.warn("FTX/FrogX bundle-buy list failed", error);
    }
    if (configs.length === 0) {
      await ctx.reply(
        [
          "Basket Buy",
          "No multi-token baskets are staged.",
          "",
          "Usage:",
          "/bundle add <mint> <SOL> <mint> <SOL> <min liquidity USD> [max market cap USD]",
          "",
          "FTX/FrogX stores the token basket, per-token SOL caps, slippage, and risk filters before Ribbot shows the basket.",
          ftxListUnavailable ? "FTX/FrogX storage is unavailable, so only local cached baskets can be shown." : ""
        ].join("\n")
      );
      return;
    }
    const lines = [
      "Basket Buy",
      ...configs.slice(0, 10).flatMap((config, index) => [
        "",
        `${index + 1}. ${config.items.length} tokens`,
        ...this.bundleBuySummaryLines(config)
      ]),
      configs.length > 10 ? `
...and ${configs.length - 10} more` : "",
      ftxListUnavailable ? "\nFTX/FrogX storage is unavailable; showing local cache." : ""
    ].filter(Boolean);
    const buttons = configs.slice(0, 5).flatMap((config) => {
      if (config.status === "staged") {
        return [
          [
            Markup.button.callback(
              `Execute ${config.id}`,
              `ribbot:execute-bundle:${config.id}`
            ),
            Markup.button.callback(
              `Cancel ${config.id}`,
              `ribbot:cancel-bundle:${config.id}`
            )
          ]
        ];
      }
      if (config.status === "executing") {
        return [
          [
            Markup.button.callback(
              `Check ${config.id}`,
              `ribbot:check-bundle:${config.id}`
            )
          ]
        ];
      }
      return [];
    });
    buttons.push([Markup.button.callback("Menu", "ribbot:menu")]);
    await ctx.reply(lines.join("\n"), Markup.inlineKeyboard(buttons));
  }
  async replyAddBundleBuy(ctx, user, intent) {
    const items = intent.items ?? [];
    if (items.length < 2 || items.length > 10 || !intent.minLiquidityUsd || intent.minLiquidityUsd <= 0) {
      await ctx.reply(
        [
          "Usage:",
          "/bundle add <mint> <SOL> <mint> <SOL> <min liquidity USD> [max market cap USD]",
          "",
          "Example:",
          "/bundle add <mintA> 0.05 <mintB> 0.05 1000"
        ].join("\n")
      );
      return;
    }
    if (!user.solanaWalletAddress) {
      await ctx.reply(
        "Link or create a wallet with /wallet before staging a basket buy."
      );
      return;
    }
    const totalSol = items.reduce((sum, item) => sum + item.amountSol, 0);
    try {
      const storage = await storeBundleBuyConfig({
        frogxApiBaseUrl: this.config.frogxApiBaseUrl,
        ftxApiToken: this.config.ftxApiToken,
        telegramUserId: user.telegramUserId,
        userPublicKey: user.solanaWalletAddress,
        items: items.map((item) => ({
          mint: item.mint,
          maxBuyAmountIn: solToLamports(item.amountSol),
          amountLabel: `${item.amountSol} SOL`
        })),
        amountLabel: `${totalSol} SOL total`,
        slippageBps: user.settings.slippageBps,
        priorityFeeLamports: user.settings.priorityFeeLamports,
        minLiquidityUsd: intent.minLiquidityUsd,
        maxMarketCapUsd: intent.maxMarketCapUsd
      });
      if (storage.status === "not_configured") {
        await ctx.reply(
          [
            "FTX/FrogX bundle-buy storage is not configured for Ribbot yet.",
            `Missing: ${(storage.required ?? []).join(", ") || "unknown"}`,
            "",
            "Ribbot did not store this basket."
          ].join("\n")
        );
        return;
      }
      const config = this.syncStoredBundleBuyConfig(user, storage.config);
      await ctx.reply(
        [
          "Bundle-buy basket stored through FTX/FrogX.",
          ...this.bundleBuySummaryLines(config),
          "",
          ...storage.warnings.map((warning) => `Warning: ${warning}`),
          "",
          "This Telegram request did not execute a trade."
        ].join("\n"),
        Markup.inlineKeyboard([
          [
            Markup.button.callback(
              "Execute",
              `ribbot:execute-bundle:${config.id}`
            ),
            Markup.button.callback("Basket Buy", "ribbot:bundle"),
            Markup.button.callback(
              "Cancel",
              `ribbot:cancel-bundle:${config.id}`
            )
          ]
        ])
      );
    } catch (error) {
      logger.warn("FTX/FrogX bundle-buy storage failed", error);
      await ctx.reply(
        "FTX/FrogX could not store this multi-token basket. Ribbot did not store it."
      );
    }
  }
  async replyAutoSell(ctx, user, intent) {
    if (intent?.action === "add") {
      await this.replyAddAutoSell(ctx, user, intent);
      return;
    }
    let configs = this.store.listAutoSellConfigs(user).filter((config) => config.status !== "cancelled");
    let ftxListUnavailable = false;
    try {
      const stored = await fetchAutoSellConfigs({
        frogxApiBaseUrl: this.config.frogxApiBaseUrl,
        ftxApiToken: this.config.ftxApiToken,
        telegramUserId: user.telegramUserId
      });
      if (stored.status === "ready") {
        configs = stored.configs.map(
          (config) => this.syncStoredAutoSellConfig(user, config)
        ).filter((config) => config.status !== "cancelled");
      } else {
        ftxListUnavailable = true;
      }
    } catch (error) {
      ftxListUnavailable = true;
      logger.warn("FTX/FrogX auto-sell list failed", error);
    }
    if (configs.length === 0) {
      await ctx.reply(
        [
          "Auto Sell",
          "No active auto-sell rules.",
          "",
          "Usage:",
          "/autosell add <mint> <sell percent> [above|below <price>]",
          "",
          "FTX/FrogX stores token, sell percentage, optional trigger, slippage, and priority fee before Ribbot shows the rule.",
          ftxListUnavailable ? "FTX/FrogX storage is unavailable, so only local cached rules can be shown." : ""
        ].join("\n")
      );
      return;
    }
    const lines = [
      "Auto Sell rules",
      ...configs.slice(0, 10).flatMap((config, index) => [
        "",
        `${index + 1}. ${shortAddress(config.mint)}`,
        ...this.autoSellSummaryLines(config)
      ]),
      configs.length > 10 ? `
...and ${configs.length - 10} more` : "",
      ftxListUnavailable ? "\nFTX/FrogX storage is unavailable; showing local cache." : ""
    ].filter(Boolean);
    const buttons = configs.filter(
      (config) => config.status === "staged" || config.status === "failed" || config.status === "executing"
    ).slice(0, 5).map((config) => [
      Markup.button.callback(
        `${config.status === "executing" ? "Check" : "Cancel"} ${config.id}`,
        config.status === "executing" ? `ribbot:check-autosell:${config.id}` : `ribbot:cancel-autosell:${config.id}`
      )
    ]);
    buttons.push([
      Markup.button.callback("Refresh", "ribbot:autosell"),
      Markup.button.callback("Menu", "ribbot:menu")
    ]);
    await ctx.reply(lines.join("\n"), Markup.inlineKeyboard(buttons));
  }
  async replyAddAutoSell(ctx, user, intent) {
    if (!intent.mint || !isSolanaMint(intent.mint) || !intent.sellPercent || intent.sellPercent <= 0 || intent.sellPercent > 100) {
      await ctx.reply(
        [
          "Usage:",
          "/autosell add <mint> <sell percent> [above|below <price>]"
        ].join("\n")
      );
      return;
    }
    if (intent.triggerDirection && !intent.triggerPrice || !intent.triggerDirection && intent.triggerPrice) {
      await ctx.reply(
        "Auto-sell trigger needs both above|below and a price."
      );
      return;
    }
    if (!user.solanaWalletAddress) {
      await ctx.reply(
        "Link or create a wallet with /wallet before staging auto sell."
      );
      return;
    }
    try {
      const storage = await storeAutoSellConfig({
        frogxApiBaseUrl: this.config.frogxApiBaseUrl,
        ftxApiToken: this.config.ftxApiToken,
        telegramUserId: user.telegramUserId,
        userPublicKey: user.solanaWalletAddress,
        mint: intent.mint,
        sellBps: Math.round(intent.sellPercent * 100),
        amountLabel: `${intent.sellPercent}%`,
        slippageBps: user.settings.slippageBps,
        priorityFeeLamports: user.settings.sellPriorityFeeLamports,
        triggerPrice: intent.triggerPrice,
        triggerDirection: intent.triggerDirection
      });
      if (storage.status === "not_configured") {
        await ctx.reply(
          [
            "FTX/FrogX auto-sell storage is not configured for Ribbot yet.",
            `Missing: ${(storage.required ?? []).join(", ") || "unknown"}`,
            "",
            "Ribbot did not store this rule."
          ].join("\n")
        );
        return;
      }
      const config = this.syncStoredAutoSellConfig(user, storage.config);
      await ctx.reply(
        [
          "Auto-sell rule stored through FTX/FrogX.",
          ...this.autoSellSummaryLines(config),
          "",
          ...storage.warnings.map((warning) => `Warning: ${warning}`),
          "",
          "This Telegram request did not start a monitor or execute a trade."
        ].join("\n"),
        Markup.inlineKeyboard([
          [
            Markup.button.callback("Auto Sell", "ribbot:autosell"),
            Markup.button.callback(
              "Cancel",
              `ribbot:cancel-autosell:${config.id}`
            )
          ]
        ])
      );
    } catch (error) {
      logger.warn("FTX/FrogX auto-sell storage failed", error);
      await ctx.reply(
        "FTX/FrogX could not store this auto-sell rule. Ribbot did not store it."
      );
    }
  }
  async replyHelp(ctx) {
    if (!this.config.spotEnabled) {
      await ctx.reply(
        [
          "Ribbot account commands",
          "/start - connect your Frog Trading Exchange account",
          "/farm - open your Delta Neutral farmer",
          "/status - check your Imperial Perps Wallet",
          ...this.config.nftTradingEnabled ? [
            "/frogs - view and trade Solana Business Frogs",
            "/buyfrog [max SOL] - buy the live floor Frog",
            "/sweepfrogs <count> [max SOL each] - buy up to 10",
            "/sellfrog <mint> [minimum SOL] - sell to the top offer"
          ] : [],
          "/account - refresh your Frog Trading Exchange account",
          "/reset - restart account setup",
          "/referral <code> - apply an invite code",
          "/menu - main menu",
          "",
          "More Ribbot features will appear here as they become available."
        ].join("\n"),
        Markup.inlineKeyboard([
          [Markup.button.callback("Connect Account", "ribbot:farm")],
          [Markup.button.callback("Menu", "ribbot:menu")]
        ])
      );
      return;
    }
    await ctx.reply(
      [
        "Ribbot trading commands",
        "/start - trading menu",
        "/wallet - wallet setup status",
        "/wallet select <number> - choose the active FTX wallet",
        "/account - refresh FTX account snapshot",
        "/referral - show referral code and tracking-only rewards",
        "/referral <code> - apply an invite code",
        "/buy <mint> <SOL> - create a buy ticket",
        "/sell <mint> <percent> - create a sell ticket",
        "/positions [page] - paginated holdings and trade actions",
        "/nfts [page] - NFTs held by the active FTX wallet",
        "/position <mint> - open one position",
        "/pnl - PNL and fill coverage",
        "/activity - recent FTX account events",
        "/cleanup - review dust, hidden, and unpriced token positions",
        "/safety <mint> - review mint/freeze authority and price signals",
        "/scan <mint> [SOL] - review safety, market cap, and quote impact",
        "/withdraw sol <amount SOL> <destination> - stage SOL withdrawal",
        "/withdraw <mint> <percent|all> <destination> - stage token withdrawal",
        "/withdrawals - staged withdrawals",
        "/limit buy <mint> <SOL> below <price> - stage a limit buy",
        "/limit sell <mint> <percent> above <price> - stage a limit sell",
        "/stop <mint> <percent> below <price> - stage a stop loss",
        "/trailing <mint> <sell percent> <trail percent> - stage a trailing stop",
        "/dca buy <mint> <total SOL> <orders> <interval minutes> - stage DCA",
        "/orders - staged limit, stop, trailing, and DCA orders",
        "/copytrade add <wallet> fixed <SOL> <min liq USD> [options]",
        "/copytrade add <wallet> percent <%> <max SOL> <min liq USD> [options]",
        "/copytrade pause|resume <config id>",
        "/copytrade edit <config id> key=value ...",
        "/copytrade duplicate <config id> [tag=name]",
        "/sniper add <source> <max SOL> <min liq USD> <max snipes> - stage sniper",
        "/autobuy instant on <SOL> <min liq USD> [max mcap USD] - buy pasted CAs",
        "/autobuy instant off - disable pasted-CA buys",
        "/autobuy add <mint> <max SOL> <min liq USD> - stage token rule",
        "/bundle add <mint> <SOL> <mint> <SOL> <min liq USD> - stage basket buy",
        "/autosell add <mint> <sell percent> [above|below <price>] - stage auto sell",
        "/watch <mint> - add a saved token mint",
        "/watchlist remove <mint> - remove a saved token mint",
        "/hide <mint> and /unhide <mint> - manage hidden token mints",
        "/settings - trade defaults",
        "",
        "Paste a Solana mint by itself to open a trade panel."
      ].join("\n"),
      Markup.inlineKeyboard([
        [Markup.button.callback("Menu", "ribbot:menu")]
      ])
    );
  }
  async replyUnknownCommand(ctx, command) {
    await ctx.reply(
      [
        `Unknown command: ${command}`,
        "",
        "Ribbot did not run a trade, stage anything, or forward this to chat.",
        "Use /help for the command list or /menu for buttons."
      ].join("\n"),
      Markup.inlineKeyboard([
        [
          Markup.button.callback("Help", "ribbot:help"),
          Markup.button.callback("Menu", "ribbot:menu")
        ]
      ])
    );
  }
  async replyUnknownAction(ctx) {
    await ctx.reply(
      [
        "That button is from an older Ribbot message and is no longer available.",
        "No trade was built, signed, or broadcast."
      ].join("\n"),
      Markup.inlineKeyboard([
        [Markup.button.callback("Menu", "ribbot:menu")]
      ])
    );
  }
  async replyBetaUnavailable(ctx) {
    await ctx.reply(
      [
        "That Ribbot feature is not available yet.",
        "Connect your Frog Trading Exchange account now and this same account will work as new features become available.",
        "",
        "No quote, order, signature, or transaction was created."
      ].join("\n"),
      Markup.inlineKeyboard([
        [Markup.button.callback("Connect Account", "ribbot:farm")],
        [Markup.button.callback("Menu", "ribbot:menu")]
      ])
    );
  }
  async replyToken(ctx, user, mint) {
    const currentUser = await this.refreshAccountSnapshot(user);
    if (currentUser.settings.instantAutoBuyEnabled) {
      await this.replyInstantAutoBuy(ctx, currentUser, mint);
      return;
    }
    await this.replyTokenActions(ctx, currentUser, mint);
  }
  async replyTokenActions(ctx, user, mint) {
    await ctx.reply(
      [
        `Token: ${shortAddress(mint)}`,
        `Wallet: ${user.solanaWalletAddress ? shortAddress(user.solanaWalletAddress) : "not linked"}`,
        `Mode: ${this.executionModeLabel()}`,
        "",
        this.config.tradingEnabled && !this.config.dryRun ? "Choose an action. Confirmed tickets route through FTX/FrogX, which owns live gates and Privy signing." : "Choose an action. Confirmed tickets stay dry-run; nothing is sent to FTX/FrogX until Ribbot live gates are enabled."
      ].join("\n"),
      Markup.inlineKeyboard([
        ...this.tradePresetRows(user, mint),
        [
          Markup.button.callback("Scan", `ribbot:scan:${mint}`),
          Markup.button.callback("Watch", `ribbot:watch:${mint}`)
        ],
        [Markup.button.callback("Menu", "ribbot:menu")]
      ])
    );
  }
  async replyInstantAutoBuy(ctx, user, mint) {
    const blocked = async (reason) => {
      await ctx.reply(
        [
          "Instant Auto Buy blocked by FTX/FrogX.",
          `Token: ${shortAddress(mint)}`,
          `Reason: ${reason}`,
          "No transaction was built, signed, or broadcast."
        ].join("\n")
      );
      await this.replyTokenActions(ctx, user, mint);
    };
    if (!user.solanaWalletAddress || user.walletSource !== "privy") {
      await blocked("Link or create an FTX-managed wallet first.");
      return;
    }
    const amountSol = user.settings.instantAutoBuyAmountSol;
    try {
      const review = await fetchMarketRisk({
        frogxApiBaseUrl: this.config.frogxApiBaseUrl,
        ftxApiToken: this.config.ftxApiToken,
        telegramUserId: user.telegramUserId,
        userPublicKey: user.solanaWalletAddress,
        mint,
        amountIn: solToLamports(amountSol),
        slippageBps: user.settings.slippageBps,
        priorityFeeLamports: user.settings.priorityFeeLamports,
        minLiquidityUsd: user.settings.instantAutoBuyMinLiquidityUsd,
        maxMarketCapUsd: user.settings.instantAutoBuyMaxMarketCapUsd,
        maxPriceImpactBps: Math.max(user.settings.slippageBps, 1500)
      });
      if (review.status === "not_configured") {
        await blocked(
          `market-risk checks need ${(review.required ?? []).join(", ") || "FTX quote configuration"}`
        );
        return;
      }
      const danger = review.risk.flags.find(
        (flag) => flag.severity === "danger"
      );
      if (danger) {
        await blocked(danger.message);
        return;
      }
      if (review.quoteProbe.status !== "ready") {
        await blocked(
          marketRiskQuoteBlockingReason(review.quoteProbe) ?? "FTX/FrogX quote verification did not complete."
        );
        return;
      }
      if (!review.quoteProbe.executable) {
        await blocked(
          "FTX/FrogX could not produce an executable quote."
        );
        return;
      }
      if (user.settings.instantAutoBuyMaxMarketCapUsd !== void 0 && review.marketCap.withinLimit !== true) {
        await blocked(
          "The configured market-cap limit could not be verified."
        );
        return;
      }
      await this.replyExecutionPreview(ctx, {
        side: "buy",
        user,
        mint,
        amountLabel: `${amountSol} SOL instant auto buy`,
        forceImmediate: true,
        executionMode: "instant_auto_buy"
      });
    } catch (error) {
      logger.warn("FTX/FrogX Instant Auto Buy precheck failed", error);
      await blocked("Market-risk checks are temporarily unavailable.");
    }
  }
  tradePresetRows(user, mint) {
    const buyRows = chunkButtons(
      user.settings.buyPresetsSol.map(
        (amount) => Markup.button.callback(
          `Buy ${formatPresetNumber(amount)} SOL`,
          `ribbot:buy:${mint}:${amount}`
        )
      )
    );
    const sellRows = chunkButtons(
      user.settings.sellPresetsPercent.map(
        (percent) => Markup.button.callback(
          `Sell ${formatPresetNumber(percent)}%`,
          `ribbot:sell:${mint}:${percent}`
        )
      )
    );
    return [...buyRows, ...sellRows];
  }
  async replyBuy(ctx, user, mint, amountSol) {
    if (!mint || !isSolanaMint(mint)) {
      await ctx.reply("Usage: /buy <token mint> <amount in SOL>");
      return;
    }
    const currentUser = await this.refreshAccountSnapshot(user);
    const amount = amountSol && amountSol > 0 ? amountSol : currentUser.settings.defaultBuySol;
    await this.replyExecutionPreview(ctx, {
      side: "buy",
      user: currentUser,
      mint,
      amountLabel: `${amount} SOL`
    });
  }
  async replySell(ctx, user, mint, percentage) {
    if (!mint || !isSolanaMint(mint)) {
      await ctx.reply("Usage: /sell <token mint> <percentage>");
      return;
    }
    const currentUser = await this.refreshAccountSnapshot(user);
    if (!currentUser.solanaWalletAddress) {
      await ctx.reply(
        "Link or create a wallet with /wallet before selling."
      );
      return;
    }
    const percent = percentage && percentage > 0 ? Math.min(percentage, 100) : 25;
    try {
      const positions = await fetchPositions({
        frogxApiBaseUrl: this.config.frogxApiBaseUrl,
        ftxApiToken: this.config.ftxApiToken,
        telegramUserId: currentUser.telegramUserId,
        userPublicKey: currentUser.solanaWalletAddress
      });
      if ("status" in positions) {
        await ctx.reply(
          [
            "FTX/FrogX positions are not configured yet.",
            `Missing: ${(positions.required ?? []).join(", ") || "unknown"}`,
            "",
            "Ribbot will not guess token balances for sells."
          ].join("\n")
        );
        return;
      }
      const token = positions.tokens.find((entry) => entry.mint === mint);
      if (!token || token.amount === "0") {
        await ctx.reply(
          [
            "No position found for that mint.",
            `Token: ${shortAddress(mint)}`,
            "",
            "Run /positions to refresh balances."
          ].join("\n")
        );
        return;
      }
      const amountIn = applyPercentage(token.amount, percent);
      if (amountIn === "0") {
        await ctx.reply(
          "Sell amount rounds to zero for this position."
        );
        return;
      }
      await this.replySellPreview(ctx, {
        user: currentUser,
        mint,
        percent,
        token,
        amountIn
      });
    } catch (error) {
      logger.warn("FTX/FrogX sell preview failed", error);
      await ctx.reply(
        "Sell preview is unavailable from FTX/FrogX right now."
      );
    }
  }
  async replySellPreview(ctx, input) {
    if (!input.user.solanaWalletAddress) return;
    const cannotExecute = !this.config.tradingEnabled || this.config.dryRun;
    let quote;
    const lines = [
      "Sell preview",
      `Token: ${shortAddress(input.mint)}`,
      `Balance: ${formatTokenBalance(input.token)}`,
      `Amount: ${input.percent}% (${formatRawTokenAmount(input.amountIn, input.token.decimals)})`,
      `Route: ${this.config.frogxApiBaseUrl}/api/frogx`,
      `Mode: ${this.executionModeLabel()}`
    ];
    if (this.config.quotePreviewsEnabled) {
      try {
        quote = await fetchQuote({
          frogxApiBaseUrl: this.config.frogxApiBaseUrl,
          inMint: input.mint,
          outMint: SOL_MINT3,
          amountIn: input.amountIn,
          userPublicKey: input.user.solanaWalletAddress,
          slippageBps: input.user.settings.slippageBps,
          priorityFeeLamports: input.user.settings.sellPriorityFeeLamports
        });
        lines.push("", "FrogX quote", ...formatQuoteLines(quote));
      } catch (error) {
        logger.warn("FrogX sell quote preview failed", error);
        lines.push(
          "",
          "FrogX quote unavailable right now. No transaction was sent."
        );
      }
    }
    lines.push(
      "",
      cannotExecute ? "No transaction was sent. Confirmation stays dry-run until Ribbot's live gates are enabled." : "Confirmation will ask FTX/FrogX to build and execute a fresh sell transaction through its Privy policy gate."
    );
    const order = this.store.createPendingOrder(input.user, {
      side: "sell",
      mint: input.mint,
      inMint: input.mint,
      outMint: SOL_MINT3,
      amountIn: input.amountIn,
      amountLabel: `${input.percent}% (${formatRawTokenAmount(input.amountIn, input.token.decimals)})`,
      walletAddress: input.user.solanaWalletAddress,
      slippageBps: input.user.settings.slippageBps,
      priorityFeeLamports: input.user.settings.sellPriorityFeeLamports,
      quote: quote ? {
        amountOut: quote.amountOut,
        priceImpactBps: quote.priceImpactBps,
        route: quote.routers.length > 0 ? quote.routers.join(" -> ") : "unknown",
        executable: quote.executable,
        updatedAt: quote.updatedAt
      } : void 0
    });
    lines.push(
      "",
      `Order ticket: ${order.id}`,
      `Expires: ${order.expiresAt}`
    );
    const confirmationRequired = requiresTradeConfirmation(
      input.user.settings,
      "sell",
      input.percent
    );
    if (!confirmationRequired) {
      lines.push(
        "",
        cannotExecute ? "Trade confirmation is off. Ribbot is recording this ticket as a dry run now." : "Trade confirmation is off. Ribbot is sending this ticket to FTX/FrogX now."
      );
      await ctx.reply(
        lines.join("\n"),
        Markup.inlineKeyboard([
          [
            Markup.button.callback("Positions", "ribbot:positions"),
            Markup.button.callback("Menu", "ribbot:menu")
          ]
        ])
      );
      await this.replyConfirmOrder(ctx, input.user, order.id);
      return;
    }
    await ctx.reply(
      lines.join("\n"),
      Markup.inlineKeyboard([
        [
          Markup.button.callback(
            "Confirm",
            `ribbot:confirm:${order.id}`
          ),
          Markup.button.callback(
            "Cancel",
            `ribbot:cancel:${order.id}`
          )
        ],
        [
          Markup.button.callback("Positions", "ribbot:positions"),
          Markup.button.callback("Menu", "ribbot:menu")
        ]
      ])
    );
  }
  async replyExecutionPreview(ctx, input) {
    const missingWallet = !input.user.solanaWalletAddress;
    const cannotExecute = missingWallet || !this.config.tradingEnabled || this.config.dryRun;
    let quote;
    const amountSol = input.side === "buy" ? parseAmountSol(input.amountLabel) : 0;
    const lines = [
      `${input.side === "buy" ? "Buy" : "Sell"} preview`,
      `Token: ${shortAddress(input.mint)}`,
      `Amount: ${input.amountLabel}`,
      `Route: ${this.config.frogxApiBaseUrl}/api/frogx`,
      `Mode: ${this.executionModeLabel()}`
    ];
    if (input.side === "buy" && input.user.solanaWalletAddress) {
      if (this.config.quotePreviewsEnabled && amountSol > 0) {
        try {
          quote = await fetchBuyQuote({
            frogxApiBaseUrl: this.config.frogxApiBaseUrl,
            outMint: input.mint,
            amountSol,
            userPublicKey: input.user.solanaWalletAddress,
            slippageBps: input.user.settings.slippageBps,
            priorityFeeLamports: input.user.settings.priorityFeeLamports
          });
          lines.push("", "FrogX quote", ...formatQuoteLines(quote));
        } catch (error) {
          logger.warn("FrogX quote preview failed", error);
          lines.push(
            "",
            "FrogX quote unavailable right now. No transaction was sent."
          );
        }
      }
    }
    if (missingWallet) {
      lines.push(
        "",
        "Link or create a wallet with /wallet before live trading."
      );
    }
    if (cannotExecute) {
      lines.push(
        "",
        "No transaction was sent. Confirmation stays dry-run until Ribbot's live gates are enabled."
      );
    } else {
      lines.push(
        "",
        "Confirmation will ask FTX/FrogX to build and execute a fresh swap transaction through its Privy policy gate."
      );
    }
    if (input.side === "buy" && input.user.solanaWalletAddress && amountSol > 0) {
      const order = this.store.createPendingOrder(input.user, {
        side: "buy",
        mint: input.mint,
        inMint: SOL_MINT3,
        outMint: input.mint,
        amountIn: solToLamports(amountSol),
        amountLabel: input.amountLabel,
        walletAddress: input.user.solanaWalletAddress,
        slippageBps: input.user.settings.slippageBps,
        priorityFeeLamports: input.user.settings.priorityFeeLamports,
        executionMode: input.executionMode,
        quote: quote ? {
          amountOut: quote.amountOut,
          priceImpactBps: quote.priceImpactBps,
          route: quote.routers.length > 0 ? quote.routers.join(" -> ") : "unknown",
          executable: quote.executable,
          updatedAt: quote.updatedAt
        } : void 0
      });
      lines.push(
        "",
        `Order ticket: ${order.id}`,
        `Expires: ${order.expiresAt}`
      );
      const confirmationRequired = !input.forceImmediate && requiresTradeConfirmation(input.user.settings, "buy");
      if (!confirmationRequired) {
        lines.push(
          "",
          cannotExecute ? "Trade confirmation is off. Ribbot is recording this ticket as a dry run now." : "Trade confirmation is off. Ribbot is sending this ticket to FTX/FrogX now."
        );
        await ctx.reply(
          lines.join("\n"),
          Markup.inlineKeyboard([
            [
              Markup.button.callback(
                "Watch",
                `ribbot:watch:${input.mint}`
              ),
              Markup.button.callback("Menu", "ribbot:menu")
            ]
          ])
        );
        await this.replyConfirmOrder(ctx, input.user, order.id);
        return;
      }
      await ctx.reply(
        lines.join("\n"),
        Markup.inlineKeyboard([
          [
            Markup.button.callback(
              "Confirm",
              `ribbot:confirm:${order.id}`
            ),
            Markup.button.callback(
              "Cancel",
              `ribbot:cancel:${order.id}`
            )
          ],
          [
            Markup.button.callback(
              "Watch",
              `ribbot:watch:${input.mint}`
            ),
            Markup.button.callback("Menu", "ribbot:menu")
          ]
        ])
      );
      return;
    }
    await ctx.reply(lines.join("\n"));
  }
  async replyConfirmOrder(ctx, user, orderId) {
    if (!orderId) {
      await ctx.reply("Order ticket missing.");
      return;
    }
    const order = this.store.getPendingOrder(user, orderId);
    if (!order) {
      await ctx.reply(
        "Order ticket not found. Create a fresh order with /buy."
      );
      return;
    }
    if (order.status === "cancelled") {
      await ctx.reply("Order ticket was already cancelled.");
      return;
    }
    if (order.status === "swap_built") {
      await ctx.reply("Swap was already built for this order ticket.");
      return;
    }
    if (order.status === "executed") {
      await ctx.reply(
        [
          "Order was already executed.",
          ...this.orderSummaryLines(order),
          order.execution?.signature ? `Signature: ${order.execution.signature}` : void 0,
          order.execution?.solscanUrl ? `Solscan: ${order.execution.solscanUrl}` : void 0
        ].filter(Boolean).join("\n")
      );
      return;
    }
    if (order.status === "execution_pending") {
      await this.replyCheckOrderStatus(ctx, user, order.id);
      return;
    }
    if (order.status === "execution_failed") {
      await ctx.reply(
        [
          "This swap attempt ended in a terminal failure.",
          ...this.orderSummaryLines(order),
          order.reconciliation?.error,
          "Create a fresh order ticket before trying again."
        ].filter(Boolean).join("\n"),
        this.orderExecutionKeyboard(order.id, false)
      );
      return;
    }
    if (new Date(order.expiresAt).getTime() < Date.now()) {
      this.store.cancelPendingOrder(user, order.id);
      await ctx.reply(
        "Order ticket expired. Create a fresh order with /buy."
      );
      return;
    }
    if (!this.config.tradingEnabled || this.config.dryRun) {
      this.store.markDryRun(user, order.id);
      await ctx.reply(
        [
          "Dry-run confirmation recorded.",
          ...this.orderSummaryLines(order),
          "",
          "No swap was built, signed, or broadcast. Ribbot's live gates are off, so this confirmation was not sent to FTX/FrogX."
        ].join("\n"),
        this.menuKeyboard()
      );
      return;
    }
    try {
      const execution = await executeSwapTransaction({
        frogxApiBaseUrl: this.config.frogxApiBaseUrl,
        ftxApiToken: this.config.ftxApiToken,
        orderId: order.id,
        telegramUserId: user.telegramUserId,
        userPublicKey: order.walletAddress,
        inMint: order.inMint,
        outMint: order.outMint,
        amountIn: order.amountIn,
        slippageBps: order.slippageBps,
        priorityFeeLamports: order.priorityFeeLamports,
        executionMode: order.executionMode
      });
      if (execution.status === "not_configured") {
        await ctx.reply(
          [
            "FTX/FrogX live execution is not configured for Ribbot yet.",
            `Missing: ${(execution.required ?? []).join(", ") || "unknown"}`,
            "",
            "No transaction was signed or broadcast."
          ].join("\n"),
          this.orderExecutionKeyboard(order.id, false)
        );
        return;
      }
      if (execution.status === "not_executable") {
        await ctx.reply(
          [
            "FTX/FrogX rejected this swap before confirming execution.",
            ...this.orderSummaryLines(order),
            "",
            execution.error ?? "No transaction was signed or broadcast."
          ].join("\n"),
          this.orderExecutionKeyboard(order.id, false)
        );
        return;
      }
      if (execution.status === "pending_reconciliation") {
        const reconciliation = this.store.markExecutionPending(
          user,
          order.id,
          {
            status: "pending",
            referenceId: execution.referenceId,
            transactionId: execution.transactionId,
            executionStartedAt: execution.executionStartedAt,
            checkedAt: (/* @__PURE__ */ new Date()).toISOString(),
            error: execution.error,
            manualReviewRequired: execution.manualReviewRequired,
            manualReviewAfter: execution.manualReviewAfter,
            manualReviewRequiredAt: execution.manualReviewRequiredAt,
            manualReviewReason: execution.manualReviewReason
          }
        );
        await ctx.reply(
          [
            "Swap status is not confirmed yet.",
            ...this.orderSummaryLines(reconciliation ?? order),
            "",
            execution.error,
            this.manualReviewRecoveryLine(execution),
            "Do not confirm this ticket again. Check status instead; the check never resends the swap."
          ].join("\n"),
          this.orderExecutionKeyboard(order.id, true)
        );
        return;
      }
      const updated = this.store.markExecuted(user, order.id, {
        signature: execution.signature,
        transactionId: execution.transactionId,
        referenceId: execution.referenceId,
        solscanUrl: execution.solscanUrl,
        executedAt: execution.executedAt
      });
      await ctx.reply(
        [
          "FTX/FrogX executed the swap through Privy.",
          ...this.orderSummaryLines(updated ?? order),
          `Signature: ${execution.signature}`,
          execution.solscanUrl ? `Solscan: ${execution.solscanUrl}` : void 0,
          execution.transactionId ? `Privy tx: ${execution.transactionId}` : void 0
        ].filter(Boolean).join("\n"),
        this.orderExecutionKeyboard(order.id, false)
      );
    } catch (error) {
      logger.warn("FTX/FrogX swap execution failed", error);
      this.store.markExecutionPending(user, order.id, {
        status: "lookup_error",
        checkedAt: (/* @__PURE__ */ new Date()).toISOString(),
        error: "Ribbot lost contact with FTX after requesting execution."
      });
      await ctx.reply(
        [
          "Swap status is unknown because Ribbot lost contact with FTX.",
          "Do not confirm this ticket again. Check status; FTX will query Privy without resending the swap."
        ].join("\n"),
        this.orderExecutionKeyboard(order.id, true)
      );
    }
  }
  async replyCheckOrderStatus(ctx, user, orderId) {
    if (!orderId) {
      await ctx.reply("Order ticket missing.", this.menuKeyboard());
      return;
    }
    const order = this.store.getPendingOrder(user, orderId);
    if (!order) {
      await ctx.reply("Order ticket not found.", this.menuKeyboard());
      return;
    }
    try {
      const result = await fetchSwapExecutionStatus({
        frogxApiBaseUrl: this.config.frogxApiBaseUrl,
        ftxApiToken: this.config.ftxApiToken,
        orderId: order.id,
        telegramUserId: user.telegramUserId,
        userPublicKey: order.walletAddress,
        inMint: order.inMint,
        outMint: order.outMint,
        amountIn: order.amountIn,
        slippageBps: order.slippageBps,
        priorityFeeLamports: order.priorityFeeLamports
      });
      if (result.status === "not_configured") {
        await ctx.reply(
          [
            "FTX swap status lookup is not configured.",
            `Missing: ${(result.required ?? []).join(", ") || "unknown"}`,
            "The ticket remains locked because its execution state is not proven."
          ].join("\n"),
          this.orderExecutionKeyboard(order.id, true)
        );
        return;
      }
      if (result.status === "executed") {
        const updated = this.store.markExecuted(user, order.id, {
          signature: result.signature,
          transactionId: result.transactionId,
          referenceId: result.referenceId,
          solscanUrl: result.solscanUrl,
          executedAt: result.executedAt
        });
        await ctx.reply(
          [
            "FTX confirmed the swap through Privy.",
            ...this.orderSummaryLines(updated ?? order),
            `Provider status: ${result.providerStatus ?? "confirmed"}`,
            `Signature: ${result.signature}`,
            result.solscanUrl ? `Solscan: ${result.solscanUrl}` : void 0
          ].filter(Boolean).join("\n"),
          this.orderExecutionKeyboard(order.id, false)
        );
        return;
      }
      if (result.status === "failed") {
        const failed = this.store.markExecutionFailed(
          user,
          order.id,
          this.reconciliationRecord(result, "failed")
        );
        await ctx.reply(
          [
            "FTX confirmed this swap failed.",
            ...this.orderSummaryLines(failed ?? order),
            `Provider status: ${result.providerStatus ?? "failed"}`,
            result.error,
            "No automatic retry was sent. Create a fresh order ticket if you still want to trade."
          ].filter(Boolean).join("\n"),
          this.orderExecutionKeyboard(order.id, false)
        );
        return;
      }
      const pendingStatus = result.status === "not_found" ? "not_found" : "lookup_error";
      const pending = this.store.markExecutionPending(
        user,
        order.id,
        this.reconciliationRecord(
          result,
          result.status === "pending" ? "pending" : pendingStatus
        )
      );
      await ctx.reply(
        [
          "Swap is still awaiting a terminal Privy status.",
          ...this.orderSummaryLines(pending ?? order),
          result.providerStatus ? `Provider status: ${result.providerStatus}` : void 0,
          result.error,
          this.manualReviewRecoveryLine(result),
          "No transaction was resent. Check again later."
        ].filter(Boolean).join("\n"),
        this.orderExecutionKeyboard(order.id, true)
      );
    } catch (error) {
      logger.warn("FTX/FrogX swap status lookup failed", error);
      this.store.markExecutionPending(user, order.id, {
        status: "lookup_error",
        checkedAt: (/* @__PURE__ */ new Date()).toISOString(),
        error: "Ribbot could not reach FTX for a read-only status check."
      });
      await ctx.reply(
        [
          "Swap status lookup is unavailable.",
          "The ticket remains locked and no swap was resent."
        ].join("\n"),
        this.orderExecutionKeyboard(order.id, true)
      );
    }
  }
  async replyCancelOrder(ctx, user, orderId) {
    if (!orderId) {
      await ctx.reply("Order ticket missing.");
      return;
    }
    const existing = this.store.getPendingOrder(user, orderId);
    if (existing?.status === "execution_pending") {
      await ctx.reply(
        "This order cannot be cancelled while Privy status is unresolved. Check status instead; no swap will be resent.",
        this.orderExecutionKeyboard(orderId, true)
      );
      return;
    }
    if (existing?.status === "executed") {
      await ctx.reply(
        "This order already executed and cannot be cancelled.",
        this.orderExecutionKeyboard(orderId, false)
      );
      return;
    }
    const order = this.store.cancelPendingOrder(user, orderId);
    if (!order) {
      await ctx.reply("Order ticket not found.");
      return;
    }
    await ctx.reply(
      ["Order cancelled.", ...this.orderSummaryLines(order)].join("\n")
    );
  }
  executionModeLabel() {
    if (!this.config.tradingEnabled) return "disabled";
    if (this.config.dryRun) return "dry-run";
    return "ftx-routed";
  }
  watchlistText(user) {
    if (user.watchlist.length === 0) {
      return "Your watchlist is empty. Paste a token mint and tap Watch.";
    }
    return [
      "Watchlist",
      ...user.watchlist.map(
        (mint, index) => `${index + 1}. ${shortAddress(mint)}`
      )
    ].join("\n");
  }
  referralSummaryLines(user) {
    const summary = user.referralSummary;
    const referralCode = summary?.referralCode ?? user.referralCode;
    if (!referralCode) {
      return [
        "Referral code: pending",
        "FTX/FrogX has not returned a referral code yet."
      ];
    }
    return [
      `Code: ${referralCode}`,
      `Invite command: /start ${referralCode}`,
      `Referred users: ${summary?.referredUsers ?? 0}`,
      `Reward status: ${summary?.rewardStatus ?? "tracking_only"}`,
      "Claimable rewards: none",
      user.referredByCode ? `Your referrer: ${user.referredByCode}` : "Your referrer: none",
      "",
      "Rewards are tracking-only right now. FTX/FrogX has not enabled fee-share, token payout, claimable balance, signing, or transfer from this flow.",
      ...(summary?.warnings ?? []).map(
        (warning) => `Warning: ${warning}`
      )
    ];
  }
  activityEventLines(event, index) {
    const label = activityEventLabel(event.eventType);
    const detail = activityEventDetail(event);
    return [
      `${index + 1}. ${label}`,
      detail ? `   ${detail}` : void 0,
      `   ${event.createdAt}`
    ].filter((line) => Boolean(line));
  }
  hiddenTokensText(user) {
    if (user.hiddenTokens.length === 0) {
      return "Your hidden-token list is empty. Use /hide <mint> to hide noisy positions.";
    }
    return [
      "Hidden tokens",
      ...user.hiddenTokens.map(
        (mint, index) => `${index + 1}. ${shortAddress(mint)}`
      )
    ].join("\n");
  }
  accountDashboardLines(user, sourceLabel, ftxUpdatedAt) {
    const wallet = user.solanaWalletAddress ? shortAddress(user.solanaWalletAddress) : "not linked";
    const walletSource = user.walletSource === "privy" ? "FTX Privy-managed" : user.walletSource === "external" ? "quote-only external" : "not set";
    const access = user.botAccessRevokedAt ? `revoked ${user.botAccessRevokedAt}` : "active";
    const claim = user.walletClaimRequestedAt ? `requested ${user.walletClaimRequestedAt}` : "not requested";
    const exportRequest = user.walletExportRequestedAt ? `requested ${user.walletExportRequestedAt}` : "not requested";
    return [
      "Ribbot account",
      `Source: ${sourceLabel}`,
      `Telegram ID: ${user.telegramUserId}`,
      `Username: ${user.username || "unknown"}`,
      `Wallet: ${wallet}`,
      `Wallet source: ${walletSource}`,
      `Wallet slots: ${user.wallets?.length ?? (user.solanaWalletAddress ? 1 : 0)}`,
      `Bot access: ${access}`,
      `Claim handoff: ${claim}`,
      `Export handoff: ${exportRequest}`,
      "",
      "Settings",
      `Interface: ${user.settings.botMode}`,
      `Default buy: ${user.settings.defaultBuySol} SOL`,
      `Buy presets: ${user.settings.buyPresetsSol.join(", ")} SOL`,
      `Sell presets: ${user.settings.sellPresetsPercent.join(", ")}%`,
      `Slippage: ${user.settings.slippageBps / 100}%`,
      `Priority fee: ${user.settings.priorityFeeLamports} lamports`,
      `Sell priority fee: ${user.settings.sellPriorityFeeLamports} lamports`,
      `Confirm trades: ${user.settings.confirmTrades ? "on" : "off"}`,
      `Sell protection: ${user.settings.sellProtection ? "on" : "off"}`,
      `MEV protection: ${user.settings.mevProtection ? "on" : "off"}`,
      `Auto buy: ${user.settings.autoBuyEnabled ? "on" : "off"}`,
      `Instant CA buy: ${user.settings.instantAutoBuyEnabled ? `${user.settings.instantAutoBuyAmountSol} SOL` : "off"}`,
      `Instant CA minimum liquidity: ${formatUsd(user.settings.instantAutoBuyMinLiquidityUsd)}`,
      `Instant CA maximum market cap: ${formatUsd(user.settings.instantAutoBuyMaxMarketCapUsd)}`,
      `Auto sell: ${user.settings.autoSellEnabled ? "on" : "off"}`,
      `Sniper: ${user.settings.sniperEnabled ? "on" : "off"}`,
      "",
      "Saved lists",
      `Watchlist: ${user.watchlist.length}`,
      `Hidden tokens: ${user.hiddenTokens.length}`,
      `Referral code: ${user.referralCode ?? "pending"}`,
      ftxUpdatedAt ? `FTX updated: ${ftxUpdatedAt}` : void 0,
      `Local cache updated: ${user.updatedAt}`
    ].filter((line) => Boolean(line));
  }
  orderSummaryLines(order) {
    return [
      `Order: ${order.id}`,
      `Status: ${order.status}`,
      `Side: ${order.side}`,
      `Token: ${shortAddress(order.mint)}`,
      `Amount: ${order.amountLabel}`,
      `Wallet: ${shortAddress(order.walletAddress)}`,
      order.reconciliation ? `Execution check: ${order.reconciliation.status} at ${order.reconciliation.checkedAt}` : void 0,
      ...this.manualReviewSummaryLines(order.reconciliation)
    ].filter((line) => Boolean(line));
  }
  withdrawalTicketSummaryLines(ticket) {
    return [
      `Ticket: ${ticket.id}`,
      `Status: ${ticket.status}`,
      `Asset: ${ticket.assetType === "sol" ? "SOL" : shortAddress(ticket.mint)}`,
      `Amount: ${ticket.amountLabel}`,
      `From: ${shortAddress(ticket.walletAddress)}`,
      `To: ${shortAddress(ticket.destinationAddress)}`,
      ticket.reconciliation ? `Execution check: ${ticket.reconciliation.status} at ${ticket.reconciliation.checkedAt}` : void 0,
      ...this.manualReviewSummaryLines(ticket.reconciliation)
    ].filter((line) => Boolean(line));
  }
  manualReviewSummaryLines(review) {
    if (!review) return [];
    const required = review.manualReviewRequired || Boolean(review.manualReviewRequiredAt);
    const lines = [];
    if (required) {
      lines.push(
        review.manualReviewRequiredAt ? `Manual review: required since ${review.manualReviewRequiredAt}` : "Manual review: required"
      );
    } else if (review.manualReviewAfter) {
      lines.push(
        `Manual review deadline: ${review.manualReviewAfter} if still unresolved`
      );
    }
    if (review.manualReviewReason) {
      lines.push(`Review reason: ${review.manualReviewReason}`);
    }
    return lines;
  }
  manualReviewRecoveryLine(review) {
    if (!review?.manualReviewRequired && !review?.manualReviewRequiredAt) {
      return void 0;
    }
    return "Keep this execution locked. Do not confirm, cancel, or retry it; inspect the execution record in FTX and Privy.";
  }
  advancedMonitorSummaryLines(monitor) {
    if (!monitor) return [];
    const lines = [];
    if (monitor.executedCount !== void 0) {
      lines.push(`Executions: ${monitor.executedCount}`);
    }
    if (monitor.reconciliationStatus) {
      lines.push(`Privy status: ${monitor.reconciliationStatus}`);
    } else if (monitor.executionStartedAt && !monitor.executionCompletedAt) {
      lines.push("Privy status: awaiting reconciliation");
    }
    if (monitor.executionSignature) {
      lines.push(
        `Signature: ${shortAddress(monitor.executionSignature)}`
      );
    }
    if (monitor.reconciliationCheckedAt) {
      lines.push(`Checked: ${monitor.reconciliationCheckedAt}`);
    }
    lines.push(...this.manualReviewSummaryLines(monitor));
    if (monitor.lastError) {
      lines.push(`Execution note: ${monitor.lastError}`);
    }
    return lines;
  }
  copyTradeSummaryLines(config) {
    const lines = [
      `Config: ${config.id}`,
      ...config.tag ? [`Tag: ${config.tag}`] : [],
      `Status: ${config.status}`,
      `Target: ${shortAddress(config.targetWallet)}`,
      `Sizing: ${config.amountLabel}`,
      `Min liquidity: $${config.minLiquidityUsd}`,
      `Copy sells: ${config.copySells ? "yes" : "no"}`,
      `Duplicate buys: ${config.duplicateBuys ? "yes" : "no"}`,
      `Only renounced: ${config.onlyRenounced ? "yes" : "no"}`,
      `Exclude Pump bonding curve: ${config.excludePumpFunTokens ? "yes" : "no"}`,
      `Slippage: ${config.slippageBps / 100}%`,
      `Fees: buy ${config.priorityFeeLamports} / sell ${config.sellPriorityFeeLamports} lamports`
    ];
    if (config.minTargetBuyAmountIn) {
      lines.push(
        `Min target buy: ${lamportsToSol(config.minTargetBuyAmountIn)} SOL`
      );
    }
    if (config.minMarketCapUsd) {
      lines.push(`Min market cap: $${config.minMarketCapUsd}`);
    }
    if (config.maxMarketCapUsd) {
      lines.push(`Max market cap: $${config.maxMarketCapUsd}`);
    }
    if (config.blacklistMints.length > 0) {
      lines.push(`Blacklist: ${config.blacklistMints.length} tokens`);
    }
    if (config.monitor?.lastObservedMint) {
      lines.push(
        `Last launch: ${config.monitor.launchSymbol ?? shortAddress(config.monitor.lastObservedMint)}`
      );
    }
    if (config.monitor?.launchpad) {
      lines.push(`Launchpad: ${config.monitor.launchpad}`);
    }
    if (config.monitor?.launchLiquidityUsd !== void 0) {
      lines.push(
        `Launch liquidity: $${config.monitor.launchLiquidityUsd.toLocaleString()}`
      );
    }
    if (config.monitor?.launchMarketCapUsd !== void 0) {
      lines.push(
        `Launch market cap: $${config.monitor.launchMarketCapUsd.toLocaleString()}`
      );
    }
    if (config.monitor?.launchOrganicScore !== void 0) {
      lines.push(`Organic score: ${config.monitor.launchOrganicScore}`);
    }
    lines.push(...this.advancedMonitorSummaryLines(config.monitor));
    return lines;
  }
  sniperSummaryLines(config) {
    const lines = [
      `Config: ${config.id}`,
      `Status: ${config.status}`,
      `Source: ${config.source}`,
      `Max buy: ${config.amountLabel}`,
      `Min liquidity: $${config.minLiquidityUsd}`,
      `Max snipes: ${config.maxSnipes}`,
      `Slippage: ${config.slippageBps / 100}%`
    ];
    if (config.maxMarketCapUsd) {
      lines.push(`Max market cap: $${config.maxMarketCapUsd}`);
    }
    lines.push(...this.advancedMonitorSummaryLines(config.monitor));
    return lines;
  }
  autoBuySummaryLines(config) {
    const lines = [
      `Rule: ${config.id}`,
      `Status: ${config.status}`,
      `Token: ${shortAddress(config.mint)}`,
      `Max buy: ${config.amountLabel}`,
      `Min liquidity: $${config.minLiquidityUsd}`,
      `Slippage: ${config.slippageBps / 100}%`
    ];
    if (config.maxMarketCapUsd) {
      lines.push(`Max market cap: $${config.maxMarketCapUsd}`);
    }
    lines.push(...this.advancedMonitorSummaryLines(config.monitor));
    return lines;
  }
  bundleBuySummaryLines(config) {
    const lines = [
      `Basket: ${config.id}`,
      `Status: ${config.status}`,
      `Tokens: ${config.items.length}`,
      `Max total: ${config.amountLabel}`,
      `Min liquidity: $${config.minLiquidityUsd}`,
      `Slippage: ${config.slippageBps / 100}%`,
      ...config.items.slice(0, 5).map(
        (item, index) => `${index + 1}. ${shortAddress(item.mint)} - ${item.amountLabel}`
      )
    ];
    if (config.items.length > 5) {
      lines.push(`...and ${config.items.length - 5} more tokens`);
    }
    if (config.maxMarketCapUsd) {
      lines.push(`Max market cap: $${config.maxMarketCapUsd}`);
    }
    if (config.execution) {
      lines.push(
        `Execution: ${config.execution.confirmedItems}/${config.execution.totalItems} confirmed (${config.execution.attemptedItems} attempted)`,
        `Checked: ${config.execution.checkedAt}`
      );
      if (config.execution.error) {
        lines.push(`Execution note: ${config.execution.error}`);
      }
      lines.push(...this.manualReviewSummaryLines(config.execution));
    }
    return lines;
  }
  bundleExecutionRecord(result, fallbackTotalItems) {
    const executions = result.executions ?? [];
    return {
      attemptedItems: result.attemptedItems ?? executions.length,
      confirmedItems: result.confirmedItems ?? executions.length,
      totalItems: result.totalItems ?? fallbackTotalItems,
      checkedAt: result.checkedAt ?? result.executedAt ?? (/* @__PURE__ */ new Date()).toISOString(),
      error: result.error,
      manualReviewRequired: result.manualReviewRequired,
      manualReviewAfter: result.manualReviewAfter,
      manualReviewRequiredAt: result.manualReviewRequiredAt,
      manualReviewReason: result.manualReviewReason,
      executions
    };
  }
  bundleBuyExecutionLine(item, index) {
    return [
      `${index + 1}. ${shortAddress(item.mint)}`,
      `${lamportsToSol(item.amountIn).toFixed(4)} SOL`,
      item.signature ? `sig ${shortAddress(item.signature)}` : void 0
    ].filter(Boolean).join(" ");
  }
  autoSellSummaryLines(config) {
    const lines = [
      `Rule: ${config.id}`,
      `Status: ${config.status}`,
      `Token: ${shortAddress(config.mint)}`,
      `Sell: ${config.amountLabel}`,
      `Slippage: ${config.slippageBps / 100}%`
    ];
    if (config.triggerPrice && config.triggerDirection) {
      lines.push(
        `Trigger: ${config.triggerDirection} $${config.triggerPrice}`
      );
    }
    lines.push(...this.advancedMonitorSummaryLines(config.monitor));
    return lines;
  }
  syncStoredAutomationOrder(user, stored) {
    return this.store.upsertAutomationOrder(user, {
      id: stored.orderId,
      kind: stored.kind,
      side: stored.side,
      status: stored.status,
      mint: stored.mint,
      inMint: stored.inMint,
      outMint: stored.outMint,
      amountIn: stored.amountIn,
      amountLabel: stored.amountLabel ?? stored.amountIn,
      walletAddress: stored.walletAddress,
      slippageBps: stored.slippageBps,
      priorityFeeLamports: stored.priorityFee,
      createdAt: stored.createdAt,
      updatedAt: stored.updatedAt,
      validation: stored.validation,
      triggerPrice: stored.triggerPrice,
      triggerDirection: stored.triggerDirection,
      orderCount: stored.orderCount,
      intervalMinutes: stored.intervalMinutes,
      perOrderAmountIn: stored.perOrderAmountIn,
      trailingBps: stored.trailingBps,
      scheduler: stored.scheduler
    });
  }
  syncStoredCopyTradeConfig(user, stored) {
    return this.store.upsertCopyTradeConfig(user, {
      id: stored.configId,
      status: stored.status,
      tag: stored.tag,
      targetWallet: stored.targetWallet,
      walletAddress: stored.walletAddress,
      buyMode: stored.buyMode ?? "percentage",
      buyPercentageBps: stored.buyPercentageBps ?? 1e4,
      maxBuyAmountIn: stored.maxBuyAmountIn,
      amountLabel: stored.amountLabel ?? stored.maxBuyAmountIn,
      slippageBps: stored.slippageBps,
      priorityFeeLamports: stored.priorityFee,
      sellPriorityFeeLamports: stored.sellPriorityFee ?? stored.priorityFee,
      copySells: stored.copySells,
      duplicateBuys: stored.duplicateBuys ?? true,
      onlyRenounced: stored.onlyRenounced ?? false,
      excludePumpFunTokens: stored.excludePumpFunTokens ?? false,
      minTargetBuyAmountIn: stored.minTargetBuyAmountIn,
      minLiquidityUsd: stored.minLiquidityUsd,
      minMarketCapUsd: stored.minMarketCapUsd,
      maxMarketCapUsd: stored.maxMarketCapUsd,
      blacklistMints: [...stored.blacklistMints ?? []],
      createdAt: stored.createdAt,
      updatedAt: stored.updatedAt,
      validation: stored.validation,
      monitor: stored.monitor
    });
  }
  syncStoredSniperConfig(user, stored) {
    return this.store.upsertSniperConfig(user, {
      id: stored.configId,
      status: stored.status,
      source: stored.source,
      walletAddress: stored.walletAddress,
      maxBuyAmountIn: stored.maxBuyAmountIn,
      amountLabel: stored.amountLabel ?? stored.maxBuyAmountIn,
      slippageBps: stored.slippageBps,
      priorityFeeLamports: stored.priorityFee,
      minLiquidityUsd: stored.minLiquidityUsd,
      maxMarketCapUsd: stored.maxMarketCapUsd,
      maxSnipes: stored.maxSnipes,
      createdAt: stored.createdAt,
      updatedAt: stored.updatedAt,
      validation: stored.validation,
      monitor: stored.monitor
    });
  }
  syncStoredAutoBuyConfig(user, stored) {
    return this.store.upsertAutoBuyConfig(user, {
      id: stored.configId,
      status: stored.status,
      mint: stored.mint,
      walletAddress: stored.walletAddress,
      maxBuyAmountIn: stored.maxBuyAmountIn,
      amountLabel: stored.amountLabel ?? stored.maxBuyAmountIn,
      slippageBps: stored.slippageBps,
      priorityFeeLamports: stored.priorityFee,
      minLiquidityUsd: stored.minLiquidityUsd,
      maxMarketCapUsd: stored.maxMarketCapUsd,
      createdAt: stored.createdAt,
      updatedAt: stored.updatedAt,
      validation: stored.validation,
      monitor: stored.monitor
    });
  }
  syncStoredBundleBuyConfig(user, stored) {
    const items = (stored.bundleItems ?? stored.items ?? []).map(
      (item) => ({
        mint: item.mint,
        maxBuyAmountIn: item.maxBuyAmountIn,
        amountLabel: item.amountLabel ?? item.maxBuyAmountIn
      })
    );
    const cached = this.store.listBundleBuyConfigs(user).find((config) => config.id === stored.configId);
    const monitor = stored.monitor;
    const hasExecutionState = stored.status === "executing" || stored.status === "failed" || stored.status === "executed";
    const execution = hasExecutionState ? {
      attemptedItems: monitor?.bundleAttemptedItems ?? cached?.execution?.attemptedItems ?? 0,
      confirmedItems: monitor?.bundleConfirmedItems ?? cached?.execution?.confirmedItems ?? 0,
      totalItems: items.length,
      checkedAt: monitor?.reconciliationCheckedAt ?? monitor?.executionCompletedAt ?? monitor?.executionStartedAt ?? stored.updatedAt,
      error: monitor?.lastError,
      manualReviewRequired: Boolean(
        monitor?.manualReviewRequiredAt
      ),
      manualReviewAfter: monitor?.manualReviewAfter,
      manualReviewRequiredAt: monitor?.manualReviewRequiredAt,
      manualReviewReason: monitor?.manualReviewReason,
      executions: cached?.execution?.executions ?? []
    } : void 0;
    return this.store.upsertBundleBuyConfig(user, {
      id: stored.configId,
      status: stored.status,
      items,
      walletAddress: stored.walletAddress,
      maxBuyAmountIn: stored.maxBuyAmountIn,
      amountLabel: stored.amountLabel ?? stored.maxBuyAmountIn,
      slippageBps: stored.slippageBps,
      priorityFeeLamports: stored.priorityFee,
      minLiquidityUsd: stored.minLiquidityUsd,
      maxMarketCapUsd: stored.maxMarketCapUsd,
      createdAt: stored.createdAt,
      updatedAt: stored.updatedAt,
      validation: stored.validation,
      ...execution ? { execution } : {}
    });
  }
  syncStoredAutoSellConfig(user, stored) {
    return this.store.upsertAutoSellConfig(user, {
      id: stored.configId,
      status: stored.status,
      mint: stored.mint,
      walletAddress: stored.walletAddress,
      sellBps: stored.sellBps,
      amountLabel: stored.amountLabel ?? `${stored.sellBps / 100}%`,
      slippageBps: stored.slippageBps,
      priorityFeeLamports: stored.priorityFee,
      triggerPrice: stored.triggerPrice,
      triggerDirection: stored.triggerDirection,
      createdAt: stored.createdAt,
      updatedAt: stored.updatedAt,
      validation: stored.validation,
      monitor: stored.monitor
    });
  }
  automationOrderTitle(order) {
    return `${order.kind.toUpperCase()} ${order.side} ${shortAddress(order.mint)}`;
  }
  automationOrderSummaryLines(order) {
    const lines = [
      `Order: ${order.id}`,
      `Status: ${order.status}`,
      `Token: ${shortAddress(order.mint)}`,
      `Amount: ${order.amountLabel}`,
      `Wallet: ${shortAddress(order.walletAddress)}`,
      `Slippage: ${order.slippageBps / 100}%`
    ];
    if (order.kind === "limit") {
      lines.push(
        `Trigger: ${order.triggerDirection ?? "unknown"} ${order.triggerPrice ?? "unknown"}`
      );
    }
    if (order.kind === "stop") {
      lines.push(
        `Stop trigger: ${order.triggerDirection ?? "unknown"} ${order.triggerPrice ?? "unknown"}`
      );
    }
    if (order.kind === "trailing") {
      lines.push(`Trail: ${formatBps(order.trailingBps)} from peak`);
    }
    if (order.kind === "dca") {
      lines.push(
        `Schedule: ${order.orderCount ?? "?"} orders every ${order.intervalMinutes ?? "?"} minutes`
      );
      if (order.scheduler?.executedCount !== void 0) {
        lines.push(
          `Progress: ${order.scheduler.executedCount}/${order.orderCount ?? "?"} slices executed`
        );
      }
      if (order.scheduler?.nextRunAt && order.status === "staged") {
        lines.push(`Next slice: ${order.scheduler.nextRunAt}`);
      }
      if (order.perOrderAmountIn) {
        lines.push(
          `Per order: ${order.perOrderAmountIn} raw input units`
        );
      }
    }
    if (order.scheduler?.lastPriceUsd !== void 0) {
      lines.push(
        `Last price: ${formatUsd(order.scheduler.lastPriceUsd)}`
      );
    }
    if (order.scheduler?.executionSignature) {
      lines.push(
        `Signature: ${shortAddress(order.scheduler.executionSignature)}`
      );
    }
    if (order.scheduler?.reconciliationStatus) {
      lines.push(
        `Reconciliation: ${order.scheduler.reconciliationStatus}`
      );
    }
    lines.push(...this.manualReviewSummaryLines(order.scheduler));
    if (order.scheduler?.lastError) {
      lines.push(`Error: ${order.scheduler.lastError}`);
    }
    return lines;
  }
};
function findMint(values) {
  return values.find(isSolanaMint);
}
function parseSettingsIntent(args) {
  const field = settingsFieldValue(args[0]);
  return {
    kind: "settings",
    field,
    value: args[1],
    values: args.slice(1)
  };
}
function parseWatchlistIntent(command, args) {
  if (command === "/watch") {
    return { kind: "watchlist", action: "add", mint: findMint(args) };
  }
  const rawAction = args[0]?.toLowerCase();
  const action = rawAction === "add" || rawAction === "remove" ? rawAction : "list";
  return {
    kind: "watchlist",
    action,
    mint: findMint(args)
  };
}
function settingsFieldValue(value) {
  const normalized = value?.toLowerCase();
  if (normalized === "slippage" || normalized === "slip") return "slippage";
  if (normalized === "priority" || normalized === "priorityfee" || normalized === "fee") {
    return "priority";
  }
  if (normalized === "sellpriority" || normalized === "sellfee" || normalized === "sellgas") {
    return "sellPriority";
  }
  if (normalized === "defaultbuy" || normalized === "default" || normalized === "buy") {
    return "defaultBuy";
  }
  if (normalized === "buypresets" || normalized === "buypreset") {
    return "buyPresets";
  }
  if (normalized === "sellpresets" || normalized === "sellpreset") {
    return "sellPresets";
  }
  if (normalized === "mode" || normalized === "botmode") return "mode";
  if (normalized === "confirm" || normalized === "confirmtrades")
    return "confirm";
  if (normalized === "sellprotection" || normalized === "protect") {
    return "sellProtection";
  }
  if (normalized === "autobuy") return "autoBuy";
  if (normalized === "autosell") return "autoSell";
  if (normalized === "sniper" || normalized === "snipe") return "sniper";
  if (normalized === "mev" || normalized === "protection") return "mev";
  return void 0;
}
function settingsUpdateFromIntent(intent) {
  if (!intent.field || intent.value === void 0) return null;
  if (intent.field === "slippage") {
    const percent = numberFromValue(intent.value);
    return percent ? { slippageBps: Math.round(percent * 100) } : null;
  }
  if (intent.field === "priority") {
    const lamports = nonNegativeNumberFromValue(intent.value);
    return lamports !== void 0 ? { priorityFeeLamports: Math.round(lamports) } : null;
  }
  if (intent.field === "sellPriority") {
    const lamports = nonNegativeNumberFromValue(intent.value);
    return lamports !== void 0 ? { sellPriorityFeeLamports: Math.round(lamports) } : null;
  }
  if (intent.field === "defaultBuy") {
    const amountSol = numberFromValue(intent.value);
    return amountSol ? { defaultBuySol: amountSol } : null;
  }
  if (intent.field === "buyPresets") {
    const presets = (intent.values ?? []).map(numberFromValue);
    if (presets.length < 2 || presets.length > 4 || presets.some((value) => value === void 0)) {
      return null;
    }
    const values = presets;
    return new Set(values).size === values.length ? { buyPresetsSol: values } : null;
  }
  if (intent.field === "sellPresets") {
    const presets = (intent.values ?? []).map(numberFromValue);
    if (presets.length < 2 || presets.length > 4 || presets.some((value) => value === void 0 || value > 100)) {
      return null;
    }
    const values = presets;
    return new Set(values).size === values.length ? { sellPresetsPercent: values } : null;
  }
  if (intent.field === "mode") {
    const mode = intent.value.toLowerCase();
    if (mode !== "simple" && mode !== "advanced") return null;
    return {
      botMode: mode,
      ...mode === "simple" ? { confirmTrades: false } : {}
    };
  }
  const enabled = parseToggleValue(intent.value);
  if (enabled === void 0) return null;
  if (intent.field === "confirm") return { confirmTrades: enabled };
  if (intent.field === "sellProtection") {
    return { sellProtection: enabled };
  }
  if (intent.field === "autoBuy") return { autoBuyEnabled: enabled };
  if (intent.field === "autoSell") return { autoSellEnabled: enabled };
  if (intent.field === "sniper") return { sniperEnabled: enabled };
  if (intent.field === "mev") return { mevProtection: enabled };
  return null;
}
function parseWithdrawalIntent(args) {
  const destinationAddress = findLastSolanaAddress(args.slice(1));
  return {
    kind: "withdraw",
    asset: args[0],
    amount: args[1],
    destinationAddress
  };
}
function controlUrlWithSession(controlUrl, telegramUserId, code) {
  try {
    const url = new URL(controlUrl);
    url.searchParams.set("telegramUserId", telegramUserId);
    url.hash = new URLSearchParams({ code }).toString();
    return url.toString();
  } catch {
    const baseUrl = controlUrl.split("#", 1)[0];
    const separator = baseUrl.includes("?") ? "&" : "?";
    const fragment = new URLSearchParams({ code }).toString();
    return `${baseUrl}${separator}telegramUserId=${encodeURIComponent(telegramUserId)}#${fragment}`;
  }
}
function isBetaIntent(intent) {
  return [
    "onboarding",
    "menu",
    "farm",
    "perpsStatus",
    "deltaNeutral",
    "deltaNeutralStop",
    "spotComingSoon",
    "account",
    "control",
    "reset",
    "referral",
    "nfts",
    "frogBuy",
    "frogSweep",
    "frogSell",
    "help",
    "unknown"
  ].includes(intent.kind);
}
function deltaNeutralPerpsWalletLabel(preview) {
  return preview.profileAddress ?? "Not available";
}
function perpsStrategyStatus(strategyReady, liveExecutionEnabled) {
  if (!liveExecutionEnabled) return "Launch not enabled";
  if (!strategyReady) return "Farmer not ready";
  return "Ready";
}
function perpsStrategyNextStep(strategyReady, liveExecutionEnabled) {
  if (!liveExecutionEnabled) {
    return "Beta launch is not enabled yet. The Start button will appear here at launch.";
  }
  if (!strategyReady)
    return "Next: Ribbot will message you when farming is ready.";
  return "Next: review Delta Neutral and confirm one live cycle.";
}
function deltaNeutralPreviewNextStep(preview, liveExecutionEnabled) {
  if (!preview.profileFunded) {
    if (!preview.profileAddress) {
      return "Next: run /start to reconnect Imperial.";
    }
    return `Next: send at least ${preview.minimumProfileUsdc} USDC on Solana to the Imperial Perps Wallet above.`;
  }
  if (!liveExecutionEnabled) {
    return "Beta launch is not enabled yet. The Start button will appear here at launch.";
  }
  if (!preview.liveReady) {
    return "Next: Ribbot will message you when farming is ready.";
  }
  return "Next: review Delta Neutral and confirm one live cycle.";
}
function deltaNeutralRunIsActive(run) {
  if ("running" in run) return run.launching || run.running;
  return [
    "launching",
    "running",
    "stopping",
    "pending_reconciliation"
  ].includes(run.status);
}
function deltaNeutralRunLabel(run) {
  if (!("running" in run)) return titleCaseStatus(run.status);
  if (run.failed) return "Failed";
  if (run.launching) return "Starting";
  if (run.running) return run.stopRequested ? "Stopping" : "Running";
  if (run.completedCycles >= run.maxCycles) return "Complete";
  if (run.stopRequested || run.stoppedAtUnix !== null) return "Stopped";
  return "Ready";
}
function titleCaseStatus(value) {
  return value.split("_").filter(Boolean).map((word) => word[0]?.toUpperCase() + word.slice(1)).join(" ");
}
function formatUsdc(value) {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 6
  });
}
function hasCopyTradeEditPatch(intent) {
  return [
    intent.tag,
    intent.targetWallet,
    intent.buyMode,
    intent.buyPercentage,
    intent.maxBuySol,
    intent.minTargetBuySol,
    intent.minLiquidityUsd,
    intent.minMarketCapUsd,
    intent.maxMarketCapUsd,
    intent.copySells,
    intent.duplicateBuys,
    intent.onlyRenounced,
    intent.excludePumpFunTokens,
    intent.blacklistMints,
    intent.slippageBps,
    intent.priorityFeeLamports,
    intent.sellPriorityFeeLamports
  ].some((value) => value !== void 0);
}
function parseSniperIntent(args) {
  if (args[0]?.toLowerCase() !== "add") {
    return { kind: "sniper", action: "list" };
  }
  const source = sniperSourceValue(args[1]);
  const numbers = args.slice(2).map(numberFromValue).filter(isNumber);
  return {
    kind: "sniper",
    action: "add",
    source,
    maxBuySol: numbers[0],
    minLiquidityUsd: numbers[1],
    maxSnipes: numbers[2],
    maxMarketCapUsd: numbers[3]
  };
}
function parseBundleBuyIntent(args) {
  if (args[0]?.toLowerCase() !== "add") {
    return { kind: "bundleBuy", action: "list" };
  }
  const values = args.slice(1);
  const consumed = /* @__PURE__ */ new Set();
  const items = [];
  for (let index = 0; index < values.length; index += 1) {
    const mint = values[index];
    const amountSol = numberFromValue(values[index + 1]);
    if (isSolanaMint(mint) && isNumber(amountSol)) {
      items.push({ mint, amountSol });
      consumed.add(index);
      consumed.add(index + 1);
      index += 1;
    }
  }
  const filterNumbers = values.map(
    (value, index) => consumed.has(index) ? void 0 : numberFromValue(value)
  ).filter(isNumber);
  return {
    kind: "bundleBuy",
    action: "add",
    items,
    minLiquidityUsd: filterNumbers[0],
    maxMarketCapUsd: filterNumbers[1]
  };
}
function parseAutoSellIntent(args) {
  if (args[0]?.toLowerCase() !== "add") {
    return { kind: "autoSell", action: "list" };
  }
  const mint = findMint(args.slice(1));
  const triggerDirection = findTriggerDirection(args);
  const numbers = findNumbersAfterMint(args, mint);
  return {
    kind: "autoSell",
    action: "add",
    mint,
    sellPercent: numbers[0],
    triggerDirection,
    triggerPrice: findTriggerPrice(args, triggerDirection)
  };
}
function findLastSolanaAddress(values) {
  return [...values].reverse().find(isSolanaAddress2);
}
function findNumber(values) {
  const found = values.map(numberFromValue).find(isNumber);
  return found;
}
function positiveNumber3(value) {
  return value ? numberFromValue(value) : void 0;
}
function positiveInteger(value) {
  const parsed = positiveNumber3(value);
  return parsed !== void 0 && Number.isInteger(parsed) ? parsed : void 0;
}
function formatSol(value) {
  return value.toFixed(9).replace(/0+$/, "").replace(/\.$/, "");
}
function formatLamportsAsSol(value) {
  const lamports = BigInt(value);
  const whole = lamports / 1000000000n;
  const fraction = (lamports % 1000000000n).toString().padStart(9, "0").replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole.toString();
}
function frogExecutionWasSubmitted(result) {
  return [
    "executed",
    "submitted",
    "pending",
    "pending_reconciliation"
  ].includes(result.status);
}
function frogExecutionError(result) {
  if (result.code === "FLOOR_ABOVE_CAP") {
    return "The live Frog floor moved above your limit. No purchase was sent.";
  }
  if (result.code === "OFFER_BELOW_MINIMUM") {
    return "The live offer moved below your minimum. No sale was sent.";
  }
  return result.error || "The Frog trade was not submitted.";
}
function parseOrderSide(value) {
  const normalized = value?.toLowerCase();
  if (normalized === "buy" || normalized === "sell") return normalized;
  return void 0;
}
function findTriggerDirection(values) {
  const found = values.map((value) => value.toLowerCase()).find((value) => value === "above" || value === "below");
  return found;
}
function findTriggerPrice(values, direction) {
  if (!direction) return void 0;
  const directionIndex = values.findIndex(
    (value) => value.toLowerCase() === direction
  );
  if (directionIndex < 0) return void 0;
  return findDecimalString(values.slice(directionIndex + 1));
}
function findAmountBeforeTrigger(values, direction) {
  if (!direction) return findNumber(values);
  const directionIndex = values.findIndex(
    (value) => value.toLowerCase() === direction
  );
  return findNumber(
    values.slice(0, directionIndex >= 0 ? directionIndex : values.length)
  );
}
function findNumbersAfterMint(values, mint) {
  const start = mint ? values.indexOf(mint) + 1 : 0;
  return values.slice(Math.max(start, 0)).map(numberFromValue).filter((value) => value !== void 0);
}
function numberFromValue(value) {
  const parsed = Number(value.replace(/%$/, ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : void 0;
}
function nonNegativeNumberFromValue(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : void 0;
}
function chunkButtons(buttons) {
  const rows = [];
  for (let index = 0; index < buttons.length; index += 2) {
    rows.push(buttons.slice(index, index + 2));
  }
  return rows;
}
function formatPresetNumber(value) {
  return value.toString();
}
function automationKindLabel(kind) {
  if (kind === "dca") return "DCA";
  if (kind === "stop") return "Stop-loss";
  if (kind === "trailing") return "Trailing stop";
  return "Limit";
}
function formatBps(value) {
  if (value === void 0) return "unknown";
  return `${(value / 100).toFixed(2).replace(/\.?0+$/, "")}%`;
}
function parseToggleValue(value) {
  const normalized = value.toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return void 0;
}
function isNumber(value) {
  return value !== void 0;
}
function isReferralCode(value) {
  return Boolean(value && /^[A-Z2-9]{6,16}$/i.test(value));
}
function isBotCommand(value) {
  return Boolean(value && /^\/[a-z0-9_]+$/.test(value));
}
function sniperSourceValue(value) {
  const normalized = value?.toLowerCase();
  if (normalized === "any" || normalized === "pump" || normalized === "raydium" || normalized === "moonshot") {
    return normalized;
  }
  return void 0;
}
function findDecimalString(values) {
  for (const value of values) {
    const normalized = value.trim().replace(/,/g, "");
    if (/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(normalized) && Number(normalized) > 0) {
      return normalized;
    }
  }
  return void 0;
}
function isSolanaMint(value) {
  if (!value) return false;
  return isSolanaAddress2(value) && value !== SOL_MINT3;
}
function isSolAlias(value) {
  const normalized = value?.toLowerCase();
  return normalized === "sol" || normalized === "wsol" || value === SOL_MINT3;
}
function isSolanaAddress2(value) {
  if (!value) return false;
  return SOLANA_ADDRESS_PATTERN4.test(value);
}
function isCopyTradeTag(value) {
  return /^[A-Za-z0-9][A-Za-z0-9 _.-]{0,31}$/.test(value);
}
function shortAddress(address) {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}
function frogDisplayName(name) {
  const number = name?.match(/#\s*(\d+)/)?.[1];
  return number ? `#${number}` : "Frog";
}
function parseAmountSol(label) {
  const [raw] = label.split(/\s+/);
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}
function lamportsToSol(lamports) {
  return Number(lamports) / 1e9;
}
function applyPercentage(amount, percentage) {
  const basisPoints = Math.floor(
    Math.max(0, Math.min(percentage, 100)) * 100
  );
  return (BigInt(amount) * BigInt(basisPoints) / 10000n).toString();
}
function formatTokenBalance(token) {
  return token.uiAmountString && token.uiAmountString !== "0" ? token.uiAmountString : formatRawTokenAmount(token.amount, token.decimals);
}
function formatUsd(value) {
  if (value === void 0 || value === null || !Number.isFinite(value)) {
    return "n/a";
  }
  const abs = Math.abs(value);
  const digits = abs >= 100 ? 0 : abs >= 1 ? 2 : 4;
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  })}`;
}
function formatAuthority(authority) {
  return authority ? shortAddress(authority) : "disabled";
}
function formatSignedUsd(value) {
  if (value === void 0 || value === null || !Number.isFinite(value)) {
    return "n/a";
  }
  const formatted = formatUsd(Math.abs(value));
  return value > 0 ? `+${formatted}` : value < 0 ? `-${formatted}` : formatted;
}
function formatSignedPct(value) {
  if (value === void 0 || value === null || !Number.isFinite(value)) {
    return "n/a";
  }
  const formatted = `${Math.abs(value).toFixed(2)}%`;
  return value > 0 ? `+${formatted}` : value < 0 ? `-${formatted}` : formatted;
}
function activityEventLabel(eventType) {
  const labels = {
    wallet_updated: "Wallet updated",
    preference_updated: "Preference updated",
    control_code_created: "Control code created",
    control_session_started: "Control session started",
    control_preference_updated: "Control preference updated",
    wallet_claim_requested: "Wallet claim requested",
    wallet_export_requested: "Wallet export requested",
    bot_access_revoked: "Bot access revoked",
    bot_access_restored: "Bot access restored",
    swap_executed: "Swap executed",
    swap_fill_reconciled: "Swap fill confirmed",
    swap_execution_failed: "Swap execution failed",
    withdrawal_executed: "Withdrawal executed",
    withdrawal_execution_failed: "Withdrawal execution failed",
    automation_order_staged: "Order staged",
    automation_order_cancelled: "Order cancelled",
    automation_order_triggered: "Order trigger observed",
    automation_order_executed: "Scheduled order executed",
    automation_order_failed: "Scheduled order failed",
    automation_order_reconciliation_required: "Scheduled order needs reconciliation",
    automation_order_reconciled: "Scheduled order reconciled",
    execution_reconciliation_required: "Execution needs reconciliation",
    execution_manual_review_required: "Execution needs manual review",
    execution_manual_review_acknowledged: "Manual review acknowledged",
    execution_manual_review_resolved: "Manual review resolved",
    advanced_automation_config_staged: "Automation config staged",
    advanced_automation_config_cancelled: "Automation config cancelled",
    advanced_automation_config_observed: "Automation monitor observed",
    advanced_automation_config_executed: "Automation config executed",
    advanced_automation_config_failed: "Automation config failed",
    advanced_automation_config_reconciled: "Automation config reconciled",
    referral_applied: "Referral applied",
    referral_received: "Referral received"
  };
  return labels[eventType] ?? eventType.replace(/_/g, " ");
}
function activityEventDetail(event) {
  const metadata = event.metadata ?? {};
  const parts = [
    metadata.kind ? `kind ${metadata.kind}` : void 0,
    metadata.side ? `side ${metadata.side}` : void 0,
    metadata.mint && typeof metadata.mint === "string" ? `token ${shortAddress(metadata.mint)}` : void 0,
    metadata.orderId ? `order ${metadata.orderId}` : void 0,
    metadata.configId ? `config ${metadata.configId}` : void 0,
    metadata.caseId ? `review ${metadata.caseId}` : void 0,
    metadata.resolution ? `resolution ${metadata.resolution}` : void 0,
    metadata.signature && typeof metadata.signature === "string" ? `sig ${shortAddress(metadata.signature)}` : void 0,
    metadata.referralCode ? `code ${metadata.referralCode}` : void 0,
    metadata.reason ? String(metadata.reason) : void 0
  ];
  return parts.filter(Boolean).join(" | ");
}
function formatRawTokenAmount(amount, decimals) {
  if (decimals <= 0) return amount;
  const normalized = BigInt(amount).toString().padStart(decimals + 1, "0");
  const whole = normalized.slice(0, -decimals) || "0";
  const fractional = normalized.slice(-decimals).replace(/0+$/, "");
  return fractional ? `${whole}.${fractional}` : whole;
}

// src/telegramClient.ts
var TelegramClient = class {
  bot;
  runtime;
  messageManager;
  backend;
  backendToken;
  tgTrader;
  tradingBot;
  constructor(runtime, botToken) {
    elizaLogger2.log("\u{1F4F1} Constructing new TelegramClient...");
    this.runtime = runtime;
    this.bot = new Telegraf2(botToken);
    this.messageManager = new MessageManager(this.bot, this.runtime);
    this.backend = runtime.getSetting("BACKEND_URL");
    this.backendToken = runtime.getSetting("BACKEND_TOKEN");
    this.tgTrader = parseBoolean(runtime.getSetting("TG_TRADER"), false);
    this.tradingBot = new TradingBot(this.bot, this.runtime);
    elizaLogger2.log("\u2705 TelegramClient constructor completed");
  }
  async start() {
    elizaLogger2.log("\u{1F680} Starting Telegram bot...");
    try {
      await this.initializeBot();
      this.setupMessageHandlers();
      this.tradingBot.startActivityAlerts();
      this.setupShutdownHandlers();
    } catch (error) {
      elizaLogger2.error("\u274C Failed to launch Telegram bot:", error);
      throw error;
    }
  }
  async initializeBot() {
    this.bot.launch({ dropPendingUpdates: true });
    elizaLogger2.log(
      "\u2728 Telegram bot successfully launched and is running!"
    );
    const botInfo = await this.bot.telegram.getMe();
    this.bot.botInfo = botInfo;
    elizaLogger2.success(`Bot username: @${botInfo.username}`);
    this.messageManager.bot = this.bot;
  }
  async isGroupAuthorized(ctx) {
    const config = this.runtime.character.clientConfig?.telegram;
    if (ctx.from?.id === ctx.botInfo?.id) {
      return false;
    }
    if (!config?.shouldOnlyJoinInAllowedGroups) {
      return true;
    }
    const allowedGroups = config.allowedGroupIds || [];
    const currentGroupId = ctx.chat.id.toString();
    if (!allowedGroups.includes(currentGroupId)) {
      elizaLogger2.info(`Unauthorized group detected: ${currentGroupId}`);
      try {
        await ctx.reply("Not authorized. Leaving.");
        await ctx.leaveChat();
      } catch (error) {
        elizaLogger2.error(
          `Error leaving unauthorized group ${currentGroupId}:`,
          error
        );
      }
      return false;
    }
    return true;
  }
  setupMessageHandlers() {
    elizaLogger2.log("Setting up message handler...");
    this.bot.on(message("new_chat_members"), async (ctx) => {
      try {
        const newMembers = ctx.message.new_chat_members;
        const isBotAdded = newMembers.some(
          (member) => member.id === ctx.botInfo.id
        );
        if (isBotAdded && !await this.isGroupAuthorized(ctx)) {
          return;
        }
      } catch (error) {
        elizaLogger2.error("Error handling new chat members:", error);
      }
    });
    this.bot.on("message", async (ctx) => {
      try {
        if (!await this.isGroupAuthorized(ctx)) {
          return;
        }
        if (this.tgTrader) {
          const userId = ctx.from?.id.toString();
          const username = ctx.from?.username || ctx.from?.first_name || "Unknown";
          if (!userId) {
            elizaLogger2.warn(
              "Received message from a user without an ID."
            );
            return;
          }
          try {
            await getOrCreateRecommenderInBe(
              userId,
              username,
              this.backendToken,
              this.backend
            );
          } catch (error) {
            elizaLogger2.error(
              "Error getting or creating recommender in backend",
              error
            );
          }
        }
        if (await this.tradingBot.handleMessage(ctx)) {
          return;
        }
        await this.messageManager.handleMessage(ctx);
      } catch (error) {
        elizaLogger2.error("\u274C Error handling message:", error);
        if (error?.response?.error_code !== 403) {
          try {
            await ctx.reply(
              "An error occurred while processing your message."
            );
          } catch (replyError) {
            elizaLogger2.error(
              "Failed to send error message:",
              replyError
            );
          }
        }
      }
    });
    this.bot.on("callback_query", async (ctx) => {
      try {
        if (await this.tradingBot.handleCallbackQuery(ctx)) {
          return;
        }
      } catch (error) {
        elizaLogger2.error("\u274C Error handling callback query:", error);
        try {
          await ctx.answerCbQuery("Unable to process that action.");
        } catch (replyError) {
          elizaLogger2.error(
            "Failed to answer callback query:",
            replyError
          );
        }
      }
    });
    this.bot.on("photo", (ctx) => {
      elizaLogger2.log(
        "\u{1F4F8} Received photo message with caption:",
        ctx.message.caption
      );
    });
    this.bot.on("document", (ctx) => {
      elizaLogger2.log(
        "\u{1F4CE} Received document message:",
        ctx.message.document.file_name
      );
    });
    this.bot.catch((err, ctx) => {
      elizaLogger2.error(`\u274C Telegram Error for ${ctx.updateType}:`, err);
      ctx.reply("An unexpected error occurred. Please try again later.");
    });
  }
  setupShutdownHandlers() {
    const shutdownHandler = async (signal) => {
      elizaLogger2.log(
        `\u26A0\uFE0F Received ${signal}. Shutting down Telegram bot gracefully...`
      );
      try {
        await this.stop();
        elizaLogger2.log("\u{1F6D1} Telegram bot stopped gracefully");
      } catch (error) {
        elizaLogger2.error(
          "\u274C Error during Telegram bot shutdown:",
          error
        );
        throw error;
      }
    };
    process.once("SIGINT", () => shutdownHandler("SIGINT"));
    process.once("SIGTERM", () => shutdownHandler("SIGTERM"));
    process.once("SIGHUP", () => shutdownHandler("SIGHUP"));
  }
  async stop() {
    elizaLogger2.log("Stopping Telegram bot...");
    await this.tradingBot.stopActivityAlerts();
    await this.bot.stop();
    elizaLogger2.log("Telegram bot stopped");
  }
};

// src/environment.ts
import { z } from "zod";
var telegramEnvSchema = z.object({
  TELEGRAM_BOT_TOKEN: z.string().min(1, "Telegram bot token is required")
});
async function validateTelegramConfig(runtime) {
  try {
    const config = {
      TELEGRAM_BOT_TOKEN: runtime.getSetting("TELEGRAM_BOT_TOKEN") || process.env.TELEGRAM_BOT_TOKEN
    };
    return telegramEnvSchema.parse(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map((err) => `${err.path.join(".")}: ${err.message}`).join("\n");
      throw new Error(
        `Telegram configuration validation failed:
${errorMessages}`
      );
    }
    throw error;
  }
}

// src/index.ts
var TelegramClientInterface = {
  start: async (runtime) => {
    await validateTelegramConfig(runtime);
    const tg = new TelegramClient(
      runtime,
      runtime.getSetting("TELEGRAM_BOT_TOKEN")
    );
    await tg.start();
    elizaLogger3.success(
      `\u2705 Telegram client successfully started for character ${runtime.character.name}`
    );
    return tg;
  },
  stop: async (_runtime) => {
    elizaLogger3.warn("Telegram client does not support stopping yet");
  }
};
var index_default = TelegramClientInterface;
export {
  TelegramClientInterface,
  index_default as default
};
//# sourceMappingURL=index.js.map