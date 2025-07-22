// Enum for exercise types
export interface ExerciseSheetRow {
  date: string;
  pushups: number;
  pullups: number;
}

export type ExerciseType = 'pushup' | 'pullup';

// Type for chart data
export interface ExerciseChartData {
  date: string;
  pushups: number;
  pullups: number;
}
