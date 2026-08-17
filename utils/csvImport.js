const fs = require('fs');
const csv = require('csv-parser');

// Strips BOM and surrounding quotes that spreadsheet exports add to headers.
const normalizeHeader = ({ header }) =>
  header.replace(/^\ufeff/, '').replace(/^["']|["']$/g, '').trim();

const readCsv = (file, { mapRow, csvOptions = {} }) =>
  new Promise((resolve, reject) => {
    const rows = [];

    fs.createReadStream(file)
      .on('error', reject)
      .pipe(csv({ mapHeaders: normalizeHeader, ...csvOptions }))
      .on('data', (row) => rows.push(mapRow(row)))
      .on('error', reject)
      .on('end', () => resolve(rows));
  });

// Replaces a collection's contents with the rows of a CSV file.
const replaceCollectionFromCsv = async ({ file, model, label, mapRow, csvOptions }) => {
  const documents = await readCsv(file, { mapRow, csvOptions });

  await model.deleteMany();
  await model.insertMany(documents);

  console.log(`${documents.length} ${label} imported successfully`);

  return documents;
};

module.exports = {
  readCsv,
  replaceCollectionFromCsv
};
