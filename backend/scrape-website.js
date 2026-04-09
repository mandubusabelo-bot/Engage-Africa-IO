import { db } from './src/services/database.js';
import { config } from 'dotenv';
config();

// Simple web scraper using fetch
async function scrapeWebsite(url) {
  try {
    console.log(`Scraping: ${url}`);
    
    const response = await fetch(url);
    const html = await response.text();
    
    // Extract text content (basic implementation)
    const textContent = html
      .replace(/<script[^>]*>.*?<\/script>/gs, '') // Remove scripts
      .replace(/<style[^>]*>.*?<\/style>/gs, '')   // Remove styles
      .replace(/<[^>]*>/g, ' ')                    // Remove HTML tags
      .replace(/\s+/g, ' ')                        // Normalize whitespace
      .trim();
    
    return textContent;
  } catch (error) {
    console.error(`Error scraping ${url}:`, error.message);
    return null;
  }
}

// Add scraped content to knowledge base
async function addScrapedContent(title, content, category = 'website') {
  try {
    const knowledge = await db.createKnowledgeBaseEntry({
      title: title,
      content: content,
      category: category,
      agent_id: 'd5a97aa8-713f-4b72-b383-3074eebc5c19', // Your agent ID
      tags: ['website', 'scraped', category]
    });
    
    console.log(`Added: ${title}`);
    return knowledge;
  } catch (error) {
    console.error(`Error adding ${title}:`, error.message);
  }
}

// Main scraping function
async function scrapeYourSite() {
  const baseUrl = 'http://localhost:5173'; // Your frontend URL
  
  const pages = [
    { url: '/', title: 'Homepage', category: 'general' },
    { url: '/about', title: 'About Us', category: 'company' },
    { url: '/products', title: 'Products', category: 'products' },
    { url: '/contact', title: 'Contact', category: 'contact' }
  ];
  
  console.log('Starting website scraping...');
  
  for (const page of pages) {
    const fullUrl = baseUrl + page.url;
    const content = await scrapeWebsite(fullUrl);
    
    if (content && content.length > 100) {
      await addScrapedContent(page.title, content, page.category);
    }
  }
  
  console.log('Scraping completed!');
}

// Run the scraper
scrapeYourSite().catch(console.error);
