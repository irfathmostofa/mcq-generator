import { Navigate, Route, Routes } from "react-router-dom";
import { RequireAdmin } from "@/features/auth/RequireAdmin";
import { AdminLayout } from "@/layouts/AdminLayout";
import { PublicLayout } from "@/layouts/PublicLayout";
import { HomePage } from "@/pages/HomePage";
import { LoginPage } from "@/pages/admin/LoginPage";
import { DashboardPage } from "@/pages/admin/DashboardPage";
import { SubjectsPage } from "@/pages/admin/SubjectsPage";
import { ResourcesPage } from "@/pages/admin/ResourcesPage";
import { GeneratePage } from "@/pages/admin/GeneratePage";
import { QuestionsPage } from "@/pages/admin/QuestionsPage";
import { ExamsPage } from "@/pages/admin/ExamsPage";
import { ResultsPage } from "@/pages/admin/ResultsPage";
import { ExamLandingPage } from "@/pages/public/ExamLandingPage";
import { ExamTakePage } from "@/pages/public/ExamTakePage";
import { ExamResultPage } from "@/pages/public/ExamResultPage";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/admin/login" element={<LoginPage />} />
      <Route element={<RequireAdmin />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="subjects" element={<SubjectsPage />} />
          <Route path="resources" element={<ResourcesPage />} />
          <Route path="generate" element={<GeneratePage />} />
          <Route path="questions" element={<QuestionsPage />} />
          <Route path="exams" element={<ExamsPage />} />
          <Route path="results" element={<ResultsPage />} />
        </Route>
      </Route>
      <Route path="/exam/:slug" element={<PublicLayout />}>
        <Route index element={<ExamLandingPage />} />
        <Route path="take" element={<ExamTakePage />} />
        <Route path="result" element={<ExamResultPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
