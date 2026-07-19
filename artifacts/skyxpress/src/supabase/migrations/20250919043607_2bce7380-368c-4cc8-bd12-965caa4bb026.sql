-- Fix RLS policies for quotes table to allow anonymous and authenticated users to create quotes
DROP POLICY IF EXISTS "Allow anonymous and authenticated quote creation" ON public.quotes;

CREATE POLICY "Anyone can create quotes" ON public.quotes
FOR INSERT 
USING (true);

-- Ensure quotes can be read by anyone (public or authenticated)
DROP POLICY IF EXISTS "Users can view their own quotes or anonymous quotes" ON public.quotes;

CREATE POLICY "Anyone can view quotes" ON public.quotes
FOR SELECT 
USING (true);

-- Only admins and staff can update/delete quotes  
CREATE POLICY "Admins and staff can manage quotes" ON public.quotes
FOR ALL TO authenticated
USING (
  public.get_user_role(auth.uid()) IN ('admin', 'staff') 
  AND NOT public.is_user_blocked(auth.uid())
);