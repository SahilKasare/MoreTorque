const axios = require('axios');
const validator = require('validator');
const mongoose = require('mongoose');
const { Org, Vehicle } = require('../models/model');
const rateLimit = require('express-rate-limit');

const DecodeVin = async (req, res) => {
  const { vin } = req.params;

  try {
      const response = await axios.get(`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/${vin}?format=json`);
      const results = response.data.Results;
      
      if (!results) {
          return res.status(404).json({ error: 'VIN not found' });
      }
      const vehicleDetails = {
        manufacturer: results.find(r => r.Variable === 'Manufacturer Name')?.Value || 'N/A',
        model: results.find(r => r.Variable === 'Model')?.Value || 'N/A',
        year: results.find(r => r.Variable === 'Model Year')?.Value || 'N/A',
      };
      
      res.status(200).json(vehicleDetails);
  } catch (error) {
      console.error(error); 
      res.status(500).json({ error: 'Failed to decode VIN' });
  }
}



const AddVehicle = async (req, res) => {
  const { vin, org } = req.body;

  if (!validator.isLength(vin, { min: 17, max: 17 }) || !validator.isAlphanumeric(vin)) {
      return res.status(400).json({ error: 'Invalid VIN' });
  }

  if (!mongoose.Types.ObjectId.isValid(org)) {
      return res.status(400).json({ error: 'Invalid organization ID' });
  }

  try {
      const organization = await Org.findById(org);
      if (!organization) {
          return res.status(400).json({ error: 'Organization does not exist' });
      }

      const existingVehicle = await Vehicle.findOne({ vin });
      if (existingVehicle) {
          return res.status(400).json({ error: 'Vehicle already exists' });
      }

      const response = await axios.get(`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/${vin}?format=json`);
      const result = response.data.Results;

      const vehicleDetails = {
        manufacturer: result.find(r => r.Variable === 'Manufacturer Name')?.Value || 'N/A',
        model: result.find(r => r.Variable === 'Model')?.Value || 'N/A',
        year: result.find(r => r.Variable === 'Model Year')?.Value || 'N/A',
      };

      if (!result) {
          return res.status(404).json({ error: 'Vehicle details not found for the given VIN' });
      }

    //   const { ManufacturerName, ModelYear, Model } = result;
    //   console.log(result);
      

      const vehicle = new Vehicle({
          vin,
          manufacturer: vehicleDetails.manufacturer,
          model: vehicleDetails.model,
          year: vehicleDetails.year,
          org
      });

      await vehicle.save();

      const printVehi = {
        vin : vehicle.vin,
        manufacturer: vehicle.manufacturer,
        model: vehicle.model,
        year: vehicle.year,
        org: vehicle.org
      }
      res.status(201).json(printVehi);

  } catch (error) {
      console.error('Error details:', error); // Log error details for debugging
      res.status(500).json({ error: 'Failed to add vehicle', details: error.message });
  }
}



const GetVehicle =async (req, res) => {
  const { vin } = req.params;

  if (!validator.isLength(vin, { min: 17, max: 17 }) || !validator.isAlphanumeric(vin)) {
      return res.status(400).json({ error: 'Invalid VIN' });
  }

  try {
      const vehicle = await Vehicle.findOne({ vin }).populate('org');
      if (!vehicle) {
          return res.status(404).json({ error: 'Vehicle not found' });
      }

      res.status(200).json(vehicle);

  } catch (error) {
      console.error('Error details:', error); // Log error details for debugging
      res.status(500).json({ error: 'Failed to fetch vehicle details', details: error.message });
  }
}



const AddOrg = async (req, res) => {
    const { name, account, website, fuelReimbursementPolicy, speedLimitPolicy } = req.body;
    
    if (!name || !account || !website) {
        return res.status(400).json({ error: 'Name, account, and website are required' });
    }
    
    const existingOrg = await Org.findOne({ name });
      if (existingOrg) {
          return res.status(400).json({ error: 'Organisation already exists' });
      }
    
    try {
        const org = new Org({
            name,
            account,
            website,
            fuelReimbursementPolicy: fuelReimbursementPolicy || '1000',
            speedLimitPolicy
        });
        
        if(req.body.parentId) {
            org.parentId = req.body.parentId;
        }

        await org.save();
        
        const response = {
            account: org.account,
            website: org.website,
            fuelReimbursementPolicy: org.fuelReimbursementPolicy,
            speedLimitPolicy: org.speedLimitPolicy,
            parentId: org.parentId
        };

        res.status(201).json(response);
        
    } catch (error) {
        console.error('Error details:', error); // Log error details for debugging
        res.status(400).json({ error: 'Failed to create organization', details: error.message });
    }
}

  


