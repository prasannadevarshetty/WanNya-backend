require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const csv = require('csv-parser');
const Product = require('./models/Product');

const products = [];

async function importProducts() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB connected');

        fs.createReadStream('./data/products.csv')
            .on('error', (error) => {
                console.error('CSV file error:', error);
                process.exit(1);
            })
            .pipe(csv())
            .on('data', (row) => {
                if (products.length === 0) {
                    console.log('First row keys:', Object.keys(row));
                    console.log('First row category value:', row.category);
                }

                products.push({
                    category: row.category || row['\ufeffcategory'],
                    subCategory: row.subCategory || '',
                    petType: row.petType ? row.petType.toLowerCase() : '',
                    nameJa: row.nameJa,
                    nameEn: row.nameEn || '',
                    descriptionJa: row.descriptionJa || '',
                    descriptionEn: row.descriptionEn || '',
                    price: row.price
                        ? (isNaN(Number(row.price.replace(/[^\d]/g, '')))
                            ? null
                            : Number(row.price.replace(/[^\d]/g, '')))
                        : null,
                    productLink: row.productLink || '',
                    image: row.image || '',
                    isActive: true,
                    featured: false
                });
            })
            .on('end', async () => {
                try {
                    await Product.deleteMany();
                    await Product.insertMany(products);

                    console.log('✅ Products inserted successfully');
                    process.exit();
                } catch (error) {
                    console.error('Insert error:', error);
                    process.exit(1);
                }
            });
    } catch (error) {
        console.error('Connection error:', error);
        process.exit(1);
    }
}

importProducts();