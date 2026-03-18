import { useQuery } from "@tanstack/react-query";
import { Route, useLocation } from "wouter";
import { lazy, Suspense, useEffect } from "react";
import { PageLoadingAnimation } from "@/components/PageLoadingAnimation";
import { ProjectsProvider } from "@/context/ProjectsContext";

const Projects = lazy(() => import("@/pages/projects"));

export function ProtectedProjectsRoute({ path }: { path: string }) {
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/user"],
    retry: false,
  });
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/auth");
    }
  }, [user, isLoading, setLocation]);

  // Условия должны быть до <Route>, чтобы хуки вызывались в одном порядке
  if (isLoading) {
    return <PageLoadingAnimation />;
  }

  if (!user) {
    return null;
  }

  return (
    <Route path={path}>
      {(params) => (
        <Suspense fallback={<PageLoadingAnimation />}>
          <ProjectsProvider>
            <Projects {...params} />
          </ProjectsProvider>
        </Suspense>
      )}
    </Route>
  );
}
