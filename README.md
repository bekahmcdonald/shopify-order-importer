# shopify-order-importer
Import orders via CSV to any given Shopify store.


## Prerequisites
* [Node](https://nodejs.org/en/)

## How to use
1. Clone the repository

```bash
git clone https://github.com/bekahmcdonald/shopify-order-importer.git
```

2. Fill in your store's credentials in the `.env.example` file, and rename the file to `.env`.

3. Install dependencies
```bash
npm install
```

4. Add your data to `orders.csv` or replace it with your own file, ensuring that the column headers match.

5. From the project root, run 
```bash 
node index.js
```