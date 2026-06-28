/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
  estimatedTime?: string;
  priority?: string;
  order?: number;
}

export type TaskPriority = 'urgent' | 'high' | 'medium' | 'low';
export type TaskStatus = 'pending' | 'completed';

export interface TaskScheduleItem {
  timeSlot: string;
  activity: string;
}

export interface RescuePlan {
  immediateAction: string;
  timeline: TaskScheduleItem[];
  tips: string;
}

export interface Task {
  id: string;
  userId: string;
  title: string;
  description: string;
  deadline: string; // ISO date-time string
  priority: TaskPriority;
  status: TaskStatus;
  subtasks: SubTask[];
  category: string;
  googleDriveFileId?: string;
  googleDriveFileName?: string;
  calendarEventId?: string;
  suggestedScheduleTime?: string;
  createdAt: string;
  
  // LiveYourDay Enhanced AI Planning metrics
  estimatedEffort?: number;     // Estimated hours to complete
  riskScore?: number;           // Calculated risk percentage 0 to 100
  riskLevel?: 'safe' | 'moderate' | 'high' | 'critical';
  executionPlan?: TaskScheduleItem[];
  coachTip?: string;
  
  // Rescue Mode active structures
  rescueModeActive?: boolean;
  rescuePlan?: RescuePlan;

  // Monetary Punisher Accountability metrics
  penaltyEnabled?: boolean;
  penaltyAmount?: number;
  penaltyTarget?: string;
  penaltyStatus?: 'active' | 'forfeited' | 'saved';

  // Core Planning, Intelligence & Integration Enhancements
  urgencyRating?: number;        // 1-10
  importanceRating?: number;     // 1-10
  priorityScore?: number;        // Calculated: Urgency * Importance (1-100)
  contextTags?: string[];        // e.g. ["@laptop", "@phone"]
  recurrence?: 'none' | 'daily' | 'weekly' | 'weekdays' | 'biweekly' | 'second-tuesday' | 'last-day-of-month';
  timeSlot?: string;             // e.g. "09:00", "14:00" (the 24h formatted slot scheduled for today)
  deepWorkBlock?: boolean;       // Silences alerts, auto-declines invitations
  
  // Contact info for delay apology
  contactEmail?: string;
  contactName?: string;
}

export interface Habit {
  id: string;
  userId: string;
  title: string;
  streak: number;
  lastCompletedDate?: string; // YYYY-MM-DD
  createdAt: string;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
}

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  description?: string;
}

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  badge: 'Critical' | 'Optimization' | 'Quick Win';
  actionType: 'reschedule' | 'breakdown' | 'priority' | 'drive';
  taskRefId?: string;
}

export interface TabActivity {
  id: string;
  userId: string;
  domain: string;
  title: string;
  duration: number; // in seconds
  classification: 'productive' | 'unproductive' | 'neutral';
  timestamp: string; // ISO date-time string
}

