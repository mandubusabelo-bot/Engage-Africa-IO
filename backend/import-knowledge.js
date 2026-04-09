import { db } from './src/services/database.js';
import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';

config();

// Import knowledge from CSV file
async function importFromCSV(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    // Skip header if exists
    const startIndex = lines[0].includes('title') ? 1 : 0;
    
    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Simple CSV parsing (assuming format: title,content,category,tags)
      const [title, content, category, tags] = line.split(',').map(field => 
        field.replace(/^"|"$/g, '') // Remove quotes
      );
      
      if (title && content) {
        await db.createKnowledgeBaseEntry({
          title: title,
          content: content,
          category: category || 'general',
          agent_id: 'd5a97aa8-713f-4b72-b383-3074eebc5c19',
          tags: tags ? tags.split(';') : []
        });
        
        console.log(`Imported: ${title}`);
      }
    }
    
    console.log('Import completed!');
  } catch (error) {
    console.error('Import error:', error.message);
  }
}

// Create sample CSV file
function createSampleCSV() {
  const csvContent = `title,content,category,tags
"Customer Support Hours","Our customer support is available Monday-Friday 9am-5pm. Contact us at support@engageafrica.io or call 012-345-6789.","support","hours;contact;support"
"Shipping Policy","Standard shipping takes 3-5 business days. Express shipping available for R50 extra. Free shipping on orders over R500.","shipping","delivery;policy;shipping"
"Return Policy","30-day return policy on all products. Items must be unused and in original packaging. Contact returns@engageafrica.io for returns.","policy","returns;refund;policy"
"Payment Methods","We accept credit/debit cards, EFT, and cash on delivery. All payments are secure and processed through PayGate.","payment","methods;payment;security"`;

  fs.writeFileSync('knowledge-base.csv', csvContent);
  console.log('Sample CSV created: knowledge-base.csv');
}

// Main function
async function main() {
  const args = process.argv.slice(2);
  
  if (args[0] === 'create-sample') {
    createSampleCSV();
  } else if (args[0] === 'import' && args[1]) {
    await importFromCSV(args[1]);
  } else {
    console.log('Usage:');
    console.log('  node import-knowledge.js create-sample  # Create sample CSV');
    console.log('  node import-knowledge.js import <file>  # Import from CSV file');
  }
}

main().catch(console.error);
