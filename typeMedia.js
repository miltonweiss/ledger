const CHUNKING_PRESETS = {
    article:        { size: 500, overlap: 100 },
    documentation:  { size: 300, overlap: 70 },
    code:           { size: 200, overlap: 30 },
    transcript:     { size: 800, overlap: 150 },
    chat:           { size: 700, overlap: 200 },
    list:           { size: 200, overlap: 20 },
    marketing:      { size: 400, overlap: 60 },
    legal:          { size: 300, overlap: 100 },
};

export default CHUNKING_PRESETS;