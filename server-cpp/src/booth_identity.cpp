#include "../include/booth_identity.h"
#include <fstream>
#include <sstream>
#include <ctime>
#include <iostream>

BoothIdentityStore::BoothIdentityStore() : initialized(false) {}

bool BoothIdentityStore::init(const std::string& dir) {
    std::lock_guard<std::mutex> lock(mu);
    baseDir = dir;
    jsonPath = baseDir + "/booth_identity.json";
    initialized = true;
    std::ifstream in(jsonPath);
    if (!in.good()) {
        std::ofstream out(jsonPath);
        if (!out.good()) return false;
        out << "[]";
    }
    return true;
}

bool BoothIdentityStore::hasIdentity() const {
    std::lock_guard<std::mutex> lock(mu);
    std::ifstream in(jsonPath);
    if (!in.good()) return false;
    std::string content;
    std::ostringstream ss;
    ss << in.rdbuf();
    content = ss.str();
    for (char c : content) { if (c == '{') return true; }
    return false;
}

std::map<std::string, std::string> BoothIdentityStore::getLatest() const {
    std::lock_guard<std::mutex> lock(mu);
    std::map<std::string, std::string> out;
    std::ifstream in(jsonPath);
    if (!in.good()) return out;
    std::string content;
    std::ostringstream ss;
    ss << in.rdbuf();
    content = ss.str();
    size_t lastObjStart = content.find_last_of('{');
    if (lastObjStart == std::string::npos) return out;
    size_t objEnd = content.find('}', lastObjStart);
    if (objEnd == std::string::npos) return out;
    std::string obj = content.substr(lastObjStart, objEnd - lastObjStart + 1);
    size_t p = 0;
    while (p < obj.size()) {
        size_t ks = obj.find('"', p);
        if (ks == std::string::npos) break;
        size_t ke = obj.find('"', ks + 1);
        if (ke == std::string::npos) break;
        std::string k = obj.substr(ks + 1, ke - ks - 1);
        size_t colon = obj.find(':', ke);
        if (colon == std::string::npos) break;
        size_t vs = colon + 1;
        while (vs < obj.size() && (obj[vs] == ' ' || obj[vs] == '"')) vs++;
        size_t ve = vs;
        while (ve < obj.size() && obj[ve] != ',' && obj[ve] != '}') ve++;
        std::string v = obj.substr(vs, ve - vs);
        if (!v.empty() && v.front() == '"' && v.back() == '"') {
            v = v.substr(1, v.size() - 2);
        }
        out[k] = v;
        p = ve + 1;
    }
    return out;
}

bool BoothIdentityStore::save(const std::string& boothName, const std::string& location, const std::string& encryptedData) {
    std::lock_guard<std::mutex> lock(mu);
    
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
    
    std::ifstream in(jsonPath);
    if (!in.good()) {
        std::cerr << "❌ Cannot read identity file: " << jsonPath << std::endl;
        return false;
    }
    
    std::ostringstream ss;
    ss << in.rdbuf();
    std::string content = ss.str();
    if (content.empty()) content = "[]";
    
    size_t insertPos = content.find_last_of(']');
    if (insertPos == std::string::npos) {
        std::cerr << "❌ Invalid JSON format in identity file" << std::endl;
        return false;
    }
    
    std::time_t t = std::time(nullptr);
    std::ostringstream obj;
    obj << "{\"booth_name\":\"" << boothName << "\",";
    obj << "\"location\":\"" << location << "\",";
    obj << "\"encrypted_data\":\"" << encryptedData << "\",";
    obj << "\"created_at\":" << t << "}";
    
    std::string prefix = content.substr(0, insertPos);
    std::string suffix = content.substr(insertPos);
    if (prefix.size() >= 1 && prefix[prefix.size() - 1] != '[') prefix += ",";
    std::string updated = prefix + obj.str() + suffix;
    
    std::string tmp = jsonPath + ".tmp";
    {
        std::ofstream out(tmp, std::ios::trunc);
        if (!out.good()) {
            std::cerr << "❌ Cannot create temp file: " << tmp << std::endl;
            return false;
        }
        out << updated;
        if (!out.good()) {
            std::cerr << "❌ Failed to write to temp file: " << tmp << std::endl;
            return false;
        }
    }
    
    if (std::remove(jsonPath.c_str()) != 0) {
        std::ifstream chk(jsonPath);
        if (chk.good()) {
            std::cerr << "❌ Cannot remove existing identity file" << std::endl;
            std::remove(tmp.c_str()); // Clean up temp file
            return false;
        }
    }
    
    if (std::rename(tmp.c_str(), jsonPath.c_str()) != 0) {
        std::cerr << "❌ Failed to rename temp file to identity file" << std::endl;
        std::remove(tmp.c_str()); // Clean up temp file
        return false;
    }
    
    std::cout << "✅ Successfully saved identity: " << boothName << " at " << location << std::endl;
    return true;
}