# Stage 1: Install dependencies and build native modules
FROM node:18 AS builder

# Set working directory
WORKDIR /usr/src/app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --unsafe-perm=true --allow-root
# RUN npm install --save-dev @types/node

# Rebuild native dependencies (e.g., sqlite3) for Linux
RUN npm rebuild sqlite3

# Copy the source code
COPY . .

# Stage 2: Run the application
FROM node:18

# Set working directory
WORKDIR /usr/src/app

# Copy everything from the builder stage
COPY --from=builder /usr/src/app /usr/src/app

# Expose application port
EXPOSE 8000

# Command to run the application
CMD ["npx", "ts-node-dev", "src/app.ts"]
