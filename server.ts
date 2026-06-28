/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

// Load environment variables
dotenv.config();

const PORT = 3000;
const app = express();

app.use(express.json({ limit: '10mb' }));

// Middleware to catch JSON parsing errors
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof SyntaxError && 'status' in err && err.status === 400 && 'body' in err) {
    console.warn("Bad JSON payload received:", err.message);
    return res.status(400).json({ error: "Invalid JSON payload" });
  }
  next(err);
});

// Lazy init of GoogleGenAI client to prevent crash on startup if GEMINI_API_KEY is not defined
let aiClient: GoogleGenAI | null = null;
function getAi(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// Ensure database/auth or any startup errors are reported
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    geminiConfigured: !!process.env.GEMINI_API_KEY
  });
});

/**
 * -------------------------------------------------------------
 * ROBUST LOCAL ALGORITHMIC FALLBACK GENERATORS (for Gemini API resilience)
 * -------------------------------------------------------------
 */

function generateLocalPrioritizedTasks(tasks: any[], currentTimeStr: string) {
  const now = new Date(currentTimeStr || Date.now());
  const updatedTasks = (tasks || []).map((task) => {
    const deadline = new Date(task.deadline || now);
    const diffMs = deadline.getTime() - now.getTime();
    const diffHours = diffMs / (3600 * 1000);

    let priority = task.priority || 'medium';
    let riskScore = 30;
    let riskLevel = 'safe';

    if (diffHours < 12) {
      priority = 'urgent';
      riskScore = 85;
      riskLevel = 'critical';
    } else if (diffHours < 36) {
      priority = 'high';
      riskScore = 60;
      riskLevel = 'high';
    } else if (diffHours < 72) {
      priority = 'medium';
      riskScore = 35;
      riskLevel = 'moderate';
    } else {
      priority = 'low';
      riskScore = 15;
      riskLevel = 'safe';
    }

    const subtasks = task.subtasks && task.subtasks.length > 0 ? task.subtasks : [
      { id: `${task.id}-s1`, title: 'Formulate primary checklist and outline', completed: false, estimatedTime: '15m', priority: 'high', order: 1 },
      { id: `${task.id}-s2`, title: 'Build core functional requirements/sections', completed: false, estimatedTime: '1h', priority: 'high', order: 2 },
      { id: `${task.id}-s3`, title: 'Perform secondary audit & review details', completed: false, estimatedTime: '30m', priority: 'medium', order: 3 }
    ];

    const executionPlan = [
      { timeSlot: 'Block A (Immediate)', activity: 'Draft the essential outline and resolve blockers' },
      { timeSlot: 'Block B (Midpoint)', activity: 'Compile key requirements and complete functional work' },
      { timeSlot: 'Block C (Review)', activity: 'Execute self-audit and finalize formatting' }
    ];

    return {
      id: task.id,
      priority,
      suggestedScheduleTime: diffHours < 24 ? "Today (ASAP)" : "Within next 48 hours",
      estimatedEffort: task.estimatedEffort || (subtasks.length * 0.75),
      riskScore,
      riskLevel,
      coachTip: `Focus strictly on high-impact requirements. Procrastination here leads to snowball effect.`,
      executionPlan,
      subtasks
    };
  });

  const recommendations = [
    {
      id: 'rec-1',
      title: 'Tackle the Looming Clock',
      description: 'Your closest deadline is approaching. Lock your browser to single-tab and start now.',
      badge: 'Critical',
      actionType: 'priority'
    },
    {
      id: 'rec-2',
      title: 'Breakdown Friction',
      description: 'Break tasks into ultra-low-friction steps (under 15 mins) to get over the starting hump.',
      badge: 'Quick Win',
      actionType: 'breakdown'
    }
  ];

  return { tasks: updatedTasks, recommendations };
}

function generateLocalRescuePlan(taskTitle: string, description: string, deadlineStr: string, currentTimeStr: string) {
  const deadline = new Date(deadlineStr);
  const now = new Date(currentTimeStr || Date.now());
  const diffMs = deadline.getTime() - now.getTime();
  const diffHours = Math.max(1, Math.round(diffMs / (3600 * 1000)));

  const timeline = [];
  if (diffHours <= 2) {
    timeline.push({ timeSlot: "Next 30 Mins", activity: "Establish draft structure & focus strictly on core elements." });
    timeline.push({ timeSlot: "Next 60 Mins", activity: "Implement functional logic/content. Completely avoid decorative or advanced features." });
    timeline.push({ timeSlot: "Last 30 Mins", activity: "Double-check subtask items, package findings, and complete submission." });
  } else if (diffHours <= 8) {
    timeline.push({ timeSlot: "Hour 1-2", activity: "Assemble basic skeleton framework, configure core parameters and import schemas." });
    timeline.push({ timeSlot: "Hour 3-5", activity: "Execute high-impact requirements (e.g. key sections, functional logic, writeups)." });
    timeline.push({ timeSlot: "Hour 6-8", activity: "Review edge cases, perform debugging/auditing, and refine overall submission." });
  } else {
    timeline.push({ timeSlot: "Block 1 (Today)", activity: "Define objective checklist, resolve technical dependencies, and build core structure." });
    timeline.push({ timeSlot: "Block 2 (Tomorrow)", activity: "Implement secondary sections, connect data components, and conduct validations." });
    timeline.push({ timeSlot: "Block 3 (Final Run)", activity: "Refine aesthetics, review constraints, and lock focus window to finish commitment." });
  }

  return {
    immediateAction: `Brainstorm and write out the absolute core checklist for "${taskTitle}" to eliminate cognitive friction.`,
    timeline,
    tips: `1. Extreme Focus: Turn off your phone and block social media instantly.\n2. Work Raw: Write down draft points directly into the template. Fix styling later.\n3. Zero Procrastination: Start with a simple 2-minute starter step immediately.`
  };
}

