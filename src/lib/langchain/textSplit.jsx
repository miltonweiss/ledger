import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { getSpecificDocument } from "../supabase/documents";
import CHUNKING_PRESETS from "../../../typeMedia"
export async function splitText (id, typeMedia){
    
        const text = await getSpecificDocument(id)
        const splitter = new RecursiveCharacterTextSplitter({ chunkSize: CHUNKING_PRESETS[typeMedia].size, chunkOverlap: CHUNKING_PRESETS[typeMedia].overlap })
        const texts = await splitter.createDocuments([text.text])
        console.log(texts);
        return texts;
    
}