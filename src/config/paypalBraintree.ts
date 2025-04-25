import braintree from "braintree";

export const gateway = new braintree.BraintreeGateway({
  environment: braintree.Environment.Sandbox,
  merchantId: process.env.MERCHANT_ID as string,
  publicKey: process.env.PUBLIC_KEY as string,
  privateKey: process.env.PRIVATE_KEY as string,
})