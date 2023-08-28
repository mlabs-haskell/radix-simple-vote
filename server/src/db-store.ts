import fs from 'fs';

export enum DbKeys {
  Polls = "polls",
  Challenges = "challenges",
}

export type DbInterface = ReturnType<typeof DbStore>;

export const DbStore = (jsonPath: string) => {
  // Initial loading of the JSON file data into memory
  let db: any= {};
  try {
    const rawData = fs.readFileSync(jsonPath, 'utf-8');
    db = JSON.parse(rawData);
  } catch (error) {
    console.log("Couldn't load data from file, starting with an empty DB.");
  }

  // Helper function to persist the in-memory data to file
  const persistToDisk = () => new Promise((resolve, reject) => 
    fs.writeFile(jsonPath, JSON.stringify(db, null, 2), 'utf-8', (err) => {}))

  return {
    // Fetch an entry by key
    get: (key: string) => {
      return db[key];
    },

    // Set an entry by key and persist to disk
    set: (key: string, value: any) => {
      db[key] = value;
      persistToDisk();
    },

    // Delete an entry by key and persist to disk
    delete: (key: string) => {
      delete db[key];
      persistToDisk();
    },

    // Fetch the entire in-memory database
    getAll: () => {
      return db;
    },
  };
};
