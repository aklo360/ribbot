// src/index.ts
import bodyParser2 from "body-parser";
import cors2 from "cors";
import express2 from "express";
import multer from "multer";
import {
  elizaLogger as elizaLogger2,
  generateCaption,
  generateImage,
  getEmbeddingZeroVector
} from "@elizaos/core";
import { composeContext } from "@elizaos/core";
import { generateMessageResponse } from "@elizaos/core";
import { messageCompletionFooter } from "@elizaos/core";
import {
  ModelClass
} from "@elizaos/core";
import { stringToUuid as stringToUuid2 } from "@elizaos/core";
import { settings } from "@elizaos/core";

// src/api.ts
import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import {
  elizaLogger,
  getEnvVariable,
  validateCharacterConfig
} from "@elizaos/core";
import { REST, Routes } from "discord.js";
import { stringToUuid } from "@elizaos/core";
function createApiRouter(agents, directClient) {
  const router = express.Router();
  router.use(cors());
  router.use(bodyParser.json());
  router.use(bodyParser.urlencoded({ extended: true }));
  router.use(
    express.json({
      limit: getEnvVariable("EXPRESS_MAX_PAYLOAD") || "100kb"
    })
  );
  router.get("/", (req, res) => {
    res.send("Welcome, this is the REST API!");
  });
  router.get("/hello", (req, res) => {
    res.json({ message: "Hello World!" });
  });
  router.get("/agents", (req, res) => {
    const agentsList = Array.from(agents.values()).map((agent) => ({
      id: agent.agentId,
      name: agent.character.name,
      clients: Object.keys(agent.clients)
    }));
    res.json({ agents: agentsList });
  });
  router.get("/agents/:agentId", (req, res) => {
    const agentId = req.params.agentId;
    const agent = agents.get(agentId);
    if (!agent) {
      res.status(404).json({ error: "Agent not found" });
      return;
    }
    res.json({
      id: agent.agentId,
      character: agent.character
    });
  });
  router.post("/agents/:agentId/set", async (req, res) => {
    const agentId = req.params.agentId;
    console.log("agentId", agentId);
    let agent = agents.get(agentId);
    if (agent) {
      agent.stop();
      directClient.unregisterAgent(agent);
    }
    const character = req.body;
    try {
      validateCharacterConfig(character);
    } catch (e) {
      elizaLogger.error(`Error parsing character: ${e}`);
      res.status(400).json({
        success: false,
        message: e.message
      });
      return;
    }
    agent = await directClient.startAgent(character);
    elizaLogger.log(`${character.name} started`);
    res.json({
      id: character.id,
      character
    });
  });
  router.get("/agents/:agentId/channels", async (req, res) => {
    const agentId = req.params.agentId;
    const runtime = agents.get(agentId);
    if (!runtime) {
      res.status(404).json({ error: "Runtime not found" });
      return;
    }
    const API_TOKEN = runtime.getSetting("DISCORD_API_TOKEN");
    const rest = new REST({ version: "10" }).setToken(API_TOKEN);
    try {
      const guilds = await rest.get(Routes.userGuilds());
      res.json({
        id: runtime.agentId,
        guilds,
        serverCount: guilds.length
      });
    } catch (error) {
      console.error("Error fetching guilds:", error);
      res.status(500).json({ error: "Failed to fetch guilds" });
    }
  });
  router.get("/agents/:agentId/:roomId/memories", async (req, res) => {
    const agentId = req.params.agentId;
    const roomId = stringToUuid(req.params.roomId);
    let runtime = agents.get(agentId);
    if (!runtime) {
      runtime = Array.from(agents.values()).find(
        (a) => a.character.name.toLowerCase() === agentId.toLowerCase()
      );
    }
    if (!runtime) {
      res.status(404).send("Agent not found");
      return;
    }
    try {
      const memories = await runtime.messageManager.getMemories({
        roomId
      });
      const response = {
        agentId,
        roomId,
        memories: memories.map((memory) => ({
          id: memory.id,
          userId: memory.userId,
          agentId: memory.agentId,
          createdAt: memory.createdAt,
          content: {
            text: memory.content.text,
            action: memory.content.action,
            source: memory.content.source,
            url: memory.content.url,
            inReplyTo: memory.content.inReplyTo,
            attachments: memory.content.attachments?.map(
              (attachment) => ({
                id: attachment.id,
                url: attachment.url,
                title: attachment.title,
                source: attachment.source,
                description: attachment.description,
                text: attachment.text,
                contentType: attachment.contentType
              })
            )
          },
          embedding: memory.embedding,
          roomId: memory.roomId,
          unique: memory.unique,
          similarity: memory.similarity
        }))
      };
      res.json(response);
    } catch (error) {
      console.error("Error fetching memories:", error);
      res.status(500).json({ error: "Failed to fetch memories" });
    }
  });
  return router;
}

