import { useState } from 'react';
import styles from './Nav.module.scss';
import About from '../About/About';

type PropTypes = {
  is_movies_only: boolean;
  setIsMoviesOnly: React.Dispatch<React.SetStateAction<boolean>>;
};

export default function Nav({ is_movies_only, setIsMoviesOnly }: PropTypes) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  return (
    <nav>
      <button
        onClick={() => setIsModalOpen(true)}
        className={`${styles.button} ${styles.about}`}
      >
        About Site
      </button>
      <About isModalOpen={isModalOpen} setIsModalOpen={setIsModalOpen} />
      <div className={styles.gif_container}>
        <img
          src="https://media.giphy.com/media/XmppNRlrlu2SA/giphy.gif"
          alt="Futuristic sci-fi visual animation"
        />
      </div>
      <button
        aria-pressed={is_movies_only}
        className={`${is_movies_only ? styles.active : ''} ${styles.button} ${
          styles.media_filter
        }`}
        onClick={() => setIsMoviesOnly((prev) => !prev)}
      >
        Movies Only
      </button>
    </nav>
  );
}
