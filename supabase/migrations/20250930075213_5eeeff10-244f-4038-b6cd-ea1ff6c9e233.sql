-- Fix: Properly restrict access to knowledge_items table
-- Drop the existing RESTRICTIVE policy and create PERMISSIVE policies instead

-- Drop existing policy
DROP POLICY IF EXISTS "Service role can manage knowledge_items" ON public.knowledge_items;

-- Create separate PERMISSIVE policies for each operation
-- Only service_role can select knowledge items
CREATE POLICY "Service role can select knowledge_items"
ON public.knowledge_items
FOR SELECT
TO authenticated
USING (
  (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'service_role'
);

-- Only service_role can insert knowledge items
CREATE POLICY "Service role can insert knowledge_items"
ON public.knowledge_items
FOR INSERT
TO authenticated
WITH CHECK (
  (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'service_role'
);

-- Only service_role can update knowledge items
CREATE POLICY "Service role can update knowledge_items"
ON public.knowledge_items
FOR UPDATE
TO authenticated
USING (
  (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'service_role'
)
WITH CHECK (
  (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'service_role'
);

-- Only service_role can delete knowledge items
CREATE POLICY "Service role can delete knowledge_items"
ON public.knowledge_items
FOR DELETE
TO authenticated
USING (
  (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'service_role'
);