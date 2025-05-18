const express = require('express');
const multer  = require('multer');
const app = express();
const port = 3000;

// Define a route
app.get('/', (req, res) => {
  res.send('Hello World! This is returned from get func');
});

const fs = require('fs');
const csv = require('csv-parser');

// creating a map to store CSV data - fileName : Person Name
const csvDataMap = new Map();

// Function to read CSV file and save data into the map
function readCSVFile(filePath) {
  fs.createReadStream(filePath)
    .pipe(csv())
    .on('data', (row) => {
      csvDataMap.set(row.Image, row.Results); // setting map items based on CSV files col names ("Image", "Results")
    })
    .on('end', () => {
      console.log('CSV file successfully processed.');
    });
}

// Calling the function with relative path to the CSV file
readCSVFile('./images.csv');

const upload = multer();
app.post('/', upload.single('inputFile'), (req, res) => {
    if (req.file) {
      var fileName = req.file.originalname.split('.')[0]
      var result = csvDataMap.get(fileName)
      res.send(fileName+':'+result)
    } else {
      res.status(400).send('No image file uploaded.');
    }
  });

// Start the server
app.listen(port, () => {
  console.log(`Server is listening at http://localhost:${port}`);
});