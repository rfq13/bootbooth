#include "../include/server.h"

std::string getCurrentTimestamp() {
    auto now = std::chrono::system_clock::now();
    auto timestamp = std::chrono::duration_cast<std::chrono::milliseconds>(
        now.time_since_epoch()).count();
    return std::to_string(timestamp);
}

bool createDirectories(const std::string& path) {
    struct stat info;
    if (stat(path.c_str(), &info) != 0) {
        if (mkdir(path.c_str(), 0755) != 0) {
            std::cerr << "Error creating directory: " << path << std::endl;
            return false;
        }
        return true;
    } else if (info.st_mode & S_IFDIR) {
        return true;
    } else {
        std::cerr << "Path exists but is not a directory: " << path << std::endl;
        return false;
    }
}

std::vector<std::string> splitString(const std::string& s, char delimiter) {
    std::vector<std::string> tokens;
    std::string token;
    std::istringstream tokenStream(s);
    while (std::getline(tokenStream, token, delimiter)) {
        tokens.push_back(token);
    }
    return tokens;
}

void parseJsonObject(const std::string& jsonStr, std::map<std::string, std::string>& result, const std::string& prefix) {
    std::cout << "🔍 Parsing JSON object with prefix: " << prefix << std::endl;
    size_t pos = 0;
    while (pos < jsonStr.length()) {
        size_t keyStart = jsonStr.find("\"", pos);
        if (keyStart == std::string::npos) break;
        size_t keyEnd = jsonStr.find("\"", keyStart + 1);
        if (keyEnd == std::string::npos) break;
        std::string key = jsonStr.substr(keyStart + 1, keyEnd - keyStart - 1);
        std::string fullKey = prefix.empty() ? key : prefix + "." + key;
        size_t colonPos = jsonStr.find(":", keyEnd);
        if (colonPos == std::string::npos) break;
        size_t valueStart = colonPos + 1;
        while (valueStart < jsonStr.length() && (jsonStr[valueStart] == ' ' || jsonStr[valueStart] == '\t')) {
            valueStart++;
        }
        if (valueStart >= jsonStr.length()) break;
        char valueChar = jsonStr[valueStart];
        if (valueChar == '{') {
            size_t nestedStart = valueStart;
            int braceCount = 1;
            size_t nestedEnd = nestedStart + 1;
            while (nestedEnd < jsonStr.length() && braceCount > 0) {
                if (jsonStr[nestedEnd] == '{') braceCount++;
                else if (jsonStr[nestedEnd] == '}') braceCount--;
                nestedEnd++;
            }
            if (braceCount == 0) {
                std::string nestedObj = jsonStr.substr(nestedStart, nestedEnd - nestedStart);
                parseJsonObject(nestedObj, result, fullKey);
                pos = nestedEnd;
            } else {
                break;
            }
        } else if (valueChar == '[') {
            size_t arrayStart = valueStart;
            int bracketCount = 1;
            size_t arrayEnd = arrayStart + 1;
            while (arrayEnd < jsonStr.length() && bracketCount > 0) {
                if (jsonStr[arrayEnd] == '[') bracketCount++;
                else if (jsonStr[arrayEnd] == ']') bracketCount--;
                arrayEnd++;
            }
            if (bracketCount == 0) {
                std::string arrayValue = jsonStr.substr(arrayStart, arrayEnd - arrayStart);
                result[fullKey] = arrayValue;
                std::cout << "🔑 Parsed array: " << fullKey << " = " << arrayValue << std::endl;
                pos = arrayEnd;
            } else {
                break;
            }
        } else if (valueChar == '"') {
            size_t valueEnd = jsonStr.find("\"", valueStart + 1);
            if (valueEnd != std::string::npos) {
                std::string value = jsonStr.substr(valueStart + 1, valueEnd - valueStart - 1);
                result[fullKey] = value;
                std::cout << "🔑 Parsed string: " << fullKey << " = " << value << std::endl;
                pos = valueEnd + 1;
            } else {
                break;
            }
        } else {
            size_t valueEnd = valueStart;
            while (valueEnd < jsonStr.length() &&
                   jsonStr[valueEnd] != ',' &&
                   jsonStr[valueEnd] != '}' &&
                   jsonStr[valueEnd] != ']' &&
                   jsonStr[valueEnd] != ' ' &&
                   jsonStr[valueEnd] != '\t') {
                valueEnd++;
            }
            std::string value = jsonStr.substr(valueStart, valueEnd - valueStart);
            result[fullKey] = value;
            std::cout << "🔑 Parsed value: " << fullKey << " = " << value << std::endl;
            pos = valueEnd;
        }
        while (pos < jsonStr.length() &&
               (jsonStr[pos] == ',' ||
                jsonStr[pos] == ' ' ||
                jsonStr[pos] == '\t' ||
                jsonStr[pos] == '\n' ||
                jsonStr[pos] == '\r')) {
            pos++;
        }
        if (pos < jsonStr.length() && jsonStr[pos] == '}') {
            break;
        }
    }
}

std::string urlEncode(const std::string& str) {
    std::string encoded;
    for (char c : str) {
        if (isalnum(c) || c == '-' || c == '_' || c == '.' || c == '~') {
            encoded += c;
        } else {
            char buf[4];
            snprintf(buf, sizeof(buf), "%%%02X", (unsigned char)c);
            encoded += buf;
        }
    }
    return encoded;
}