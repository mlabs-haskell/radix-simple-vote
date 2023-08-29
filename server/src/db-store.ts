import fs from 'fs';

export enum DbKeys {
  Polls = "polls",
  Challenges = "challenges",
}

export type DbInterface = ReturnType<typeof DbStore>;

export const DbStore = (jsonPath: string) => {
  let db: any= {};
  try {
    const rawData = fs.readFileSync(jsonPath, 'utf-8');
    db = JSON.parse(rawData);
  } catch (error) {
    console.log("Couldn't load data from file, starting with an empty DB.");
  }

  const persistToDisk = () => new Promise((resolve, reject) => 
    fs.writeFile(jsonPath, JSON.stringify(db, null, 2), 'utf-8', (err) => {}))

  return {
    get: (key: string) => {
      return db[key];
    },

    set: (key: string, value: any) => {
      db[key] = value;
      persistToDisk();
    },

    delete: (key: string) => {
      delete db[key];
      persistToDisk();
    },

    getAll: () => {
      return db;
    },
  };
};
