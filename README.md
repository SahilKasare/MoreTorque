# MotorQ Backend Assessment (More Torque)


## Introduction
This project is a RESTful API for managing vehicles and organizations for the taxi service company "More Torque." The API supports operations such as decoding vehicle VINs, managing vehicle records, and handling organizational details and policies.

## API Endpoints

### Vehicle Endpoints

- **GET /vehicles/decode/:vin**
  - Decodes a VIN and returns vehicle details (manufacturer, model, year).
  - Rate-limited to 5 requests per minute per client.

- **POST /vehicles**
  - Adds a new vehicle to the system.
  - **Request Body:**
    ```json
    {
      "vin": "xxxxxxxx",
      "org": "yyyyyy"
    }
    ```

- **GET /vehicles/:vin**
  - Fetches details of a vehicle by VIN.

### Organization Endpoints

- **POST /orgs**
  - Creates a new organization.
  - **Request Body:**
    ```json
    {
      "name": "Org1",
      "account": "acc1",
      "website": "www.org1.com",
      "fuelReimbursementPolicy": "policy1",
      "speedLimitPolicy": "policy2"
    }
    ```
  - Default `fuelReimbursementPolicy`: `1000`

- **PATCH /orgs**
  - Updates details of an existing organization.
  - **Request Body:**
    ```json
    {
      "account": "acc1",
      "website": "www.org1.com",
      "fuelReimbursementPolicy": "policy1",
      "speedLimitPolicy": "policy2"
    }
    ```

- **GET /orgs**
  - Retrieves information about all organizations.

## Features and Guidelines

- **Rate Limiting**: Implemented to restrict NHTSA API requests to 5 per minute.
- **Caching**: Utilized for optimizing VIN decoding.
- **Authentication**: APIs secured to prevent unauthorized access.
- **Pagination**: Included for retrieving a large number of organizations.

## Setup Instructions

1. **Clone the Repository**
   ```bash
   git clone https://github.com/your-repo-url.git
   npm i
