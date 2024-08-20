const express = require('express');
const rateLimit = require('express-rate-limit');
const { DecodeVin, AddVehicle, GetVehicle, AddOrg, UpdateOrg, GetOrg} = require('./controller/controller');
const mongoose = require('mongoose');
const axios = require('axios');
const app = express();
const port = process.env.PORT || 3000;

// MongoDB atlas is used for preventing data from being deleted
const MONGODB_URL = process.env.MONGODB_URL || 'mongodb://localhost/more_torque';

// Set up rate limiting: max 5 requests per minute
const limiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 5, // limit each IP to 5 requests per windowMs
    message: 'Too many requests, please try again later.',
});

app.use(express.json());
app.use(limiter);


mongoose.connect(MONGODB_URL, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        console.log('MongoDB connected');
    })
    .catch(err => {
        console.error('MongoDB connection error:', err);
    });


app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});


// Endpoint to decode VIN
app.get('/vehicles/decode/:vin', limiter, DecodeVin);

// Create a new vehicle
app.post('/vehicles', AddVehicle);

//get Vehicles
app.get('/vehicles/:vin', GetVehicle);


// Create Organization
app.post('/orgs', AddOrg);


// Update Organization
app.patch('/orgs/:name', async (req, res) => {
    const { name } = req.params; // Extract name using destructuring
    const updateData = req.body;
  
    try {
      // Call UpdateOrg function with the name and updateData
      const result = await UpdateOrg(name, updateData);
      res.status(result.status).json(result);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });
  

//get Organisation
app.get('/orgs', GetOrg);