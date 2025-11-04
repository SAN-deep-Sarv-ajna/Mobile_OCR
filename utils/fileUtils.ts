
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        // The result is a data URL like "data:image/png;base64,iVBORw0KGgo...".
        // We need to strip the prefix to get just the base64 part.
        const base64String = reader.result.split(',')[1];
        resolve(base64String);
      } else {
        reject(new Error("Failed to read file as base64 string."));
      }
    };
    reader.onerror = (error) => reject(error);
  });
};

// --- API Key Management for non-AI Studio environments ---

const API_KEY_SESSION_STORAGE_KEY = 'gemini-api-key';

export const setApiKey = (apiKey: string): void => {
  sessionStorage.setItem(API_KEY_SESSION_STORAGE_KEY, apiKey);
};

export const getApiKey = (): string | null => {
  return sessionStorage.getItem(API_KEY_SESSION_STORAGE_KEY);
};

export const clearApiKey = (): void => {
  sessionStorage.removeItem(API_KEY_SESSION_STORAGE_KEY);
};

export const hasApiKey = (): boolean => {
  return getApiKey() !== null;
};
