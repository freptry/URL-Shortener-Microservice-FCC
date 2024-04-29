require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const bodyParser = require('body-parser');
const dns = require('dns');
const mongoose = require('mongoose');

// Basic Configuration
const port = process.env.PORT || 3000;

// MongoDB Connection
mongoose.connect(process.env.DB_URL);
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => console.log('Connected to MongoDB'));

// Schema definition
const urlSchema = new mongoose.Schema({
  original_url: String,
  short_url: Number
});
const Url = mongoose.model('Url', urlSchema);

app.use(cors());
app.use('/public', express.static(`${process.cwd()}/public`));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.sendFile(process.cwd() + '/views/index.html');
});

app.get('/api/hello', (req, res) => {
  res.json({ greeting: 'hello API' });
});

// POST endpoint for shortening URL
app.post('/api/shorturl', (req, res) => {
  const originalUrl = req.body.url;

  // Validate URL format
  // const isValidUrl = new URL(originalUrl).protocol.startsWith('http');
  // if (!isValidUrl) {
  //   return res.json({ error: 'Invalid URL format' });
  // }

  // Validate URL using DNS lookup
  dns.lookup(new URL(originalUrl).hostname, async (err) => {
    if (err) {
      return res.json({ error: 'Invalid URL' });
    }

    try {
      // Find the next available short URL number
      const nextShortUrl = await Url.countDocuments() + 1;

      // Create new URL document
      const newUrl = new Url({
        original_url: originalUrl,
        short_url: nextShortUrl
      });

      // Save new URL document
      await newUrl.save();

      // Respond with original and short URL
      res.json({ original_url: newUrl.original_url, short_url: newUrl.short_url });
    } catch (error) {
      console.error('Error saving data:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
});

// GET endpoint for redirection
app.get('/api/shorturl/:shortUrl', async (req, res) => {
  const shortUrl = req.params.shortUrl;

  try {
    // Find URL document by short URL number
    const url = await Url.findOne({ short_url: shortUrl }).exec();

    if (!url) {
      return res.json({ error: 'Short URL not found' });
    }

    // Redirect to original URL
    res.redirect(url.original_url);
  } catch (error) {
    console.error('Error finding data:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
