import { useForm, Resolver, Controller } from "react-hook-form";
import DatePicker from "react-datepicker";
import { 
  Button,
  FormErrorMessage,
  FormHelperText,
  FormLabel,
  FormControl,
  Input
} from '@chakra-ui/react';

export type DepositValues = {
    amountInEth: number;
    unlockTimestamp: Date;
    monthlyWithdrawBasePoint: number;
};

const resolver: Resolver<DepositValues> = async (values) => {
  return {
    values: values.amountInEth ? values : {},
    errors: {}
  };
};

declare type Handler = (data: DepositValues) => void;

type Props = {
    handler: Handler
}

const baseFee = 35;
const monthlyWithdrawFee = 15;

export function DepositForm(props: Props) {
  const { register, control, handleSubmit, watch, formState: { isSubmitting, errors } } = useForm<DepositValues>();

  const onSubmit = handleSubmit(props.handler);
  const watchFee = watch(['amountInEth', 'monthlyWithdrawBasePoint']); 

  const feeBasisPoint = baseFee + (watchFee[1] == 0 ? 0 : monthlyWithdrawFee);
  const fee = watchFee[0] * feeBasisPoint / 10000;

  const monthlyWithdrawal = watchFee[0] * watchFee[1] / 10000;

  return (
    <form onSubmit={onSubmit}>
      <FormControl isInvalid={errors.amountInEth != null}>

        <FormLabel htmlFor='amountInEth' mb={4}>Amount in ETH</FormLabel>
        <Input
          id='amountInEth'
          placeholder='0 ETH'
          autoComplete="off"
          isInvalid={errors.amountInEth != null}
          {...register('amountInEth', {
            required: 'Amount is required',
            min: {
              value: 0.1,
              message: 'Amount must be greater than 0.1'
            }
          })}
        />

        { errors.amountInEth != null 
          ? (<FormErrorMessage>{errors.amountInEth?.message}</FormErrorMessage>)
          : (<FormHelperText>Protocol Fee: {fee} ETH</FormHelperText>)
        }

      </FormControl>

      <FormControl isInvalid={errors.unlockTimestamp != null}>
        <FormLabel htmlFor='unlockTimestamp' mb={4} mt={4}>Unlock date</FormLabel>
        <Controller
          control={control}
          name="unlockTimestamp"
          rules={{
            required: 'Unlock date must be set'
          }}
          render={({ field: { onChange, onBlur, value } }) => (
            <DatePicker
              className="chakra-input css-1ohbhgu"
              id="unlockTimestamp"
              onChange={onChange}
              onBlur={onBlur}
              selected={value}
              autoComplete="off"
              placeholderText={new Date().toLocaleDateString()}
            />
          )}
        />

        { errors.unlockTimestamp != null 
          ? (<FormErrorMessage>{errors.unlockTimestamp?.message}</FormErrorMessage>)
          : (<FormHelperText>When do you want it to be unlocked?</FormHelperText>)
        }
        
      </FormControl>

      <FormControl isInvalid={errors.monthlyWithdrawBasePoint != null}>
        <FormLabel htmlFor='monthlyWithdraw' mb={4} mt={4}>Monthly withdrawal (basis points)</FormLabel>
        <Input
          id='monthlyWithdraw'
          defaultValue={0}
          autoComplete="off"
          {...register('monthlyWithdrawBasePoint', {
            required: false,
            min: {
              value: 0,
              message: 'Cannot be less than 0'
            },
            max: {
              value: 10000,
              message: 'Cannot be greater than 10000'
            }
          })}
        />

        { errors.monthlyWithdrawBasePoint != null 
          ? (<FormErrorMessage>{errors.monthlyWithdrawBasePoint?.message}</FormErrorMessage>)
          : (
            <FormHelperText>
              Monthly withdrawal in basis points of deposit.
              <br/>
              <br/>
              Equals to { monthlyWithdrawal } ETH
            </FormHelperText>
          )
        }
      </FormControl>

      <Button 
        type="submit"
        mt={4} colorScheme='teal'
        isLoading={isSubmitting}
        px={4}
        fontSize={'sm'}
        rounded={'full'}
        bg={'blue.400'}
        color={'white'} 
        boxShadow={
          '0px 1px 25px -5px rgb(66 153 225 / 48%), 0 10px 10px -5px rgb(66 153 225 / 43%)'
        }
        _hover={{
          bg: 'blue.500',
        }}
        _focus={{
          bg: 'blue.500',
        }}>
        Deposit
      </Button>

    </form>
  );
}