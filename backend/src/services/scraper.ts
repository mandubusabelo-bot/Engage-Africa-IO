import axios from 'axios';
import * as cheerio from 'cheerio';
import { logger } from '../utils/logger.js';
import { db } from './database.js';

class ScraperService {
  private ntandokaziUrl: string;

  constructor() {
    this.ntandokaziUrl = process.env.NTANDOKAZI_URL || 'https://ntandokazi.com';
  }

  async scrapeProducts(): Promise<void> {
    try {
      logger.info('Starting product scraping from Ntandokazi...');
      
      const response = await axios.get(this.ntandokaziUrl);
      const $ = cheerio.load(response.data);
      
      const products: any[] = [];

      // Adjust selectors based on actual Ntandokazi site structure
      $('.product-item, .product-card, [data-product]').each((_index: number, element: any) => {
        const $el = $(element);
        
        const product = {
          name: $el.find('.product-name, .product-title, h3, h4').first().text().trim(),
          description: $el.find('.product-description, .description, p').first().text().trim(),
          price: this.extractPrice($el.find('.price, .product-price').text()),
          stock_status: this.extractStockStatus($el),
          category: $el.find('.category, .product-category').text().trim() || 'Herbal Products',
          image_url: $el.find('img').first().attr('src') || '',
          source_url: this.ntandokaziUrl,
          metadata: {
            scraped_at: new Date().toISOString(),
            source: 'ntandokazi'
          }
        };

        if (product.name) {
          products.push(product);
        }
      });

      logger.info(`Scraped ${products.length} products`);

      // Save to database
      for (const product of products) {
        await this.saveProduct(product);
      }

      logger.info('Product scraping completed successfully');
    } catch (error) {
      logger.error('Product scraping error:', error);
      throw error;
    }
  }

  private extractPrice(priceText: string): number {
    const match = priceText.match(/[\d,]+\.?\d*/);
    if (match) {
      return parseFloat(match[0].replace(/,/g, ''));
    }
    return 0;
  }

  private extractStockStatus($el: any): string {
    const stockText = $el.find('.stock-status, .availability').text().toLowerCase();
    
    if (stockText.includes('in stock') || stockText.includes('available')) {
      return 'in_stock';
    } else if (stockText.includes('out of stock')) {
      return 'out_of_stock';
    } else if (stockText.includes('low stock')) {
      return 'low_stock';
    }
    
    return 'unknown';
  }

  private async saveProduct(product: any): Promise<void> {
    try {
      // Check if product already exists by name
      const existing = await db.getProductByName(product.name);
      
      if (existing) {
        // Update existing product
        await db.updateProduct(existing.id, product);
      } else {
        // Create new product
        await db.createProduct(product);
      }
    } catch (error) {
      logger.error('Error saving product:', error);
    }
  }

  async getProducts(filters?: any): Promise<any[]> {
    return await db.getProducts(filters);
  }

  async searchProducts(query: string): Promise<any[]> {
    return await db.searchProducts(query);
  }

  async getProductById(id: string): Promise<any> {
    return await db.getProductById(id);
  }
}

export const scraperService = new ScraperService();
