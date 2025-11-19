#include "../include/booth_identity.h"
#include <fstream>
#include <sstream>
#include <ctime>
#include <iostream>
#include <cstdio>

BoothIdentityStore::BoothIdentityStore() : initialized(false), db(nullptr) {}

BoothIdentityStore::~BoothIdentityStore() {
    if (db != nullptr) {
        sqlite3_close(db);
        db = nullptr;
    }
}

bool BoothIdentityStore::initializeDatabase() {
    std::string sql = "CREATE TABLE IF NOT EXISTS booth_identities ("
                      "id INTEGER PRIMARY KEY AUTOINCREMENT,"
                      "booth_name TEXT NOT NULL,"
                      "location TEXT NOT NULL,"
                      "encrypted_data TEXT,"
                      "created_at INTEGER NOT NULL"
                      ");";
    
    return executeSQL(sql);
}

bool BoothIdentityStore::createTables() {
    return initializeDatabase();
}

bool BoothIdentityStore::executeSQL(const std::string& sql) const {
    char* errMsg = nullptr;
    int rc = sqlite3_exec(db, sql.c_str(), nullptr, nullptr, &errMsg);
    
    if (rc != SQLITE_OK) {
        std::cerr << "❌ SQL error: " << errMsg << std::endl;
        std::cerr << "❌ SQL statement: " << sql << std::endl;
        sqlite3_free(errMsg);
        return false;
    }
    
    return true;
}

bool BoothIdentityStore::executeSQL(const std::string& sql, std::vector<std::map<std::string, std::string>>& results) const {
    sqlite3_stmt* stmt;
    int rc = sqlite3_prepare_v2(db, sql.c_str(), -1, &stmt, nullptr);
    
    if (rc != SQLITE_OK) {
        std::cerr << "❌ Failed to prepare SQL: " << sqlite3_errmsg(db) << std::endl;
        std::cerr << "❌ SQL statement: " << sql << std::endl;
        return false;
    }
    
    results.clear();
    
    while ((rc = sqlite3_step(stmt)) == SQLITE_ROW) {
        std::map<std::string, std::string> row;
        int columnCount = sqlite3_column_count(stmt);
        
        for (int i = 0; i < columnCount; i++) {
            const char* columnName = sqlite3_column_name(stmt, i);
            const char* columnValue = reinterpret_cast<const char*>(sqlite3_column_text(stmt, i));
            
            if (columnName && columnValue) {
                row[columnName] = columnValue;
            } else if (columnName) {
                row[columnName] = "";
            }
        }
        
        results.push_back(row);
    }
    
    sqlite3_finalize(stmt);
    
    if (rc != SQLITE_DONE) {
        std::cerr << "❌ SQL execution error: " << sqlite3_errmsg(db) << std::endl;
        return false;
    }
    
    return true;
}

bool BoothIdentityStore::init(const std::string& dir) {
    std::lock_guard<std::mutex> lock(mu);
    
    if (initialized) {
        return true;
    }
    
    baseDir = dir;
    dbPath = baseDir + "/booth_identity.db";
    
    int rc = sqlite3_open(dbPath.c_str(), &db);
    if (rc != SQLITE_OK) {
        std::cerr << "❌ Cannot open database: " << sqlite3_errmsg(db) << std::endl;
        if (db) {
            sqlite3_close(db);
            db = nullptr;
        }
        return false;
    }
    
    // Enable foreign keys
    if (!executeSQL("PRAGMA foreign_keys = ON;")) {
        std::cerr << "❌ Failed to enable foreign keys" << std::endl;
        sqlite3_close(db);
        db = nullptr;
        return false;
    }
    
    // Create tables
    if (!createTables()) {
        std::cerr << "❌ Failed to create database tables" << std::endl;
        sqlite3_close(db);
        db = nullptr;
        return false;
    }
    
    // Try to migrate from JSON if it exists
    std::string jsonPath = baseDir + "/booth_identity.json";
    std::ifstream jsonFile(jsonPath);
    if (jsonFile.good()) {
        std::cout << "🔄 Migrating data from JSON to SQLite..." << std::endl;
        if (!migrateFromJSON(jsonPath)) {
            std::cout << "⚠️  Warning: Migration from JSON failed, but continuing with SQLite" << std::endl;
        } else {
            std::cout << "✅ Successfully migrated data from JSON to SQLite" << std::endl;
            // Backup the old JSON file
            std::string backupPath = jsonPath + ".backup";
            std::rename(jsonPath.c_str(), backupPath.c_str());
            std::cout << "📦 Backed up old JSON file to: " << backupPath << std::endl;
        }
    }
    
    initialized = true;
    std::cout << "✅ BoothIdentityStore initialized with SQLite database: " << dbPath << std::endl;
    return true;
}

