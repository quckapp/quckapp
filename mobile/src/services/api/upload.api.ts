/**
 * Upload API Service
 * Handles all file upload related API calls
 */

import api from '../api';

// Types
export interface UploadResponse {
  url: string;
  thumbnail?: string;
  filename: string;
  size: number;
  mimeType: string;
  duration?: number;
  width?: number;
  height?: number;
}

export interface MultipleUploadResponse {
  files: UploadResponse[];
  failed: Array<{
    filename: string;
    error: string;
  }>;
}

// Helper function to create FormData for file upload
const createFormData = (
  file: {
    uri: string;
    name: string;
    type: string;
  },
  fieldName: string = 'file'
): FormData => {
  const formData = new FormData();
  formData.append(fieldName, {
    uri: file.uri,
    name: file.name,
    type: file.type,
  } as any);
  return formData;
};

// Upload API Service
const uploadApi = {
  // Single File Uploads
  uploadImage: (file: { uri: string; name: string; type: string }) =>
    api.post<UploadResponse>('/upload/image', createFormData(file, 'image'), {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),

  uploadVideo: (file: { uri: string; name: string; type: string }) =>
    api.post<UploadResponse>('/upload/video', createFormData(file, 'video'), {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 60000, // 60 seconds for video uploads
    }),

  uploadAudio: (file: { uri: string; name: string; type: string }) =>
    api.post<UploadResponse>('/upload/audio', createFormData(file, 'audio'), {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),

  uploadFile: (file: { uri: string; name: string; type: string }) =>
    api.post<UploadResponse>('/upload/file', createFormData(file, 'file'), {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),

  // Multiple Files Upload
  uploadMultiple: (
    files: Array<{ uri: string; name: string; type: string }>
  ) => {
    const formData = new FormData();
    files.forEach((file, index) => {
      formData.append('files', {
        uri: file.uri,
        name: file.name,
        type: file.type,
      } as any);
    });

    return api.post<MultipleUploadResponse>('/upload/multiple', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 120000, // 2 minutes for multiple file uploads
    });
  },
};

export default uploadApi;
