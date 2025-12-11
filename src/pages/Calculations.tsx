import { useNavigate } from "react-router-dom";
import { useProject } from "@/contexts/ProjectContext";
import { CableCalculator } from "@/components/CableCalculator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit } from "lucide-react";
import { PROJECT_TYPE_LABELS } from "@/types/project";
import { useEffect } from "react";

const Calculations = () => {
  const navigate = useNavigate();
  const { currentProject, loading } = useProject();

  useEffect(() => {
    // Only redirect if we're done loading and still have no project
    if (!loading && !currentProject) {
      navigate("/");
    }
  }, [currentProject, loading, navigate]);

  // Show loading state while projects are being loaded
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg">Indlæser projekt...</div>
        </div>
      </div>
    );
  }

  // If not loading and no project, don't render (useEffect will redirect)
  if (!currentProject) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Project header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/")}
                title="Tilbage til projekter"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-6">
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-lg font-semibold">
                      {currentProject.customer.name}
                    </h1>
                    <Badge variant="secondary" className="text-xs">
                      {PROJECT_TYPE_LABELS[currentProject.type]}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {currentProject.projectAddress || currentProject.customer.address}
                  </p>
                </div>
                <div className="border-l pl-6 hidden md:block">
                  <p className="text-sm font-medium text-foreground">
                    Stikledning- og gruppeberegner
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Professionelt værktøj til dimensionering af kabler
                  </p>
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // TODO: Implement edit project
                navigate("/");
              }}
            >
              <Edit className="h-4 w-4 mr-2" />
              Rediger projekt
            </Button>
          </div>
        </div>
      </div>

      {/* Calculator */}
      <CableCalculator />
    </div>
  );
};

export default Calculations;
