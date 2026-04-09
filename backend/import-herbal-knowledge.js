import { db } from './src/services/database.js';
import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';

config();

// Import knowledge from files in the AI AGENT folder
async function importFromAgentFolder() {
  const agentFolder = 'C:\\Users\\newbr\\Documents\\Clients\\Nthandokazi Herbal\\AI AGNENT';
  const agentId = 'd5a97aa8-713f-4b72-b383-3074eebc5c19';
  
  try {
    console.log(`Scanning folder: ${agentFolder}`);
    
    if (!fs.existsSync(agentFolder)) {
      console.log('Agent folder not found, creating sample knowledge entries...');
      await createSampleHerbalKnowledge(agentId);
      return;
    }
    
    const files = fs.readdirSync(agentFolder);
    
    for (const file of files) {
      const filePath = path.join(agentFolder, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isFile()) {
        const content = fs.readFileSync(filePath, 'utf8');
        const title = path.basename(file, path.extname(file));
        
        // Determine category based on filename
        let category = 'general';
        if (title.toLowerCase().includes('product')) category = 'products';
        if (title.toLowerCase().includes('skin')) category = 'skin';
        if (title.toLowerCase().includes('love') || title.toLowerCase().includes('isichitho')) category = 'traditional';
        if (title.toLowerCase().includes('luck') || title.toLowerCase().includes('fertility')) category = 'traditional';
        if (title.toLowerCase().includes('contact') || title.toLowerCase().includes('branch')) category = 'contact';
        
        await db.addKnowledge({
          title: title,
          content: content,
          category: category,
          agent_id: agentId,
          tags: [category, 'imported']
        });
        
        console.log(`Imported: ${title} (${category})`);
      }
    }
    
    console.log('Import completed!');
  } catch (error) {
    console.error('Import error:', error.message);
  }
}

// Create sample herbal knowledge entries
async function createSampleHerbalKnowledge(agentId) {
  const sampleKnowledge = [
    {
      title: "Skin Care Products",
      content: "We offer natural skin care products including acne treatment creams, skin lightening lotions, and moisturizers made from traditional herbs. All products are 100% natural and safe for all skin types.",
      category: "products",
      tags: ["skin", "acne", "care", "natural"]
    },
    {
      title: "Isichitho Remedies",
      content: "Traditional isichitho remedies for cleansing and protection. Our products include cleansing herbs, protective soaps, and spiritual bath salts prepared according to traditional practices.",
      category: "traditional",
      tags: ["isichitho", "cleansing", "protection", "spiritual"]
    },
    {
      title: "Love Matters Solutions",
      content: "Natural solutions for love and relationship matters including attraction oils, love potions, and relationship strengthening herbs. All products are prepared with respect to traditional practices.",
      category: "traditional",
      tags: ["love", "relationships", "attraction", "natural"]
    },
    {
      title: "Luck and Fortune",
      content: "Traditional luck-enhancing products including good luck charms, fortune oils, and prosperity herbs. These products help attract positive energy and opportunities.",
      category: "traditional",
      tags: ["luck", "fortune", "prosperity", "positive"]
    },
    {
      title: "Fertility Support",
      content: "Natural fertility support products for both men and women. Includes fertility herbs, reproductive health supplements, and traditional fertility boosters.",
      category: "traditional",
      tags: ["fertility", "reproductive", "health", "natural"]
    },
    {
      title: "Product Ordering",
      content: "To order products: 1) Send product name and quantity via WhatsApp, 2) Confirm availability, 3) Make payment via EFT or cash deposit, 4) Receive tracking number. Delivery takes 3-5 working days.",
      category: "ordering",
      tags: ["ordering", "delivery", "payment", "process"]
    }
  ];
  
  for (const knowledge of sampleKnowledge) {
    await db.addKnowledge({
      ...knowledge,
      agent_id: agentId
    });
    console.log(`Added: ${knowledge.title}`);
  }
}

// Run the import
importFromAgentFolder().catch(console.error);
