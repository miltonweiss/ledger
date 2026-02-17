import { supabase } from "./client"

export async function getDocumentChunks (){
  const { data, error } = await supabase
    .from('document_chunks')
    .select("*")
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching Documents:', error);
    return [];
  }

  console.log(data);
  return data || [];
}

export async function getSpecificDocumentChunk (id){
  const { data, error } = await supabase
    .from('document_chunks')
    .select("*")
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching document_chunks:', error);
    return null;
  }

  return data || null;
}

export async function createDocumentsChunks(chunk){
  try {
    const resolvedName = chunk.document_id ?? chunk.name ?? '';

    const { data, error } = await supabase
      .from('document_chunks')
      .insert([{
        name: resolvedName,
        content: chunk.content ?? '',
        embedding: chunk.embedding ?? [],
        chunks_number: chunk.number ?? 0,
      }])
      .select()

    if (error) {
      console.error('Error creating Documents:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      console.error('Error message:', error.message);
      console.error('Error code:', error.code);
      console.error('Error details object:', error.details);
      console.error('Error hint:', error.hint);
      return null;
    }

    return data?.[0] || null;
  } catch (err) {
    console.error('Exception creating Documents:', err);
    return null;
  }
}

export async function deleteDocumentChunks(id){
  const { error } = await supabase
    .from('document_chunks')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting Documents:', error);
    return false;
  }

  return true;
}


export async function updateDocumentChunk(id, updates){
  const { data, error } = await supabase
    .from('document_chunks')
    .update(updates)
    .eq('id', id)
    .select()

  if (error) {
    console.error('Error updating Documents:', error);
    return null;
  }

  return data?.[0] || null;
}
