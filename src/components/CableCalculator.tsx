import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, Building2, Warehouse } from "lucide-react";
import { ServiceCableTab } from "./ServiceCableTab";
import { GroupsTab } from "./GroupsTab";
import { CalculationLog } from "./CalculationLog";
import { LoadPlan } from "./LoadPlan";
import { ApartmentsTab } from "./ApartmentsTab";
import { MainBoardTab } from "./MainBoardTab";
import { useProject } from "@/contexts/ProjectContext";
import type { ProjectType } from "@/types/project";

export interface CalculationStep {
  category: 'overbelastning' | 'kortslutning' | 'spændingsfald' | 'effektberegning';
  formula: string;
  variables: string;
  calculation: string;
  result: string;
}

export interface LogEntry {
  id: string;
  timestamp: Date;
  title: string;
  type: 'service' | 'group';
  steps: CalculationStep[];
}

export function CableCalculator() {
  const { currentProject } = useProject();
  const projectType: ProjectType | undefined = currentProject?.type;
  
  // Check if apartments tab should be shown
  const showApartmentsTab = projectType === "lejlighed" || projectType === "blandet";

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [serviceData, setServiceData] = useState<any>(null);
  const [groupsData, setGroupsData] = useState<any[]>([]);
  const [serviceCableMethod, setServiceCableMethod] = useState<string>("individual");
  const [apartments, setApartments] = useState<any[]>([]);
  const [sharedServiceCables, setSharedServiceCables] = useState<Array<{id: string; name: string; diversityFactor: string}>>([]);

  // Load saved data from localStorage on mount
  useEffect(() => {
    const projectId = currentProject?.id || 'default';
    const savedService = localStorage.getItem(`service-tab-state-${projectId}`);
    const savedServiceResults = localStorage.getItem(`service-tab-state-${projectId}-results`);
    const savedGroups = localStorage.getItem(`groups-tab-state-${projectId}`);
    const savedApartments = localStorage.getItem(`apartments-tab-state-${projectId}`);
    
    if (savedService) {
      try {
        setServiceData(JSON.parse(savedService));
      } catch (e) {
        console.error("Failed to parse service data:", e);
      }
    }

    if (savedServiceResults) {
      try {
        const results = JSON.parse(savedServiceResults);
        setServiceData((prev: any) => ({ ...prev, ...results }));
      } catch (e) {
        console.error("Failed to parse service results:", e);
      }
    }
    
    if (savedGroups) {
      try {
        setGroupsData(JSON.parse(savedGroups));
      } catch (e) {
        console.error("Failed to parse groups data:", e);
      }
    }
    
    if (savedApartments) {
      try {
        const parsed = JSON.parse(savedApartments);
        setServiceCableMethod(parsed.serviceCableMethod || "individual");
        setApartments(parsed.apartments || []);
        setSharedServiceCables(parsed.sharedServiceCables || [{id: 'shared-1', name: 'Fælles stikledning A', diversityFactor: '0.7'}]);
      } catch (e) {
        console.error("Failed to parse apartments data:", e);
      }
    }
  }, [currentProject?.id]);

  // Listen for storage changes (when data is updated in other components)
  useEffect(() => {
    const handleStorageChange = () => {
      const projectId = currentProject?.id || 'default';
      const savedService = localStorage.getItem(`service-tab-state-${projectId}`);
      const savedServiceResults = localStorage.getItem(`service-tab-state-${projectId}-results`);
      const savedGroups = localStorage.getItem(`groups-tab-state-${projectId}`);
      const savedApartments = localStorage.getItem(`apartments-tab-state-${projectId}`);
      
      if (savedService) {
        try {
          setServiceData(JSON.parse(savedService));
        } catch (e) {
          console.error("Failed to parse service data:", e);
        }
      }

      if (savedServiceResults) {
        try {
          const results = JSON.parse(savedServiceResults);
          setServiceData((prev: any) => ({ ...prev, ...results }));
        } catch (e) {
          console.error("Failed to parse service results:", e);
        }
      }
      
      if (savedGroups) {
        try {
          setGroupsData(JSON.parse(savedGroups));
        } catch (e) {
          console.error("Failed to parse groups data:", e);
        }
      }
      
      if (savedApartments) {
        try {
          const parsed = JSON.parse(savedApartments);
          setServiceCableMethod(parsed.serviceCableMethod || "individual");
          setApartments(parsed.apartments || []);
          setSharedServiceCables(parsed.sharedServiceCables || [{id: 'shared-1', name: 'Fælles stikledning A', diversityFactor: '0.7'}]);
        } catch (e) {
          console.error("Failed to parse apartments data:", e);
        }
      }
    };

    handleStorageChange(); // Initial load
    window.addEventListener('storage', handleStorageChange);
    
    // Also check periodically (for same-tab updates)
    const interval = setInterval(handleStorageChange, 1000);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [currentProject?.id]);

  const addLog = (title: string, type: 'service' | 'group', steps: CalculationStep[]) => {
    const newLog: LogEntry = {
      id: `log-${type}-${title}-${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      title,
      type,
      steps,
    };
    // Fjern tidligere logs med samme type og titel (kun vis den seneste af hver)
    setLogs((prev) => {
      const filtered = prev.filter(log => !(log.type === type && log.title === title));
      return [...filtered, newLog];
    });
  };

  const clearLogs = () => setLogs([]);

  const showSharedServiceCable = showApartmentsTab && serviceCableMethod === "ladder";
  
  // Get units with individual service cables
  const individualServiceCableUnits = apartments.filter(apt => !apt.sharedServiceCableId);
  
  // Get units grouped by shared service cable
  const unitsBySharedCable: Record<string, any[]> = {};
  sharedServiceCables.forEach(cable => {
    unitsBySharedCable[cable.id] = apartments.filter(apt => apt.sharedServiceCableId === cable.id);
  });

  return (
    <div className="bg-background">
      <main className="container mx-auto px-4 py-6">
        <Tabs defaultValue={showApartmentsTab ? "apartments" : "service"} className="w-full">
          <TabsList className="inline-flex h-11 items-center justify-center gap-1 rounded-lg bg-muted p-1 mb-6">
            {showApartmentsTab && (
              <TabsTrigger 
                value="mainboard"
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md px-6 py-2.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm hover:bg-muted-foreground/10"
              >
                <Warehouse className="h-4 w-4" />
                Hovedtavle
              </TabsTrigger>
            )}
            {showApartmentsTab && (
              <TabsTrigger 
                value="apartments"
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md px-6 py-2.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm hover:bg-muted-foreground/10"
              >
                <Building2 className="h-4 w-4" />
                Lejligheder
              </TabsTrigger>
            )}
            {!showApartmentsTab && (
              <TabsTrigger 
                value="service"
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-6 py-2.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm hover:bg-muted-foreground/10"
              >
                Stikledning
              </TabsTrigger>
            )}
            {!showApartmentsTab && (
              <TabsTrigger 
                value="groups"
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-6 py-2.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm hover:bg-muted-foreground/10"
              >
                Grupper
              </TabsTrigger>
            )}
            <TabsTrigger 
              value="logs"
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-6 py-2.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm hover:bg-muted-foreground/10"
            >
              Mellemregninger
            </TabsTrigger>
            <TabsTrigger 
              value="diagram"
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-6 py-2.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm hover:bg-muted-foreground/10"
            >
              Belastningsplan
            </TabsTrigger>
          </TabsList>

          {showApartmentsTab && (
            <TabsContent value="mainboard" className="space-y-4">
              <MainBoardTab apartments={apartments} onAddLog={addLog} />
            </TabsContent>
          )}

          {showApartmentsTab && (
            <TabsContent value="apartments" className="space-y-4">
              <ApartmentsTab onAddLog={addLog} />
            </TabsContent>
          )}

          {(!showApartmentsTab || showSharedServiceCable) && sharedServiceCables.map(cable => (
            <TabsContent key={cable.id} value={`service-${cable.id}`} className="space-y-4">
              <ApartmentsTab filterServiceCableId={cable.id} onAddLog={addLog} />
              <ServiceCableTab addLog={addLog} />
            </TabsContent>
          ))}

          {/* Service cable tab for regular projects */}
          {!showApartmentsTab && (
            <TabsContent value="service" className="space-y-4">
              <ServiceCableTab addLog={addLog} />
            </TabsContent>
          )}

          {/* Individual service cable tabs for units */}
          {showApartmentsTab && individualServiceCableUnits.map(apt => (
            <TabsContent key={apt.id} value={`service-${apt.id}`} className="space-y-4">
              <ApartmentsTab filterServiceCableId={null} onAddLog={addLog} />
              <ServiceCableTab addLog={addLog} />
            </TabsContent>
          ))}

          {!showApartmentsTab && (
            <TabsContent value="groups" className="space-y-4">
              <GroupsTab addLog={addLog} serviceData={serviceData} />
            </TabsContent>
          )}

          <TabsContent value="logs" className="space-y-4">
            <CalculationLog logs={logs} onClear={clearLogs} />
          </TabsContent>

          <TabsContent value="diagram" className="space-y-4">
            <LoadPlan groupsData={groupsData} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
