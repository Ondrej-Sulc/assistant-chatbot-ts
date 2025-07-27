export enum ExerciseSubcommand {
  Pushup = "pushup",
  Pullup = "pullup",
  Stats = "stats",
}

export interface ExerciseSheetRow {
  date: string;
  pushups: number;
  pullups: number;
}

export type ExerciseType = "pushup" | "pullup";

export interface ExerciseChartData {
  date: string;
  pushups: number;
  pullups: number;
}

export type RawSheetRow = [string, string, string, string];
