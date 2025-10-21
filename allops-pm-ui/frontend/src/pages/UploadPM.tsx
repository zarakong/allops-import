import React from 'react';

const UploadPM: React.FC = () => {
    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            // Handle file upload logic here
            console.log('File uploaded:', file.name);
        }
    };

    return (
        <div className="upload-pm">
            <h1>Upload PM Data</h1>
            <input type="file" onChange={handleFileUpload} />
            <button type="submit">Upload</button>
        </div>
    );
};

export default UploadPM;