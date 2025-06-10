import axios, { AxiosError, AxiosRequestConfig } from "axios";
import env from "../environments";

// Extend the AxiosRequestConfig to include our custom retry options
interface PiAxiosRequestConfig extends AxiosRequestConfig {
  _retry?: boolean;
  _retryCount?: number;
}

const MAX_RETRIES = 3;
const INITIAL_TIMEOUT = 60000; // 30 seconds

const platformAPIClient = axios.create({
  baseURL: env.platform_api_url,
  timeout: INITIAL_TIMEOUT,
  headers: { 
    'Authorization': `Key ${env.pi_api_key}`,
    'Content-Type': 'application/json'
  }
});

// Add a request interceptor for logging and retry logic
platformAPIClient.interceptors.request.use(
  (config) => {
    console.log(`[Pi API] ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('[Pi API] Request error:', error);
    return Promise.reject(error);
  }
);

// Add a response interceptor for handling errors and retries
platformAPIClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as PiAxiosRequestConfig;
    
    // If we don't have a config or we've already retried, reject
    if (!config || config._retry) {
      return Promise.reject(error);
    }

    // Mark that we're retrying this request
    config._retry = true;
    
    // Log the error
    console.error(`[Pi API] Request failed: ${error.message}`, {
      url: config.url,
      method: config.method,
      status: error.response?.status,
      data: error.response?.data
    });

    // If it's a timeout error or server error, retry with exponential backoff
    if (error.code === 'ECONNABORTED' || (error.response && error.response.status >= 500)) {
      const retryCount = config['_retryCount'] = (config['_retryCount'] || 0) + 1;
      
      if (retryCount <= MAX_RETRIES) {
        const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
        console.log(`[Pi API] Retrying (${retryCount}/${MAX_RETRIES}) in ${delay}ms...`);
        
        // Create a new config with increased timeout
        const newConfig = {
          ...config,
          timeout: INITIAL_TIMEOUT * (retryCount + 1)
        };
        
        return new Promise(resolve => 
          setTimeout(() => resolve(platformAPIClient(newConfig)), delay)
        );
      }
    }
    
    return Promise.reject(error);
  }
);

export default platformAPIClient;