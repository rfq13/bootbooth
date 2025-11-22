#ifndef BOOTH_IDENTITY_H
#define BOOTH_IDENTITY_H

#include <string>
#include <map>
#include <vector>
#include <mutex>
#include <sqlite3.h>

class BoothIdentityStore {
private:
    std::string baseDir;
    std::string dbPath;
    mutable std::mutex mu;
    bool initialized;
    sqlite3* db;
    
    bool initializeDatabase();
    bool createTables();
    bool executeSQL(const std::string& sql) const;
    bool executeSQL(const std::string& sql, std::vector<std::map<std::string, std::string>>& results) const;
    
public:
    BoothIdentityStore();
    ~BoothIdentityStore();
    bool init(const std::string& dir);
    bool hasIdentity() const;
    std::map<std::string, std::string> getLatest() const;
    bool save(const std::string& boothName, const std::string& location, const std::string& encryptedData);
    bool migrateFromJSON(const std::string& jsonPath);
};

#endif