export interface Exercise {
  id: string;
  name: string;
  targetSets: number;
  targetReps: string; // e.g. "8-12" or "10"
  targetRIR: number;
}

export interface Split {
  id: string;
  name: string;
  exercises: Exercise[];
}

export interface LoggedSet {
  exerciseId: string;
  setIndex: number;
  reps: number;
  weight: number;
  rir: number;
}

export interface WorkoutLog {
  id: string;
  splitId: string;
  date: string; // "YYYY-MM-DD"
  sets: LoggedSet[];
}

export type ProgressStatus = 'improved' | 'same' | 'declined' | 'new';
