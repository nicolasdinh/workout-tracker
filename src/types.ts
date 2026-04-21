export interface Exercise {
  id: string;
  name: string;
  targetSets: number;
  targetReps: string;
  targetRIR: number;
}

export interface Split {
  id: string;
  name: string;
  exercises: Exercise[];
}

export interface Program {
  id: string;
  name: string;
  splits: Split[];
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
  programId: string;
  splitId: string;
  date: string; // "YYYY-MM-DD"
  sets: LoggedSet[];
}

export interface WeightEntry {
  id: string;
  date: string; // "YYYY-MM-DD"
  weightLbs: number; // always stored in lbs; convert for display
  note?: string;
}

export interface UserSettings {
  weightUnit: 'lbs' | 'kg';
}

export type ProgressStatus = 'improved' | 'same' | 'declined' | 'new';
