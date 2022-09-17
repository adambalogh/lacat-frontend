import { useForm, Resolver, Controller } from "react-hook-form";
import DatePicker from "react-datepicker";
import { 
  Box,
  Button,
  ButtonProps,
  Flex,
  FormErrorMessage,
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

export function DepositForm(props: Props) {
  const { register, control, handleSubmit, formState: { isSubmitting, errors } } = useForm<DepositValues>({ resolver });

  const onSubmit = handleSubmit(props.handler);
  
  return (
    <form onSubmit={onSubmit}>
      <FormControl>

        <FormLabel htmlFor='amountInEth'>Amount in ETH</FormLabel>
        <Input
          id='amountInEth'
          placeholder='0 ETH'
          {...register('amountInEth', {
            required: 'This is required',
          })}
        />

        <FormLabel htmlFor='unlockTimestamp'>Unlock date</FormLabel>
        <Controller
          control={control}
          name="unlockTimestamp"
          render={({ field: { onChange, onBlur, value } }) => (
              <DatePicker
                id="unlockTimestamp"
                onChange={onChange}
                onBlur={onBlur}
                selected={value}
              />
          )}
        />

        <FormLabel htmlFor='monthlyWithdraw'>Monthly withdrawal</FormLabel>
        <Input
          id='monthlyWithdraw'
          placeholder='0'
          {...register('monthlyWithdrawBasePoint')}
        />

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