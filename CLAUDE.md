# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is a travel blog system built with Node.js Express, Sequelize ORM, and EJS templates. It serves as the Node.js version running on fallincloud.com (port 5001), coexisting with a Flask version on fallinai.cn (port 5000).

## Architecture

- **Backend**: Node.js Express server with RESTful routes
- **Database**: SQLite via Sequelize ORM with two main models
- **Frontend**: Server-side rendered EJS templates with vanilla JavaScript
- **File Storage**: Local disk storage for images via Multer middleware
- **Process Management**: PM2 for production deployment

## Database Schema

### Models (models/index.js)
- **Travel**: Main travel entries with title, description, locations, dates, cover image, and cost tracking
- **Itinerary**: Individual itinerary items linked to travels with transport details, timestamps, cost, and sequence ordering

### Relationships
- One-to-many: Travel has many Itineraries (CASCADE delete enabled)
- Belongs-to: Itineraries belong to Travel

## Development Commands

```bash
# Development
npm run dev          # Start with nodemon for auto-reload
npm start            # Start with node for production

# Database operations
node -e "require('./models').sequelize.sync()"  # Sync database schema

# File structure check (useful for navigation)
find . -type f -name "*.js" | head -20  # List JS files
find . -type f -name "*.ejs" | head -20  # List EJS templates
```

## Key Routes & Features

### Travel Routes (routes/travels.js)
- `GET /travels` - List all travels (sorted by newest first)
- `GET /travels/new` - Create new travel form
- `POST /travels` - Create travel with image upload
- `GET /travels/:id` - View single travel with itineraries (sorted chronologically)
- `GET /travels/:id/edit` - Edit travel form
- `PUT /travels/:id` - Update travel (with optional new cover image)
- `DELETE /travels/:id` - Delete travel (cascades to itineraries)

### Itinerary Routes (routes/itineraries.js)
- `POST /itineraries` - Create new itinerary for a travel
- `GET /itineraries/:id/edit` - Edit itinerary form
- `PUT /itineraries/:id` - Update itinerary
- `DELETE /itineraries/:id` - Delete itinerary
- `POST /itineraries/upload-image` - Upload images for itinerary content

## Transport Methods & Data Handling

The system supports these transport types with specific handling:
- **火车 (Train)**: Stores trainNumber, 1-hour reminder
- **飞机 (Flight)**: Stores flightNumber, 2-hour reminder  
- **自驾 (Self-drive)**: 1-hour reminder
- **客车 (Bus)**: Stores busNumber, 1-hour reminder
- **步行游览 (Walking tour)**: Location-based
- **住宿 (Accommodation)**: Location-based

## File Upload System

- **Location**: `/uploads/` directory
- **Middleware**: Multer with image validation (mimetype starts with 'image/')
- **Naming**: Timestamp-based with random suffix
- **Usage**: Cover images for travels, inline images for itinerary content

## Template Structure

- **Layout**: views/layout.ejs (base template)
- **Travel views**: views/travels/
- **Itinerary views**: views/itineraries/
- **Static assets**: public/ (CSS, JS, images)
- **Client-side features**: countdown.js (real-time timers), navbar-scroll.js

## Production Deployment

### Initial Setup
```bash
# Upload to /tmp/travel-blog-node then:
cd /tmp/travel-blog-node
sudo ./deploy-node.sh
```

### Service Management
- `travel-node-start` - Start service
- `travel-node-stop` - Stop service  
- `travel-node-restart` - Restart service
- `travel-node-status` - Check status
- `travel-node-backup` - Backup database

## Configuration Details

- **Database**: SQLite file `travel_blog_node.db` (persists between updates)
- **Port**: 5001 (production), configurable via PORT env var
- **Session**: express-session with flash messaging
- **Static**: /public and /uploads served as static files
- **Reverse proxy**: Nginx on port 80

## Common Development Tasks

### Adding new fields to models
1. Update models/index.js with new field definitions
2. Run database sync: `node -e "require('./models').sequelize.sync({alter: true})"`
3. Update forms in EJS templates
4. Update route handlers in travels.js/itineraries.js

### Debugging data flow
- Check console.log statements in itinerary routes for datetime parsing
- Use browser dev tools for client-side JavaScript (countdown timers)
- Monitor uploads/ directory for file upload issues

### Image handling
- Cover images: Single image upload via form
- Inline images: Multiple uploads via drag/drop or file input in itinerary content