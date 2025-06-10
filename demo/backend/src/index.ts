import fs from 'fs';
import path from 'path';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import logger from 'morgan';
import MongoStore from 'connect-mongo';
import { MongoClient } from 'mongodb';
import env from './environments';
import mountPaymentsEndpoints from './handlers/payments';
import mountUserEndpoints from './handlers/users';
import "./types/session";

const dbName = env.mongo_db_name;
const mongoUri = `mongodb://${env.mongo_host}/${dbName}`;
const mongoClientOptions = {
  authSource: "admin",
  auth: {
    username: env.mongo_user,
    password: env.mongo_password,
  },
  useNewUrlParser: true,
  useUnifiedTopology: true
};

const app: express.Application = express();

// Dev console log
app.use(logger('dev'));

// Persistent access logs
app.use(logger('common', {
  stream: fs.createWriteStream(path.join(__dirname, '..', 'log', 'access.log'), { flags: 'a' }),
}));

// JSON body parser
app.use(express.json());

const allowedOrigins = [
  env.frontend_url,
  'http://localhost:3314',
  'http://127.0.0.1:3314'
];

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.some(allowed => origin.startsWith(allowed))) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  exposedHeaders: ['set-cookie'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Fix for TS error on app.options - wrap cors middleware in lambda
app.options('*', (req, res, next) => cors(corsOptions)(req, res, next));

// Cookie parser
app.use(cookieParser());

// Session config
app.use(session({
  secret: env.session_secret,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: mongoUri,
    mongoOptions: mongoClientOptions,
    dbName: dbName,
    collectionName: 'user_sessions',
    ttl: 14 * 24 * 60 * 60 // 14 days in seconds
  }),
  cookie: {
    // For cross-origin requests, sameSite must be 'none' and secure must be true
    secure: true, // Required for sameSite: 'none'
    httpOnly: true,
    sameSite: 'none', // Required for cross-origin requests
    maxAge: 14 * 24 * 60 * 60 * 1000, // 14 days in milliseconds
    // Only set domain in production with your actual domain
    domain: process.env.NODE_ENV === 'production' ? '.yourdomain.com' : undefined
  },
  proxy: true
}));

// Session debug (only in non-production)
app.use((req, res, next) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log('Session ID:', req.sessionID);
    console.log('Session data:', JSON.stringify(req.session, null, 2));
  }
  next();
});

// Mount endpoints
const paymentsRouter = express.Router();
mountPaymentsEndpoints(paymentsRouter);
app.use('/payments', paymentsRouter);

const userRouter = express.Router();
mountUserEndpoints(userRouter);
app.use('/user', userRouter);

// Health check endpoint for Render
app.get('/health', (_, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Root endpoint
app.get('/', (_, res) => {
  res.status(200).json({ 
    message: "Pi2 Backend API",
    status: 'operational',
    timestamp: new Date().toISOString()
  });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'CORS policy does not allow access from this origin.' });
  }
  res.status(500).json({ error: 'Internal Server Error' });
});

// Start server
app.listen(8000, async () => {
  try {
    const client = await MongoClient.connect(mongoUri, mongoClientOptions);
    const db = client.db(dbName);
    app.locals.orderCollection = db.collection('orders');
    app.locals.userCollection = db.collection('users');
    console.log('Connected to MongoDB on:', mongoUri);
  } catch (err) {
    console.error('Connection to MongoDB failed:', err);
    process.exit(1);
  }

  console.log('App platform demo app - Backend listening on port 8000!');
  console.log(`CORS config: configured to respond to frontend at ${env.frontend_url}`);
  console.log('Environment:', process.env.NODE_ENV || 'development');
});
