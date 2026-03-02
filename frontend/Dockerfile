FROM node:20-alpine

WORKDIR /app

# Copy package info and install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Expose Vite default port
EXPOSE 5173

# Start Vite with --host so it's accessible from the host machine
CMD ["npm", "run", "dev", "--", "--host"]
