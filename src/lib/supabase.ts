import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qxhojqwycxysxhlwktzq.supabase.co';
const supabaseKey = 'sb_publishable_IkDhteqUfJ1JRsywkK8JDg_c9dTdP-B'; // Using the provided Anon Key

export const supabase = createClient(supabaseUrl, supabaseKey);
