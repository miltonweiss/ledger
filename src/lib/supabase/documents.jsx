import { supabase } from "./client"

export async function getDocuments (){
  const { data, error } = await supabase
    .from('documents')
    .select("*")
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching Documents:', error);
    return [];
  }

  console.log(data);
  return data || [];
}

export async function getSpecificDocument (id){
  const { data, error } = await supabase
    .from('documents')
    .select("*")
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching Documents:', error);
    return null;
  }

  return data || null;
}

export async function createDocuments(document){
  try {
    const { data, error } = await supabase
      .from('documents')
      .insert([{
        name: document.name || "",
        text: document.fileContent || "",
        
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

export async function deleteDocuments(id){
  const { error } = await supabase
    .from('documents')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting Documents:', error);
    return false;
  }

  return true;
}


export async function updateDocuments(id, updates){
  const { data, error } = await supabase
    .from('documents')
    .update(updates)
    .eq('id', id)
    .select()

  if (error) {
    console.error('Error updating Documents:', error);
    return null;
  }

  return data?.[0] || null;
}

