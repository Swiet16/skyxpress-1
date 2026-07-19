-- Fix RLS policies for quotes table to allow anonymous quote creation
DROP POLICY IF EXISTS "Users can create quotes" ON public.quotes;
DROP POLICY IF EXISTS "Users can view their own quotes" ON public.quotes;

-- Create updated policies that properly handle anonymous users
CREATE POLICY "Anyone can create quotes" 
ON public.quotes 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can view their own quotes or anonymous quotes" 
ON public.quotes 
FOR SELECT 
USING (
  (auth.uid() IS NOT NULL AND auth.uid() = user_id) OR 
  (user_id IS NULL)
);

-- Add admin user
UPDATE public.profiles 
SET is_admin = true 
WHERE user_id = (
  SELECT id FROM auth.users 
  WHERE email = 'azizub18@gmail.com'
);

-- If the user doesn't exist yet, we'll handle it with a conditional insert
-- First, let's create a function to safely set admin status
CREATE OR REPLACE FUNCTION public.set_admin_by_email(admin_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_id_found uuid;
BEGIN
  -- Find user by email
  SELECT id INTO user_id_found
  FROM auth.users
  WHERE email = admin_email;
  
  -- If user exists, update or insert profile with admin status
  IF user_id_found IS NOT NULL THEN
    INSERT INTO public.profiles (user_id, is_admin, full_name)
    VALUES (user_id_found, true, 'Admin User')
    ON CONFLICT (user_id) 
    DO UPDATE SET is_admin = true;
    
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- Set admin status for the specified email
SELECT public.set_admin_by_email('azizub18@gmail.com');