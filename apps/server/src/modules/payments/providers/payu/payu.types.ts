// PayU Hosted Checkout specific types and API request/response contracts

export interface PayUHashParams {
  key: string;
  txnid: string;
  amount: string; // Formatted to 2 decimals e.g. "99.00"
  productinfo: string;
  firstname: string;
  email: string;
  udf1?: string;
  udf2?: string;
  udf3?: string;
  udf4?: string;
  udf5?: string;
  salt: string;
}

export interface PayUResponseHashParams {
  key: string;
  txnid: string;
  amount: string;
  productinfo: string;
  firstname: string;
  email: string;
  status: string;
  udf1?: string;
  udf2?: string;
  udf3?: string;
  udf4?: string;
  udf5?: string;
  additionalCharges?: string;
  salt: string;
  hash: string;
}

export interface PayUVerifyApiParams {
  key: string;
  command: 'verify_payment';
  var1: string; // txnid
  salt: string;
}

export interface PayURefundApiParams {
  key: string;
  command: 'cancel_refund_transaction';
  var1: string; // PayU mihpayid or txnid
  var2: string; // Token ID / Refund request ID
  var3: string; // Amount formatted to 2 decimals
  salt: string;
}