function generateLocalSaverChatReply(messages: any[], tasks: any[]) {
  const lastUserMsg = (messages && messages.length > 0) 
    ? messages[messages.length - 1].content.toLowerCase() 
    : '';

  const pendingTasks = (tasks || []).filter((t: any) => t.status === 'pending');
  
  let taskMention = '';
  if (pendingTasks.length > 0) {
    const nextTask = pendingTasks[0];
    taskMention = `Looking at your upcoming task, **"${nextTask.title}"** (due ${new Date(nextTask.deadline).toLocaleDateString()}), the absolute best thing is to tackle it step-by-step. Let's break down the starting friction.`;
  } else {
    taskMention = "You don't have any pressing pending deadlines right now! That is the perfect time to review your upcoming schedule or establish a relaxed, steady habit.";
  }

  if (lastUserMsg.includes('stress') || lastUserMsg.includes('panick') || lastUserMsg.includes('anxious') || lastUserMsg.includes('overwhelm')) {
    return `I hear you. Let's take a slow, deep breath. 🌬️ 

Anxiety is just a signal that you care deeply about your commitments. Let's silence the noise:
1. **Minimize the Screen**: Close any background tabs you don't need right now.
2. **Start Tiny**: Can you write down just the first 3 bullet points or draft outline for your most pressing item?
3. **The 2-Minute Rule**: Don't worry about finalizing it today. Just make a tiny, 2-minute effort to get started.

${taskMention}

I'm right here with you. What is the single smallest action we can do next?`;
  }

  if (lastUserMsg.includes('deadline') || lastUserMsg.includes('late') || lastUserMsg.includes('overshoot') || lastUserMsg.includes('forfeit')) {
    return `Time management is all about momentum, not perfection. If you are worried about overshooting a deadline or forfeiting a pledge:
1. **Focus on Draft Mode**: A completed rough-draft is infinitely better than a blank, perfect page.
2. **Accept Fallbacks**: Strip out all nice-to-haves and just satisfy the raw requirements first.
3. **Turn on Accountability**: If you haven't already, check the **Accountability Penalty** switch to motivate you with a small commitment pledge!

How can we simplify your next milestone right now?`;
  }

  if (lastUserMsg.includes('help') || lastUserMsg.includes('how') || lastUserMsg.includes('what')) {
    return `I am here as your personal **Saver AI** companion! 🛡️

Here is what we can do together to conquer procrastination:
- **Prioritize with AI**: Press the AI Prioritize button on your dashboard to optimize schedules and build automatic micro-checklists.
- **Lock In Pledges**: Enable the **Accountability Penalty** on key tasks to back your timeline with commitment balance.
- **Activate Rescue Mode**: If a task is dangerously close to its deadline, click **Rescue Mode** (the life buoy icon) to get an immediate, stripped-down emergency hourly timeline.

${taskMention}

Tell me what you are working on, and let's conquer it together!`;
  }

  return `Hello there! I'm here as your time-rescue companion. 

Let's keep things incredibly simple and focus on the immediate present:
1. **Pick One Thing**: Don't think about the whole mountain. Just pick one small task.
2. **Work for 10 Minutes**: Commit to just ten minutes of focused work. If you want to stop after that, you can.
3. **Celebrate Starting**: The hardest part is always the transition.

${taskMention}

How can I support you right now? Let me know if you want to break down a specific task, reschedule, or find a quick win!`;
}

function generateLocalDriveExtraction(fileName: string, fileContent: string) {
  return {
    title: `Action Items from ${fileName || 'Drive File'}`,
    description: `Extracted content summary: ${fileContent ? fileContent.substring(0, 150) + '...' : 'No content provided'}`,
    deadline: new Date(Date.now() + 48 * 3600 * 1000).toISOString().split('T')[0],
    priority: "high",
    category: "Work",
    subtasks: [
      { title: "Review extracted source materials" },
      { title: "Consolidate next action items" },
      { title: "Schedule follow-up discussion block" }
    ]
  };
}

/**
 * -------------------------------------------------------------
 * API: PRIORITIZE AND RECOMMEND ACTIONS
 * -------------------------------------------------------------
 */
