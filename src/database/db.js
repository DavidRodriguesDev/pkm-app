import * as SQLite from 'expo-sqlite';

// A API antiga (SQLite.openDatabase, callback-based) foi removida nas
// versões atuais do expo-sqlite. A API nova abre o banco de forma
// síncrona e as queries são feitas por método (getAllAsync, runAsync,
// getFirstAsync, execAsync) em vez de db.executeAsync(...).
const db = SQLite.openDatabaseSync('pkm-app.db');

export { db };