const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { readFileSync } = require('fs');
const { join } = require('path');

let db = null;

function getDb() {
  if (db) return db;

  const serviceAccount = JSON.parse(
    readFileSync(join(__dirname, 'serviceAccount.json'), 'utf-8')
  );

  initializeApp({
    credential: cert(serviceAccount)
  });

  db = getFirestore();
  return db;
}

exports.handler = async (event) => {
  // Handle CORS preflight (OPTIONS) request
  if (event.requestContext.http.method === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': '*'
      }
    };
  }

  try {
    const firestore = getDb();

    // Get book count from Firestore
    const snapshot = await firestore.collection('books').count().get();
    const count = snapshot.data().count;

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ count })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: error.message, stack: error.stack })
    };
  }
};
