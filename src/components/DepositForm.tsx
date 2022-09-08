import { useForm, Resolver, Controller } from "react-hook-form";
import DatePicker from "react-datepicker";

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
  const { register, control, handleSubmit } = useForm<DepositValues>({ resolver });

  const onSubmit = handleSubmit(props.handler);
  
  return (
    <form onSubmit={onSubmit}>
      <input {...register("amountInEth")} placeholder="0 ETH" />
      <Controller
        control={control}
        name="unlockTimestamp"
        render={({ field: { onChange, onBlur, value } }) => (
          <DatePicker
            onChange={onChange}
            onBlur={onBlur}
            selected={value}
          />
        )}
      />
      <input {...register("monthlyWithdrawBasePoint")} placeholder="0" />

      <input type="submit" />
    </form>
  );
}