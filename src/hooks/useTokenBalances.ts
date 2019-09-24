import { useState, useEffect } from 'react'
import { TokenBalanceDetails } from 'types'
import { tokenListApi, walletApi, erc20Api, depositApi } from 'api'
import { ALLOWANCE_VALUE } from 'const'

interface UseTokenBalanceResult {
  balances: TokenBalanceDetails[] | undefined
  error: boolean
}

async function _getBalances(): Promise<TokenBalanceDetails[]> {
  // TODO: Remove connect once login is done
  await walletApi.connect()

  const [userAddress, networkId] = await Promise.all([walletApi.getAddress(), walletApi.getNetworkId()])
  const tokens = tokenListApi.getTokens(networkId)
  const contractAddress = depositApi.getContractAddress()

  const balancePromises = tokens.map(async token => {
    const tokenAddress = token.address
    const [exchangeBalance, depositingBalance, withdrawingBalance, walletBalance, allowance] = await Promise.all([
      depositApi.getBalance(userAddress, tokenAddress),
      depositApi.getPendingDepositAmount(userAddress, tokenAddress),
      depositApi.getPendingWithdrawAmount(userAddress, tokenAddress),
      erc20Api.balanceOf(tokenAddress, userAddress),
      erc20Api.allowance(tokenAddress, userAddress, contractAddress),
    ])

    return {
      ...token,
      exchangeBalance,
      depositingBalance,
      withdrawingBalance,
      walletBalance,
      enabled: allowance.eq(ALLOWANCE_VALUE),
    }
  })
  return Promise.all(balancePromises)
}

export const useTokenBalances = (): UseTokenBalanceResult => {
  const [balances, setBalances] = useState<TokenBalanceDetails[] | undefined>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    _getBalances()
      .then(balances => setBalances(balances))
      .catch(error => {
        console.error('Error loading balances', error)
        setError(error)
      })
  }, [])

  return { balances, error }
}