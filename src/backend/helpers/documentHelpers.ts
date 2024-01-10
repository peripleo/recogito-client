import type { SupabaseClient } from '@supabase/supabase-js';
import { createDocument, createProjectDocument } from '@backend/crud';
import { createLayerInContext } from './layerHelpers';
import { uploadFile, uploadImage } from '@backend/storage';
import type { Response } from '@backend/Types';
import type {
  Document,
  DocumentInContext,
  DocumentInTaggedContext,
  Layer,
  TaggedContext,
} from 'src/Types';
import { getTagsForContext } from './tagHelpers';

/**
 * Initializes a new Document in a Context. Process differs for
 * different types of content.
 *
 * - For IIIF remote sources, only the URL of the manifest is stored in Supabase
 * - Text and TEI documents are uploaded to Supabase storage
 * - Images are uploaded to the IIIF server, and a reference to the image
 *   manifest stored in Supabase
 */
export const initDocument = (
  supabase: SupabaseClient,
  name: string,
  projectId: string,
  contextId: string,
  onProgress?: (progress: number) => void,
  file?: File,
  url?: string
): Promise<DocumentInContext> => {
  if (file?.type.startsWith('image')) {
    // If the document is an image upload, the file is first
    // uploaded to the IIIF server, and then treated like a remote
    // IIIF source.
    return uploadImage(supabase, file, name, onProgress).then((iiif) =>
      _initDocument(
        supabase,
        name,
        projectId,
        contextId,
        undefined,
        undefined,
        'IIIF_IMAGE',
        iiif.manifest_iiif_url
      )
    );
  } else {
    return _initDocument(
      supabase,
      name,
      projectId,
      contextId,
      onProgress,
      file,
      undefined,
      url
    );
  }
};

/**
 * Initializes a text (plaintext, TEI) or remote IIIF document.
 *
 * Procedure is as follows:
 * 1. A `document` record is created in Supabase.
 * 2. A default `layer` on the document is created in the given context. (Happens in parallel.)
 * 3. After step 1 and 2 have completed:
 *    - the method returns if the document is a remote IIIF source
 *    - the text file is uploaded to Supabase storage, with a reference to the document ID
 */
const _initDocument = (
  supabase: SupabaseClient,
  name: string,
  projectId: string,
  contextId: string,
  onProgress?: (progress: number) => void,
  file?: File,
  protocol?: 'IIIF_IMAGE',
  url?: string
): Promise<DocumentInContext> => {
  
  // First promise: create the document
  const a: Promise<Document> = new Promise((resolve, reject) =>
    createDocument(supabase, name, file?.type, protocol ? {
      protocol, url,
    } : undefined).then(({ error, data }) => {
      if (error) {
        reject(error);
      } else {
        createProjectDocument(supabase, data.id, projectId).then(
          ({ error: pdError, data: _projectDocument }) => {
            if (pdError) {
              reject(error);
            } else {
              resolve(data);
            }
          }
        );
      }
    })
  );

  // Second promise: create layer in the default context
  const b: Promise<Layer> = a.then((document) =>
    createLayerInContext(supabase, document.id, projectId, contextId)
  );

  return Promise.all([a, b]).then(([document, defaultLayer]) => {
    if (file) {
      return uploadFile(supabase, file, document.id, onProgress).then(() => ({
        ...document,
        layers: [defaultLayer],
      }));
    } else {
      return { ...document, layers: [defaultLayer] };
    }
  });
};

export const addDocumentToProject = (
  supabase: SupabaseClient,
  projectId: string,
  contextId: string,
  documentId: string
): Promise<DocumentInContext> => {
  // First promise: select the document
  const a: Promise<Document> = new Promise((resolve, reject) =>
    supabase
      .from('documents')
      .select()
      .eq('id', documentId)
      .then(({ error, data }) => {
        if (error) reject(error);
        else resolve(data[0]);
      })
  );

  // Second promise: create layer in the default context
  const b: Promise<Layer> = a.then((document) =>
    createLayerInContext(supabase, document.id, projectId, contextId)
  );

  return Promise.all([a, b]).then(([document, defaultLayer]) => {
    return { ...document, layers: [defaultLayer] };
  });
};

