-- Update projects table to match the correct Project type structure
ALTER TABLE public.projects DROP COLUMN customer_name;
ALTER TABLE public.projects DROP COLUMN project_type;
ALTER TABLE public.projects DROP COLUMN address;

-- Add columns matching the Project type
ALTER TABLE public.projects ADD COLUMN type TEXT NOT NULL DEFAULT 'hus';
ALTER TABLE public.projects ADD COLUMN customer JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.projects ADD COLUMN project_address TEXT;