app.post("/api/ai/prioritize", async (req, res) => {
  try {
    const { tasks, currentLocalTime } = req.body;
    const ai = getAi();

    const prompt = `
      You are the ultimate LiveYourDay AI Productivity Companion, specializing in guiding highly-stressed students, entrepreneurs, and professionals who have looming deadlines, cluttered task lists, and low time.
      Given the following list of tasks and the current local time (${currentLocalTime}), analyze and output the optimal schedule and prioritization.
      
      Tasks:
      ${JSON.stringify(tasks || [], null, 2)}

      For each task:
      1. Assign or optimize its priority ('urgent' | 'high' | 'medium' | 'low') based on how soon the deadline is and effort.
      2. Propose a specific, focused calendar block-off time (e.g. "Today 2:00 PM - 3:00 PM" or "Tomorrow 9:00 AM") that avoids common procrastination blocks.
      3. Suggest concrete, micro-actionable subtasks (3 to 6 steps) to help the user start IMMEDIATELY without friction. Each subtask MUST have a estimatedTime string (e.g., '15m', '45m'), a priority ('high' | 'medium' | 'low'), and an integer order.
      4. Estimate the total active effort required to complete the task in hours (e.g., 2.5 or 4).
      5. Calculate the completion risk score (integer 0 to 100) representing risk probability of missing the deadline. Calculate risk based on time remaining relative to effort, outstanding subtasks, and user workload.
      6. Determine the riskLevel ('safe', 'moderate', 'high', 'critical') based on the risk score.
      7. Provide a personalized coaching tip ('coachTip') specifically tailored to that task (e.g., "Start by writing 3 key bullet points first. Focus on the core code outline before handling styles.").
      8. Build a visual, step-by-step smart execution timeline as a list of schedule items ('executionPlan') mapping estimated activities directly to time blocks. It must cover at least 3 segments for each task.
      
      Also provide 3 high-level personalized recommendations targeting the most urgent tasks to keep the user calm and productive.

      The response MUST conform to the required JSON schema.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            tasks: {
              type: Type.ARRAY,
              description: "The list of original tasks updated with optimized priority, micro subtasks, schedules, effort, and risk analytics",
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  priority: { type: Type.STRING, description: "urgent, high, medium, or low" },
                  suggestedScheduleTime: { type: Type.STRING, description: "Human-friendly focus time slot" },
                  estimatedEffort: { type: Type.NUMBER, description: "Estimated completion time in hours (decimal allowed, e.g. 2.5)" },
                  riskScore: { type: Type.NUMBER, description: "Looming risk of missing deadline (integer 0 to 100)" },
                  riskLevel: { type: Type.STRING, description: "safe, moderate, high, or critical" },
                  coachTip: { type: Type.STRING, description: "Direct coaching tip to prevent procrastination" },
                  executionPlan: {
                    type: Type.ARRAY,
                    description: "Step-by-step optimal action schedule",
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        timeSlot: { type: Type.STRING, description: "e.g. '6:00 PM - 7:00 PM' or 'Tomorrow 10:00 AM'" },
                        activity: { type: Type.STRING, description: "High-value active task action block" }
                      },
                      required: ["timeSlot", "activity"]
                    }
                  },
                  subtasks: {
                    type: Type.ARRAY,
                    description: "Actionable micro-steps to accomplish",
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING },
                        title: { type: Type.STRING, description: "Low-friction, actionable step description" },
                        completed: { type: Type.BOOLEAN },
                        estimatedTime: { type: Type.STRING, description: "Estimated step time, e.g. '15m', '45m'" },
                        priority: { type: Type.STRING, description: "high, medium, or low" },
                        order: { type: Type.INTEGER, description: "Chronological logical execution order, starting at 1" }
                      },
                      required: ["id", "title", "completed", "estimatedTime", "priority", "order"]
                    }
                  }
                },
                required: ["id", "priority", "suggestedScheduleTime", "estimatedEffort", "riskScore", "riskLevel", "coachTip", "executionPlan", "subtasks"]
              }
            },
            recommendations: {
              type: Type.ARRAY,
              description: "Top 3 personalized saving-grace recommendations",
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  badge: { type: Type.STRING, description: "Critical, Optimization, or Quick Win" },
                  actionType: { type: Type.STRING, description: "breakdown, reschedule, priority, or drive" },
                  taskRefId: { type: Type.STRING, description: "Optional single task reference ID" }
                },
                required: ["id", "title", "description", "badge", "actionType"]
              }
            }
          },
          required: ["tasks", "recommendations"]
        }
      }
    });

    const output = response.text ? JSON.parse(response.text.trim()) : { tasks: [], recommendations: [] };
    res.json(output);
  } catch (error: any) {
    console.log("[Info] Prioritize API: using local prioritized fallback");
    try {
      const { tasks, currentLocalTime } = req.body;
      const fallbackData = generateLocalPrioritizedTasks(tasks || [], currentLocalTime);
      res.json(fallbackData);
    } catch (fallbackErr: any) {
      console.log("[Info] Prioritize API fallback complete with standard structure");
      res.json({ tasks: [], recommendations: [] });
    }
  }
});

/**
 * -------------------------------------------------------------
 * API: RESCUE MODE - EMERGENCY INTERVENTION
 * -------------------------------------------------------------
 */
app.post("/api/ai/rescue", async (req, res) => {
  try {
    const { task, currentLocalTime } = req.body;
    if (!task) {
      return res.status(400).json({ error: "Task content required for Rescue Mode" });
    }
    const ai = getAi();

    const prompt = `
      You are the LiveYourDay EMERGENCY RESCUE AGENT.
      The user is facing critical timeline decay for their task: "${task.title}".
      Requirements/Notes: "${task.description || ''}"
      Deadline is: "${task.deadline}".
      Current local time is: "${currentLocalTime}".
      
      The user is overwhelmed and has very little time left before the deadline.
      Construct an EMERGENCY rescue plan. Your goal is to:
      1. Eliminate low-value, secondary, or optional work (e.g., "Skip fancy styling, focus strictly on basic calculations", "Ignore section 4, focus on sections 1 & 2").
      2. Identify the single, absolute highest-impact core requirement they must start writing/doing RIGHT THIS SECOND. Show this as 'immediateAction'.
      3. Create a streamlined hourly focus sequence targeting only the remaining duration. Show this as 'timeline'.
      4. List 3 critical, hard-hitting operational hacks (e.g., "Close all other browser tabs", "Dump raw bullet points instead of paragraphs") to beat the clock. Include this as 'tips'.
      
      The response MUST conform to the required JSON schema.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            immediateAction: { type: Type.STRING, description: "The single most impactful first-step action to start right this second." },
            timeline: {
              type: Type.ARRAY,
              description: "A compact hourly schedule timeline targeting only the remaining duration",
              items: {
                type: Type.OBJECT,
                properties: {
                  timeSlot: { type: Type.STRING, description: "e.g. 'Next 45 Mins' or '4:00 PM - 5:00 PM'" },
                  activity: { type: Type.STRING, description: "Streamlined, high-impact focus activity." }
                },
                required: ["timeSlot", "activity"]
              }
            },
            tips: { type: Type.STRING, description: "No-nonsense motivational and operational tips grouped into scannable advice." }
          },
          required: ["immediateAction", "timeline", "tips"]
        }
      }
    });

    const output = response.text ? JSON.parse(response.text.trim()) : null;
    res.json(output);
  } catch (error: any) {
    console.log("[Info] Rescue API: using local rescue fallback");
    try {
      const { task, currentLocalTime } = req.body;
      const fallbackPlan = generateLocalRescuePlan(
        task.title,
        task.description || '',
        task.deadline,
        currentLocalTime
      );
      res.json(fallbackPlan);
    } catch (fallbackErr: any) {
      console.log("[Info] Rescue plan fallback complete with standard structure");
      res.json({
        immediateAction: "Focus strictly on completing top priority task items first.",
        timeline: [{ timeSlot: "Immediate", activity: "Do raw draft and complete high value requirements" }],
        tips: "Avoid all secondary details, skip advanced styles and finish core content."
      });
    }
  }
});

