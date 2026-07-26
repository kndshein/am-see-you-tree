import { MediaUiType } from '../../../types/Media';
import styles from './Tag.module.scss';
import { FaSquare, FaBars, FaPlay, FaCircle } from 'react-icons/fa';

type PropTypes = {
  is_movies_only: boolean;
  media_ui_type: MediaUiType;
};

const TYPE_ICONS: Record<MediaUiType, React.ReactNode> = {
  movie: <FaSquare />,
  show: <FaBars />,
  short: <FaPlay />,
  special: <FaCircle />,
};

export default function Tag({ is_movies_only, media_ui_type }: PropTypes) {
  return (
    <div
      className={`${styles.type_tag} ${styles[media_ui_type]} ${
        !is_movies_only ? `${styles.show_type}` : ''
      }`}
    >
      <span className={styles.icon}>{TYPE_ICONS[media_ui_type]}</span>
      <span className={styles.label}>{media_ui_type}</span>
    </div>
  );
}
