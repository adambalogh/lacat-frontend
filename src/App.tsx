import React, { useState, useEffect } from 'react';
import { BigNumber, ethers } from 'ethers';
import { TransactionResponse } from "@ethersproject/abstract-provider";
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
  Center,
  Flex,
  chakra,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  useColorModeValue,
} from '@chakra-ui/react'
import { TimeIcon } from '@chakra-ui/icons'

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

interface LacatState {
  deposits: Deposit[],
  totalLockedUp: ethers.BigNumber
}

interface Deposit {
  id: number,
  amount: ethers.BigNumber,
  unlockDate: Date,
  monthlyWithdraw: ethers.BigNumber,
  lastWithdraw: Date | null
}

function App() {

  const [ethEnv, setEthEnv] = useState<EthEnv | null>(null);
  const [balance, setBalance] = useState<ethers.BigNumber>(ethers.BigNumber.from(0));
  const [lacat, setLacat] = useState<ethers.Contract | null>(null);
  const [lacatState, setLacatState] = useState<LacatState>({ deposits: [], totalLockedUp: BigNumber.from(0) });

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
          const deposit = await connectedLacat.getDepositStatus(0);

          deposits.push({
            id: i,
            amount: deposit[0],
            unlockDate: new Date((deposit[1] as BigNumber).toNumber() * 1000),
            monthlyWithdraw: deposit[2],
            lastWithdraw: deposit[3] == 0 ? null : new Date((deposit[3] as BigNumber).toNumber() * 1000)
          });
        }

        const totalDeposit = deposits.map(d => d.amount).reduce((prev, current) => prev.add(current), BigNumber.from(0));

        setLacatState({
          deposits: deposits,
          totalLockedUp: totalDeposit,
        });
      }
    }

    fetchDeposits();

    const interval = setInterval(() => {
      fetchDeposits()
    }, 10000);
    return () => clearInterval(interval);
  }, [ethEnv, lacat]);

  var depositAccordions = lacatState.deposits.map(deposit => {
    return (<AccordionItem key={deposit.id}>
      <h2>
        <AccordionButton>
          <Box flex='1' textAlign='left'>
            <TimeIcon mr={4} />
            <b>{`${deposit.id + 1}: `}</b>
            {`${ethers.utils.formatEther(deposit.amount)} ETH`}
          </Box>
          <AccordionIcon />
        </AccordionButton>
      </h2>
      <AccordionPanel pb={4}>
        <SimpleGrid mt={4} columns={{ base: 1, md: 4 }} spacing={{ base: 5, lg: 8 }}>
          <StatsCard title="Remaining balance" stat={`${ethers.utils.formatEther(deposit.amount)} ETH`} />
          <StatsCard title="Unlock date" stat={deposit.unlockDate.toDateString()} />
          <StatsCard title="Monthly withdrawal" 
            stat={deposit.monthlyWithdraw.eq(BigNumber.from(0)) 
              ? "Not supported" 
              : `${ethers.utils.formatEther(deposit.monthlyWithdraw)} ETH`} 
          />
          <StatsCard title="Last monthly withdrawal" 
            stat={deposit.lastWithdraw == null ? "Never" : deposit.lastWithdraw.toDateString()}
          />
        </SimpleGrid>
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
          title={'Account Balance'}
          stat={ethers.utils.formatEther(balance) + " ETH"} />

        <StatsCard 
          title={'Total Locked-up Balance'}
          stat={ethers.utils.formatEther(lacatState.totalLockedUp) + " ETH"} />

      
      </SimpleGrid>

      <chakra.h2
        textAlign={'center'}
        fontSize={'2xl'}
        py={10}
        fontWeight={'bold'}>
          Deposits
      </chakra.h2>

      <Accordion allowToggle={true}>
        { depositAccordions }
      </Accordion>

      <chakra.h2
        textAlign={'center'}
        fontSize={'2xl'}
        py={10}
        fontWeight={'bold'}>
          Make a deposit
      </chakra.h2>

      <Center py={6}>
        <Box
          maxW={'320px'}
          w={'full'}
          bg={useColorModeValue('white', 'gray.900')}
          boxShadow={'2xl'}
          rounded={'lg'}
          p={4}
          textAlign={'center'}>
          <DepositForm handler={makeDeposit} />
        </Box>
      </Center>

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
