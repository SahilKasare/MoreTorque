const mongoose = require('mongoose');

// Define schemas and models
const VehicleSchema = new mongoose.Schema({
    vin: String,
    manufacturer: String,
    model: String,
    year: Number,
    org: { type: mongoose.Schema.Types.ObjectId, ref: 'Org' }
});
const Vehicle = mongoose.model('Vehicle', VehicleSchema);

const OrgSchema = new mongoose.Schema({
    name:{
        type: String,
        required: true,
        unique: true
    },
    account: String,
    website: String,
    fuelReimbursementPolicy: { type: String, default: '1000' },
    speedLimitPolicy: String,
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Org', default: null }, 
    children: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Org' }]
});


OrgSchema.pre('save', async function (next) {
    if (this.isNew && this.parentId) {
        const parentOrg = await Org.findById(this.parentId);
        if (parentOrg) {
            parentOrg.children.push(this._id);
            await parentOrg.save();
        }
    }
    next();
});


const Org = mongoose.model('Org', OrgSchema);

module.exports = { Vehicle, Org };