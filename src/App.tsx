import React, { useState, useEffect } from 'react';
import { BigNumber, ethers } from 'ethers';
import './App.css';
import lacatDefinition from "./abi/lacat.json";
import { DepositForm, DepositValues } from './components/DepositForm';
import { env } from 'process';

const lacatAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

async function getSigner() {
  const provider = new ethers.providers.Web3Provider((window as any).ethereum)
  await provider.send("eth_requestAccounts", []);

  const signer = provider.getSigner();
  console.log("Got signer");

  return signer;
}

interface EthEnv {
  signer: ethers.Signer,
  address: string
}

interface Deposit {
  amount: ethers.BigNumber,
  unlock: number,
  isWithdrawn: boolean 
}

function App() {

  const [ethEnv, setEthEnv] = useState<EthEnv | null>(null);
  const [balance, setBalance] = useState<ethers.BigNumber>(ethers.BigNumber.from(0));
  const [lacat, setLacat] = useState<ethers.Contract | null>(null);
  const [deposits, setDeposits] = useState<Deposit[]>([]);

  const makeDeposit = async (deposit: DepositValues) => {
    if (!ethEnv || !lacat) return;

    const response = await lacat.connect(ethEnv.signer).deposit(deposit.unlockTimestamp.getTime() / 1000, deposit.monthlyWithdrawBasePoint, {
      value: deposit.amountInEth
    });

    console.log("Sent transaction", response);
  };

  useEffect(() => {
    const fetchSigner = async () => {
      const signer = await getSigner();
      const address = await signer.getAddress();

      setEthEnv({ signer, address });
    }

    fetchSigner();
  }, []);

  useEffect(() => {
    const contractFetcher = async () => {
      if (ethEnv) {
        const lacat = new ethers.Contract(lacatAddress, lacatDefinition.abi).connect(ethEnv.signer);
        setLacat(lacat);
      }
    }

    contractFetcher();
  }, [ethEnv]);

  useEffect(() => {
    const fetchBalance = async () => {
      if (ethEnv) {
        const balance = await ethEnv?.signer.getBalance();
        setBalance(balance);
      }
    }

    fetchBalance();

    const interval = setInterval(() => {
      fetchBalance()
    }, 10000);
    return () => clearInterval(interval);
  }, [ethEnv]);

  useEffect(() => {
    const fetchDeposits = async () => {
      if (ethEnv && lacat) {
        const deposits = [];

        const numDeposits = await lacat.connect(ethEnv.signer).getNumDeposits();
        for (let i = 0; i < numDeposits; i++) {
          const deposit = await lacat.connect(ethEnv.signer).getDepositStatus(i);
          deposits.push({
            amount: deposit[0],
            unlock: deposit[1],
            isWithdrawn: deposit[2]
          });
        }

        setDeposits(deposits);
      }
    }

    fetchDeposits();

    const interval = setInterval(() => {
      fetchDeposits()
    }, 10000);
    return () => clearInterval(interval);
  }, [ethEnv, lacat]);

  return (
    <div className="App">

      <h1>{ "Lacat App" }</h1>

      <p>{ "Account: " +  ethEnv?.address }</p>
      <p>{ "Balance: " + ethers.utils.formatEther(balance) + " ETH"}</p>
      <p>{ "Deposits: " + JSON.stringify(deposits) }</p>

      <h2>Make a deposit</h2>
      <DepositForm handler={makeDeposit} />
    </div>
  );
}

export default App;
