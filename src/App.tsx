import React, { useState, useEffect } from 'react';
import { BigNumber, ethers } from 'ethers';
import { TransactionResponse } from "@ethersproject/abstract-provider";
import './App.css';
import lacatDefinition from "./abi/lacat.json";
import { DepositForm, DepositValues } from './components/DepositForm';
import { Footer } from './components/Footer';
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
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Spacer,
  useDisclosure,
} from '@chakra-ui/react'
import { TimeIcon, UnlockIcon, CheckIcon } from '@chakra-ui/icons'

const lacatAddress = "0xf6dE9D88947DA04Aad964A5129f2535E3a57FB1F";

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
    return !this.isAlreadyWithdrawn() && new Date() >= this.unlockDate;
  }

  isAlreadyWithdrawn(): boolean {
    return this.amount.eq(0);
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

  const withdrawFullDeposit = async (deposit: Deposit) => {
    if (!ethEnv || !lacat) return;

    const response: TransactionResponse = await lacat.connect(ethEnv.signer)
      .withdraw(deposit.id);

    response.wait(1).then(() => toast({
      title: 'Deposit withdrawal successful',
      status: 'success',
      duration: 5000,
      isClosable: true,
    }));

    toast({
      title: 'Transaction submitted for deposit withdrawal',
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
            { deposit.isAlreadyWithdrawn()
              ? <CheckIcon mr={4} />
              : deposit.canBeUnlocked() ? <UnlockIcon mr={4}/> : <TimeIcon mr={4} />
            }

            {`Deposit ${deposit.id + 1}: `}
            { deposit.isAlreadyWithdrawn()
              ? <b>Deposit withdrawn</b>
              : <b>{`${ethers.utils.formatEther(deposit.amount)} ETH`}</b>
            }
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

          <Button 
            disabled={!deposit.canBeUnlocked()}
            onClick={() => withdrawFullDeposit(deposit)}>
            Withdraw full deposit
          </Button>
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
    <div>
      <Box maxW="7xl" mx={'auto'} pb={10} px={{ base: 2, sm: 12, md: 17 }}>

        <Flex>
          <Box>
            <chakra.h1
              textAlign={'center'}
              fontSize={'4xl'}
              py={10}
              fontWeight={'bold'}>
                Lacat v1.0.0
            </chakra.h1>
          </Box>

          <Spacer />

          <Center>
            <HelpModal />
          </Center>

        </Flex>


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

        <Center>
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

      <Footer />
    </div>
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

function HelpModal() {
  const { isOpen, onOpen, onClose } = useDisclosure();
  
  return (
    <>
      <Button onClick={onOpen} variant='ghost'>How it works?</Button>

      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Lacat Smart Wallet</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <p>
              Lacat is the best way to HODL your crypto. It allows you to lock up your funds for a specified amount of time
              so you don't have to worry about panic-selling or losing your funds due to a hack or accidentally sending it to someone.
            </p>
            <br/>
            <p>
              Just make a deposit and once the time expires, you can withdraw it back to your personal wallet. Your crypto always remains
              yours, we just hold it for you temporarily. There is no way for us or anyone else to withdraw your funds so it is totally safe.
            </p>
            <br/>
            <p>
              Optionally, you can also allow monthly withdrawals in case you need to access your funds due to unforseen circumatances.
            </p>
            <br/>
            <p>
              Depositing costs 0.035% of your funds and enabling monthly withdrawals costs 0.015%. Once your funds are locked in, it is not
              possible to enable/disable monthly withdrawal or change the expiration date.
            </p>
          </ModalBody>

          <ModalFooter>
            <Button colorScheme='blue' mr={3} onClick={onClose}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  )
}

export default App;
