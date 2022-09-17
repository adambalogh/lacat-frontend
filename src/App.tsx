import React, { useState, useEffect } from 'react';
import { BigNumber, ethers } from 'ethers';
import { TransactionReceipt, TransactionResponse } from "@ethersproject/abstract-provider";
import './App.css';
import lacatDefinition from "./abi/lacat.json";
import { DepositForm, DepositValues } from './components/DepositForm';
import {
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Box,
  Flex,
  chakra,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  useColorModeValue,
} from '@chakra-ui/react'

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

    const response: TransactionResponse = await lacat.connect(ethEnv.signer).deposit(
      BigNumber.from(deposit.unlockTimestamp.getTime() / 1000),
      BigNumber.from(deposit.monthlyWithdrawBasePoint),
      { value: deposit.amountInEth }
    );

    console.log("txn sent " + response);
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
        const deposits: Deposit[] = [];

        const connectedLacat = lacat.connect(ethEnv.signer);
        const numDeposits = await connectedLacat.getNumDeposits();
        console.log("num deposits " + numDeposits);

        for (let i = 0; i < numDeposits; i++) {
          console.log("Getting deposit " + i);

          const deposit = await connectedLacat.getDepositStatus(0);
          console.log(deposit);

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

  var depositAccordions = deposits.map(deposit => {
    return (<AccordionItem>
      <h2>
        <AccordionButton>
          <Box flex='1' textAlign='left'>
            {ethers.utils.formatEther(deposit.amount)}
          </Box>
          <AccordionIcon />
        </AccordionButton>
      </h2>
      <AccordionPanel pb={4}>
      </AccordionPanel>
    </AccordionItem>);
  });

  return (
    <Box maxW="7xl" mx={'auto'} pt={10} pb={10} px={{ base: 2, sm: 12, md: 17 }}>

      <chakra.h1
        textAlign={'center'}
        fontSize={'4xl'}
        py={10}
        fontWeight={'bold'}>
          Lacat App
      </chakra.h1>

      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={{ base: 5, lg: 8 }}>

        <StatsCard 
          title={'Account'}
          stat={ ethEnv?.address || 'n/a' } />

        <StatsCard 
          title={'Balance'}
          stat={ethers.utils.formatEther(balance) + " ETH"} />
      
      </SimpleGrid>

      <chakra.h2
        textAlign={'center'}
        fontSize={'2xl'}
        py={10}
        fontWeight={'bold'}>
          Deposits
      </chakra.h2>

      <Accordion>
        { depositAccordions }
      </Accordion>

      <chakra.h2
        textAlign={'center'}
        fontSize={'2xl'}
        py={10}
        fontWeight={'bold'}>
          Make a deposit
      </chakra.h2>

      <Flex justifyContent="center" alignItems="center">
        <DepositForm handler={makeDeposit} />
      </Flex>

    </Box>
  );
}

interface StatsCardProps {
  title: string;
  stat: string
}

function StatsCard(props: StatsCardProps) {
  return (
    <Stat
      px={{ base: 2, md: 4 }}
      py={'5'}
      shadow={'xl'}
      border={'1px solid'}
      borderColor={useColorModeValue('gray.800', 'gray.500')}
      rounded={'lg'}>
      <Flex justifyContent={'space-between'}>
        <Box pl={{ base: 1, md: 4 }}>
          <StatLabel fontWeight={'medium'} >
            {props.title}
          </StatLabel>
          <StatNumber fontSize={'xl'} fontWeight={'medium'}>
            {props.stat}
          </StatNumber>
        </Box>
      </Flex>
    </Stat>
  );
}

export default App;
