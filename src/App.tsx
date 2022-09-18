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
  Button,
  useToast
} from '@chakra-ui/react'
import { TimeIcon } from '@chakra-ui/icons'

const lacatAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

async function getSigner() {
  const provider = new ethers.providers.Web3Provider((window as any).ethereum)
  await provider.send("eth_requestAccounts", []);

  return provider.getSigner();
}

interface EthEnv {
  signer: ethers.Signer,
  address: string
}

interface LacatState {
  deposits: Deposit[],
  totalLockedUp: ethers.BigNumber
}

class Deposit {
  id: number;
  amount: ethers.BigNumber;
  unlockDate: Date;
  monthlyWithdraw: ethers.BigNumber;
  lastWithdraw: Date | null;

  constructor(id: number, amount: BigNumber, unlockDate: Date, monthlyWithdraw: BigNumber, lastWithdraw: Date | null) {
    this.id = id;
    this.amount = amount;
    this.unlockDate = unlockDate;
    this.monthlyWithdraw = monthlyWithdraw;
    this.lastWithdraw = lastWithdraw;
  }

  canBeUnlocked(): boolean {
    return new Date() >= this.unlockDate;
  }

  canWithdrawMonthlyAllowance(): boolean {
    if (!this.monthlyWithdrawSupported()) {
      return false;
    }
    if (this.lastWithdraw == null) {
      return true;
    }

    const oneMonthAgo = new Date();
    oneMonthAgo.setDate(new Date().getDate() - 30);

    return this.lastWithdraw <= oneMonthAgo;
  }

  monthlyWithdrawSupported(): boolean {
    return this.monthlyWithdraw.gt(0);
  }
}

function App() {

  const [ethEnv, setEthEnv] = useState<EthEnv | null>(null);
  const [balance, setBalance] = useState<ethers.BigNumber>(ethers.BigNumber.from(0));
  const [lacat, setLacat] = useState<ethers.Contract | null>(null);
  const [lacatState, setLacatState] = useState<LacatState>({ deposits: [], totalLockedUp: BigNumber.from(0) });
  const toast = useToast();

  const makeDeposit = async (deposit: DepositValues) => {
    if (!ethEnv || !lacat) return;

    let response: TransactionResponse;
    try {
      response = await lacat.connect(ethEnv.signer).deposit(
        BigNumber.from(deposit.unlockTimestamp.getTime() / 1000),
        BigNumber.from(deposit.monthlyWithdrawBasePoint),
        { value: ethers.utils.parseUnits(deposit.amountInEth.toString(), "ether") }
      );
    } catch (err) {
      toast({
        title: 'Transaction cancelled',
        status: 'warning',
        duration: 5000,
        isClosable: true,
      });
      throw err;
    }

    response.wait(1).then(() => toast({
      title: 'Deposit successful',
      status: 'success',
      duration: 5000,
      isClosable: true,
    }));

    toast({
      title: 'Transaction submitted for deposit',
      status: 'success',
      duration: 5000,
      isClosable: true,
    });
  };

  const withdrawMontlyAllowance = async (deposit: Deposit) => {
    if (!ethEnv || !lacat) return;

    const response: TransactionResponse = await lacat.connect(ethEnv.signer)
      .withdrawMonthlyAllowance(deposit.id);

    response.wait(1).then(() => toast({
      title: 'Monthly withdrawal successful',
      status: 'success',
      duration: 5000,
      isClosable: true,
    }));

    toast({
      title: 'Transaction submitted for monthly withdrawal',
      status: 'success',
      duration: 5000,
      isClosable: true,
    });
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

        for (let i = 0; i < numDeposits; i++) {
          const deposit = await connectedLacat.getDepositStatus(i);

          deposits.push(new Deposit(
            i,
            deposit[0],
            new Date((deposit[1] as BigNumber).toNumber() * 1000),
            deposit[2],
            deposit[3] == 0 ? null : new Date((deposit[3] as BigNumber).toNumber() * 1000)));
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
            {`Deposit ${deposit.id + 1}: `}
            <b>{`${ethers.utils.formatEther(deposit.amount)} ETH`}</b>
          </Box>
          <AccordionIcon />
        </AccordionButton>
      </h2>
      <AccordionPanel pb={4}>
        <SimpleGrid mt={4} columns={{ base: 1, md: 4 }} spacing={{ base: 5, lg: 8 }}>
          <StatsCard title="Remaining balance" stat={`${ethers.utils.formatEther(deposit.amount)} ETH`} />
          <StatsCard title="Unlock date" stat={deposit.unlockDate.toDateString()} />
          <StatsCard title="Monthly withdrawal allowance" 
            stat={!deposit.monthlyWithdrawSupported()
              ? "Not supported" 
              : `${ethers.utils.formatEther(deposit.monthlyWithdraw)} ETH`} 
          />
          <StatsCard title="Last monthly withdrawal" 
            stat={deposit.lastWithdraw == null ? "Never" : deposit.lastWithdraw.toDateString()}
          />

          <Button disabled={!deposit.canBeUnlocked()}>Withdraw full deposit</Button>
          <Button 
            disabled={!deposit.canWithdrawMonthlyAllowance()}
            onClick={() => withdrawMontlyAllowance(deposit)}>
            Withdraw monthly allowance
          </Button>

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
