#ifndef BOOTH_IDENTITY_H
#define BOOTH_IDENTITY_H

#include <string>
#include <map>
#include <vector>
#include <mutex>

class BoothIdentityStore {
private:
    std::string baseDir;
    std::string jsonPath;
    mutable std::mutex mu;
    bool initialized;
public:
    BoothIdentityStore();
    bool init(const std::string& dir);
    bool hasIdentity() const;
    std::map<std::string, std::string> getLatest() const;
    bool save(const std::string& boothName, const std::string& location, const std::string& encryptedData);
};

#endif