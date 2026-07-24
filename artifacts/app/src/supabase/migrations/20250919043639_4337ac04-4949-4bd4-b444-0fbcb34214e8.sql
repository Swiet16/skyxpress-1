-- Fix RLS policies for quotes table to allow anonymous and authenticated users to create quotes
DROP POLICY IF EXISTS "Allow anonymous and authenticated quote creation" ON public.quotes;

CREATE POLICY "Anyone can create quotes" ON public.quotes
FOR INSERT 
WITH CHECK (true);

-- Ensure quotes can be read by anyone (public or authenticated)
DROP POLICY IF EXISTS "Users can view their own quotes or anonymous quotes" ON public.quotes;

CREATE POLICY "Anyone can view quotes" ON public.quotes
FOR SELECT 
USING (true);

-- Only admins and staff can update/delete quotes  
DROP POLICY IF EXISTS "Admins can manage all quotes" ON public.quotes;

CREATE POLICY "Admins and staff can manage quotes" ON public.quotes
FOR UPDATE TO authenticated
USING (
  public.get_user_role(auth.uid()) IN ('admin', 'staff') 
  AND NOT public.is_user_blocked(auth.uid())
);

CREATE POLICY "Admins and staff can delete quotes" ON public.quotes
FOR DELETE TO authenticated
USING (
  public.get_user_role(auth.uid()) IN ('admin', 'staff') 
  AND NOT public.is_user_blocked(auth.uid())
);