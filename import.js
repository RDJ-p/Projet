const fs = require('fs');
const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'bookstore',
    password: '15975321',
    port: 5432
});

async function insertProducts() {
    try {
        const data = JSON.parse(fs.readFileSync('public/Products.json', 'utf8'));

        for (const product of data) {
            await pool.query(
                `INSERT INTO products (id, title, author, price, image, category, description, sku, stock_status) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
                 ON CONFLICT (sku) DO NOTHING`,
                [
                    product.id,
                    product.title,
                    product.author,
                    product.price,
                    product.image,
                    product.category,
                    product.description,
                    product.sku,
                    product.stock_status
                ]
            );
        }
        console.log('Products imported successfully!');
    } catch (error) {
        console.error('Error importing products:', error);
    } finally {
        pool.end();
    }
}

insertProducts();
