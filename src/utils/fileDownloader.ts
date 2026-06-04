import toast from 'react-hot-toast';
import api from '../services/api';

/**
 * Programmatically downloads a file from a URL by fetching it as a blob.
 * Falls back to opening the URL in a new tab if blocked by CORS or network issues.
 * 
 * @param url The S3 or relative URL of the file to download
 * @param filename The desired name for the downloaded file (without extension or with extension)
 */
export const downloadFile = async (url: string, filename: string) => {
    if (!url) {
        toast.error('No document URL provided for download.');
        return;
    }
    
    const toastId = toast.loading('Starting download...');
    try {
        // Construct backend proxy download URL to bypass CORS limits
        const backendBaseUrl = api.defaults.baseURL || 'http://localhost:3000';
        const cleanBaseUrl = backendBaseUrl.replace(/\/$/, '');
        const proxyUrl = `${cleanBaseUrl}/api/proxy-download?url=${encodeURIComponent(url)}`;

        const response = await fetch(proxyUrl, {
            method: 'GET',
        });
        
        if (!response.ok) {
            throw new Error(`Failed to fetch file: ${response.statusText}`);
        }
        
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = blobUrl;
        
        // Extract file extension from the URL if not provided in filename
        let finalFilename = filename;
        const urlPathPart = url.split(/[?#]/)[0];
        const urlExt = urlPathPart.split('.').pop();
        if (urlExt && urlExt !== urlPathPart && !filename.toLowerCase().endsWith(`.${urlExt.toLowerCase()}`)) {
            finalFilename = `${filename}.${urlExt}`;
        }
        
        link.download = finalFilename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
        
        toast.success('Download completed successfully!', { id: toastId });
    } catch (error: any) {
        console.error('Direct download failed, falling back to opening in a new tab:', error);
        toast.error('Direct download blocked. Opening file in new tab...', { id: toastId });
        // Fallback: Open in new tab
        window.open(url, '_blank', 'noopener,noreferrer');
    }
};
