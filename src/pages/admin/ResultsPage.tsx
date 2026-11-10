import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { listExaminations } from "@/services/exams";
import { listResults, type ResultRow } from "@/services/results";
import { exportResultsToExcel } from "@/services/excel";
import type { Examination } from "@/types";

export function ResultsPage() {
  const [exams, setExams] = useState<Examination[]>([]);
  const [examId, setExamId] = useState("");
  const [results, setResults] = useState<ResultRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [examsLoading, setExamsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setExamsLoading(true);
    listExaminations()
      .then(setExams)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load exams");
      })
      .finally(() => setExamsLoading(false));
  }, []);

  useEffect(() => {
    if (!examId) {
      setResults([]);
      return;
    }
    setLoading(true);
    setError(null);
    listResults({ examination_id: examId })
      .then(setResults)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load results");
        setResults([]);
      })
      .finally(() => setLoading(false));
  }, [examId]);

  const selectedExam = exams.find((exam) => exam.id === examId) ?? null;

  const summary = useMemo(() => {
    if (results.length === 0) return null;
    const total = results.length;
    const avgMarks =
      results.reduce((sum, row) => sum + Number(row.obtained_marks), 0) / total;
    const avgPercent =
      results.reduce((sum, row) => sum + Number(row.percentage), 0) / total;
    const highest = Math.max(...results.map((row) => Number(row.percentage)));
    return {
      total,
      avgMarks: avgMarks.toFixed(2),
      avgPercent: avgPercent.toFixed(2),
      highest: highest.toFixed(2),
    };
  }, [results]);

  const selectedTitle = selectedExam?.title ?? "exam";

  return (
    <div>
      <PageHeader
        title="Results"
        description="Select an examination first. Scores are calculated on the server."
        actions={
          <Button
            variant="outline"
            disabled={!examId || results.length === 0}
            onClick={() =>
              exportResultsToExcel(
                results,
                `${selectedTitle.replace(/\s+/g, "-").toLowerCase()}-results.xlsx`,
              )
            }
          >
            Export Excel
          </Button>
        }
      />
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="max-w-md space-y-2">
            <Label htmlFor="exam_id">Examination</Label>
            <select
              id="exam_id"
              className="flex h-9 w-full max-w-full rounded-md border border-input bg-transparent px-3 text-sm"
              value={examId}
              onChange={(event) => setExamId(event.target.value)}
              disabled={examsLoading}
            >
              <option value="">
                {examsLoading ? "Loading examinations..." : "Select an examination"}
              </option>
              {exams.map((exam) => (
                <option key={exam.id} value={exam.id}>
                  {exam.title} ({exam.status})
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>
      {error ? <p className="mb-4 text-sm text-destructive">{error}</p> : null}
      {!examId ? (
        <EmptyState
          title="Choose an examination"
          description="Results are shown only after you select an examination from the list above."
        />
      ) : loading ? (
        <p className="text-sm text-muted-foreground">Loading results...</p>
      ) : (
        <>
          {selectedExam ? (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold">{selectedExam.title}</h2>
              <Badge variant="secondary">{selectedExam.status}</Badge>
              <span className="text-sm text-muted-foreground">
                {selectedExam.total_questions} questions · {selectedExam.total_marks} marks
              </span>
            </div>
          ) : null}
          {summary ? (
            <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Participants</p>
                  <p className="text-xl font-semibold">{summary.total}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Average marks</p>
                  <p className="text-xl font-semibold">{summary.avgMarks}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Average %</p>
                  <p className="text-xl font-semibold">{summary.avgPercent}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Highest %</p>
                  <p className="text-xl font-semibold">{summary.highest}</p>
                </CardContent>
              </Card>
            </div>
          ) : null}
          {results.length === 0 ? (
            <EmptyState
              title="No results for this exam"
              description="No participant has submitted this examination yet."
            />
          ) : (
            <>
              <div className="space-y-3 md:hidden">
                {results.map((result) => (
                  <Card key={result.id}>
                    <CardContent className="space-y-2 p-4 text-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="break-words font-medium">
                            {result.full_name ?? result.participant_id}
                          </p>
                          <p className="break-all text-xs text-muted-foreground">
                            {result.email} · {result.phone}
                          </p>
                        </div>
                        <Badge variant="secondary">#{result.rank ?? "-"}</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <p>Correct: {result.correct_count}</p>
                        <p>Incorrect: {result.incorrect_count}</p>
                        <p>Unanswered: {result.unanswered_count}</p>
                        <p>
                          Marks: {result.obtained_marks}/{result.total_marks}
                        </p>
                      </div>
                      <p className="text-sm font-medium">{result.percentage}%</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <div className="hidden overflow-x-auto rounded-lg border md:block">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-3 py-2">Rank</th>
                      <th className="px-3 py-2">Participant</th>
                      <th className="px-3 py-2">Correct</th>
                      <th className="px-3 py-2">Incorrect</th>
                      <th className="px-3 py-2">Unanswered</th>
                      <th className="px-3 py-2">Marks</th>
                      <th className="px-3 py-2">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((result) => (
                      <tr key={result.id} className="border-t">
                        <td className="px-3 py-2">{result.rank ?? "-"}</td>
                        <td className="px-3 py-2">
                          <div>{result.full_name ?? result.participant_id}</div>
                          <div className="text-xs text-muted-foreground">
                            {result.email} · {result.phone}
                          </div>
                        </td>
                        <td className="px-3 py-2">{result.correct_count}</td>
                        <td className="px-3 py-2">{result.incorrect_count}</td>
                        <td className="px-3 py-2">{result.unanswered_count}</td>
                        <td className="px-3 py-2">
                          {result.obtained_marks}/{result.total_marks}
                        </td>
                        <td className="px-3 py-2">{result.percentage}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
