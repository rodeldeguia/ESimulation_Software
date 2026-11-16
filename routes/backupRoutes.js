// routes/backupRoutes.js
require('dotenv').config();
const express = require('express');
const router = express.Router();
const mysqldump = require('mysqldump');
const fs = require('fs');
const path = require('path');
const auth = require('../middleware/middlewareAuth'); // Ensure only logged-in users can access

// 1. Download Backup Route
router.get('/backup', auth, async (req, res) => {
  // Optional: Check if the user is actually an admin
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Admins only.' });
  }

  try {
    const backupDir = path.join(__dirname, '../backups');
    
    // Create the backups folder if it doesn't exist
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir);
    }

    const fileName = `backup-${Date.now()}.sql`;
    const filePath = path.join(backupDir, fileName);

    // Run mysqldump
    await mysqldump({
      connection: {
        host : process.env.DB_HOST,
        port :process.env.DB_PORT,
        user : process.env.DB_USER,
        password : process.env.DB_PASSWORD,
        database : process.env.DB_NAME,
        },
      dumpToFile: filePath,
    });

    // Send the file to the browser for download
    res.download(filePath, fileName, (err) => {
      if (err) {
        console.error("Error downloading file:", err);
      }
      // Optional: Delete the file from the server after download to save space
      // fs.unlinkSync(filePath); 
    });

  } catch (err) {
    console.error("Backup Error:", err);
    res.status(500).json({ error: 'Backup failed. Check server logs.' });
  }
});

module.exports = router;