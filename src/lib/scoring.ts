export type ScoreInput = {
  totalQuestions: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  marksPerQuestion: number;
  negativeMarking: number;
};

export type ScoreOutput = {
  obtainedMarks: number;
  totalMarks: number;
  percentage: number;
};

export function calculateScore(input: ScoreInput): ScoreOutput {
  const totalMarks = input.totalQuestions * input.marksPerQuestion;
  const obtainedMarks =
    input.correctCount * input.marksPerQuestion -
    input.incorrectCount * input.negativeMarking;
  const percentage = totalMarks === 0 ? 0 : (obtainedMarks / totalMarks) * 100;

  return {
    obtainedMarks: Number(obtainedMarks.toFixed(2)),
    totalMarks: Number(totalMarks.toFixed(2)),
    percentage: Number(percentage.toFixed(2)),
  };
}
