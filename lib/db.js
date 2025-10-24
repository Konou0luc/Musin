import { MongoClient } from 'mongodb';

let cachedClient = null;
let cachedDb = null;

export async function getDb() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB || 'app';
  if (!uri) {
    throw new Error('MONGODB_URI non défini');
  }
  if (cachedDb && cachedClient) {
    return { client: cachedClient, db: cachedDb };
  }
  const client = new MongoClient(uri, { maxPoolSize: 5 });
  await client.connect();
  const db = client.db(dbName);
  cachedClient = client;
  cachedDb = db;
  return { client, db };
}

export async function getCollection(collectionName) {
  const { db } = await getDb();
  return db.collection(collectionName);
}
