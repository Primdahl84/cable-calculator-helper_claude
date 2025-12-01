import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProject } from "@/contexts/ProjectContext";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Folder, Trash2, Calendar, User, MapPin } from "lucide-react";
import { PROJECT_TYPE_LABELS } from "@/types/project";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Projects() {
  const navigate = useNavigate();
  const { projects, setCurrentProject, deleteProject, loading } = useProject();
  const { user, isAdmin, signOut, loading: authLoading } = useAuth();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    // Wait for auth to finish loading before checking
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const handleSelectProject = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (project) {
      setCurrentProject(project);
      navigate("/calculations");
    }
  };

  const handleDeleteProject = () => {
    if (deleteId) {
      deleteProject(deleteId);
      setDeleteId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("da-DK", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Indlæser projekter...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Mine projekter</h1>
            <p className="text-muted-foreground mt-1">
              Administrer dine elektriske installationsprojekter
            </p>
          </div>
          <div className="flex gap-2">
            {isAdmin && (
              <Button variant="outline" onClick={() => navigate("/admin")}>
                Admin Dashboard
              </Button>
            )}
            <Button variant="outline" onClick={signOut}>
              Log ud
            </Button>
            <Button onClick={() => navigate("/new-project")} size="lg">
              <Plus className="mr-2 h-5 w-5" />
              Nyt projekt
            </Button>
          </div>
        </div>

        {projects.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Folder className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">Ingen projekter endnu</h3>
              <p className="text-muted-foreground mb-6 text-center max-w-md">
                Opret dit første projekt for at komme i gang med kabelberegninger
              </p>
              <Button onClick={() => navigate("/new-project")}>
                <Plus className="mr-2 h-4 w-4" />
                Opret projekt
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Card
                key={project.id}
                className="cursor-pointer transition-all hover:shadow-lg hover:border-primary/50"
                onClick={() => handleSelectProject(project.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate">
                        {project.customer.name}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {PROJECT_TYPE_LABELS[project.type]}
                        </Badge>
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteId(project.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {project.customer.email && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{project.customer.email}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">
                      {project.projectAddress || project.customer.address}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground pt-2 border-t">
                    <Calendar className="h-4 w-4 flex-shrink-0" />
                    <span className="text-xs">
                      Oprettet {formatDate(project.createdAt)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Slet projekt?</AlertDialogTitle>
              <AlertDialogDescription>
                Er du sikker på at du vil slette dette projekt? Denne handling kan ikke fortrydes.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuller</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteProject}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Slet projekt
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