export const listDocumentsInProject = (
  supabase: SupabaseClient,
  projectId: string
): Response<DocumentInContext[]> =>
  supabase
    .from('documents')
    .select(
      `
      id,
      created_at,
      created_by,
      updated_at,
      updated_by,
      name,
      bucket_id,
      content_type,
      meta_data,
      is_private,
      layers!inner (
        id,
        document_id,
        project_id,
        name,
        description,
        contexts:layer_contexts!inner (
          ...contexts!inner (
            id,
            name,
            project_id
          )
        )
      )
    `
    )
    .eq('layers.project_id', projectId)
    .then(({ error, data }) => {
      if (error) {
        return { error, data: [] };
      } else {
        // Simplify layers from list of contexts to single (default) context
        const inDefaultContext = data
          .map((d) => ({
            // @ts-ignore
            ...d,
            // @ts-ignore
            layers: d.layers
              // @ts-ignore
              .map(({ contexts, ...l }) => ({
                ...l,
                // @ts-ignore
                context: contexts.find((c) => c.name === null),
                // @ts-ignore
              }))
              .filter((l: any) => l.context),
          }))
          .filter((d) => d.layers.length > 0);

        return {
          error,
          data: inDefaultContext as unknown as DocumentInContext[],
        };
      }
    });

export const listDocumentsInContext = (
  supabase: SupabaseClient,
  contextId: string
): Response<DocumentInContext[]> =>
  supabase
    .from('documents')
    .select(
      `
      id,
      created_at,
      created_by,
      updated_at,
      updated_by,
      name,
      bucket_id,
      content_type,
      meta_data,
      is_private,
      layers!inner (
        id,
        document_id,
        project_id,
        name,
        description,
        contexts:layer_contexts!inner (
          ...contexts (
            id,
            name,
            project_id
          )
        )
      )
    `
    )
    .eq('layers.layer_contexts.context_id', contextId)
    .then(({ error, data }) =>
      error
        ? { error, data: [] }
        : { error, data: data as unknown as DocumentInContext[] }
    );

export const getDocumentInContext = (
  supabase: SupabaseClient,
  documentId: string,
  contextId: string
): Response<DocumentInTaggedContext | undefined> =>
  supabase
    .from('documents')
    .select(
      `
      id,
      created_at,
      created_by,
      updated_at,
      updated_by,
      name,
      bucket_id,
      content_type,
      meta_data,
      is_private,
      layers!inner (
        id,
        document_id,
        project_id,
        name,
        description,
        contexts:layer_contexts!inner (
          ...contexts (
            id,
            name, 
            project_id
          )
        )
      )
    `
    )
    .eq('id', documentId)
    .eq('layers.layer_contexts.context_id', contextId)
    .single()
    .then(({ error, data }) => {
      const doc = data;

      if (error) {
        return { error, data: undefined };
      } else {
        return getTagsForContext(supabase, contextId).then(
          ({ error, data }) => {
            //@ts-ignore
            const context = doc?.layers[0].contexts[0];

            if (!context)
              // Should never happen, except for DB integrity issue
              throw new Error('DocumentInContext without context');

            const documentInContext = {
              // @ts-ignore
              ...doc,
              // @ts-ignore
              layers: doc.layers.map(({ contexts, ...layer }) => ({
                ...layer,
                context: contexts[0],
              })),
              context: {
                ...context,
                tags: data,
              },
            };

            return {
              error,
              data: documentInContext as unknown as DocumentInTaggedContext,
            };
          }
        );
      }
    });

export const listAllDocuments = (
  supabase: SupabaseClient
): Response<Document[] | null> =>
  // @ts-ignore
  supabase
    .from('documents')
    .select(
      'id,created_at,created_by,updated_at,updated_by,name,bucket_id,content_type,meta_data'
    )
    .then(({ error, data }) => {
      return { error, data };
    });

export const isDefaultContext = (context: TaggedContext) =>
  context.tags?.length > 0 &&
  context.tags.some(
    (t) =>
      t.tag_definition?.scope === 'system' &&
      t.tag_definition?.name === 'DEFAULT_CONTEXT'
  );
