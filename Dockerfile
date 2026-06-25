# Stage 1: Build frontend assets
FROM node:20-alpine AS frontend

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy files needed for build
COPY vite.config.js ./
COPY postcss.config.js ./
COPY tailwind.config.js ./
COPY resources/ resources/

# Build assets
RUN npm run build

# Stage 2: PHP application
FROM php:8.3-cli

RUN apt-get update && apt-get install -y \
    git \
    unzip \
    libpq-dev \
    && docker-php-ext-install pdo pdo_pgsql

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /app

# Copy application code
COPY . .

# Copy built assets from frontend stage
COPY --from=frontend /app/public/build ./public/build

# Install PHP dependencies
RUN composer install --no-dev --optimize-autoloader

# Clean up unnecessary files
RUN rm -rf node_modules package*.json vite.config.js postcss.config.js tailwind.config.js

# Set permissions
RUN chmod -R 775 storage bootstrap/cache

EXPOSE 10000

CMD php artisan serve --host=0.0.0.0 --port=${PORT:-10000}