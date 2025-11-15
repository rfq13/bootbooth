# Makefile for Photo Booth Server (C++)

# Compiler and flags
CXX = g++
CXXFLAGS = -std=c++17 -Wall -Wextra -O2
LDFLAGS = -lpthread -ljpeg -lssl -lcrypto

# Directories
SRC_DIR = src
INC_DIR = include
OBJ_DIR = obj
BIN_DIR = bin

# Source files
SOURCES = $(SRC_DIR)/main.cpp

# Object files
OBJECTS = $(SOURCES:$(SRC_DIR)/%.cpp=$(OBJ_DIR)/%.o)

# Target executable
TARGET = $(BIN_DIR)/photobooth-server

# Default target
all: $(TARGET)

# Create directories
$(OBJ_DIR):
	mkdir -p $(OBJ_DIR)

$(BIN_DIR):
	mkdir -p $(BIN_DIR)

# Link the executable
$(TARGET): $(OBJECTS) | $(BIN_DIR)
	$(CXX) $(OBJECTS) -o $@ $(LDFLAGS)

# Compile source files
$(OBJ_DIR)/%.o: $(SRC_DIR)/%.cpp | $(OBJ_DIR)
	$(CXX) $(CXXFLAGS) -I$(INC_DIR) -c $< -o $@

# Clean build artifacts
clean:
	rm -rf $(OBJ_DIR) $(BIN_DIR)

# Run the server
run: $(TARGET)
	$(TARGET)

# Install dependencies (Ubuntu/Debian)
install-deps:
	sudo apt-get update
	sudo apt-get install -y g++ libjpeg-dev libssl-dev gphoto2 libboost-all-dev git cmake build-essential

# Install dependencies (CentOS/RHEL)
install-deps-centos:
	sudo yum install -y gcc-c++ libjpeg-turbo-devel openssl-devel gphoto2

# Install dependencies (macOS with Homebrew)
install-deps-macos:
	brew install libjpeg openssl gphoto2

# Development build with debug symbols
debug: CXXFLAGS += -g -DDEBUG -O0
debug: $(TARGET)

# Production build with optimization
release: CXXFLAGS += -O3 -DNDEBUG
release: $(TARGET)

# Static analysis
cppcheck:
	cppcheck --enable=all --std=c++17 -I$(INC_DIR) $(SRC_DIR)

# Format code
format:
	clang-format -i $(SRC_DIR)/*.cpp $(INC_DIR)/*.h

# Generate documentation
docs:
	doxygen Doxyfile 2>/dev/null || echo "Doxyfile not found. Documentation not generated."

# Test (placeholder for future test implementation)
test:
	@echo "Tests not implemented yet."

# Help
help:
	@echo "Available targets:"
	@echo "  all         - Build the server (default)"
	@echo "  clean       - Remove build artifacts"
	@echo "  run         - Build and run the server"
	@echo "  debug       - Build with debug symbols"
	@echo "  release    - Build with optimization"
	@echo "  install-deps - Install dependencies (Ubuntu/Debian)"
	@echo "  install-deps-centos - Install dependencies (CentOS/RHEL)"
	@echo "  install-deps-macos - Install dependencies (macOS)"
	@echo "  cppcheck    - Run static analysis"
	@echo "  format      - Format code with clang-format"
	@echo "  docs        - Generate documentation"
	@echo "  test        - Run tests (not implemented)"
	@echo "  help        - Show this help"

.PHONY: all clean run debug release install-deps install-deps-centos install-deps-macos cppcheck format docs test help