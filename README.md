# shopify-order-importer
Import orders via CSV to any given Shopify store.


## How to use
1. Clone the repository

```bash
git clone https://github.com/bekahmcdonald/shopify-order-importer.git
```

2. Fill in your store's credentials in the `.env.example` file, and rename the file to `.env`.

3. Add your data to `orders.csv` or replace it with your own file, ensuring that the column headers match the existing file. 

4. From the project root, run 
```bash 
node index.js
```