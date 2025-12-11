import { OrderType } from '../../../App';
import styles from './Index.module.scss';
import { motion } from 'motion/react';

interface Props {
  idx: number;
  order_type: OrderType;
  media_length: number;
}

function normalizeNum(num: number) {
  let output: string[] = [];
  const num_string = num.toString();
  for (let i = 0; i < 3 - num_string.length; i++) output.push('0');
  output.push(num_string);
  return output.join('');
}

export default function Index({ idx, order_type, media_length }: Props) {
  const calculated_idx = order_type.includes('Reverse')
    ? media_length - idx
    : idx + 1;
  return (
    <motion.span
      className={`${styles.index} ${
        calculated_idx >= 100 && calculated_idx < 200
          ? styles.first_hundred
          : ''
      }`}
      layout="position"
    >
      {normalizeNum(calculated_idx)}
    </motion.span>
  );
}
