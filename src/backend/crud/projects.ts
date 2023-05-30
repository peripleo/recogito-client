import type { SupabaseClient } from '@supabase/supabase-js';
import type { Project } from 'src/Types';
import type { Response } from '@backend/Types';
import { getUser } from '@backend/auth';

export const createProject = (supabase: SupabaseClient, name: string, description: string | null = null): Response<Project> =>
  supabase
    .from('projects')
    .insert({
      name, description
    })
    .select()
    .single()
    .then(({ error, data }) => ({ error, data: data as Project }));

export const deleteProject = (supabase: SupabaseClient, id: string) =>
  supabase
    .from('projects')
    .delete()
    .match({ id })
    .select();

export const getProject = (supabase: SupabaseClient, id: string): Response<Project> =>
  supabase
    .from('projects')
    .select()
    .eq('id', id)
    .single()
    .then(({ error, data }) => ({ error, data: data as Project }));
  
export const listMyProjects = (supabase: SupabaseClient): Response<Project[]> =>
  getUser(supabase).then(user =>
    supabase
      .from('projects')
      .select(`
        id,
        created_at,
        updated_at,
        updated_by,
        name,
        description
      `)
      .eq('created_by', user?.id)
      .then(({ error, data }) => ({ error, data: data as Project[] })));

export const updateProject = (supabase: SupabaseClient, project: Project): Response<Project> =>
  supabase 
    .from('projects')
    .update({...project })
    .eq('id', project.id)
    .select()
    .single()
    .then(({ error, data }) => ({ error, data: data as Project }));