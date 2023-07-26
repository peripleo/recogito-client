import type { SupabaseClient } from '@supabase/supabase-js';
import type { Invitation, Project } from 'src/Types';
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
        created_by:profiles!projects_created_by_fkey(
          id,
          nickname,
          first_name,
          last_name,
          avatar_url
        ),
        updated_at,
        updated_by,
        name,
        description
      `)
      .then(({ error, data }) => ({ error, data: data as unknown as Project[] })));

export const updateProject = (supabase: SupabaseClient, project: Project): Response<Project> =>
  supabase 
    .from('projects')
    .update({...project })
    .eq('id', project.id)
    .select()
    .single()
    .then(({ error, data }) => ({ error, data: data as Project }));

export const inviteUserToProject = (supabase: SupabaseClient, email: string, project_id: string, role: string, invited_by_name?: string, project_name?: string) =>
  supabase
    .from('roles')
    .select('id')
    .eq('name', role)
    .single()
    .then(({ error, data }) => {
      if (data) {
      supabase
        .from('project_groups')
        .select('id')
        .eq('role_id', data.id)
        .eq('project_id', project_id)
        .single()
        .then(({ error, data }) => {
          if (data) {
            const project_group_id = data.id;
            supabase
              .from('invites')
              .insert({ email, project_id, project_group_id, invited_by_name, project_name })
              .select()
              .single()
              .then(({ error, data }) => ({ error, data }));
          }
        }); 
        }
      else {
        return ({ error, data });
      }
      });

export const retrievePendingInvites = async (supabase: SupabaseClient, email: string) => {
  const { count } = await supabase
    .from('invites')
    .select('*', { count: 'exact', head: true })
    .eq('email', email)
    .is('accepted', false)
    .is('ignored', false)
  return count;
};

export const listPendingInvitations = (
  supabase: SupabaseClient, 
  projectId: string
): Response<Invitation[]> => 
  supabase
    .from('invites')
    .select(`
      id,
      created_at,
      email,
      invited_by_name,
      project_id,
      project_name,
      project_group_id,
      accepted,
      ignored
    `)
    .eq('project_id', projectId)
    .is('accepted', false)
    .then(({ error, data }) => ({ error, data: data as Invitation[] }));

export const listProjectUsers = async (supabase: SupabaseClient, typeIds: string[]) => {
  const { data } = await supabase
    .from('group_users')
    .select(`
      type_id,
      profiles!group_users_user_id_fkey (
        id,
        first_name,
        last_name,
        nickname,
        email
      )
    `)
    .in('type_id', typeIds);
    return data;
};

export const getProjectGroups = async (supabase: SupabaseClient, projectId: string) => {
  const { error, data } = await supabase
    .from('project_groups')
    .select(`
      id,
      name
      `)
    .eq('project_id', projectId);
    return { error, data };
}

export const updateUserProjectGroup = async (supabase: SupabaseClient, userId: string, oldTypeId: string, newTypeId: string) => {
  const { error } = await supabase 
    .from('group_users')
    .update({
      type_id: newTypeId
    })
    .eq('user_id', userId)
    .eq('type_id', oldTypeId);
  return error;
  };

export const removeUserFromProject = (
  supabase: SupabaseClient, 
  userId: string, 
  typeId: string
): Response<Boolean> =>
  supabase
    .from('group_users')
    .delete()
    .eq('user_id', userId)
    .eq('type_id', typeId)
    .then(({ error }) => ({ error, data: !error }));