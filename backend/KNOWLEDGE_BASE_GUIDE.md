# Knowledge Base Management Guide

## Current Status: Chatbot is Working! 

Your chatbot now provides intelligent responses using the knowledge base.

## Ways to Add Knowledge

### 1. API Method (Recommended)
```bash
curl -X POST "http://localhost:3001/api/knowledge" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer demo-token" \
  -d '{
    "title": "Product Name",
    "content": "Detailed product description with price and features",
    "category": "products",
    "tags": ["tag1", "tag2", "tag3"]
  }'
```

### 2. CSV Import
Use the provided `knowledge-base.csv` file as a template:
```csv
title,content,category,tags
"Product Name","Description with price","products","tag1;tag2;tag3"
"Service Info","Service details","services","service;info"
```

### 3. Web Scraping
Run the scraper to automatically extract content from your website:
```bash
node scrape-website.js
```

## Best Practices

### Product Entries
- Always include price
- Mention key features and benefits
- Use descriptive titles
- Add relevant tags

### Support Information
- Include contact details
- Specify business hours
- Mention policies clearly

### Company Information
- Add company history and values
- Include quality certifications
- Mention mission/vision

## Current Knowledge Base

### Products Added:
- Imvungamngu Ointment (R150) - Muscle relaxant
- Back Support Cushion ($29.99) - Ergonomic support

### Support Info:
- Customer Support Hours - Mon-Fri 9am-5pm

## Test Your Chatbot

```bash
# Test product questions
curl -X POST "http://localhost:3001/api/agents/d5a97aa8-713f-4b72-b383-3074eebc5c19/test" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer demo-token" \
  -d '{"message":"What do you have for back pain?"}'

# Test support questions
curl -X POST "http://localhost:3001/api/agents/d5a97aa8-713f-4b72-b383-3074eebc5c19/test" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer demo-token" \
  -d '{"message":"When are you open?"}'
```

## Agent Configuration

Your agent is configured with:
- **Name**: Engage Africa Assistant
- **Personality**: Friendly and professional
- **Instructions**: Uses knowledge base for accurate product information
- **Language**: English

## Next Steps

1. **Add all your products** to the knowledge base
2. **Import your website content** using the scraper
3. **Add company policies** (shipping, returns, etc.)
4. **Test thoroughly** with different types of questions
5. **Monitor responses** and adjust as needed

## Example Product Entry

```json
{
  "title": "Headache Relief Tablets",
  "content": "Fast-acting headache relief tablets. Price: R45 for 24 tablets. Provides relief from tension headaches, migraines, and sinus headaches. Non-drowsy formula. Take 1-2 tablets with water every 4-6 hours as needed.",
  "category": "products",
  "tags": ["headache", "pain", "tablets", "relief", "migraine"]
}
```

Your chatbot is now much smarter and will provide helpful, contextual responses!
