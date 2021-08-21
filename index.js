const csv = require('csvtojson');
const https = require('https');

// Path to csv to be imported
const CSV_FILE_PATH = './orders.csv';

// Shopify store credentials
const ENV = {...process.env};
const SHOPIFY_STORE_HANDLE = ENV.SHOPIFY_STORE_HANDLE;
const SHOPIFY_API_KEY = ENV.SHOPIFY_API_KEY;
const SHOPIFY_API_PASSWORD = ENV.SHOPIFY_API_PASSWORD;
const SHOPIFY_STORE_CREDENTIALS = `${SHOPIFY_API_KEY}:${SHOPIFY_API_PASSWORD}`;

// Add tag to each imported order
const order_tag = 'IMPORT';

(async () => {
  let records = await csv().fromFile(CSV_FILE_PATH);

  if (!records) {
    throw `Couldn\'t read records from CSV ${CSV_FILE_PATH}`;
  }

  console.log(`Read ${records.length} records from CSV ${CSV_FILE_PATH}`);

  let orders = {};

  records.forEach(record => {

    if (!orders['_' + record.order_name]) {
      orders['_' + record.order_name] = {
        imported: false,
        order_name: record.order_name,
        email: record.billing_email,
        phone: record.billing_phone,
        billing_first_name: record.billing_first_name,
        billing_last_name: record.billing_last_name,
        billing_company: record.company,
        billing_address_1: record.billing_address_1,
        billing_city: record.billing_city,
        billing_postocde: record.billing_postcode,
        billing_state: record.billing_state,
        billing_country: record.billing_country_code,
        shipping_address_1: record.shipping_address_1,
        shipping_address_2: '',
        shipping_city: record.shipping_city,
        shipping_company: '',
        shipping_country_code: record.shipping_country_code,
        shipping_first_name: record.shipping_first_name,
        shipping_last_name: record.shipping_last_name,
        shipping_province: record.shipping_state,
        shipping_zip: record.shipping_postcode,
        processed_at: record.processed_at,
        fulfillment_status: record.fulfillment_status,
        financial_status: record.financial_status,
        cancel_reason: record.fulfillment_status == 'cancelled',
        total_discounts: record.cart_discount_amount,
        total_price: record.order_total_amount,
        total_tax: record.order_total_tax_amount,
        line_items: [
          {
            title: record.line_item_name,
            sku: record.sku,
            price: parseFloat(record.item_cost),
            quantity: parseInt(record.quantity)
          }
        ],
        shipping_amount: record.order_shipping_amount,
        shipping_method: record.shipping_method_title,
        tags: order_tag,
        subtotal_price: record.order_subtotal_amount,
        note_attributes: record.note_attributes,
        discount_codes: [
          {
            'code': record.discount_codes,
            'amount': record.discount_amount,
            'type': 'fixed_amount',
          },
        ],
      }
    } else {
      orders['_' + record.order_name].line_items.push({
        title: record.line_item_name,
        sku: record.sku,
        price: parseFloat(record.item_cost),
        quantity: parseInt(record.quantity)
      })
    }
  });

  let ordersArr = [];

  for (let key in orders) {
    let order = orders[key];
    if (!order.imported) {
      ordersArr.push(order);
    }
  }

  console.log(`Imported ${ordersArr.length} orders from file ${CSV_FILE_PATH}`);

  for (let i = 0; i < ordersArr.length; i++) {
    let order = ordersArr[i];

    if (!order.imported) {
      console.log(`Uploading order ${i+1}/${ordersArr.length} to Shopify`);

      let customer  = {
        first_name: order.billing_first_name,
        last_name: order.billing_last_name,
        company: order.billing_company,
        email: order.email,
        phone: order.phone,
      };

      let billing_address = {
        first_name: customer.first_name,
        last_name: customer.last_name,
        address1: order.billing_address_1,
        address2: '',
        city: order.billing_city,
        company: order.billing_company,
        phone: order.billing_phone,
        zip: order.billing_postcode,
        province: order.billing_state,
        country_code: order.billing_country_code
      };

      let shipping_address = {
        address1: order.shipping_address_1,
        address2: '',
        city: order.shipping_city,
        company: '',
        country_code: order.shipping_country_code,
        first_name: order.shipping_first_name,
        last_name: order.shipping_last_name,
        province: order.shipping_state,
        zip: order.shipping_postcode
      };

      let shipping = {
        title: order.shipping_method,
        code: order.shipping_method,
        price: order.shipping_amount,
      };

      let shopifyOrder = {
        order: {
          customer,
          billing_address,
          shipping_address,
          financial_status: order.financial_status,
          fulfillment_status: order.fulfillment_status,
          processed_at: order.processed_at,
          send_fulfillment_receipt: false,
          send_receipt: false,
          subtotal_price: order.subtotal_price,
          line_items: order.line_items.map(item => {
            return {
              title: item.title,
              sku: item.sku,
              price: item.price,
              quantity: item.quantity
            }
          }),
          shipping_lines: [shipping],
          tags: order.tags,
          note: order.note,
          total_discounts: order.total_discounts,
          total_price: order.total_price,
          total_tax: order.total_tax,
        }
      };

      let result = JSON.parse(await uploadOrder(shopifyOrder));

      if (result.errors) {
        console.log(result.errors)
      } else {
        console.log(`Uploaded order ${i+1}/${ordersArr.length} to Shopify`);
      }

      await sleep(1000);
    }
  }
})();

function sleep(delay) {
  return new Promise(resolve => setTimeout(resolve, delay))
}

async function uploadOrder(order) {
  return new Promise(async (resolve, reject) => {
    let body = JSON.stringify(order);
    let request = https.request(`https://${SHOPIFY_STORE_HANDLE}.myshopify.com/admin/api/2021-07/orders.json`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${new Buffer.from(SHOPIFY_STORE_CREDENTIALS).toString('base64')}`,
        'Content-Length': Buffer.byteLength(body),
        'Content-Type': 'application/json'
      }
    }, response => {
      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('error', (error) => {
        reject(error);
      });
      response.on('end', () => resolve(data))
    });

    request.write(body);
    request.end()
  })
}
