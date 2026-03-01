import { supabase } from "./client"

export async function getYoutubeVideoChunks (){
  const { data, error } = await supabase
    .from('youtube_videos_chunks')
    .select("*")
    .order('date_Added', { ascending: false })

  if (error) {
      console.error('Error fetching Youtube Video Chunks:', error);
      return false;
  }

  return data || false;
}

export async function getSpecificYoutubeVideoChunk (id){
  const { data, error } = await supabase
    .from('youtube_video_chunks')
    .select("*")
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching Youtube Video Chunks:', error);
    return null;
  }

  return data || null;
}

export async function createYoutubeVideoChunk(chunk){
  try {
    const payload = {
      name: chunk.name ?? '',
      content: chunk.content ?? '',
      embedding: chunk.embedding ?? [],
      chunks_number: chunk.number ?? 0,
    }

    let data = null
    let error = null

    ;({ data, error } = await supabase
      .from('youtube_videos_chunks')
      .insert([payload])
      .select())

    if (error) {
      console.error('Error creating Youtube Video Chunks:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      console.error('Error message:', error.message);
      console.error('Error code:', error.code);
      console.error('Error details object:', error.details);
      console.error('Error hint:', error.hint);
      return null;
    }

    return data?.[0] || null;
  } catch (err) {
    console.error('Exception creating Youtube Video Chunks:', err);
    return null;
  }
}

export async function deleteYoutubeVideoChunk(id){
  const { error } = await supabase
    .from('youtube_videos_chunks')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting Youtube Video Chunks:', error);
    return false;
  }

  return true;
}


export async function updateYoutubeVideoChunk(id, updates){
  const { data, error } = await supabase
    .from('youtube_videos_chunks')
    .update(updates)
    .eq('id', id)
    .select()

  if (error) {
      console.error('Error updating Youtube Video Chunks:', error);
      return false;
  }

  return true;
}