bool BoothIdentityStore::hasIdentity() const {
    std::lock_guard<std::mutex> lock(mu);
    
    if (!initialized || !db) {
        return false;
    }
    
    std::string sql = "SELECT COUNT(*) as count FROM booth_identities LIMIT 1";
    std::vector<std::map<std::string, std::string>> results;
    
    if (!executeSQL(sql, results)) {
        return false;
    }
    
    if (!results.empty()) {
        std::string countStr = results[0]["count"];
        return std::stoi(countStr) > 0;
    }
    
    return false;
}

std::map<std::string, std::string> BoothIdentityStore::getLatest() const {
    std::lock_guard<std::mutex> lock(mu);
    
    std::map<std::string, std::string> out;
    
    if (!initialized || !db) {
        std::cerr << "❌ Database not initialized" << std::endl;
        return out;
    }
    
    std::string sql = "SELECT booth_name, location, encrypted_data, created_at "
                      "FROM booth_identities "
                      "ORDER BY created_at DESC, id DESC "
                      "LIMIT 1";
    
    std::vector<std::map<std::string, std::string>> results;
    if (!executeSQL(sql, results)) {
        std::cerr << "❌ Failed to query latest identity" << std::endl;
        return out;
    }
    
    if (!results.empty()) {
        out = results[0];
        std::cout << "🔍 Retrieved latest identity with " << out.size() << " fields" << std::endl;
    }
    
    return out;
}

bool BoothIdentityStore::save(const std::string& boothName, const std::string& location, const std::string& encryptedData) {
    std::lock_guard<std::mutex> lock(mu);
    
    if (!initialized || !db) {
        std::cerr << "❌ Database not initialized" << std::endl;
        return false;
    }
    
    // Validate inputs
    if (boothName.empty() || location.empty()) {
        std::cerr << "❌ Invalid input: booth_name or location is empty" << std::endl;
        return false;
    }
    
    if (boothName.length() < 3 || boothName.length() > 50) {
        std::cerr << "❌ Invalid booth_name length: " << boothName.length() << " (must be 3-50 chars)" << std::endl;
        return false;
    }
    
    // Validate location format (should be "lat,lng")
    size_t commaPos = location.find(',');
    if (commaPos == std::string::npos) {
        std::cerr << "❌ Invalid location format: " << location << " (expected lat,lng)" << std::endl;
        return false;
    }
    
    try {
        std::string latStr = location.substr(0, commaPos);
        std::string lngStr = location.substr(commaPos + 1);
        double lat = std::stod(latStr);
        double lng = std::stod(lngStr);
        
        if (lat < -90.0 || lat > 90.0) {
            std::cerr << "❌ Invalid latitude: " << lat << " (must be -90..90)" << std::endl;
            return false;
        }
        if (lng < -180.0 || lng > 180.0) {
            std::cerr << "❌ Invalid longitude: " << lng << " (must be -180..180)" << std::endl;
            return false;
        }
    } catch (const std::exception& e) {
        std::cerr << "❌ Failed to parse location coordinates: " << e.what() << std::endl;
        return false;
    }
    
    std::time_t t = std::time(nullptr);
    
    // Use prepared statement to prevent SQL injection
    sqlite3_stmt* stmt;
    std::string sql = "INSERT INTO booth_identities (booth_name, location, encrypted_data, created_at) "
                      "VALUES (?, ?, ?, ?)";
    
    int rc = sqlite3_prepare_v2(db, sql.c_str(), -1, &stmt, nullptr);
    if (rc != SQLITE_OK) {
        std::cerr << "❌ Failed to prepare insert statement: " << sqlite3_errmsg(db) << std::endl;
        return false;
    }
    
    sqlite3_bind_text(stmt, 1, boothName.c_str(), -1, SQLITE_STATIC);
    sqlite3_bind_text(stmt, 2, location.c_str(), -1, SQLITE_STATIC);
    sqlite3_bind_text(stmt, 3, encryptedData.c_str(), -1, SQLITE_STATIC);
    sqlite3_bind_int64(stmt, 4, t);
    
    rc = sqlite3_step(stmt);
    sqlite3_finalize(stmt);
    
    if (rc != SQLITE_DONE) {
        std::cerr << "❌ Failed to insert identity: " << sqlite3_errmsg(db) << std::endl;
        return false;
    }
    
    std::cout << "✅ Successfully saved identity: " << boothName << " at " << location << std::endl;
    return true;
}