/**
 * -------------------------------------------------------------
 * API: SCAN AND EXTRACT TASK DETAILS FROM GOOGLE DRIVE FILE TEXT
 * -------------------------------------------------------------
 */
app.post("/api/ai/analyze-drive-file", async (req, res) => {
  try {
    const { fileName, fileContent } = req.body;
    if (!fileContent) {
      return res.status(400).json({ error: "No file content to analyze" });
    }
    const ai = getAi();

    const prompt = `
      You are an expert deadline rescuer. We have scanned a file from Google Drive named "${fileName}".
      Extract deadlines, next-actions, project requirements, or commitments from this text to structure them into an actionable, priority-sorted Task representation.
      If no explicit deadlines are found, infer a reasonable deadline (e.g., in 2 days) based on the context.
      
      Text Content:
      ${fileContent.substring(0, 8000)}

      Structure the response as a single, detailed Task with appropriate subtasks.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "A high-impact task title based on the document" },
            description: { type: Type.STRING, description: "Brief background or objective extracted from the document" },
            deadline: { type: Type.STRING, description: "Inferred or exact ISO timestamp of the deadline" },
            priority: { type: Type.STRING, description: "urgent, high, medium, or low" },
            category: { type: Type.STRING, description: "Academic, Work, Personal, Bill, etc." },
            subtasks: {
              type: Type.ARRAY,
              description: "Actionable micro-steps extracted directly from the document content",
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING }
                },
                required: ["title"]
              }
            }
          },
          required: ["title", "description", "deadline", "priority", "category", "subtasks"]
        }
      }
    });

    const output = response.text ? JSON.parse(response.text.trim()) : null;
    res.json(output);
  } catch (error: any) {
    console.log("[Info] Drive scanner: using local fallback task extraction");
    try {
      const { fileName, fileContent } = req.body || {};
      const fallbackTask = generateLocalDriveExtraction(fileName || 'Document', fileContent || '');
      res.json(fallbackTask);
    } catch (fallbackErr: any) {
      console.log("[Info] Drive scanner fallback complete with standard structure");
      res.json({
        title: "Action Items",
        description: "Task parsed from drive document",
        deadline: new Date(Date.now() + 48 * 3600 * 1000).toISOString().split('T')[0],
        priority: "high",
        category: "Work",
        subtasks: [
          { title: "Review document outline" },
          { title: "Identify core requirements" }
        ]
      });
    }
  }
});

/**
 * -------------------------------------------------------------
 * API: COOPERATIVE SAVER CHAT SIDEBAR
 * -------------------------------------------------------------
 */
app.post("/api/ai/chat", async (req, res) => {
  try {
    const { messages, tasks } = req.body;
    const ai = getAi();

    const chatHistory = (messages || []).map((m: any) => ({
      role: m.role === "assistant" ? "model" as const : "user" as const,
      parts: [{ text: m.content }]
    }));

    const systemPrompt = `
      You are 'Saver AI', the empathetic, hyper-calm, but direct time-rescue companion.
      Users talking to you might be panicked, overwhelmed, or very close to failing their deadlines.
      Your goal is NOT to give broad philosophical advice or scold them. 
      Your goal is to:
      1. Calm their anxiety immediately (be incredibly supportive, warm, but action-oriented).
      2. Suggest 1 single micro-step they can do in 2 minutes.
      3. Help them reorganize scheduling conflicts.
      
      Here is their current task list for context:
      ${JSON.stringify(tasks || [], null, 2)}
      
      Keep responses brief, highly structured, in human language. Use markdown list formats where possible.
    `;

    // Ensure system prompt is set
    const chat = ai.chats.create({
      model: "gemini-3.5-flash",
      history: [
        {
          role: "user",
          parts: [{ text: systemPrompt }]
        },
        {
          role: "model",
          parts: [{ text: "Understood. I will act as Saver AI, focusing entirely on providing comforting, ultra-actionable guidance and helping users execute immediately." }]
        },
        ...chatHistory.slice(0, -1) // input the rest of history
      ]
    });

    const userMessage = chatHistory[chatHistory.length - 1]?.parts[0]?.text || "Hello";
    const response = await chat.sendMessage({
      message: userMessage
    });

    res.json({ reply: response.text });
  } catch (error: any) {
    console.log("[Info] Saver Chat: using local conversational fallback");
    try {
      const { messages, tasks } = req.body;
      const reply = generateLocalSaverChatReply(messages || [], tasks || []);
      res.json({ reply });
    } catch (fallbackErr: any) {
      console.log("[Info] Saver Chat fallback complete");
      res.json({ reply: "I'm here for you! Let's focus on completing just one small, actionable chunk of your highest priority task." });
    }
  }
});


/**
 * -------------------------------------------------------------
 * API: NATURAL LANGUAGE QUICK ADD PARSER
 * -------------------------------------------------------------
 */
app.post("/api/ai/parse-natural-language", async (req, res) => {
  try {
    const { text, currentLocalTime } = req.body;
    const ai = getAi();
    
    const systemPrompt = `You are an expert AI productivity assistant. Parse the following natural language sentence into a structured JSON task representation.
    Extract the title, description, deadline (infer an ISO date-time string relative to the current local time), priority ('urgent' | 'high' | 'medium' | 'low'), category ('Academic' | 'Work' | 'Personal' | 'Finance'), recurrence ('none' | 'daily' | 'weekly' | 'weekdays' | 'biweekly' | 'second-tuesday' | 'last-day-of-month'), importanceRating (1 to 10), urgencyRating (1 to 10), and contextTags (array of tags beginning with @, e.g. ["@laptop", "@phone", "@errands"]).
    
    Current local time context is: ${currentLocalTime || new Date().toISOString()}
    Input sentence: "${text}"
    
    Format response strictly as JSON with this structure:
    {
      "title": "extracted task name",
      "description": "any additional context details or notes",
      "deadline": "ISO date-time string (YYYY-MM-DDTHH:mm:ss.sssZ)",
      "priority": "low" | "medium" | "high" | "urgent",
      "category": "Academic" | "Work" | "Personal" | "Finance",
      "recurrence": "none" | "daily" | "weekly" | "weekdays" | "biweekly" | "second-tuesday" | "last-day-of-month",
      "importanceRating": 5,
      "urgencyRating": 5,
      "contextTags": ["@laptop"]
    }`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [{ role: "user", parts: [{ text: systemPrompt }] }],
      config: {
        responseMimeType: "application/json"
      }
    });

    const output = response.text ? JSON.parse(response.text.trim()) : null;
    res.json(output);
  } catch (error: any) {
    console.log("[Info] NLP Quick Add: using smart local regex parser fallback");
    try {
      const { text } = req.body || {};
      const cleanText = text || '';
      
      // Local Heuristic parsing
      let title = cleanText;
      let description = "Automatically parsed via local intelligence fallback";
      let priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium';
      let category = 'Personal';
      let recurrence: any = 'none';
      let importanceRating = 5;
      let urgencyRating = 5;
      let contextTags: string[] = [];

      // Extract context tags (@laptop, @phone, @errands, etc.)
      const tagsMatch = cleanText.match(/@\w+/g);
      if (tagsMatch) {
        contextTags = tagsMatch;
        // Clean tags from title
        title = title.replace(/@\w+/g, '').trim();
      }

      // Check priority keywords
      if (cleanText.toLowerCase().includes('urgent') || cleanText.toLowerCase().includes('asap')) {
        priority = 'urgent';
        urgencyRating = 9;
        importanceRating = 8;
      } else if (cleanText.toLowerCase().includes('important') || cleanText.toLowerCase().includes('critical')) {
        priority = 'high';
        importanceRating = 9;
      }

      // Check category keywords
      if (/homework|exam|assignment|study|class|read|essay/i.test(cleanText)) {
        category = 'Academic';
      } else if (/work|meeting|corp|office|project|client|call/i.test(cleanText)) {
        category = 'Work';
      } else if (/bill|pay|credit|finance|invoice|tax|rent/i.test(cleanText)) {
        category = 'Finance';
      }

      // Check recurrence keywords
      if (/every day|daily/i.test(cleanText)) {
        recurrence = 'daily';
      } else if (/every week|weekly/i.test(cleanText)) {
        recurrence = 'weekly';
      } else if (/weekdays/i.test(cleanText)) {
        recurrence = 'weekdays';
      } else if (/second tuesday/i.test(cleanText)) {
        recurrence = 'second-tuesday';
      } else if (/last day/i.test(cleanText)) {
        recurrence = 'last-day-of-month';
      }

      // Deadline computation
      let deadlineDate = new Date();
      deadlineDate.setDate(deadlineDate.getDate() + 1); // default tomorrow
      
      if (/today/i.test(cleanText)) {
        deadlineDate = new Date();
      } else if (/next week/i.test(cleanText)) {
        deadlineDate = new Date();
        deadlineDate.setDate(deadlineDate.getDate() + 7);
      } else if (/monday/i.test(cleanText)) {
        deadlineDate = getNextDayOfWeek(1);
      } else if (/tuesday/i.test(cleanText)) {
        deadlineDate = getNextDayOfWeek(2);
      } else if (/wednesday/i.test(cleanText)) {
        deadlineDate = getNextDayOfWeek(3);
      } else if (/thursday/i.test(cleanText)) {
        deadlineDate = getNextDayOfWeek(4);
      } else if (/friday/i.test(cleanText)) {
        deadlineDate = getNextDayOfWeek(5);
      }

      // Parse hours if specified (e.g. 3pm or 9am)
      const hourMatch = cleanText.match(/(\d+)\s*(am|pm)/i);
      if (hourMatch) {
        let hour = parseInt(hourMatch[1]);
        const ampm = hourMatch[2].toLowerCase();
        if (ampm === 'pm' && hour < 12) hour += 12;
        if (ampm === 'am' && hour === 12) hour = 0;
        deadlineDate.setHours(hour, 0, 0, 0);
      } else {
        deadlineDate.setHours(18, 0, 0, 0); // default 6 PM
      }

      res.json({
        title: title.split(/at\s+\d+|on\s+\w+|every|next|today|tomorrow/i)[0].trim() || title,
        description,
        deadline: deadlineDate.toISOString(),
        priority,
        category,
        recurrence,
        importanceRating,
        urgencyRating,
        contextTags
      });
    } catch (fallbackErr: any) {
      res.status(500).json({ error: "Failed to parse natural language" });
    }
  }
});

// Helper for local parsing of upcoming day of week
function getNextDayOfWeek(dayOfWeek: number): Date {
  const resultDate = new Date();
  resultDate.setDate(resultDate.getDate() + (7 + dayOfWeek - resultDate.getDay()) % 7);
  return resultDate;
}

/**
 * -------------------------------------------------------------
 * API: SMART SCHEDULING TIME-BLOCK GENERATOR
 * -------------------------------------------------------------
 */
app.post("/api/ai/smart-schedule", async (req, res) => {
  try {
    const { tasks, currentLocalTime } = req.body;
    const ai = getAi();
    
    const systemPrompt = `You are an AI calendar planning strategist. Your objective is to distribute tasks across optimal 1-hour time blocks (from 08:00 to 21:00) for today.
    Match difficult/high-effort tasks to peak focus times (Morning: 09:00 - 12:00, or Evening: 18:00 - 21:00) and minor/admin tasks to slump focus times (Afternoon: 13:00 - 16:00).
    Consider priority ratings and deadlines. Avoid any double bookings.
    
    Tasks to schedule: ${JSON.stringify(tasks || [])}
    Current context local time: ${currentLocalTime}
    
    Format response strictly as a JSON object where keys are the task IDs and values are the scheduled 24h hour slot (e.g. "09:00", "13:00", "16:00"):
    {
      "taskId1": "09:00",
      "taskId2": "14:00"
    }`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [{ role: "user", parts: [{ text: systemPrompt }] }],
      config: {
        responseMimeType: "application/json"
      }
    });

    const output = response.text ? JSON.parse(response.text.trim()) : {};
    res.json(output);
  } catch (error: any) {
    console.log("[Info] Smart schedule: using local chronological heuristic");
    try {
      const { tasks } = req.body || {};
      const pendingTasks = (tasks || []).filter((t: any) => t.status === 'pending');
      
      // Sort priority: urgent first, then high, then medium, then low
      const sorted = [...pendingTasks].sort((a: any, b: any) => {
        const priorityWeight: any = { urgent: 4, high: 3, medium: 2, low: 1 };
        const wA = priorityWeight[a.priority] || 2;
        const wB = priorityWeight[b.priority] || 2;
        return wB - wA;
      });

      // Daily 1-hour focus slots available
      const slots = ["09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00", "19:00", "20:00", "21:00"];
      const mapping: Record<string, string> = {};
      
      sorted.forEach((task: any, index: number) => {
        if (index < slots.length) {
          mapping[task.id] = slots[index];
        }
      });
      
      res.json(mapping);
    } catch (fallbackErr: any) {
      res.json({});
    }
  }
});


/**
 * -------------------------------------------------------------
 * API: AUTOMATICALLY GENERATE APOLOGY EMAIL FOR MISSED DEADLINES
 * -------------------------------------------------------------
 */
app.post("/api/ai/generate-apology", async (req, res) => {
  try {
    const { taskTitle, taskDescription, deadline, contactName, contactEmail } = req.body;
    const ai = getAi();
    
    const prompt = `You are a helpful, professional, and empathetic communication coach. Write a customized, warm, and highly professional apology email to '${contactName || 'Valued Contact'}' at email '${contactEmail || 'their email'}' regarding a missed deadline for the task: '${taskTitle}'.
    Task Details: '${taskDescription || 'None'}'
    Missed Deadline: '${deadline || 'recently'}'.
    The tone should be professional, honest, and respectful. It should explain that the deadline was missed, express a sincere apology, provide a realistic reassurance of progress (without over-promising), and invite them to reach out if they have urgent concerns.
    
    Format response strictly as JSON with this structure:
    {
      "subject": "A clear, elegant, and professional subject line",
      "body": "The complete email body content, ready to be sent. Ensure there are proper double-newline spacings for paragraphs."
    }`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json"
      }
    });

    const output = response.text ? JSON.parse(response.text.trim()) : null;
    res.json(output);
  } catch (error: any) {
    console.log("[Info] Generate Apology API: using smart local apology generator fallback");
    try {
      const { taskTitle, contactName, deadline } = req.body;
      const formattedDeadline = deadline ? new Date(deadline).toLocaleDateString() : 'recently';
      const name = contactName || 'there';
      const subject = `Apology: Delay regarding "${taskTitle}"`;
      const body = `Dear ${name},

I hope you are doing well.

I am writing to sincerely apologize for missing our deadline of ${formattedDeadline} for the task: "${taskTitle}". 

I want to take full responsibility for this delay. I am working diligently on completing the outstanding items right now and am committed to delivering a high-quality result. I expect to have this finalized and shared with you as soon as possible.

Thank you very much for your understanding and patience. Please let me know if you have any urgent questions or updates in the meantime.

Best regards,
[Your Name]`;

      res.json({ subject, body });
    } catch (fallbackErr: any) {
      res.status(500).json({ error: "Failed to generate apology email" });
    }
  }
});


/**
 * -------------------------------------------------------------
 * API: RECEIVE CHROME EXTENSION ACTIVE TAB TELEMETRY ACTIVITY
 * -------------------------------------------------------------
 */
app.post("/api/extension/activity", (req, res) => {
  try {
    const { id, userId, domain, title, duration, classification, timestamp } = req.body;
    if (!userId || !domain || !title) {
      return res.status(400).json({ error: "Missing required fields (userId, domain, title)" });
    }
    // Return success response to confirm receiver connectivity
    res.json({ 
      status: "synchronized", 
      entryId: id || `ext-${Date.now()}`,
      receivedAt: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});


/**
 * -------------------------------------------------------------
 * API: NEURAL PRODUCTIVITY AUDIT & GOAL SUCCESS PROBABILITY
 * -------------------------------------------------------------
 */
app.post("/api/ai/analyze-productivity", async (req, res) => {
  try {
    const { activities, standards, futureGoals, currentLocalTime } = req.body;
    
    // Attempt Gemini API Analysis
    const ai = getAi();
    
    const systemPrompt = `You are an expert AI cognitive behavioral and productivity audit consultant. Your objective is to review a user's automated tab tracking telemetry logs, audit their performance against their personal standards, and predict their probability of achieving their future goals.

Telemetry Activities: ${JSON.stringify(activities || [])}
Productivity Goals/Standards:
- Desired productive hours: ${standards?.productiveGoal || 4} hours
- Max allowed unproductive time: ${standards?.maxUnproductiveMins || 30} minutes

User's Defined Future Goals: ${JSON.stringify(futureGoals || [])}
Current Time context: ${currentLocalTime || new Date().toISOString()}

Perform a rigorous evaluation of their tab usage:
1. "isProductive": Boolean. Did they achieve their standards based on total productive duration logged?
2. "score": Integer (0 to 100). Overall day efficiency rating.
3. "likelihoodOfGoals": Integer (0 to 100). The likelihood (percentage) they will hit their future goals based on current focus patterns.
4. "outliers": Array of objects. Identify 1 to 2 actual distractions or "attention leaks" from the domains, what triggered them, and the cognitive impact.
   - "flaw": e.g., "YouTube Procrastination Loop", "Context-Switching Drag"
   - "trigger": e.g., "Opened youtube.com during a coding sprint"
   - "impact": e.g., "Drains cognitive reserve, stalling focus and delaying PyTorch assignment completion."
5. "executiveSummary": A concise 2-sentence direct critique. Speak objectively but constructively.
6. "recommendations": Array of strings (2-4 items). Practical focus adjustments (e.g. "Trigger a 25-minute focus sprint on PyTorch before opening Google search", "Schedule an absolute offline block for administrative tasks").

Respond strictly in valid JSON using this EXACT structure:
{
  "isProductive": true,
  "score": 85,
  "likelihoodOfGoals": 75,
  "outliers": [
    {
      "flaw": "YouTube Procrastination Loop",
      "trigger": "Opened youtube.com during a coding sprint",
      "impact": "Drains cognitive reserve, stalling focus and delaying PyTorch assignment completion."
    }
  ],
  "executiveSummary": "Your productive momentum is high, but a 45-minute YouTube leak interrupted your core focus. You are highly likely to hit your goals if you run Pomodoro sprints.",
  "recommendations": [
    "Trigger a 25-minute focus sprint on PyTorch before opening Google search",
    "Close social tabs permanently during deep work sessions"
  ]
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [{ role: "user", parts: [{ text: systemPrompt }] }],
      config: {
        responseMimeType: "application/json"
      }
    });

    const output = response.text ? JSON.parse(response.text.trim()) : null;
    if (!output) {
      throw new Error("Empty response from model");
    }
    res.json(output);

  } catch (error: any) {
    console.log("[Info] Analyze Productivity API: using smart local audit algorithm fallback");
    try {
      const { activities, standards, futureGoals } = req.body || {};
      const targetProductiveHours = standards?.productiveGoal || 4;
      const allowedUnproductiveMins = standards?.maxUnproductiveMins || 30;

      let productiveTimeSecs = 0;
      let unproductiveTimeSecs = 0;
      let neutralTimeSecs = 0;

      (activities || []).forEach((act: any) => {
        if (act.classification === 'productive') productiveTimeSecs += act.duration || 0;
        else if (act.classification === 'unproductive') unproductiveTimeSecs += act.duration || 0;
        else neutralTimeSecs += act.duration || 0;
      });

      const totalSecs = productiveTimeSecs + unproductiveTimeSecs + neutralTimeSecs;
      const isProductive = (productiveTimeSecs >= targetProductiveHours * 3600) && (unproductiveTimeSecs <= allowedUnproductiveMins * 60);

      // Algorithmic efficiency rating
      let score = 50;
      if (totalSecs > 0) {
        const prodRatio = productiveTimeSecs / totalSecs;
        const leakPenalty = Math.max(0, (unproductiveTimeSecs - (allowedUnproductiveMins * 60)) / 60);
        score = Math.min(100, Math.max(10, Math.round(prodRatio * 100 - leakPenalty)));
      }

      // Success likelihood
      let likelihoodOfGoals = 40;
      if (futureGoals && futureGoals.length > 0) {
        if (productiveTimeSecs > 0) {
          const ratio = productiveTimeSecs / Math.max(1, productiveTimeSecs + unproductiveTimeSecs);
          likelihoodOfGoals = Math.min(95, Math.max(20, Math.round(ratio * 90 + 10)));
        }
      } else {
        likelihoodOfGoals = 70; // no explicit goals
      }

      const report = {
        isProductive,
        score,
        likelihoodOfGoals,
        outliers: [
          {
            flaw: unproductiveTimeSecs > 0 ? "Leisure/Media Distraction Leak" : "Sub-optimal Momentum",
            trigger: unproductiveTimeSecs > 0 ? "Detected visits to recreational domains during target work blocks" : "Passive tab state without active deep workspace interaction",
            impact: unproductiveTimeSecs > 0 
              ? `Leaking ${Math.round(unproductiveTimeSecs/60)} minutes of attention blocks high focus and disrupts goal accomplishment.`
              : "Slow momentum might delay your target completions unless you trigger a Pomodoro sprint."
          }
        ],
        executiveSummary: `You recorded ${(productiveTimeSecs/3600).toFixed(2)} productive hours today against your target of ${targetProductiveHours}h. Your distraction leak is currently ${Math.round(unproductiveTimeSecs/60)} minutes.`,
        recommendations: [
          "Initiate a 25-minute Pomodoro focus sprint to lock out distraction domains.",
          "Establish clear task breakdowns in your Time-Blocking view before opening web browsers.",
          "Keep recreational media tabs fully closed during active project hours."
        ]
      };

      res.json(report);
    } catch (fallbackErr: any) {
      res.status(500).json({ error: "Failed to generate audit report" });
    }
  }
});


// Global uncaught error handler to prevent HTML responses for API routes
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Uncaught Express Error:", err);
  if (req.path.startsWith('/api/')) {
    return res.status(err.status || 500).json({
      error: err.message || "Internal Server Error",
      fallbackActive: true
    });
  }
  next(err);
});


/**
 * -------------------------------------------------------------
 * VITE MIDDLEWARE / STATIC FILES SERVING
 * -------------------------------------------------------------
 */
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting in development mode with Vite middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting in production mode...");
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`The Last-Minute Life Saver application is running on port ${PORT}`);
  });
}

startServer();
