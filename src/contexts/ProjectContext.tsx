import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { Project, ProjectType, CustomerInfo } from "@/types/project";
import type { User } from "@supabase/supabase-js";

interface ProjectContextType {
  projects: Project[];
  currentProject: Project | null;
  setCurrentProject: (project: Project | null) => void;
  addProject: (project: Project) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  loading: boolean;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user ?? null);
      } catch (error) {
        console.error("Error initializing auth:", error);
        setUser(null);
      } finally {
        setAuthLoading(false);
      }
    };

    initAuth();

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Load projects when user changes
  useEffect(() => {
    if (authLoading) return;

    if (user) {
      loadProjects();
    } else {
      setProjects([]);
      setCurrentProject(null);
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]); // loadProjects is stable

  const loadProjects = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (error) {
        console.error("Error loading projects:", error);
        setProjects([]);
      } else if (data) {
        const mappedProjects = data.map((p) => ({
          id: p.id,
          type: p.type as ProjectType,
          customer: p.customer as unknown as CustomerInfo,
          projectAddress: p.project_address,
          createdAt: p.created_at,
          updatedAt: p.updated_at,
        }));
        setProjects(mappedProjects);

        // Restore current project from localStorage
        const savedId = localStorage.getItem("el-current-project-id");
        if (savedId) {
          const found = mappedProjects.find((p) => p.id === savedId);
          if (found) {
            setCurrentProject(found);
          } else {
            localStorage.removeItem("el-current-project-id");
          }
        }
      }
    } catch (error) {
      console.error("Error loading projects:", error);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const addProject = async (project: Project) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("projects")
        .insert([{
          user_id: user.id,
          type: project.type,
          customer: project.customer || "",
          project_address: project.projectAddress,
          segments: [],
          groups: [],
        }])
        .select()
        .single();

      if (error) {
        console.error("Error adding project:", error);
        throw error;
      }
      
      if (data) {
        const newProject: Project = {
          id: data.id,
          type: data.type as ProjectType,
          customer: data.customer as unknown as CustomerInfo,
          projectAddress: data.project_address,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };
        setProjects((prev) => [newProject, ...prev]);
        setCurrentProject(newProject);
        localStorage.setItem("el-current-project-id", newProject.id);
      }
    } catch (error) {
      console.error("Error in addProject:", error);
      throw error;
    }
  };

  const updateProject = async (id: string, updates: Partial<Project>) => {
    if (!user) return;

    try {
      const dbUpdates: Partial<{
        type: string;
        customer: string;
        project_address: string;
      }> = {};
      if (updates.type !== undefined) dbUpdates.type = updates.type;
      if (updates.customer !== undefined) dbUpdates.customer = updates.customer;
      if (updates.projectAddress !== undefined) dbUpdates.project_address = updates.projectAddress;

      const { error } = await supabase
        .from("projects")
        .update(dbUpdates)
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) {
        console.error("Error updating project:", error);
        throw error;
      }
      
      setProjects((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
        )
      );
      if (currentProject?.id === id) {
        setCurrentProject((prev) =>
          prev ? { ...prev, ...updates, updatedAt: new Date().toISOString() } : null
        );
      }
    } catch (error) {
      console.error("Error in updateProject:", error);
      throw error;
    }
  };

  const deleteProject = async (id: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) {
        console.error("Error deleting project:", error);
        throw error;
      }
      
      setProjects((prev) => prev.filter((p) => p.id !== id));
      if (currentProject?.id === id) {
        setCurrentProject(null);
        localStorage.removeItem("el-current-project-id");
      }
    } catch (error) {
      console.error("Error in deleteProject:", error);
      throw error;
    }
  };

  useEffect(() => {
    if (currentProject) {
      localStorage.setItem("el-current-project-id", currentProject.id);
    }
  }, [currentProject]);

  return (
    <ProjectContext.Provider
      value={{
        projects,
        currentProject,
        setCurrentProject,
        addProject,
        updateProject,
        deleteProject,
        loading,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useProject() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error("useProject must be used within a ProjectProvider");
  }
  return context;
}