bool BoothIdentityStore::migrateFromJSON(const std::string& jsonPath) {
    std::ifstream in(jsonPath);
    if (!in.good()) {
        std::cout << "ℹ️  No JSON file found at: " << jsonPath << std::endl;
        return true; // Not an error, just no file to migrate
    }
    
    std::ostringstream ss;
    ss << in.rdbuf();
    std::string content = ss.str();
    
    if (content.empty() || content == "[]") {
        std::cout << "ℹ️  JSON file is empty, nothing to migrate" << std::endl;
        return true;
    }
    
    // Simple JSON parsing for migration
    // Find all objects in the array
    size_t pos = 0;
    int migratedCount = 0;
    
    while ((pos = content.find('{', pos)) != std::string::npos) {
        size_t objEnd = pos;
        int braceCount = 0;
        
        for (size_t i = pos; i < content.size(); ++i) {
            if (content[i] == '{') braceCount++;
            else if (content[i] == '}') {
                braceCount--;
                if (braceCount == 0) {
                    objEnd = i;
                    break;
                }
            }
        }
        
        if (braceCount != 0) break;
        
        std::string obj = content.substr(pos, objEnd - pos + 1);
        
        // Extract values from JSON object
        std::string boothName, location, encryptedData;
        std::time_t createdAt = 0;
        
        // Simple parsing for known fields
        size_t found = obj.find("\"booth_name\"");
        if (found != std::string::npos) {
            size_t start = obj.find('"', found + 13);
            size_t end = obj.find('"', start + 1);
            if (start != std::string::npos && end != std::string::npos) {
                boothName = obj.substr(start + 1, end - start - 1);
            }
        }
        
        found = obj.find("\"location\"");
        if (found != std::string::npos) {
            size_t start = obj.find('"', found + 11);
            size_t end = obj.find('"', start + 1);
            if (start != std::string::npos && end != std::string::npos) {
                location = obj.substr(start + 1, end - start - 1);
            }
        }
        
        found = obj.find("\"encrypted_data\"");
        if (found != std::string::npos) {
            size_t start = obj.find('"', found + 17);
            size_t end = obj.find('"', start + 1);
            if (start != std::string::npos && end != std::string::npos) {
                encryptedData = obj.substr(start + 1, end - start - 1);
            }
        }
        
        found = obj.find("\"created_at\"");
        if (found != std::string::npos) {
            size_t start = obj.find(':', found + 13);
            size_t end = obj.find(',', start);
            if (end == std::string::npos) end = obj.find('}', start);
            if (start != std::string::npos && end != std::string::npos) {
                std::string timeStr = obj.substr(start + 1, end - start - 1);
                try {
                    createdAt = std::stoll(timeStr);
                } catch (...) {
                    createdAt = std::time(nullptr);
                }
            }
        }
        
        if (!boothName.empty() && !location.empty()) {
            if (createdAt == 0) createdAt = std::time(nullptr);
            
            // Insert into SQLite
            sqlite3_stmt* stmt;
            std::string sql = "INSERT INTO booth_identities (booth_name, location, encrypted_data, created_at) "
                              "VALUES (?, ?, ?, ?)";
            
            int rc = sqlite3_prepare_v2(db, sql.c_str(), -1, &stmt, nullptr);
            if (rc == SQLITE_OK) {
                sqlite3_bind_text(stmt, 1, boothName.c_str(), -1, SQLITE_STATIC);
                sqlite3_bind_text(stmt, 2, location.c_str(), -1, SQLITE_STATIC);
                sqlite3_bind_text(stmt, 3, encryptedData.c_str(), -1, SQLITE_STATIC);
                sqlite3_bind_int64(stmt, 4, createdAt);
                
                rc = sqlite3_step(stmt);
                sqlite3_finalize(stmt);
                
                if (rc == SQLITE_DONE) {
                    migratedCount++;
                    std::cout << "📥 Migrated identity: " << boothName << std::endl;
                }
            }
        }
        
        pos = objEnd + 1;
    }
    
    std::cout << "✅ Migration completed. Migrated " << migratedCount << " identities" << std::endl;
    return migratedCount > 0 || content.empty() || content == "[]";
}