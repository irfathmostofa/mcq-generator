import * as XLSX from "xlsx";
import type { ResultRow } from "@/services/results";

export function exportResultsToExcel(
  results: ResultRow[],
  filename = "exam-results.xlsx",
): void {
  const rows = results.map((result) => ({
    Name: result.full_name ?? "",
    Email: result.email ?? "",
    Phone: result.phone ?? "",
    Examination: result.examination_title ?? result.examination_id,
    "Total Questions": result.total_questions,
    Correct: result.correct_count,
    Incorrect: result.incorrect_count,
    Unanswered: result.unanswered_count,
    "Obtained Marks": result.obtained_marks,
    "Total Marks": result.total_marks,
    Percentage: result.percentage,
    Rank: result.rank ?? "",
    "Created At": result.created_at,
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Results");
  XLSX.writeFile(workbook, filename);
}
