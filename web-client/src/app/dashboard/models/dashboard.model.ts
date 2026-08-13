import { UserRole } from '../../auth/auth.service';

export type TrainingStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export type ObjectiveCategory = 'technique' | 'physical' | 'tactical' | 'mental';
export type ObjectiveStatus = 'active' | 'completed' | 'pending_review';
export type EventType = 'training' | 'tournament' | 'match' | 'evaluation';
export type NoteType = 'technical' | 'tactical' | 'physical' | 'general';
export type ActivityType = 'training_completed' | 'note_added' | 'objective_updated' | 'match_registered';

export interface Training {
  id: string;
  title: string;
  date: Date;
  durationMinutes: number;
  objective: string;
  status: TrainingStatus;
}

export interface Objective {
  id: string;
  name: string;
  category: ObjectiveCategory;
  progress: number;
  deadline: Date;
  status: ObjectiveStatus;
}

export interface DashboardEvent {
  id: string;
  type: EventType;
  title: string;
  date: Date;
  description: string;
}

export interface Note {
  id: string;
  author: string;
  date: Date;
  content: string;
  type: NoteType;
}

export interface Activity {
  id: string;
  type: ActivityType;
  text: string;
  timestamp: Date;
}

export interface DashboardData {
  role: UserRole;
  nextTraining: Training | null;
  objectives: Objective[];
  upcomingEvents: DashboardEvent[];
  notes: Note[];
  recentActivity: Activity[];
}
