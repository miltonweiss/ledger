'use client';
import { useEffect, useState } from "react";
import { getDocuments, createDocuments } from "@/lib/supabase/documents";
import FileUploader from "@/components/fileUploader";
export default function DocumentAdmin() {
    const [documents, setDocuments] = useState([])
    const [loading, setLoading] = useState(true)
    const [file, setFile] = useState(null)
    const [fileContent, setFileContent] = useState("")
    const [saving, setSaving] = useState(false)
    const [isExtracting, setIsExtracting] = useState(false)
    const [uploadError, setUploadError] = useState("")
    useEffect( () => {
        handleFetch()
      }, []);   

      

    async function handleFetch (){
        const result = await getDocuments()
        setDocuments(result)
        setLoading(false)
    }

    function shrinkText (text){
        if (!text) {
            return "";
        }
        const sliceText = text.slice(0, 50);
        return ( sliceText + "...")
    }
    async function handleSaveToDB (){
        if (!file || !fileContent) {
            console.error('No file or file content to save');
            alert('Please select a file first');
            return;
        }
        
        if (saving) {
            return; // Prevent multiple clicks
        }
        
        setSaving(true);
        
        try {
            
            const documentData = {
                name: file.name || "",
                fileContent: fileContent
            };
            
            const result = await createDocuments(documentData);
            if (result) {
                
                
                // Refresh the documents list
                await handleFetch();
                // Clear the form
                setFile(null);
                setFileContent("");
                setUploadError("");
            } else {
                alert('Failed to save document');
            }
        } catch (error) {
            console.error('Error saving document:', error);
            alert('Error saving document: ' + error.message);
        } finally {
            setSaving(false);
        }
    }
    return (
        <>
            {/* name of each tab group should be unique */}
        <div className="tabs tabs-lift foreground rounded-t-[0]">
        <input type="radio" name="my_tabs_2" className="tab foreforeground" aria-label="See Documets" />
        <div className="tab-content foreforeground border-base-300 p-6">
            {loading ? (
                <p className="text-secondary">Loading documents...</p>
            ) : (
            <div className="overflow-x-auto">
                <table className="table">
                    <thead>
                        <tr>
                            <th>Index</th>
                            <th>Name</th>
                            <th >text</th>
                        </tr>
                    </thead>
                    <tbody>
                        {documents.map( (document, index ) => {
                            return(
                                <tr key={index}>
                                    <th>{index}</th>
                                    <td>{document.name}</td>
                                    <td>{shrinkText(document.text)}</td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
            )}
        </div>

        <input type="radio" name="my_tabs_2" className="tab foreforeground" aria-label="Add documents" defaultChecked />
        <div className="tab-content foreforeground border-base-300 p-6">

            <FileUploader
            setFunc={setFile}
            getVar={file}
            fileContent={fileContent}
            setFileContent={setFileContent}
            isExtracting={isExtracting}
            setIsExtracting={setIsExtracting}
            uploadError={uploadError}
            setUploadError={setUploadError}
            />
            <button 
                onClick={handleSaveToDB}
                disabled={!file || !fileContent || saving || isExtracting || !!uploadError}
                className="mt-5 w-full rounded-lg borderDefault px-4 py-2 text-sm font-medium accent-bg disabled:cursor-not-allowed disabled:opacity-50"
            >
                {saving ? 'Saving...' : 'Move to Supabase'}
            </button>
        </div>

        </div>
        </>
    );
}
