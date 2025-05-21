import { gateway } from '../utils/braintree.config'

export const generateClientToken = async () => {
  return gateway.clientToken.generate({})
}

export const processTransaction = async (
  amount: string,
  paymentMethodNonce: string
) => {
  return gateway.transaction.sale({
    amount,
    paymentMethodNonce,
    options: {
      submitForSettlement: true,
    },
  })
}
