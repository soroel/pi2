import dotenv from 'dotenv';

console.log("NODE_ENV: " + process.env.NODE_ENV);

const result = dotenv.config()

if (result.error) {
  if (process.env.NODE_ENV === "development") {
    console.error(".env file not found. This is an error condition in development. Additional error is logged below");
    throw result.error;
  }

  // In production, environment variables are injected into the container environment. We should not even have
  // a .env file inside the running container.
}

interface Environment {
  session_secret: string,
  pi_api_key: string,
  platform_api_url: string,
  mongo_uri: string,
  mongo_db_name: string,
  frontend_url: string,
}

// For local development, you can set MONGODB_URI in your .env file
const mongoUri = process.env.MONGODB_URI || 
  `mongodb://${process.env.MONGODB_USERNAME}:${process.env.MONGODB_PASSWORD}@${process.env.MONGO_HOST || 'localhost:27017'}/${process.env.MONGODB_DATABASE_NAME || 'pi2'}`;

const env: Environment = {
  session_secret: process.env.SESSION_SECRET || "This is my session secret",
  pi_api_key: process.env.PI_API_KEY || '',
  platform_api_url: process.env.PLATFORM_API_URL || 'https://api.minepi.com',
  mongo_uri: mongoUri,
  mongo_db_name: process.env.MONGODB_DATABASE_NAME || 'pi2',
  frontend_url: process.env.FRONTEND_URL || 'http://localhost:3314',
};

export default env;
