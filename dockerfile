# Use a lightweight Node.js base image.  Alpine is smaller than the full Ubuntu.
FROM node:18-alpine

# Set the working directory inside the container.  This is where your code will live.
WORKDIR /app

# Install Python 3.  Alpine uses apk package manager.
RUN apk add --no-cache python3

# Copy package.json and package-lock.json (if available) to the working directory.
#  Using a separate step leverages Docker's caching.  If only your code changes,
#  Docker can reuse the cached 'npm install' layer.
COPY package*.json ./

# Install dependencies. Include --omit=dev to reduce image size in production.
# If you need devDependencies to build assets, remove this.
RUN npm install --omit=dev

# Copy the rest of your application's source code into the working directory.
#  This should be done *after* installing dependencies.
COPY . .

# Define the command to run your application.  Use "node" if you're directly
#  running a script, or "npm start" if you have a start script in package.json.
CMD [ "npm", "start" ]
