# Makefile for Photo Booth Server (C++)

# Compiler and flags
CXX = g++
CXXFLAGS = -std=c++17 -Wall -Wextra -O2 -DBOOST_DATE_TIME_NO_LIB -DBOOST_REGEX_NO_LIB -D_WEBSOCKETPP_CPP11_STL_ -D_WEBSOCKETPP_CPP11_FUNCTIONAL_
LDFLAGS = -lpthread -ljpeg -lssl -lcrypto -lsqlite3

# WebSocket++ system library (no longer needs sioclient)
WEBSOCKETPP_INCLUDES =

# Boost include path (system boost installation)
BOOST_INCLUDES = -I/usr/include/boost

# Directories
SRC_DIR = src
INC_DIR = include
OBJ_DIR = obj
BIN_DIR = bin

# Source files
SOURCES = $(SRC_DIR)/main.cpp \
          $(SRC_DIR)/utils.cpp \
          $(SRC_DIR)/image_effects.cpp \
          $(SRC_DIR)/gphoto_wrapper.cpp \
          $(SRC_DIR)/mjpeg_server.cpp \
          $(SRC_DIR)/web_socket_server.cpp \
          $(SRC_DIR)/photobooth_server.cpp \
          $(SRC_DIR)/booth_identity.cpp \
          $(SRC_DIR)/template_renderer.cpp

# All sources
ALL_SOURCES = $(SOURCES)

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
	$(CXX) $(CXXFLAGS) -I$(INC_DIR) $(WEBSOCKETPP_INCLUDES) $(BOOST_INCLUDES) -c $< -o $@

# Clean build artifacts
clean:
	rm -rf $(OBJ_DIR) $(BIN_DIR)

# Run the server
run: $(TARGET)
	$(TARGET)

# Run the server with standalone mode (recommended)
run-standalone: $(TARGET)
	$(TARGET)

# Quick start script
start: $(TARGET)
	@echo "🚀 Starting Photo Booth Server (Standalone Mode)..."
	@mkdir -p uploads previews data
	./bin/photobooth-server

# Install dependencies (Ubuntu/Debian)
install-deps:
	sudo apt-get update
	sudo apt-get install -y g++ libjpeg-dev libssl-dev gphoto2 libboost-all-dev git cmake build-essential libsqlite3-dev

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
	@echo "  run-standalone - Build and run in standalone mode (recommended)"
	@echo "  start       - Quick start with directory setup"
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
	@echo ""
	@echo "Recommended usage:"
	@echo "  make start     - Quick start with setup"
	@echo "  ./start-server.sh - Full startup script"

.PHONY: all clean run run-standalone start debug release install-deps install-deps-centos install-deps-macos cppcheck format docs test help