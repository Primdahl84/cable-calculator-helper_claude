export type ProjectType = "hus" | "lejlighed" | "blandet" | "erhverv";

export interface CustomerInfo {
  name: string;
  address: string;
  phone?: string;
  email?: string;
  cvr?: string; // Valgfrit for erhverv
}

export interface Project {
  id: string;
  type: ProjectType;
  customer: CustomerInfo;
  projectAddress?: string; // Hvis anden end kundeadresse
  createdAt: string;
  updatedAt: string;
}

export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  hus: "Enfamiliehus",
  lejlighed: "Lejlighedskompleks (kun boliger)",
  blandet: "Blandet bolig/erhverv",
  erhverv: "Erhverv (fabrikker, kontorer)",
};
