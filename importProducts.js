const Product = require('./models/Product');
const { runWithDatabase } = require('./utils/dbScript');
const { replaceCollectionFromCsv } = require('./utils/csvImport');

const parsePrice = (value) => {
  if (!value) {
    return null;
  }

  const price = Number(String(value).replace(/[^\d]/g, ''));

  return isNaN(price) ? null : price;
};

runWithDatabase(() =>
  replaceCollectionFromCsv({
    file: './data/products.csv',
    model: Product,
    label: 'products',
    mapRow: (row) => ({
      category: row.category || '',
      subCategory: row.subCategory || '',
      petType: row.petType ? row.petType.toLowerCase() : '',

      nameJa: row.nameJa || '',
      nameEn: row.nameEn || '',

      descriptionJa: row.descriptionJa || '',
      descriptionEn: row.descriptionEn || '',

      price: parsePrice(row.price),

      productLink: row.productLink || '',
      image: row.image || '',

      isActive: true,
      featured: false
    })
  })
);