const UpdateOrg = async (req, res) => {
    const { id } = req.params;
    const { account, website, fuelReimbursementPolicy, speedLimitPolicy } = req.body;
  
    try {
        // Find the organization to update
        const org = await Org.findById(id).populate('children').exec();
        if (!org) return res.status(404).json({ error: 'Organization not found' });
  
        // Update organization details
        if (account) org.account = account;
        if (website) org.website = website;
  
        // Handle fuelReimbursementPolicy
        if (org.parentId) {
            if (fuelReimbursementPolicy) {
                // Fetch parent and check if the policy matches
                const parentOrg = await Org.findById(org.parentId);
                if (parentOrg && parentOrg.fuelReimbursementPolicy !== fuelReimbursementPolicy) {
                    return res.status(400).json({ error: 'Fuel reimbursement policy update must be done at parent level' });
                }
            }
            // Set the new fuel reimbursement policy
            org.fuelReimbursementPolicy = fuelReimbursementPolicy;
        }
  
        // Handle speedLimitPolicy
        if (org.parentId) {
        if (speedLimitPolicy) {
                // Fetch parent and get its speedLimitPolicy
                const parentOrg = await Org.findById(org.parentId);
                if (parentOrg && parentOrg.speedLimitPolicy !== speedLimitPolicy) {
                    // Check if the policy is overridden
                    if (org.speedLimitPolicy === parentOrg.speedLimitPolicy) {
                        // Update this org and propagate to children
                        org.speedLimitPolicy = speedLimitPolicy;
                        await org.save();
                        
                        for (const childId of org.children) {
                            const childOrg = await Org.findById(childId);
                            if (childOrg && childOrg.speedLimitPolicy === parentOrg.speedLimitPolicy) {
                                childOrg.speedLimitPolicy = speedLimitPolicy;
                                await childOrg.save();
                            }
                        }
                    } else {
                        return res.status(400).json({ error: 'Cannot override inherited speed limit policy' });
                    }
                } else {
                    // If the parent's policy matches the new one, apply it directly
                    org.speedLimitPolicy = speedLimitPolicy;
                }
            } else {
                // If no parent, just set the new speed limit policy
                org.speedLimitPolicy = speedLimitPolicy;
            }
        }
  
        // Save the updated organization
        await org.save();
        res.status(200).json(org);
  
    } catch (err) {
        console.error('Error updating organization:', err); 
        res.status(500).json({ error: 'Server error', details: err.message }); 
    }
}
  
  

const GetOrg = async (req, res) => {
    try {
        // Extract page and limit from query parameters
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;

        // Validate page and limit
        if (page <= 0 || limit <= 0) {
            return res.status(400).json({ error: 'Page and limit must be positive integers' });
        }

        // Retrieve organizations with pagination
        const orgs = await Org.find()
            .skip((page - 1) * limit)
            .limit(limit)
            .select('-_id -__v')
            .populate('parentId', 'name account website fuelReimbursementPolicy speedLimitPolicy') // Populate parent details
            .populate('children', 'name'); // Populate children details

        // Count total organizations
        const totalOrgs = await Org.countDocuments();
        const totalPages = Math.ceil(totalOrgs / limit);

        // Prepare response
        const response = {
            totalOrgs,
            totalPages,
            currentPage: page,
            orgs
        };

        res.status(200).json(response);
    } catch (error) {
        console.error('Error retrieving organizations:', error);
        res.status(400).json({ error: 'Error retrieving organizations' });
    }
};

module.exports.DecodeVin = DecodeVin;
module.exports.AddVehicle = AddVehicle;
module.exports.GetVehicle = GetVehicle;
module.exports.AddOrg = AddOrg;
module.exports.UpdateOrg = UpdateOrg;
module.exports.GetOrg = GetOrg;