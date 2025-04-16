FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install global dependencies
RUN npm install -g expo-cli

# Copy package files
COPY package.json package-lock.json* yarn.lock* ./

# Install dependencies
RUN npm install || (yarn install --frozen-lockfile && echo "Used yarn instead of npm")

# Copy app files
COPY . .

# Expose Expo web port
EXPOSE 19006
# Expose Metro bundler port
EXPOSE 8081
# Expose additional Expo ports commonly needed
EXPOSE 19000
EXPOSE 19001
EXPOSE 19002

# Use environment variables to configure Expo
ENV EXPO_DEV_SERVER_LISTEN_ADDRESS="0.0.0.0"
ENV REACT_NATIVE_PACKAGER_HOSTNAME="localhost"

# Start Expo web 
CMD ["npx", "expo", "start", "--web"] 