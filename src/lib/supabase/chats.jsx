import { supabase } from "./client"

export async function getChats (){
  const { data, error } = await supabase
    .from('chats')
    .select("*")
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching chats:', error);
    return [];
  }

  console.log(data);
  return data || [];
}

export async function getSpecificChat (id){
  const { data, error } = await supabase
    .from('chats')
    .select("*")
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching chat:', error);
    return null;
  }

  return data || null;
}

export async function createChat(chat){
  try {
    const { data, error } = await supabase
      .from('chats')
      .insert([{
        conversation: chat.conversation || [],
        name: chat.name || new Date().toISOString(),
        personality: chat.personality || null
      }])
      .select()

    if (error) {
      console.error('Error creating chat:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      console.error('Error message:', error.message);
      console.error('Error code:', error.code);
      console.error('Error details object:', error.details);
      console.error('Error hint:', error.hint);
      return null;
    }

    return data?.[0] || null;
  } catch (err) {
    console.error('Exception creating chat:', err);
    return null;
  }
}

export async function deleteChat(id){
  const { error } = await supabase
    .from('chats')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting chat:', error);
    return false;
  }

  return true;
}


export async function updateChat(id, updates){
  const { data, error } = await supabase
    .from('chats')
    .update(updates)
    .eq('id', id)
    .select()

  if (error) {
    console.error('Error updating chat:', error);
    return null;
  }

  return data?.[0] || null;
}

