FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps --production=false

# Copy source
COPY . .

# Build
ENV NODE_ENV=production
RUN npm run build

# Expose port
EXPOSE 3000

# Start
CMD ["npm", "start"]
