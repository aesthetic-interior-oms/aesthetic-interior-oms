const fs = require('fs');

function fixEnums(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(/TransactionType\.INFLOW/g, '"INFLOW"');
  content = content.replace(/TransactionType\.OUTFLOW/g, '"OUTFLOW"');
  content = content.replace(/PaymentAccount\.CASH/g, '"CASH"');
  content = content.replace(/PaymentAccount\.BANK/g, '"BANK"');
  fs.writeFileSync(filePath, content, 'utf8');
}

fixEnums('app/api/finance/reports/route.ts');
fixEnums('app/api/finance/transactions/route.ts');
console.log('Fixed');
