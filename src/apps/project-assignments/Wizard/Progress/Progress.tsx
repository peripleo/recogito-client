import { useEffect, useState } from 'react';
import { addUsersToLayer, createAssignmentContext, createLayerInContext } from '@backend/helpers';
import { supabase } from '@backend/supabaseBrowserClient';
import { Spinner } from '@components/Spinner';
import { AnimatedCheck } from '@components/AnimatedIcons';
import type { Layer, ExtendedProjectData, Translations, Context } from 'src/Types';
import type { AssignmentSpec } from '../AssignmentSpec';

import './Progress.css';

interface ProgressProps {

  i18n: Translations;

  project: ExtendedProjectData;

  assignment: AssignmentSpec;

  onCreated(assignment: Context): void;

  onError(error: string): void;

}

type ProgressState = 'idle' | 'creating_assignment' | 'success' | 'failed';

export const Progress = (props: ProgressProps) => {

  const { t } = props.i18n;

  const { name, description, documents, team } = props.assignment;

  const [state, setState] = useState<ProgressState>('idle');
  
  useEffect(() => {
    const projectId = props.project.id;

    setState('creating_assignment');

    // Step 1. Create a new context for this assignment
    createAssignmentContext(supabase, name!, description, projectId)
      .then(({ error, data }) => {
        if (error) {
          console.error(error);

          setState('failed');
          props.onError(error.message);
        } else {
          const context = data;

          // Step 2. For each document, create a layer in this context
          documents.reduce((promise, document) => {
            return promise.then(layers => {
              return createLayerInContext(supabase, document.id, projectId, context.id)
                .then(layer => ([...layers, layer]))
            });
          }, Promise.resolve<Layer[]>([])).then(layers => {
            
            // Step 3. For each layer, add users to the 'Layer Student' group
            layers.reduce((promise, layer) => {
              return promise.then(() => 
                addUsersToLayer(supabase, layer.id, 'Layer Student', team));
            }, Promise.resolve<void>(undefined)).then(() => {
              setState('success');
              props.onCreated(context);
            })            
          }).catch(error => {
            console.error(error);

            setState('failed');
            props.onError(error.message);
          })
        }
      });
  }, []);

  return (
    <div className="creating-assignment">
      {state === 'idle' || state === 'creating_assignment' ? (
        <Spinner />
      ) : state === 'success' ? (
        <>
          <AnimatedCheck size={40} />
          <p>
            {t['The assignment was created successfully']}
          </p>
        </>
      ) : (
        <p>Something went wrong</p>
      )}
    </div>
  )

}