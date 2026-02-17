'use client';

import { useState } from 'react';
import { splitText } from '@/lib/langchain/textSplit';
import { createDocumentsChunks } from '@/lib/supabase/doc_chunks';
import CHUNKING_PRESETS from '../../../../typeMedia';
export default function Textsplit() {
    const [id, setId] = useState('');
    const [typeMedia, setTypeMedia] = useState(Object.keys(CHUNKING_PRESETS)[0] || '');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [saveProgress, setSaveProgress] = useState(null);

    const handleTest = async () => {
        if (!id.trim()) {
            setError('Please enter an ID');
            return;
        }

        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const output = await splitText(id, typeMedia);
            setResult(output);
            console.log('Split result:', output);
        } catch (err) {
            setError(err.message || 'An error occurred');
            console.error('Error:', err);
        } finally {
            setLoading(false);
        }
    };
    const handleEmbed = async () => {
        if (!result || !Array.isArray(result)) {
            setError('No result to embed. Please run Test Split first.');
            return;
        }
        
        setLoading(true);
        setError(null);
        
        try {
            const response = await fetch('/api/embed', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ values: result }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to generate embeddings');
            }

            const { embeddings } = await response.json();
            console.log('Embeddings:', embeddings);
            setResult({ ...result, embeddings });
        } catch (err) {
            setError(err.message || 'An error occurred during embedding');
            console.error('Embedding error:', err);
        } finally {
            setLoading(false);
        }
    }

    const handleSaveToSupabase = async () => {
        if (!result || !result.embeddings || !Array.isArray(result.embeddings)) {
            setError('No embeddings found. Please run Test Split and then Embed first.');
            return;
        }

        setLoading(true);
        setError(null);
        setSaveProgress({ current: 0, total: result.embeddings.length });

        try {
            let savedCount = 0;

            for (let i = 0; i < result.embeddings.length; i++) {
                const chunk = result[i];
                const embedding = result.embeddings[i];

                const saved = await createDocumentsChunks({
                    name: id || `chunk-${i}`,
                    content: chunk.pageContent,
                    embedding: embedding,
                    number: i,
                });

                if (!saved) {
                    throw new Error(`Failed to save chunk ${i}`);
                }

                savedCount++;
                setSaveProgress({ current: savedCount, total: result.embeddings.length });
            }

            setSaveProgress({ current: savedCount, total: result.embeddings.length, done: true });
            console.log(`Successfully saved ${savedCount} chunks to Supabase`);
        } catch (err) {
            setError(err.message || 'An error occurred while saving to Supabase');
            console.error('Save error:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
            <h1>Text Split Test</h1>
            
            <div style={{ marginBottom: '1rem' }}>
                <label htmlFor="document-id" style={{ display: 'block', marginBottom: '0.5rem' }}>
                    Document ID:
                </label>
                <input
                    id="document-id"
                    type="text"
                    value={id}
                    onChange={(e) => setId(e.target.value)}
                    placeholder="Enter document ID"
                    style={{
                        width: '100%',
                        padding: '0.5rem',
                        fontSize: '1rem',
                        border: '1px solid #ccc',
                        borderRadius: '4px'
                    }}
                />
                <select
                    value={typeMedia}
                    onChange={(e) => setTypeMedia(e.target.value)}
                    style={{
                        width: '100%',
                        padding: '0.5rem',
                        fontSize: '1rem',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        marginTop: '0.5rem'
                    }}
                >
                    {Object.keys(CHUNKING_PRESETS).map((preset) => {
                        return(
                            <option key={preset} value={preset}>{preset}</option>
                        )
                    })}
                </select>
                
            </div>

            <button
                onClick={handleTest}
                disabled={loading}
                style={{
                    padding: '0.75rem 1.5rem',
                    fontSize: '1rem',
                    backgroundColor: loading ? '#ccc' : '#0070f3',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: loading ? 'not-allowed' : 'pointer'
                }}
            >
                {loading ? 'Testing...' : 'Test Split'}
            </button>

            {error && (
                <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#fee', color: '#c33', borderRadius: '4px' }}>
                    Error: {error}
                </div>
            )}

            {result && (
                <div style={{ marginTop: '1rem', padding: '1rem', borderRadius: '4px' }}>
                    <h3>Result:</h3>
                    <pre style={{ whiteSpace: 'pre-wrap', fontFamily: "Satoshi", wordBreak: 'break-word' }}>
                        {(() => {
                            // If result has embeddings, show only first few lines as preview
                            if (result.embeddings && Array.isArray(result.embeddings)) {
                                const previewResult = {
                                    ...result,
                                    embeddings: result.embeddings.slice(0, 3).map((emb, idx) => ({
                                        index: idx,
                                        preview: Array.isArray(emb) 
                                            ? `[${emb.slice(0, 5).map(v => v.toFixed(4)).join(', ')}, ...] (${emb.length} dimensions)`
                                            : emb
                                    })).concat(
                                        result.embeddings.length > 3 
                                            ? [{ note: `... and ${result.embeddings.length - 3} more embeddings` }]
                                            : []
                                    )
                                };
                                return JSON.stringify(previewResult, null, 2);
                            }
                            return JSON.stringify(result, null, 2);
                        })()}
                    </pre>
                </div>
            )}
            <button
                onClick={handleEmbed}
                disabled={loading || !result || !Array.isArray(result)}
                style={{
                    padding: '0.75rem 1.5rem',
                    fontSize: '1rem',
                    backgroundColor: (loading || !result || !Array.isArray(result)) ? '#ccc' : '#7928ca',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: (loading || !result || !Array.isArray(result)) ? 'not-allowed' : 'pointer',
                    marginLeft: '0.5rem'
                }}
            >
                Embed
            </button>

            <button
                onClick={handleSaveToSupabase}
                disabled={loading || !result?.embeddings}
                style={{
                    padding: '0.75rem 1.5rem',
                    fontSize: '1rem',
                    backgroundColor: (loading || !result?.embeddings) ? '#ccc' : '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: (loading || !result?.embeddings) ? 'not-allowed' : 'pointer',
                    marginLeft: '0.5rem'
                }}
            >
                {loading && saveProgress ? `Saving ${saveProgress.current}/${saveProgress.total}...` : 'Save to Supabase'}
            </button>

            {saveProgress?.done && (
                <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#d1fae5', color: '#065f46', borderRadius: '4px' }}>
                    Successfully saved {saveProgress.total} chunks to Supabase!
                </div>
            )}
        </div>
    );
}