// src/index.ts
import * as fs from "fs";
import * as path from "path";
var storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), "data", "uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  }
});
var upload = multer({ storage });
var messageHandlerTemplate = (
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

{{providers}}

{{attachments}}

# Capabilities
Note that {{agentName}} is capable of reading/seeing/hearing various forms of media, including images, videos, audio, plaintext and PDFs. Recent attachments have been included above under the "Attachments" section.

{{messageDirections}}

{{recentMessages}}

{{actions}}

# Instructions: Write the next message for {{agentName}}.
` + messageCompletionFooter
);
var DirectClient = class {
  app;
  agents;
  // container management
  server;
  // Store server instance
  startAgent;
  // Store startAgent functor
  constructor() {
    elizaLogger2.log("DirectClient constructor");
    this.app = express2();
    this.app.use(cors2());
    this.agents = /* @__PURE__ */ new Map();
    this.app.use(bodyParser2.json());
    this.app.use(bodyParser2.urlencoded({ extended: true }));
    this.app.use(
      "/media/uploads",
      express2.static(path.join(process.cwd(), "/data/uploads"))
    );
    this.app.use(
      "/media/generated",
      express2.static(path.join(process.cwd(), "/generatedImages"))
    );
    const apiRouter = createApiRouter(this.agents, this);
    this.app.use(apiRouter);
    this.app.post(
      "/:agentId/whisper",
      upload.single("file"),
      async (req, res) => {
        const audioFile = req.file;
        const agentId = req.params.agentId;
        if (!audioFile) {
          res.status(400).send("No audio file provided");
          return;
        }
        let runtime = this.agents.get(agentId);
        if (!runtime) {
          runtime = Array.from(this.agents.values()).find(
            (a) => a.character.name.toLowerCase() === agentId.toLowerCase()
          );
        }
        if (!runtime) {
          res.status(404).send("Agent not found");
          return;
        }
        const formData = new FormData();
        const audioBlob = new Blob([audioFile.buffer], {
          type: audioFile.mimetype
        });
        formData.append("file", audioBlob, audioFile.originalname);
        formData.append("model", "whisper-1");
        const response = await fetch(
          "https://api.openai.com/v1/audio/transcriptions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${runtime.token}`
            },
            body: formData
          }
        );
        const data = await response.json();
        res.json(data);
      }
    );
    this.app.post(
      "/:agentId/message",
      upload.single("file"),
      async (req, res) => {
        const agentId = req.params.agentId;
        const roomId = stringToUuid2(
          req.body.roomId ?? "default-room-" + agentId
        );
        const userId = stringToUuid2(req.body.userId ?? "user");
        let runtime = this.agents.get(agentId);
        if (!runtime) {
          runtime = Array.from(this.agents.values()).find(
            (a) => a.character.name.toLowerCase() === agentId.toLowerCase()
          );
        }
        if (!runtime) {
          res.status(404).send("Agent not found");
          return;
        }
        await runtime.ensureConnection(
          userId,
          roomId,
          req.body.userName,
          req.body.name,
          "direct"
        );
        const text = req.body.text;
        const messageId = stringToUuid2(Date.now().toString());
        const attachments = [];
        if (req.file) {
          const filePath = path.join(
            process.cwd(),
            "data",
            "uploads",
            req.file.filename
          );
          attachments.push({
            id: Date.now().toString(),
            url: filePath,
            title: req.file.originalname,
            source: "direct",
            description: `Uploaded file: ${req.file.originalname}`,
            text: "",
            contentType: req.file.mimetype
          });
        }
        const content = {
          text,
          attachments,
          source: "direct",
          inReplyTo: void 0
        };
        const userMessage = {
          content,
          userId,
          roomId,
          agentId: runtime.agentId
        };
        const memory = {
          id: stringToUuid2(messageId + "-" + userId),
          ...userMessage,
          agentId: runtime.agentId,
          userId,
          roomId,
          content,
          createdAt: Date.now()
        };
        await runtime.messageManager.addEmbeddingToMemory(memory);
        await runtime.messageManager.createMemory(memory);
        let state = await runtime.composeState(userMessage, {
          agentName: runtime.character.name
        });
        const context = composeContext({
          state,
          template: messageHandlerTemplate
        });
        const response = await generateMessageResponse({
          runtime,
          context,
          modelClass: ModelClass.LARGE
        });
        if (!response) {
          res.status(500).send(
            "No response from generateMessageResponse"
          );
          return;
        }
        const responseMessage = {
          id: stringToUuid2(messageId + "-" + runtime.agentId),
          ...userMessage,
          userId: runtime.agentId,
          content: response,
          embedding: getEmbeddingZeroVector(),
          createdAt: Date.now()
        };
        await runtime.messageManager.createMemory(responseMessage);
        state = await runtime.updateRecentMessageState(state);
        let message = null;
        await runtime.processActions(
          memory,
          [responseMessage],
          state,
          async (newMessages) => {
            message = newMessages;
            return [memory];
          }
        );
        await runtime.evaluate(memory, state);
        const action = runtime.actions.find(
          (a) => a.name === response.action
        );
        const shouldSuppressInitialMessage = action?.suppressInitialMessage;
        if (!shouldSuppressInitialMessage) {
          if (message) {
            res.json([response, message]);
          } else {
            res.json([response]);
          }
        } else {
          if (message) {
            res.json([message]);
          } else {
            res.json([]);
          }
        }
      }
    );
    this.app.post(
      "/:agentId/image",
      async (req, res) => {
        const agentId = req.params.agentId;
        const agent = this.agents.get(agentId);
        if (!agent) {
          res.status(404).send("Agent not found");
          return;
        }
        const images = await generateImage({ ...req.body }, agent);
        const imagesRes = [];
        if (images.data && images.data.length > 0) {
          for (let i = 0; i < images.data.length; i++) {
            const caption = await generateCaption(
              { imageUrl: images.data[i] },
              agent
            );
            imagesRes.push({
              image: images.data[i],
              caption: caption.title
            });
          }
        }
        res.json({ images: imagesRes });
      }
    );
    this.app.post(
      "/fine-tune",
      async (req, res) => {
        try {
          const response = await fetch(
            "https://api.bageldb.ai/api/v1/asset",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-API-KEY": `${process.env.BAGEL_API_KEY}`
              },
              body: JSON.stringify(req.body)
            }
          );
          const data = await response.json();
          res.json(data);
        } catch (error) {
          res.status(500).json({
            error: "Please create an account at bakery.bagel.net and get an API key. Then set the BAGEL_API_KEY environment variable.",
            details: error.message
          });
        }
      }
    );
    this.app.get(
      "/fine-tune/:assetId",
      async (req, res) => {
        const assetId = req.params.assetId;
        const downloadDir = path.join(
          process.cwd(),
          "downloads",
          assetId
        );
        console.log("Download directory:", downloadDir);
        try {
          console.log("Creating directory...");
          await fs.promises.mkdir(downloadDir, { recursive: true });
          console.log("Fetching file...");
          const fileResponse = await fetch(
            `https://api.bageldb.ai/api/v1/asset/${assetId}/download`,
            {
              headers: {
                "X-API-KEY": `${process.env.BAGEL_API_KEY}`
              }
            }
          );
          if (!fileResponse.ok) {
            throw new Error(
              `API responded with status ${fileResponse.status}: ${await fileResponse.text()}`
            );
          }
          console.log("Response headers:", fileResponse.headers);
          const fileName = fileResponse.headers.get("content-disposition")?.split("filename=")[1]?.replace(
            /"/g,
            /* " */
            ""
          ) || "default_name.txt";
          console.log("Saving as:", fileName);
          const arrayBuffer = await fileResponse.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const filePath = path.join(downloadDir, fileName);
          console.log("Full file path:", filePath);
          await fs.promises.writeFile(filePath, buffer);
          const stats = await fs.promises.stat(filePath);
          console.log(
            "File written successfully. Size:",
            stats.size,
            "bytes"
          );
          res.json({
            success: true,
            message: "Single file downloaded successfully",
            downloadPath: downloadDir,
            fileCount: 1,
            fileName,
            fileSize: stats.size
          });
        } catch (error) {
          console.error("Detailed error:", error);
          res.status(500).json({
            error: "Failed to download files from BagelDB",
            details: error.message,
            stack: error.stack
          });
        }
      }
    );
    this.app.post("/:agentId/speak", async (req, res) => {
      const agentId = req.params.agentId;
      const roomId = stringToUuid2(req.body.roomId ?? "default-room-" + agentId);
      const userId = stringToUuid2(req.body.userId ?? "user");
      const text = req.body.text;
      if (!text) {
        res.status(400).send("No text provided");
        return;
      }
      let runtime = this.agents.get(agentId);
      if (!runtime) {
        runtime = Array.from(this.agents.values()).find(
          (a) => a.character.name.toLowerCase() === agentId.toLowerCase()
        );
      }
      if (!runtime) {
        res.status(404).send("Agent not found");
        return;
      }
      try {
        await runtime.ensureConnection(
          userId,
          roomId,
          req.body.userName,
          req.body.name,
          "direct"
        );
        const messageId = stringToUuid2(Date.now().toString());
        const content = {
          text,
          attachments: [],
          source: "direct",
          inReplyTo: void 0
        };
        const userMessage = {
          content,
          userId,
          roomId,
          agentId: runtime.agentId
        };
        const memory = {
          id: messageId,
          agentId: runtime.agentId,
          userId,
          roomId,
          content,
          createdAt: Date.now()
        };
        await runtime.messageManager.createMemory(memory);
        const state = await runtime.composeState(userMessage, {
          agentName: runtime.character.name
        });
        const context = composeContext({
          state,
          template: messageHandlerTemplate
        });
        const response = await generateMessageResponse({
          runtime,
          context,
          modelClass: ModelClass.LARGE
        });
        const responseMessage = {
          ...userMessage,
          userId: runtime.agentId,
          content: response
        };
        await runtime.messageManager.createMemory(responseMessage);
        if (!response) {
          res.status(500).send("No response from generateMessageResponse");
          return;
        }
        await runtime.evaluate(memory, state);
        const _result = await runtime.processActions(
          memory,
          [responseMessage],
          state,
          async () => {
            return [memory];
          }
        );
        const textToSpeak = response.text;
        const elevenLabsApiUrl = `https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVENLABS_VOICE_ID}`;
        const apiKey = process.env.ELEVENLABS_XI_API_KEY;
        if (!apiKey) {
          throw new Error("ELEVENLABS_XI_API_KEY not configured");
        }
        const speechResponse = await fetch(elevenLabsApiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "xi-api-key": apiKey
          },
          body: JSON.stringify({
            text: textToSpeak,
            model_id: process.env.ELEVENLABS_MODEL_ID || "eleven_multilingual_v2",
            voice_settings: {
              stability: parseFloat(process.env.ELEVENLABS_VOICE_STABILITY || "0.5"),
              similarity_boost: parseFloat(process.env.ELEVENLABS_VOICE_SIMILARITY_BOOST || "0.9"),
              style: parseFloat(process.env.ELEVENLABS_VOICE_STYLE || "0.66"),
              use_speaker_boost: process.env.ELEVENLABS_VOICE_USE_SPEAKER_BOOST === "true"
            }
          })
        });
        if (!speechResponse.ok) {
          throw new Error(`ElevenLabs API error: ${speechResponse.statusText}`);
        }
        const audioBuffer = await speechResponse.arrayBuffer();
        res.set({
          "Content-Type": "audio/mpeg",
          "Transfer-Encoding": "chunked"
        });
        res.send(Buffer.from(audioBuffer));
      } catch (error) {
        console.error("Error processing message or generating speech:", error);
        res.status(500).json({
          error: "Error processing message or generating speech",
          details: error.message
        });
      }
    });
  }
  // agent/src/index.ts:startAgent calls this
  registerAgent(runtime) {
    this.agents.set(runtime.agentId, runtime);
  }
  unregisterAgent(runtime) {
    this.agents.delete(runtime.agentId);
  }
  start(port) {
    this.server = this.app.listen(port, () => {
      elizaLogger2.success(
        `REST API bound to 0.0.0.0:${port}. If running locally, access it at http://localhost:${port}.`
      );
    });
    const gracefulShutdown = () => {
      elizaLogger2.log("Received shutdown signal, closing server...");
      this.server.close(() => {
        elizaLogger2.success("Server closed successfully");
        process.exit(0);
      });
      setTimeout(() => {
        elizaLogger2.error(
          "Could not close connections in time, forcefully shutting down"
        );
        process.exit(1);
      }, 5e3);
    };
    process.on("SIGTERM", gracefulShutdown);
    process.on("SIGINT", gracefulShutdown);
  }
  stop() {
    if (this.server) {
      this.server.close(() => {
        elizaLogger2.success("Server stopped");
      });
    }
  }
};
var DirectClientInterface = {
  start: async (_runtime) => {
    elizaLogger2.log("DirectClientInterface start");
    const client = new DirectClient();
    const serverPort = parseInt(settings.SERVER_PORT || "3000");
    client.start(serverPort);
    return client;
  },
  stop: async (_runtime, client) => {
    if (client instanceof DirectClient) {
      client.stop();
    }
  }
};
var index_default = DirectClientInterface;
export {
  DirectClient,
  DirectClientInterface,
  index_default as default,
  messageHandlerTemplate
};
//# sourceMappingURL=index.js.map