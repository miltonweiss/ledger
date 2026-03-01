import { supabase } from "./client"

export async function getYoutubeVideos (){
  const { data, error } = await supabase
    .from('youtube_videos')
    .select("*")
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching Youtube Videos:', error);
    return [];
  }

  return data || [];
}

export async function getSpecificYoutubeVideo (id){
  const { data, error } = await supabase
    .from('youtube_videos')
    .select("*")
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching Youtube Videos:', error);
    return null;
  }

  return data || null;
}

export async function createYoutubeVideo(video){
  try {
    const { data, error } = await supabase
      .from('youtube_videos')
      .insert([{
        name: video.name || "",
        text: video.text || video.fileContent || "",
      }])
      .select()

    if (error) {
      console.error('Error creating Youtube Videos:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      console.error('Error message:', error.message);
      console.error('Error code:', error.code);
      console.error('Error details object:', error.details);
      console.error('Error hint:', error.hint);
      return null;
    }

    return data?.[0] || null;
  } catch (err) {
    console.error('Exception creating Youtube Videos:', err);
    return null;
  }
}

export async function deleteYoutubeVideo(id){
  const { error } = await supabase
    .from('youtube_videos')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting Youtube Videos:', error);
    return false;
  }

  return true;
}


export async function updateYoutubeVideo(id, updates){
  const { data, error } = await supabase
    .from('youtube_videos')
    .update(updates)
    .eq('id', id)
    .select()

  if (error) {
    console.error('Error updating Youtube Videos:', error);
    return null;
  }

  return data?.[0] || null;
}

