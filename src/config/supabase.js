import { createClient } from '@supabase/supabase-js';

// Supabase configuration - these should be set in the environment
const supabaseUrl = process.env.SUPABASE_URL || 'https://psbapehdbxwxskqqbcyf.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBzYmFwZWhkYnh3eHNrcXFiY3lmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxNTc0MTUsImV4cCI6MjA3NDczMzQxNX0._uYdS7YZHwRHi6b0dJr3G0hu5yYcIVLL_GcAZJyEJT8';

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

console.log('Supabase client initialized with URL:', supabaseUrl);

export { supabase };
